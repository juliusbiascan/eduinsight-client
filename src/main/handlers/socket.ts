import { ipcMain } from 'electron';
import { testHttpConnection } from '../lib/socket-manager';
import { IPCRoute } from '../../shared/constants';

export default function () {

  ipcMain.handle(IPCRoute.TEST_SOCKET_URL, async (_, url: string) => {
    return await testHttpConnection(url);
  });
}