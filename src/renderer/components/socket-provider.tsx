import React, { createContext, useContext, useEffect, useState } from 'react';
import { initSocket } from '../lib/socket';
import { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  transport: string;
  error: string;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {

  const [socketUrl, setSocketUrl] = useState<string>('');
  const [connectionMode, setConnectionMode] = useState<string>('');

  const [socketState, setSocketState] = useState<SocketContextType>({
    socket: null,
    isConnected: false,
    transport: "N/A",
    error: "",
  });

  useEffect(() => {
    const fetchSocketUrl = async () => {
      const socketUrl = await api.store.get('socketUrl');
      const savedData = await api.store.get('deviceSetupData') as any;
      if (!savedData) {
        throw new Error('Device setup data not found');
      }

      const connectionMode = savedData.connectionMode;

      if (!socketUrl) {
        throw new Error('Socket URL not found');
      }

      if (!connectionMode) {
        throw new Error('Connection mode not found');
      }

      setConnectionMode(connectionMode);
      setSocketUrl(socketUrl);
    };
    fetchSocketUrl();
  }, []);

  useEffect(() => {

    if (!socketUrl) {
      return;
    }

    console.log('Connecting to server:', socketUrl);



    const socketInstance = initSocket(socketUrl, connectionMode === 'REMOTE');

    function onConnect() {
      console.log('Connected to server');
      setSocketState(prev => ({
        ...prev,
        socket: socketInstance,
        isConnected: true,
        transport: socketInstance.io.engine.transport.name,
      }));
    }

    function onDisconnect(reason: string) {
      console.log('Disconnected from server:', reason);
      setSocketState(prev => ({
        ...prev,
        isConnected: false,
        transport: "N/A",
      }));
    }

    function onConnectError(error: Error) {
      console.error('Connection error:', error);
      setSocketState(prev => ({ ...prev, error: error.message }));
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
  }, [socketUrl]);

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