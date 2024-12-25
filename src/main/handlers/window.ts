/**
 * BrowserWindow IPC handlers.
 *
 * @module
 */
import { ipcMain , shell} from 'electron';
import { WindowManager } from '../lib';
import { IPCRoute, WindowIdentifier } from '@/shared/constants';
import { createTray, removeTray } from '../lib/tray-menu';
import path from 'path';

/**
 * Register the IPC event handlers.
 *
 * @function
 */
export default function () {

  ipcMain.on(IPCRoute.WINDOW_OPEN_SETUP, (_, data) => {
    const setupWindow = WindowManager.get(WindowIdentifier.Setup);
    setupWindow.on('ready-to-show', () => {
      setupWindow.webContents.send("mode", data);
    });
  });
  ipcMain.on(IPCRoute.WINDOW_CLOSE, (_, id) => WindowManager.get(id).close());

  ipcMain.on(IPCRoute.WINDOW_HIDE, (_, id) => WindowManager.get(id).hide());
  
  ipcMain.on(IPCRoute.WINDOW_OPEN, (_, id) => WindowManager.get(id));
  
  ipcMain.on(IPCRoute.WINDOW_OPEN_IN_TRAY, (_, id) => {

    const mainWindow = WindowManager.get(id)
    mainWindow.webContents.reload();
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();

  });

  ipcMain.on(IPCRoute.WINDOW_SEND, (_, id: string, data) => {
    WindowManager.get(id).webContents.send(IPCRoute.WINDOW_SEND, data);
  });

  ipcMain.on(IPCRoute.WINDOW_CLOSE_SETUP, () => {
    const setupWindow = WindowManager.get(WindowIdentifier.Setup);
    if (setupWindow) {
      setupWindow.removeAllListeners('close');
      setupWindow.close();
    }
  });

  ipcMain.on(IPCRoute.WINDOW_CREATE_TRAY, (_) => createTray(path.join(__dirname, 'img/tray-icon.ico')));
  ipcMain.on(IPCRoute.WINDOW_REMOVE_TRAY, (_) => removeTray());
  ipcMain.on(IPCRoute.OPEN_EXTERNAL_LINK, (_, url) => {
    shell.openExternal(url);
   });
}