import { io } from 'socket.io-client';

// In dev, use Vite proxy (relative URL). In production, point to the same origin.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '/';

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
