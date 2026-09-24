import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    // Same-origin in production (rewritten to the backend service);
    // proxied by Vite in dev. Override with VITE_SOCKET_URL if needed.
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      auth: { token: localStorage.getItem("raksharoute_token") || "" },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

// Subscribe to a live event; returns an unsubscribe function
export function onLive(event, handler) {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}

export function connectSocket() {
  return getSocket();
}

export function disconnectSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
