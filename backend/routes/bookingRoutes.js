const express = require("express");

const {
  bookAmbulance,
  getMyBookings,
  getBooking,
  updateBookingStatus,
  getAllBookings
} = require("../controllers/bookingcontroller");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, bookAmbulance);

router.get("/", protect, getAllBookings);

router.get("/my", protect, getMyBookings);

router.get("/:id", protect, getBooking);

router.patch("/:id/status", protect, updateBookingStatus);

module.exports = router;