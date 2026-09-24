const express = require("express");

const {
  bookAmbulance,
  getMyBookings,
  getBooking,
  updateBookingStatus,
  getAllBookings
} = require("../controllers/bookingcontroller");

const protect = require("../middleware/authMiddleware");
const { authorize } = protect;

const router = express.Router();

router.post("/", protect, bookAmbulance);

// The fleet-wide activity feed contains other patients' data —
// restrict it to drivers and admins
router.get("/", protect, authorize("admin", "driver"), getAllBookings);

router.get("/my", protect, getMyBookings);

router.get("/:id", protect, getBooking);

router.patch("/:id/status", protect, updateBookingStatus);

module.exports = router;