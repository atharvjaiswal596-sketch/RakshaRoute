// End-to-end verification of RakshaRoute API fixes.
// Uses global fetch (Node 22). Run from backend/ with the server running on :5001.
const BASE = "http://localhost:5001/api";

let passed = 0;
let failed = 0;

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const R = (n) => `test_${Date.now()}_${n}@raksharoute.test`;

async function main() {
  const emailA = R("a");
  const emailB = R("b");
  const pw = "password123";

  console.log("\n── 1. Registration / auth ───────────────────────────");
  let r = await req("POST", "/auth/register", { body: { name: "Alice", email: emailA, password: pw, phone: "1111111111" } });
  check("register user A -> 201", r.status === 201);
  const idA = r.data?.user?.id;

  r = await req("POST", "/auth/register", { body: { name: "Bob", email: emailB, password: pw, phone: "2222222222" } });
  check("register user B -> 201", r.status === 201);

  r = await req("POST", "/auth/register", { body: { name: "Alice2", email: emailA, password: pw, phone: "3333333333" } });
  check("duplicate email -> 400", r.status === 400);

  r = await req("POST", "/auth/register", { body: { name: "Eve", email: R("eve"), password: pw, role: "admin", phone: "4444444444" } });
  check("requested role 'admin' is forced to 'patient'", r.status === 201 && r.data?.user?.role === "patient");
  const idEve = r.data?.user?.id;

  r = await req("POST", "/auth/login", { body: { email: emailA, password: pw } });
  check("login A -> 200", r.status === 200);
  const tokenA = r.data?.token;

  r = await req("POST", "/auth/login", { body: { email: emailB, password: pw } });
  const tokenB = r.data?.token;

  r = await req("POST", "/auth/login", { body: { email: emailB, password: "wrong" } });
  check("login wrong password -> 400", r.status === 400);

  console.log("\n── 2. Nearby ambulance search ────────────────────────");
  r = await req("GET", "/ambulances/nearby");
  check("nearby without coords -> 400", r.status === 400);

  r = await req("GET", "/ambulances/nearby?latitude=30.7333&longitude=76.7794&distance=50000");
  check("nearby with coords -> 200", r.status === 200);
  check("seeded ambulances returned", Array.isArray(r.data?.ambulances) && r.data.ambulances.length > 0);

  r = await req("GET", "/ambulances/nearby?latitude=30.7333&longitude=76.7794&distance=50000");
  check("nearby includes ETA", (r.data?.ambulances || []).some((a) => a.etaMinutes > 0));
  check("ETA source is road/estimated", (r.data?.ambulances || []).every((a) => !a.etaMinutes || ["road", "estimated"].includes(a.etaSource)));

  r = await req("GET", "/ambulances/nearby?latitude=30.7333&longitude=76.7794&distance=-5");
  check("negative distance is clamped -> 200", r.status === 200);

  console.log("\n── 3. Ambulance registration authorization ───────────");
  r = await req("POST", "/ambulances/register", { body: {} });
  check("register ambulance unauth -> 401", r.status === 401);

  r = await req("POST", "/ambulances/register", {
    token: tokenA,
    body: { vehicleNumber: "CH-99-XY-9999", driverName: "Hacker", driverPhone: "9999999999", longitude: 76.77, latitude: 30.73 },
  });
  check("patient cannot register ambulance -> 403", r.status === 403);

  console.log("\n── 4. Driver flow (driver provisioned server-side) ───");
  // Simulate an admin creating a driver account directly in the DB.
  const { default: mongoose } = await import("mongoose");
  const bcrypt = (await import("bcryptjs")).default;
  require("dotenv").config();
  await mongoose.connect(process.env.MONGO_URI);
  const User = require("./models/User");
  const emailD = R("driver");
  const veh = `CH-${String(Date.now()).slice(-5)}-AB-4321`;
  const driver = await User.create({
    name: "Driver Dan",
    email: emailD,
    password: await bcrypt.hash(pw, 10),
    phone: "5555555555",
    role: "driver",
  });
  console.log(`  (provisioned driver ${driver._id} in DB)`);

  r = await req("POST", "/auth/login", { body: { email: emailD, password: pw } });
  const tokenD = r.data?.token;
  check("driver login -> 200", r.status === 200);

  r = await req("POST", "/ambulances/register", {
    token: tokenD,
    body: { vehicleNumber: veh, driverName: "Driver Dan", driverPhone: "5555555555", longitude: 76.75, latitude: 30.72 },
  });
  check("driver registers ambulance -> 201", r.status === 201);
  const ambId = r.data?.ambulance?._id;
  check("ambulance linked to driver account", r.data?.ambulance?.driver?.toString() === String(driver._id));

  r = await req("POST", "/ambulances/register", {
    token: tokenD,
    body: { vehicleNumber: veh.toLowerCase(), driverName: "Driver Dan", driverPhone: "5555555555", longitude: 76.75, latitude: 30.72 },
  });
  check("duplicate vehicleNumber (case-insensitive) -> 400", r.status === 400);

  r = await req("POST", "/ambulances/register", {
    token: tokenD,
    body: { vehicleNumber: "CH-78-AB-0001", driverName: "Bad", driverPhone: "1", longitude: "not-a-number", latitude: 30.72 },
  });
  check("NaN coordinates rejected -> 400", r.status === 400);

  console.log("\n── 5. Booking flow ───────────────────────────────────");
  r = await req("POST", "/bookings", {
    token: tokenA,
    body: { ambulanceId: ambId, latitude: 30.7333, longitude: 76.7794, destination: "PGI Chandigarh", patientName: "Alice", patientPhone: "1111111111" },
  });
  check("book ambulance -> 201", r.status === 201);
  check("confirmation includes ETA", r.data?.booking?.etaMinutes > 0);

  r = await req("POST", "/bookings", {
    token: tokenA,
    body: { ambulanceId: ambId, latitude: "bad", longitude: 76.7794, destination: "X", patientName: "A", patientPhone: "1" },
  });
  check("booking with NaN coords -> 400", r.status === 400);

  r = await req("POST", "/bookings", {
    token: tokenB,
    body: { ambulanceId: ambId, latitude: 30.73, longitude: 76.77, destination: "GMCH", patientName: "Bob", patientPhone: "2222222222" },
  });
  check("booking already-busy ambulance (race fix) -> 400", r.status === 400);

  r = await req("POST", "/bookings", {
    token: tokenA,
    body: { ambulanceId: "not-an-objectid", latitude: 30.73, longitude: 76.77, destination: "X", patientName: "A", patientPhone: "1" },
  });
  check("booking with invalid ambulance id -> handled (400/404)", r.status === 400 || r.status === 404);

  r = await req("GET", "/bookings/my", { token: tokenA });
  check("A's bookings -> 200", r.status === 200);
  let bookingId = r.data?.bookings?.[0]?._id;
  check("A has >= 1 booking", !!bookingId);

  console.log("\n── 6. Booking authorization (IDOR) ───────────────────");
  r = await req("GET", `/bookings/${bookingId}`, { token: tokenB });
  check("B cannot view A's booking -> 403", r.status === 403);

  r = await req("GET", `/bookings/${bookingId}`, { token: tokenA });
  check("owner views own booking -> 200", r.status === 200);
  check("booking detail includes ETA", r.data?.booking?.etaMinutes > 0);

  r = await req("GET", `/ambulances/${ambId}/eta?lat=30.7333&lng=76.7794`, { token: tokenA });
  check("ambulance ETA endpoint -> 200 with minutes", r.status === 200 && r.data?.eta?.minutes > 0);

  r = await req("GET", "/bookings/not-an-objectid", { token: tokenA });
  check("invalid booking id -> 400", r.status === 400);

  r = await req("GET", `/bookings/${bookingId}`, { token: tokenA });
  check("A's booking status is confirmed", r.data?.booking?.status === "confirmed");

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenB, body: { status: "completed" } });
  check("B cannot change A's booking status -> 403", r.status === 403);

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenA, body: { status: "ranting" } });
  check("invalid status value -> 400", r.status === 400);

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenA, body: { status: "ongoing" } });
  check("owner cannot start the trip (only cancel) -> 403", r.status === 403);

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenD, body: { status: "ongoing" } });
  check("assigned driver sets ongoing -> 200", r.status === 200);

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenA, body: { status: "completed" } });
  check("owner cannot complete (only cancel) -> 403", r.status === 403);

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenD, body: { status: "completed" } });
  check("assigned driver completes trip -> 200", r.status === 200);

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenA, body: { status: "cancelled" } });
  check("cannot cancel a completed trip -> 400", r.status === 400);

  // Book again to restore an active booking, then test owner cancel
  r = await req("POST", "/bookings", {
    token: tokenA,
    body: { ambulanceId: ambId, latitude: 30.7333, longitude: 76.7794, destination: "PGI Chandigarh", patientName: "Alice", patientPhone: "1111111111" },
  });
  check("re-book after completion -> 201", r.status === 201);

  r = await req("GET", "/bookings/my", { token: tokenA });
  bookingId = r.data?.bookings?.[0]?._id;

  r = await req("PATCH", `/bookings/${bookingId}/status`, { token: tokenA, body: { status: "cancelled" } });
  check("owner cancels own booking -> 200", r.status === 200);

  // Ambulance should be free again after cancellation
  r = await req("GET", "/ambulances/nearby?latitude=30.7333&longitude=76.7794&distance=50000");
  const freed = (r.data?.ambulances || []).some((a) => a._id === ambId);
  check("ambulance is available again after cancel", freed === true);

  console.log("\n── 7. Deleted user token rejected ────────────────────");
  const jwt = require("jsonwebtoken");
  // Eve still exists in the DB at this point — sign a valid token for her.
  const eveToken = jwt.sign({ id: idEve, role: "patient" }, process.env.JWT_SECRET, { expiresIn: "7d" });

  r = await req("GET", "/bookings/my", { token: eveToken });
  check("valid token for existing user works -> 200", r.status === 200);

  await mongoose.model("User").findByIdAndDelete(idEve);
  r = await req("GET", "/bookings/my", { token: eveToken });
  check("deleted user's token rejected -> 401", r.status === 401);

  // ---- Clean up all test data from the shared DB ----
  const Booking = require("./models/booking");
  const Ambulance = require("./models/ambulance");
  await Booking.deleteMany({ user: { $in: [idA, driver._id] } });
  await Ambulance.deleteMany({ vehicleNumber: new RegExp(veh, "i") });
  await User.deleteMany({ email: { $in: [emailA, emailB, emailD] } });
  console.log("  (cleaned up test users, booking and ambulance)");

  await mongoose.disconnect();

  console.log("\n────────────────────────────────────────────");
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("Verification script error:", e);
  process.exit(1);
});