import { io } from 'socket.io-client';

// Production server URL (Render.com) or VITE_SERVER_URL env or local proxy
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? 'https://auction-server-bqvr.onrender.com' : '/');

export const socket = io(SERVER_URL, {
  autoConnect: false,
});

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}
