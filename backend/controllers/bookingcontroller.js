const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Ambulance = require("../models/ambulance");
const { computeEta, heuristicMinutes, haversineMeters } = require("../lib/eta");

// Attach a straight-line ETA to a booking (ambulance → pickup) — instant,
// used for the booking confirmation card
function attachInstantEta(booking) {
  const amb = booking?.ambulance?.location?.coordinates;
  const pick = booking?.pickupLocation?.coordinates;
  if (!booking || !amb || !pick) return;
  const minutes = heuristicMinutes(
    haversineMeters(
      { lng: amb[0], lat: amb[1] },
      { lng: pick[0], lat: pick[1] }
    )
  );
  if (minutes != null) {
    booking.etaMinutes = minutes;
    booking.etaSource = "estimated";
  }
}

// BOOK AMBULANCE
const bookAmbulance = async (req, res) => {
  try {
    const {
      ambulanceId,
      latitude,
      longitude,
      destination,
      patientName,
      patientPhone,
    } = req.body;

    if (
      !ambulanceId ||
      latitude === undefined  || latitude === "" ||
      longitude === undefined || longitude === "" ||
      !destination ||
      !patientName ||
      !patientPhone
    ) {
      return res.status(400).json({
        message: "All booking details are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(ambulanceId)) {
      return res.status(400).json({ message: "Invalid ambulance id" });
    }

    const lng = Number(longitude);
    const lat = Number(latitude);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({ message: "Invalid pickup coordinates" });
    }

    // Atomically claim the ambulance (check + set busy in one step)
    const ambulance = await Ambulance.findOneAndUpdate(
      { _id: ambulanceId, status: "available" },
      { status: "busy" },
      { returnDocument: "after" }
    );

    if (!ambulance) {
      const exists = await Ambulance.findById(ambulanceId);

      return res.status(exists ? 400 : 404).json({
        message: exists
          ? "Ambulance is not available"
          : "Ambulance not found",
      });
    }

    // Create booking; free the ambulance again if booking creation fails
    let booking;

    try {
      booking = await Booking.create({
        user: req.user._id || req.user.id,
        ambulance: ambulanceId,
        pickupLocation: {
          type: "Point",
          coordinates: [lng, lat],
        },
        destination,
        patientName,
        patientPhone,
        status: "confirmed",
      });
    } catch (err) {
      await Ambulance.findByIdAndUpdate(ambulanceId, { status: "available" });
      throw err;
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("ambulance")
      .populate("user", "-password")
      .lean();

    attachInstantEta(populatedBooking);

    // Broadcast the new booking so fleet views update instantly
    const { emit } = require("../config/socket");
    emit("booking:created", populatedBooking);

    res.status(201).json({
      message: "Ambulance booked successfully",
      booking: populatedBooking,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// GET MY BOOKINGS
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const bookings = await Booking.find({
      user: userId,
    })
      .populate("ambulance")
      .sort({ createdAt: -1 });

    res.status(200).json({
      bookings,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// GET SINGLE BOOKING
const getBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id)
      .populate("ambulance")
      .populate("user", "-password")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const userId = req.user._id?.toString() || req.user.id;
    const ownerId = String(booking.user?._id ?? booking.user ?? "");

    let authorized = ownerId === userId || req.user.role === "admin";

    // Drivers assigned to this ambulance may also track the trip
    if (!authorized && req.user.role === "driver") {
      const ambulance = await Ambulance.findById(booking.ambulance);
      authorized = ambulance?.driver?.toString() === userId;
    }

    if (!authorized) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Road ETA (with straight-line fallback) for this trip's pickup point
    const ambCoords = booking.ambulance?.location?.coordinates;
    const pickCoords = booking.pickupLocation?.coordinates;
    if (ambCoords && pickCoords) {
      const eta = await computeEta({
        from: { lng: ambCoords[0], lat: ambCoords[1] },
        to: { lng: pickCoords[0], lat: pickCoords[1] },
      });
      if (eta) {
        booking.etaMinutes = eta.minutes;
        booking.etaSource = eta.source;
      }
    }

    res.status(200).json({ booking });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// UPDATE BOOKING STATUS
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "confirmed",
      "ongoing",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid booking status",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const userId = req.user._id?.toString() || req.user.id;
    const isOwner = booking.user.toString() === userId;

    // Who may make this change
    let canManage = false;

    if (req.user.role === "admin") {
      canManage = true;
    } else if (status === "cancelled" && isOwner) {
      canManage = true;
    } else if (req.user.role === "driver") {
      const ambulance = await Ambulance.findById(booking.ambulance);
      canManage = ambulance?.driver?.toString() === userId;
    }

    if (!canManage) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Valid next states for the current state
    const TRANSITIONS = {
      confirmed: ["ongoing", "cancelled"],
      ongoing:   ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (!(TRANSITIONS[booking.status] || []).includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${booking.status} to ${status}`,
      });
    }

    booking.status = status;
    await booking.save();

    // If trip is completed/cancelled,
    // make ambulance available again
    if (status === "completed" || status === "cancelled") {
      const ambulance = await Ambulance.findById(
        booking.ambulance
      );

      if (ambulance) {
        ambulance.status = "available";
        await ambulance.save();
      }
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate("ambulance");

    // Broadcast the status change for live tracking
    const { emit } = require("../config/socket");
    emit("booking:status", {
      bookingId: booking._id,
      status,
      booking: updatedBooking,
    });

    res.status(200).json({
      message: "Booking status updated",
      booking: updatedBooking,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// GET ALL BOOKINGS (fleet activity feed)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("ambulance")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .limit(15);

    res.status(200).json({
      bookings,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  bookAmbulance,
  getMyBookings,
  getBooking,
  updateBookingStatus,
  getAllBookings,
};