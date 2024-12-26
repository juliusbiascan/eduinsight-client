import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (url: string): Socket => {
  if (!socket) {
    
    socket = io(url, {
      transports: ['websocket', 'polling'], // Allow fallback to polling
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      reconnectionDelay: 1000,
      timeout: 20000, // Increase timeout
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }
  return socket;
};