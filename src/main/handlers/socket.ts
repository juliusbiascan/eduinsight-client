import { app, BrowserWindow, desktopCapturer, ipcMain, shell } from 'electron';
import { Database, WindowManager } from '../lib';
import {
  createSocketConnection,
  testHttpConnection,
} from '../lib/socket-manager';
import { IPCRoute, WindowIdentifier } from '@/shared/constants';
import { Socket } from 'socket.io-client';
import { startMonitoring } from '../lib/monitoring';
import { createTray } from '../lib/tray-menu';
import fs from 'fs';
import path from 'path';
import StoreManager from '../lib/store';

export default function () {
  const store = StoreManager.getInstance();
  const deviceId = store.get('deviceId') as string;
  const labId = store.get('labId') as string;

  function setupSocketEventListeners(socket: Socket) {
    const TARGET_FPS = 10; // Limit to 10 FPS
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    socket.on('start-live-quiz', ({ quizId }) => {
      const quiz = WindowManager.get(WindowIdentifier.QuizPlayer);
      quiz.on('ready-to-show', () => {
        quiz.webContents.send(IPCRoute.QUIZ_GET_QUIZ_ID, quizId);
      });
    });

    socket.on('launch-webpage', ({ url }) => {
      WindowManager.get(
        WindowManager.WINDOW_CONFIGS.dashboard_window.id,
      ).close();
      shell.openExternal(url);
    });

    socket.on(
      'upload-file-chunk',
      ({
        fileId,
        file,
        filename,
        subjectName,
        fileType,
      }: {
        fileId: string;
        file: Buffer;
        filename: string;
        subjectName: string;
        fileType: string;
      }) => {
        try {
          const downloadPath = path.join(
            app.getPath('downloads'),
            'EduInsight',
            subjectName,
          );

          if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
          }

          const filePath = path.join(downloadPath, filename);

          // Write file in chunks to avoid memory issues
          const writeStream = fs.createWriteStream(filePath);
          writeStream.write(file);
          writeStream.end();

          writeStream.on('finish', () => {
            BrowserWindow.getAllWindows().forEach((window) => {
              window.webContents.send('file-received', {
                fileId,
                filename,
                path: filePath,
                subjectName,
                fileType,
              });
            });
          });

          writeStream.on('error', (error) => {
            throw new Error(`Failed to write file: ${error.message}`);
          });
        } catch (error) {
          console.error('Failed to save file:', error);
          BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send('file-receive-error', {
              fileId,
              filename,
              error: error.message,
            });
          });
        }
      },
    );

    socket.on(
      'file-progress',
      ({
        fileId,
        filename,
        progress,
        subjectName,
      }: {
        fileId: string;
        filename: string;
        progress: number;
        subjectName: string;
      }) => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(
            'file-progress',
            fileId,
            filename,
            progress,
            subjectName,
          );
        });
      },
    );

    const captureIntervals: Record<string, NodeJS.Timeout> = {};
    const MAX_RETRY_ATTEMPTS = 3;

    socket.on('show-screen', async ({ userId, subjectId }) => {
      // Clear existing interval if any
      if (captureIntervals[userId]) {
        clearInterval(captureIntervals[userId]);
      }

      let retryCount = 0;

      const startCapture = async () => {
        try {
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
              width: 854,
              height: 480,
            },
            fetchWindowIcons: false,
          });

          if (!sources[0]) {
            throw new Error('No screen source available');
          }

          captureIntervals[userId] = setInterval(async () => {
            try {
              if (!socket.connected) {
                clearInterval(captureIntervals[userId]);
                return;
              }

              const thumbnail = sources[0].thumbnail.toDataURL({
                scaleFactor: 0.5,
              });

              socket.emit('screen-data', {
                userId,
                subjectId,
                screenData: thumbnail,
                timestamp: Date.now(),
              });

              // Reset retry count on successful capture
              retryCount = 0;
            } catch (error) {
              console.error('Screen capture error:', error);
              retryCount++;

              if (retryCount >= MAX_RETRY_ATTEMPTS) {
                clearInterval(captureIntervals[userId]);
                socket.emit('screen-share-error', {
                  error: 'Screen capture failed',
                  userId,
                  subjectId,
                });
              }
            }
          }, FRAME_INTERVAL);
        } catch (error) {
          console.error('Failed to initialize screen capture:', error);
          socket.emit('screen-share-error', {
            error: 'Failed to initialize screen capture',
            userId,
            subjectId,
          });
        }
      };

      await startCapture();
    });

    socket.on('hide-screen', ({ _deviceId }) => {
      // Clear all intervals for the device
      Object.keys(captureIntervals).forEach((userId) => {
        clearInterval(captureIntervals[userId]);
        delete captureIntervals[userId];
      });
    });

    // Cleanup on socket disconnect
    socket.on('disconnect', () => {
      Object.keys(captureIntervals).forEach((userId) => {
        clearInterval(captureIntervals[userId]);
        delete captureIntervals[userId];
      });
    });
  }

  ipcMain.handle(IPCRoute.TEST_SOCKET_URL, async (_, url: string) => {
    return await testHttpConnection(url);
  });

  //handle device initiated event
  ipcMain.on(IPCRoute.DEVICE_INITIATED, async () => {
    createSocketConnection().then(async (socket) => {
      
      const device = await Database.prisma.device.findFirst({
        where: { id: deviceId },
      });

      if (!device) {
        WindowManager.get(WindowManager.WINDOW_CONFIGS.setup_window.id);
      }

      //setup socket event listeners
      socket.emit('join-server', device.id);
      
      setupSocketEventListeners(socket);
      

      const activeUser = await Database.prisma.activeDeviceUser.findFirst({
        where: { deviceId: device.id },
      });

      if (activeUser) {
        startMonitoring(activeUser.userId, device.id, labId);
        createTray(path.join(__dirname, 'img/tray-icon.ico'));

        const dashboard = WindowManager.get(
          WindowManager.WINDOW_CONFIGS.dashboard_window.id,
        );

        dashboard.maximize();
        dashboard.show();
        dashboard.focus();

        store.set('userId', activeUser.userId);
      } else {
        store.delete('userId');
        WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);
      }
    });
  });
}
