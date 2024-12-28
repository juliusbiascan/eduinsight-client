import { Socket, io } from "socket.io-client";
import StoreManager from '@/main/lib/store';
import http from 'http';
import https from 'https';
import { app } from 'electron';

let socketInstance: Socket | null = null;

export function createSocketConnection(url?: string): Promise<Socket> {

  return new Promise((resolve, reject) => {
    if (socketInstance) {
      socketInstance.disconnect();
    }

    const store = StoreManager.getInstance();
    const savedUrl = store.get('socketUrl') as string;
    const socketUrl = url || savedUrl;

    socketInstance = io(socketUrl, {
      rejectUnauthorized: false,
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      reconnection: true,
      reconnectionAttempts: Infinity, // Changed from 5 to Infinity
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      extraHeaders: {
        'User-Agent': `EduInsight Client ${app.getVersion()}`
      }
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      store.set('socketUrl', socketUrl);
      resolve(socketInstance);
    });

    socketInstance.on('connect_error', (error) => {
      if (error.message.includes('xhr poll error')) {
        socketInstance.io.opts.transports = ['polling'];
      }
      reject(error);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  });
}

export function getSocketInstance(): Socket | null {
  return socketInstance;
}


export function disconnectSocket(): void {
  if (socketInstance) {
    console.log('Disconnecting socket');
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function testHttpConnection(url: string): Promise<boolean> {
  console.log('Testing Socket.IO connection to:', url);
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: '/socket.io/?EIO=4&transport=polling',
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 5000, // Add a timeout
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Socket.IO test response status:', res.statusCode);
        console.log('Socket.IO test response data:', data);

        // Check if the response contains a valid Socket.IO handshake
        const isValidResponse = data.startsWith('0{') && data.includes('"sid":');

        resolve(res.statusCode === 200 && isValidResponse);
      });
    });

    req.on('error', (error) => {
      console.error('Socket.IO test error:', error);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('Socket.IO test timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}