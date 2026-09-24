const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());

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

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully 🚀");

    const { init } = require("./config/socket");
    const server = http.createServer(app);
    init(server);

    // Only listen when run directly (node server.js). When required as a
    // module (e.g. Vercel serverless entrypoint) we just export the app.
    if (require.main === module) {
      // Render injects PORT (e.g. 10000); default to 5001 for local dev
      const port = process.env.PORT || 5001;
      server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
      });
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

module.exports = app;
