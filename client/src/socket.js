import { io } from 'socket.io-client';

// Production server URL (Render.com) or VITE_SERVER_URL env or local proxy
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? 'https://auction-server-bqvr.onrender.com' : '/');

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 3000,
  timeout: 20000,
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
