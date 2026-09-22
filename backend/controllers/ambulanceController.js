const Ambulance = require("../models/ambulance");

// Register ambulance
const registerAmbulance = async (req, res) => {
  try {
    const {
      vehicleNumber,
      driverName,
      driverPhone,
      type,
      longitude,
      latitude,
    } = req.body;

    if (
      !vehicleNumber ||
      !driverName ||
      !driverPhone ||
      longitude === undefined || longitude === "" ||
      latitude === undefined  || latitude === ""
    ) {
      return res.status(400).json({
        message: "Please provide all required ambulance details",
      });
    }

    const lng = Number(longitude);
    const lat = Number(latitude);
    const normalizedVehicleNumber = String(vehicleNumber).trim().toUpperCase();

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({
        message: "Invalid coordinates",
      });
    }

    // Normalized (uppercase) duplicate check — no regex, no crashes
    const existingAmbulance = await Ambulance.findOne({
      vehicleNumber: normalizedVehicleNumber,
    });

    if (existingAmbulance) {
      return res.status(400).json({
        message: "Ambulance already registered",
      });
    }

    const ambulance = await Ambulance.create({
      vehicleNumber: normalizedVehicleNumber,
      driverName,
      driverPhone,
      type: type || "Basic",
      status: "available",
      driver: req.user._id || req.user.id, // link the driver account

      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
    });

    res.status(201).json({
      message: "Ambulance registered successfully",
      ambulance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Find nearby ambulances
const getNearbyAmbulances = async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    // Clamp invalid/negative distance to the default 10km
    const parsedDistance = Number(req.query.distance);
    const maxDistance =
      Number.isFinite(parsedDistance) && parsedDistance > 0
        ? parsedDistance
        : 10000;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    const ambulances = await Ambulance.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },

          distanceField: "distance",

          maxDistance: maxDistance,

          spherical: true,

          query: {
            status: "available",
          },
        },
      },

      {
        $project: {
          vehicleNumber: 1,
          driverName: 1,
          driverPhone: 1,
          type: 1,
          status: 1,
          location: 1,
          distance: 1,
        },
      },
    ]);

    res.json({
      count: ambulances.length,
      ambulances,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to find nearby ambulances",
      error: error.message,
    });
  }
};

// GET ALL AMBULANCES (fleet view)
const getAllAmbulances = async (req, res) => {
  try {
    const ambulances = await Ambulance.find().sort({ createdAt: -1 });

    res.json({
      ambulances,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// UPDATE AMBULANCE LOCATION (live tracking / simulate)
const updateAmbulanceLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    const ambulance = await Ambulance.findById(req.params.id);

    if (!ambulance) {
      return res.status(404).json({
        message: "Ambulance not found",
      });
    }

    ambulance.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
    };

    await ambulance.save();

    // Broadcast so maps everywhere move live
    const { emit } = require("../config/socket");
    emit("ambulance:location", {
      _id: ambulance._id,
      location: ambulance.location,
    });

    res.status(200).json({
      message: "Location updated",
      ambulance,
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
  registerAmbulance,
  getNearbyAmbulances,
  getAllAmbulances,
  updateAmbulanceLocation,
};