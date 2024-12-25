/**
 * @file index.ts
 * @description Main entry point for the EduInsight Client application.
 */

import { app, BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron';
import { Database, WindowManager } from './lib';
import * as IPCHandlers from './handlers';
import {
  createSocketConnection,
  isSocketConnected,
  getConnectionStatus,
  disconnectSocket,
  removeAllListeners,
  testHttpConnection,
} from './lib/socket-manager';
import * as robot from '@jitsi/robotjs';
import { IPCRoute } from '@/shared/constants';
import StoreManager from '@/main/lib/store';
import Store from 'electron-store';
import { Socket } from 'socket.io-client';
import { sleep } from '@/shared/utils';
import { startMonitoring } from './lib/monitoring';
import shutdownCommand from 'electron-shutdown-command';
import { createTray } from './lib/tray-menu';
import path from 'path';

const store = StoreManager.getInstance();
const deviceId = store.get('deviceId') as string;
const labId = store.get('labId') as string;
const connectionUrl = store.get('socketUrl') as string;
const databaseUrl = store.get('databaseUrl') as string;

function setupSocketEventListeners(socket: Socket) {
  let captureInterval: NodeJS.Timeout | null = null;

  console.log('Setting up socket event listeners', {
    connectionUrl,
    databaseUrl,
    deviceId: store.get('deviceId'),
    labId: store.get('labId'),
    userId: store.get('userId'),
  });

  socket
    .on('start_sharing', () => {
      console.log('Starting screen sharing for device:', deviceId);
      if (captureInterval) clearInterval(captureInterval);
      captureInterval = setInterval(() => {
        desktopCapturer
          .getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 },
          })
          .then((sources) => {
            const base64 = sources[0].thumbnail.toDataURL();
            socket.emit('screen-share', { deviceId, screenData: base64 });
          })
          .catch((error) => console.error('Error capturing screen:', error));
      }, 1000);
    })
    .on('stop_sharing', () => {
      console.log('Stop sharing event received');
      if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
      }
    })
    .on('mouse_move', ({ clientX, clientY, clientWidth, clientHeight }) => {
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      robot.moveMouse(
        (clientX * width) / clientWidth,
        (clientY * height) / clientHeight,
      );
    })
    .on('mouse_click', (data) => {
      if (data) robot.mouseClick(data.button, data.double);
    })
    .on('shutdown', ({ deviceId }) => {
      if (deviceId === deviceId) {
        shutdownCommand.shutdown();
      }
    })
    .on('logoff', ({ deviceId }) => {
      if (deviceId === deviceId) {
        shutdownCommand.logoff();
      }
    })
    .on('reboot', ({ deviceId: string }) => {
      if (deviceId === string) {
        shutdownCommand.reboot();
      }
    })
    .on('mouse_scroll', ({ deltaX, deltaY }) =>
      robot.scrollMouse(deltaX, deltaY),
    )
    .on(
      'mouse_drag',
      ({ direction, clientX, clientY, clientWidth, clientHeight }) => {
        let mouseDirection: string | null = null;
        if (direction !== mouseDirection) {
          mouseDirection = direction;
          robot.mouseToggle(direction);
        }
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        robot.dragMouse(
          (clientX * width) / clientWidth,
          (clientY * height) / clientHeight,
        );
      },
    )
    .on('keyboard', (keys) => {
      try {
        if (
          keys[1].length > 0 &&
          keys[0].toLowerCase() !== keys[1][0].toLowerCase()
        ) {
          robot.keyToggle(keys[0], 'down', keys[1]);
          robot.keyToggle(keys[0], 'up', keys[1]);
        } else if (keys[1].length === 0) {
          robot.keyTap(keys[0]);
        }
      } catch (e) {
        console.error('Error processing keyboard event:', e);
      }
    })
    .on('error', (error) => console.error('Socket error:', error))
    .on('disconnect', (reason) =>
      console.log('Disconnected from server:', reason),
    )
    .on('connect_error', (error) => console.log('Connect error:', error))
    .on('connect_timeout', (error) => console.log('Connect timeout:', error));

  const handleDevice = () => {
    if (!deviceId || !labId) {
      const window = WindowManager.get(
        WindowManager.WINDOW_CONFIGS.setup_window.id,
      );
      sleep(2000).then(() => window.webContents.send('mode', 'setup-device'));
    } else {
      WindowManager.get(WindowManager.WINDOW_CONFIGS.splash_window.id);
    }
  };

  if (databaseUrl) {
    Database.connect(databaseUrl)
      .then(() => handleDevice())
      .catch((error) => {
        const window = WindowManager.get(
          WindowManager.WINDOW_CONFIGS.setup_window.id,
        );
        sleep(2000).then(() => {
          window.webContents.send('mode', 'setup-db');
          window.webContents.send('mode', error);
        });
      });
  } else {
    const window = WindowManager.get(
      WindowManager.WINDOW_CONFIGS.setup_window.id,
    );
    sleep(2000).then(() => window.webContents.send('mode', 'setup-db'));
  }

  ipcMain.on(IPCRoute.DATABASE_INITIALIZE, () => handleDevice());

  ipcMain.on(IPCRoute.DEVICE_INITIATED, async () => {
    async function initializeDevice() {
      try {
        const device = await Database.prisma.device.findFirst({
          where: { id: deviceId },
        });

        if (!device) {
          const window = WindowManager.get(
            WindowManager.WINDOW_CONFIGS.setup_window.id,
          );
          sleep(2000).then(() =>
            window.webContents.send('mode', 'device-setup'),
          );
        }

        socket.emit('join-server', device.id);
        const activeUser = await Database.prisma.activeDeviceUser.findFirst({
          where: { deviceId: device.id },
        });

        if (activeUser) {
          store.set('userId', activeUser.userId);
          startMonitoring(activeUser.userId, device.id, labId);
          createTray(path.join(__dirname, 'img/tray-icon.ico'));
          WindowManager.get(WindowManager.WINDOW_CONFIGS.welcome_window.id);
          WindowManager.get(
            WindowManager.WINDOW_CONFIGS.main_window.id,
          ).close();
        } else {
          store.delete('userId');
          WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);
        }
      } catch (error) {
        console.error('Error in device initialization:', error);
      }
    }

    initializeDevice();
    setInterval(() => {
      const id = WindowManager.WINDOW_CONFIGS.main_window.id;
      const status = getConnectionStatus();
      const window = WindowManager.getWindow(id);
      if (window) {
        window.webContents.send(IPCRoute.CONNECTION_STATUS_UPDATE, status);
      }
    }, 1000);
  });
}

