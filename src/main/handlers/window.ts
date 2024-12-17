/**
 * BrowserWindow IPC handlers.
 *
 * @module
 */
import { ipcMain, screen } from 'electron';
import { WindowManager } from '../lib';
import { IPCRoute, WindowIdentifier } from '@/shared/constants';

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
    const windowBounds = mainWindow.getBounds();
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;

    // Position window in the bottom-right corner of the screen
    const x = workAreaSize.width - windowBounds.width - 10;
    const y = workAreaSize.height - windowBounds.height - 10;

    mainWindow.webContents.reload();
    mainWindow.setPosition(x, y, false);
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
}