/**
 * @file index.ts
 * @description Main entry point for the EduInsight Client application.
 */

import { app, BrowserWindow, desktopCapturer, ipcMain, shell } from 'electron';
import { Database, WindowManager } from './lib';
import * as IPCHandlers from './handlers';
import {
  createSocketConnection,
  disconnectSocket,
  testHttpConnection,
} from './lib/socket-manager';
import { IPCRoute, WindowIdentifier } from '@/shared/constants';
import StoreManager from '@/main/lib/store';
import Store from 'electron-store';
import { Socket } from 'socket.io-client';
import { sleep } from '@/shared/utils';
import { startMonitoring } from './lib/monitoring';
import { createTray } from './lib/tray-menu';
import fs, { writeFile } from 'fs';
import path from 'path';
//import { createCanvas, loadImage } from 'canvas';

const store = StoreManager.getInstance();
const deviceId = store.get('deviceId') as string;
const labId = store.get('labId') as string;
const connectionUrl = store.get('socketUrl') as string;
const databaseUrl = store.get('databaseUrl') as string;

function setupSocketEventListeners(socket: Socket) {
  console.log('Setting up socket event listeners', {
    connectionUrl,
    databaseUrl,
    deviceId: store.get('deviceId'),
    labId: store.get('labId'),
    userId: store.get('userId'),
  });
  let captureInterval: NodeJS.Timeout | null = null;
  const fileChunks: Record<string, { chunks: string[]; totalChunks: number }> =
    {};

  socket.on('start-live-quiz', ({ quizId }) => {
    const quiz = WindowManager.get(WindowIdentifier.QuizPlayer);
    quiz.on('ready-to-show', () => {
      quiz.webContents.send(IPCRoute.QUIZ_GET_QUIZ_ID, quizId);
    });
  });

  socket.on('launch-webpage', ({ url }) => {
    shell.openExternal(url);
  });

  socket.on(
    'upload-file-chunk',
    ({ chunk, filename, subjectName, chunkIndex, totalChunks }) => {
      if (!fileChunks[filename]) {
        fileChunks[filename] = { chunks: [], totalChunks };
      }
      fileChunks[filename].chunks[chunkIndex] = chunk;

      if (fileChunks[filename].chunks.filter(Boolean).length === totalChunks) {
        const fileContent = fileChunks[filename].chunks.join('');
        const buffer = Buffer.from(fileContent, 'base64');
        const subjectFolderPath = path.join(
          app.getPath('downloads'),
          subjectName,
        );
        if (!fs.existsSync(subjectFolderPath)) {
          fs.mkdirSync(subjectFolderPath);
        }
        writeFile(path.join(subjectFolderPath, filename), buffer, (err) => {
          if (err) {
            console.error('Failed to save file:', err);
          }
        });
        delete fileChunks[filename];
      }
    },
  );

  socket.on('show-screen', ({ _deviceId, userId, subjectId }) => {
    if (captureInterval) clearInterval(captureInterval);

    captureInterval = setInterval(() => {
      desktopCapturer
        .getSources({
          types: ['screen'],
          thumbnailSize: { width: 1280, height: 720 },
        })
        .then(async (sources) => {
          socket.emit('screen-data', {
            userId,
            subjectId,
            screenData: sources[0].thumbnail.toDataURL(),
          });
        })
        .catch((error) => console.error('Error capturing screen:', error));
    }, 100);
  });

  socket.on('hide-screen', () => {
    console.log('Stop sharing event received');
    if (captureInterval) {
      clearInterval(captureInterval);
      captureInterval = null;
    }
  });

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
  });
}

function handleOnReady() {
  Object.values(IPCHandlers).forEach((handler) => handler());
  Store.initRenderer();

  if (connectionUrl) {
    testHttpConnection(connectionUrl)
      .then((isReachable) =>
        isReachable
          ? createSocketConnection(connectionUrl)
          : Promise.reject('Server is not reachable'),
      )
      .then((socket) => {
        setupSocketEventListeners(socket);
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

    try {
      const socket = await createSocketConnection(newUrl);
      setupSocketEventListeners(socket);
      return 'connected';
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
  // Ignore Chromium selfsigned warning errors
  app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

  app.on('ready', () => {
    desktopCapturer
      .getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      })
      .then(async (sources) => {
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sources[0].id,
            },
          },
        });

       console.log('stream:', stream);
      })
      .catch((error) => console.error('Error capturing screen:', error));
    handleOnReady();
  });
  app.on('window-all-closed', () => {
    if (!store.get('deviceId')) app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);
    }
  });
})();
