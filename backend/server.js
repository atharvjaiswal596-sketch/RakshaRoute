const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const { getCorsOrigins } = require("./config/cors");

const app = express();

app.use(cors({
  origin: getCorsOrigins(),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Lightweight health check that does not depend on Mongo, so Render can
// verify the process is listening even while the DB connects in the background.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
const authRoutes = require("./routes/authRoutes");
const ambulanceRoutes = require("./routes/ambulanceRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/bookings", bookingRoutes);

app.get("/", (req, res) => {
  res.json({ message: "RakshaRoute API is running" });
});

// Only listen when run directly (node server.js). When required as a
// module (e.g. Vercel serverless entrypoint) we just export the app.
if (require.main === module) {
  // Start listening immediately so a slow/failed Mongo connection can no
  // longer keep the port unbound (which previously surfaced as 404/no-server
  // on Render and "CORS error" in the browser). DB + Socket.IO come after.
  const port = process.env.PORT || 5001;
  const server = http.createServer(app);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB Connected Successfully 🚀");

      const { init } = require("./config/socket");
      init(server);
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });
}

module.exports = app;