function handleOnReady() {
  Object.values(IPCHandlers).forEach((handler) => handler());
  Store.initRenderer();
  console.log('App User Data:', app.getPath('userData'));

  if (connectionUrl) {
    testHttpConnection(connectionUrl)
      .then((isReachable) =>
        isReachable
          ? createSocketConnection(connectionUrl)
          : Promise.reject('Server is not reachable'),
      )
      .then((socket) => {
        if (isSocketConnected()) setupSocketEventListeners(socket);
      })
      .catch((error) => {
        console.error('Failed to create socket connection:', error);
        WindowManager.get(WindowManager.WINDOW_CONFIGS.setup_window.id);
      });
  } else {
    WindowManager.get(WindowManager.WINDOW_CONFIGS.setup_window.id);
  }

  ipcMain.handle(IPCRoute.UPDATE_SOCKET_URL, async (_event, newUrl: string) => {
    await disconnectSocket();
    removeAllListeners();
    try {
      const socket = await createSocketConnection(newUrl);
      setupSocketEventListeners(socket);
      return getConnectionStatus();
    } catch (error) {
      console.error('Failed to update socket URL:', error);
      return 'failed';
    }
  });
}

(async () => {
  if (require('electron-squirrel-startup')) {
    app.quit();
    return;
  }

  // This line configures the app to start automatically on system login
  // It sets the 'openAtLogin' setting to true if the app is not running in development mode
  // This ensures that the app starts automatically when the user logs in, but only in production
  app.setLoginItemSettings({ openAtLogin: true });
  // SSL/TSL: this is the self signed certificate support
  app.on(
    'certificate-error',
    (event, webContents, url, error, certificate, callback) => {
      // On certificate error we disable default behaviour (stop loading the page)
      // and we then say "it is all fine - true" to the callback
      event.preventDefault();
      callback(true);
    },
  );
  app.on('ready', handleOnReady);
  app.on('window-all-closed', () => {
    if (!store.get('deviceId')) app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);
    }
  });
})();
