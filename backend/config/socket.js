const { Server } = require("socket.io");

let io = null;

function init(server) {
  if (io) return io;

  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH"] },
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