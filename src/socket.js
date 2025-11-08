import { io } from "socket.io-client";

export let socket = null;

export const initSocket = () => {
  const token = sessionStorage.getItem("token");

  if (!token) {
    console.error("❌ No token found — cannot connect to socket");
    return null;
  }

  socket = io("http://localhost:5000", {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    auth: { token },
  });

  socket.on("connect", () => {
    console.log(" Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn(" Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error(" Socket connection error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log("🔌 Socket disconnected manually");
  }
};

export default { initSocket, getSocket, disconnectSocket };
