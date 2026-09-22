// Seeds demo ambulances near Chandigarh so "Find Nearby Ambulance" has data.
// Safe to re-run — skips vehicle numbers that already exist.
// Run with: node seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const Ambulance = require("./models/ambulance");

const DEMO_AMBULANCES = [
  { vehicleNumber: "CH-01-AB-1234", driverName: "Raj Kumar", driverPhone: "9812345678", type: "Basic", lat: 30.7333, lng: 76.7794 },
  { vehicleNumber: "CH-02-AB-5678", driverName: "Aman Singh", driverPhone: "9812345098", type: "Advanced", lat: 30.7218, lng: 76.8019 },
  { vehicleNumber: "CH-03-AB-9012", driverName: "Naveen Sharma", driverPhone: "9812345566", type: "ICU", lat: 30.7455, lng: 76.7577 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  let created = 0;

  for (const a of DEMO_AMBULANCES) {
    const exists = await Ambulance.findOne({ vehicleNumber: a.vehicleNumber });

    if (exists) {
      console.log(`Skip (already exists): ${a.vehicleNumber}`);
      continue;
    }

    await Ambulance.create({
      vehicleNumber: a.vehicleNumber,
      driverName: a.driverName,
      driverPhone: a.driverPhone,
      type: a.type,
      status: "available",
      location: { type: "Point", coordinates: [a.lng, a.lat] },
    });

    created++;
    console.log(`Created: ${a.vehicleNumber} (${a.type})`);
  }

  await mongoose.disconnect();
  console.log(`Done. ${created} ambulance(s) added.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});