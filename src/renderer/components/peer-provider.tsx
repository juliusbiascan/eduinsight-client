import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Peer } from 'peerjs';

// Define the context properties
interface PeerContextProps {
  peer: Peer | undefined;
}

// Create the Peer context
const PeerContext = createContext<PeerContextProps>({ peer: undefined });

// Define the provider properties
interface PeerProviderProps {
  userId: string;
  children: React.ReactNode;
}

export const PeerProvider: React.FC<PeerProviderProps> = ({ userId, children }) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const peerRef = useRef<Peer | null>(null);

  // const peerOptions: PeerOptions = {
  //   host: "192.168.1.82",
  //   port: 4000,
  //   path: "/peerjs/peerjs",
  //   secure: true,
  //   key: "jlzk21dev",
  // };

  useEffect(() => {
    if (!peerRef.current) {
      console.log('Initializing PeerJS with options:');
      const peer = new Peer(userId);
      peerRef.current = peer;

      peer.on('open', (id: string) => {
        console.log('PeerJS connection opened with ID:', id);
        setPeer(peer);
      });

      peer.on('connection', (conn) => {
        console.log('PeerJS connection established:', conn);
      });

      peer.on('disconnected', () => {
        console.log('PeerJS connection disconnected');
      });

      peer.on('close', () => {
        console.log('PeerJS connection closed');
      });

      peer.on('error', (error) => {
        console.error('PeerJS Error:', error);
      });
    }

    return () => {
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
        console.log('PeerJS connection destroyed');
      }
    };
  }, [userId]);

  return (
    <PeerContext.Provider value={{ peer }}>
      {children}
    </PeerContext.Provider>
  );
};

// Custom hook to use the Peer context
export const usePeer = (): PeerContextProps => {
  return useContext(PeerContext);
};
