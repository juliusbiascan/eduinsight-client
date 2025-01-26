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
    let captureInterval: NodeJS.Timeout | null = null;

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
      ({ fileId, file, filename, subjectName, fileType }) => {
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
          fs.writeFileSync(filePath, file);

          // Notify success
          BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send('file-received', {
              fileId,
              filename,
              path: filePath,
              subjectName,
              fileType,
            });
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

    socket.on('file-progress', ({ fileId, filename, progress }) => {
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('file-progress', {
          fileId,
          filename,
          progress,
        });
      });
    });

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
      setupSocketEventListeners(socket);
      socket.emit('join-server', device.id);

      const activeUser = await Database.prisma.activeDeviceUser.findFirst({
        where: { deviceId: device.id },
      });

      if (activeUser) {
        store.set('userId', activeUser.userId);
        startMonitoring(activeUser.userId, device.id, labId);
        createTray(path.join(__dirname, 'img/tray-icon.ico'));
        WindowManager.get(WindowManager.WINDOW_CONFIGS.welcome_window.id);
        WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id).close();
      } else {
        store.delete('userId');
        WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);
      }
    });
  });
}
