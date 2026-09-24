const express = require("express");

const {
  registerAmbulance,
  getNearbyAmbulances,
  getAllAmbulances,
  updateAmbulanceLocation,
  getAmbulanceEta,
} = require("../controllers/ambulanceController");

const protect = require("../middleware/authMiddleware");
const { authorize } = protect;

const router = express.Router();

// Only drivers and admins may register an ambulance
router.post("/register", protect, authorize("driver", "admin"), registerAmbulance);

router.get("/", protect, getAllAmbulances);

router.get("/nearby", getNearbyAmbulances);

router.get("/:id/eta", protect, getAmbulanceEta);

router.patch("/:id/location", protect, updateAmbulanceLocation);

module.exports = router;