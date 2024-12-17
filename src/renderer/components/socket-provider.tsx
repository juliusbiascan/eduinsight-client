'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

import { Socket } from 'socket.io-client';
import { initSocket } from '../lib/socket';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  transport: string;
  error: string;
  reconnectAttempts: number;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socketState, setSocketState] = useState<SocketContextType>({
    socket: null,
    isConnected: false,
    transport: "N/A",
    error: "",
    reconnectAttempts: 0,
  });

  useEffect(() => {
    const socketInstance = initSocket();

    function onConnect() {
      console.log('Connected to server');
      setSocketState(prev => ({
        ...prev,
        socket: socketInstance,
        isConnected: true,
        transport: socketInstance.io.engine.transport.name,
        error: "",
        reconnectAttempts: 0,
      }));
    }

    function onDisconnect(reason: string) {
      console.log('Disconnected from server:', reason);
      setSocketState(prev => ({
        ...prev,
        isConnected: false,
        transport: "N/A",
        error: `Disconnected: ${reason}`,
      }));
    }

    function onConnectError(error: Error) {
      console.error('Connection error:', error);
      setSocketState(prev => ({
        ...prev,
        error: error.message,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));

      if (error.message.includes('net::ERR_FAILED')) {
        console.error('WebSocket connection failed. This could be due to network issues, server unavailability, or SSL certificate problems.');
      }

      // Handle other specific errors
      if (error.message.includes('net::ERR_CERT_AUTHORITY_INVALID')) {
        console.error('SSL Certificate Error: The server\'s SSL certificate is not trusted.');
      }
    }

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("connect_error", onConnectError);

    socketInstance.io.engine.on("upgrade", (transport) => {
      setSocketState(prev => ({ ...prev, transport: transport.name }));
    });

    // Attempt to connect if not already connected
    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onConnectError);
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketState}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};