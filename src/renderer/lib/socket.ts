import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io('https://192.168.1.82:4000', {
      secure: false,
      transports: ['websocket', 'polling'], // Allow fallback to polling
      rejectUnauthorized: false, // This is necessary to bypass SSL certificate validation
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      reconnectionDelay: 1000,
      timeout: 20000, // Increase timeout
      // Add these options to handle SSL errors
      extraHeaders: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      withCredentials: true,
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (error.message.includes('net::ERR_CERT_AUTHORITY_INVALID') || error.message.includes('SSL error code 1')) {
        console.warn('SSL Certificate Error: The server\'s SSL certificate is not trusted or there\'s an SSL handshake failure.');
        // Implement a user-friendly message or error handling here
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      // Implement additional error handling if needed
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Implement reconnection logic if needed
    });
  }
  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};