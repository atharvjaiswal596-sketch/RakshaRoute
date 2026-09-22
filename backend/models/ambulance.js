const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
    },

    driverName: {
      type: String,
      required: true,
    },

    driverPhone: {
      type: String,
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    type: {
      type: String,
      enum: ["Basic", "Advanced", "ICU"],
      default: "Basic",
    },

    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

ambulanceSchema.index({
  location: "2dsphere",
});

module.exports = mongoose.model("Ambulance", ambulanceSchema);