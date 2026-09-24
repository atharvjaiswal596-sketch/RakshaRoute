const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { getCorsOrigins } = require("./cors");

let io = null;

function init(server) {
  if (io) return io;

  io = new Server(server, {
    cors: { origin: getCorsOrigins(), methods: ["GET", "POST", "PATCH"] },
  });

  // Require a valid JWT before allowing a live connection,
  // otherwise anyone could eavesdrop on all trip broadcasts
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) return next(new Error("Unauthorized: no token"));

    try {
      jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Unauthorized: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("⚡ client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("✖ client disconnected:", socket.id);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emit(event, payload) {
  if (io) io.emit(event, payload);
}

module.exports = { init, getIO, emit };