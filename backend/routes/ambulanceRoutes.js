const express = require("express");

const {
  registerAmbulance,
  getNearbyAmbulances,
  getAllAmbulances,
  updateAmbulanceLocation,
} = require("../controllers/ambulanceController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", protect, registerAmbulance);

router.get("/", protect, getAllAmbulances);

router.get("/nearby", getNearbyAmbulances);

router.patch("/:id/location", protect, updateAmbulanceLocation);

module.exports = router;