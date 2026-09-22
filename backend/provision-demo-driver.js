// Creates a demo driver account so /api/ambulances/register can be used.
// Safe to re-run — skips the user if the email already exists.
// Run with: node provision-demo-driver.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const DEMO_DRIVER = {
  email: "driver@raksharoute.demo",
  password: "password123",
  name: "Driver Dan",
  phone: "5555555555",
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await User.findOne({ email: DEMO_DRIVER.email });

  if (exists) {
    console.log(`Skip (already exists): ${DEMO_DRIVER.email}`);
  } else {
    await User.create({
      name: DEMO_DRIVER.name,
      email: DEMO_DRIVER.email,
      password: await bcrypt.hash(DEMO_DRIVER.password, 10),
      phone: DEMO_DRIVER.phone,
      role: "driver",
    });
    console.log(
      `Created driver: ${DEMO_DRIVER.email} / ${DEMO_DRIVER.password}`
    );
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});