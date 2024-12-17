import { ipcMain } from 'electron';
import { getSocketInstance, testHttpConnection } from '../lib/socket-manager';
import { IPCRoute } from '../../shared/constants';

export default function () {
  ipcMain.on(IPCRoute.GET_SOCKET_INSTANCE, (event) => {
    const socket = getSocketInstance();
    if (socket) {
      socket.on('connect', () => event.sender.send('socket:connect'));
      socket.on('disconnect', () => event.sender.send('socket:disconnect'));
      // Add any other events you need to forward
    }
  });

  ipcMain.on('socket:emit', (event, eventName, ...args) => {
    const socket = getSocketInstance();
    if (socket) socket.emit(eventName, ...args);
  });

  ipcMain.on('socket:on', (event, eventName) => {
    const socket = getSocketInstance();
    if (socket) {
      socket.on(eventName, (...args: any[]) => {
        event.sender.send('socket:event', eventName, ...args);
      });
    }
  });

  ipcMain.on('socket:off', (event, eventName) => {
    const socket = getSocketInstance();
    if (socket) socket.off(eventName);
  });

  ipcMain.handle(IPCRoute.TEST_SOCKET_URL, async (_, url: string) => {
    return await testHttpConnection(url);
  });
}