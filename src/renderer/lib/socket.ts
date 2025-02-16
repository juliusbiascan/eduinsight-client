import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;


export const initSocket =  (url: string, isSecure: boolean): Socket => {
  if (!socket) {
    socket = io(url, {
      rejectUnauthorized: isSecure,
      secure: isSecure,
      transports: ['websocket'], // Allow fallback to polling
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