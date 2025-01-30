import { io } from "socket.io-client";
import http from 'http';
import https from 'https';
import { app, BrowserWindow, ipcMain, shell, Notification, desktopCapturer } from 'electron';
import { Database, WindowManager } from '../lib';
import { Config, IPCRoute, WindowIdentifier } from '@/shared/constants';
import { startMonitoring } from '../lib/monitoring';
import { createTray } from '../lib/tray-menu';
import fs from 'fs';
import path from 'path';
import StoreManager from '../lib/store';
import { FirewallManager } from '../lib/firewall';

export default function () {
  const store = StoreManager.getInstance();
  const deviceId = store.get('deviceId') as string;
  const labId = store.get('labId') as string;

  function setupSocketEventListeners({ id }: { id: string }) {

    const socket = io(Config.SOCKET_URL, {
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

    socket.on('connect', () => {
      //setup socket event listeners
      socket.emit('join-server', id);
      console.log('Socket connected successfully');
    });

    socket.on('connect_error', (error) => {
      if (error.message.includes('xhr poll error')) {
        socket.io.opts.transports = ['polling'];
      }
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('block-url', async ({ urls }: { urls: string[] }) => {
      try {
        await FirewallManager.blockUrls(urls);
        socket.emit('urls-blocked', { success: true });
      } catch (error) {
        console.error('Failed to block URLs:', error);
        socket.emit('urls-blocked', { success: false, error: error.message });
      }
    });

    socket.on('unblock-url', async ({ urls }: { urls: string[] }) => {
      try {
        await FirewallManager.unblockUrls(urls);
        socket.emit('urls-unblocked', { success: true });
      } catch (error) {
        console.error('Failed to unblock URLs:', error);
        socket.emit('urls-unblocked', { success: false, error: error.message });
      }
    });

    socket.on('get-blocked-urls', async () => {
      try {
        const blockedUrls = await FirewallManager.getBlockedUrls();
        socket.emit('blocked-urls', { success: true, urls: blockedUrls });
      } catch (error) {
        console.error('Failed to get blocked URLs:', error);
        socket.emit('blocked-urls', { success: false, error: error.message });
      }
    });

    socket.on('limit-web', async ({ enabled }: { enabled: boolean }) => {
      try {
        await FirewallManager.limitWebAccess(enabled);
        socket.emit('web-limited', {
          success: true,
          enabled,
          message: `Web access ${enabled ? 'limited' : 'unlimited'} successfully`
        });
      } catch (error) {
        console.error('Failed to limit web access:', error);
        socket.emit('web-limited', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('get-web-limit-status', async () => {
      try {
        const isLimited = await FirewallManager.isWebLimited();
        socket.emit('web-limit-status', {
          success: true,
          limited: isLimited
        });
      } catch (error) {
        console.error('Failed to get web limit status:', error);
        socket.emit('web-limit-status', {
          success: false,
          error: error.message
        });
      }
    });

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

    let captureIntervals: NodeJS.Timeout = null;

    socket.on('show-screen', async ({ userId, subjectId, settings }) => {
      try {
        new Notification({
          title: 'Screen Sharing',
          body: 'Screen sharing has been started',
        }).show();
    
        if (captureIntervals) {
          clearInterval(captureIntervals);
        }
    
        let lastCaptureTime = Date.now();
        let skippedFrames = 0;
        let frameRate = settings?.targetFPS || 20;
        const minFrameRate = 10;
        const maxFrameRate = settings?.targetFPS || 30;
        const targetResolution = settings?.resolution || { width: 854, height: 480 };
        let compressionQuality = settings?.compression || 0.8;
        let lastNetworkDelay = 0;
    
        const startCapture = async () => {
          captureIntervals = setInterval(async () => {
            try {
              const now = Date.now();
              const frameDelay = now - lastCaptureTime;
              
              // Skip frame if we're behind schedule
              if (frameDelay < (1000 / frameRate)) {
                skippedFrames++;
                return;
              }
    
              // Adapt quality based on performance
              if (skippedFrames > 10) {
                frameRate = Math.max(minFrameRate, frameRate - 2);
                compressionQuality = Math.max(0.5, compressionQuality - 0.1);
              } else if (skippedFrames === 0 && frameRate < maxFrameRate) {
                frameRate = Math.min(maxFrameRate, frameRate + 1);
                compressionQuality = Math.min(0.9, compressionQuality + 0.05);
              }
    
              const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: targetResolution
              });
    
              const primaryDisplay = sources[0];
              if (!primaryDisplay) throw new Error('No display found');
    
              // Compress image with dynamic quality
              const pngBuffer = primaryDisplay.thumbnail.toPNG({
                scaleFactor: Math.round(compressionQuality * 100),
              });
    
              // Check buffer size and skip if too large
              if (pngBuffer.length > 1024 * 1024) {
                compressionQuality = Math.max(0.5, compressionQuality - 0.1);
                skippedFrames++;
                return;
              }
    
              const emitStart = Date.now();
              socket.emit('screen-data', {
                userId,
                subjectId,
                screenData: `data:image/png;base64,${pngBuffer.toString('base64')}`,
                timestamp: now,
                metadata: {
                  frameRate,
                  frameDropped: skippedFrames,
                  dataSize: pngBuffer.length,
                  resolution: targetResolution,
                  quality: compressionQuality,
                  networkDelay: lastNetworkDelay
                }
              }, () => {
                // Measure network delay on acknowledgment
                lastNetworkDelay = Date.now() - emitStart;
                
                // Adapt frame rate based on network delay
                if (lastNetworkDelay > 200) {
                  frameRate = Math.max(minFrameRate, frameRate - 1);
                }
              });
    
              lastCaptureTime = now;
              skippedFrames = 0;
    
            } catch (error) {
              console.error('Screen capture error:', error);
              handleScreenError(error, userId, subjectId, socket);
            }
          }, 1000 / maxFrameRate);
        };
    
        await startCapture();
    
        // Add cleanup on window/tab close
        window.addEventListener('beforeunload', () => {
          if (captureIntervals) {
            clearInterval(captureIntervals);
          }
        });
    
      } catch (error) {
        console.error('Failed to start screen capture:', error);
        handleScreenError(error, userId, subjectId, socket);
      }
    });
    
    socket.on('hide-screen', ({ deviceId, userId }) => {
      try {
        if (captureIntervals) {
          clearInterval(captureIntervals);
          captureIntervals = null;
        }
    
        new Notification({
          title: 'Screen Sharing',
          body: 'Screen sharing has been stopped',
        }).show();
    
        socket.emit('screen-share-ended', {
          deviceId,
          userId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error stopping screen share:', error);
      }
    });
    
    // Add helper functions
    
    const handleScreenError = (error: unknown, userId: string, subjectId: string, socket: any) => {
      socket.emit('screen-share-error', {
        error: error instanceof Error ? error.message : 'Screen capture failed',
        userId,
        subjectId,
      });
    };

    // Add cleanup on socket disconnect
    socket.on('disconnect', () => {
      clearInterval(captureIntervals);
    });

    // Remove or comment out the first show-screen handler and keep only this optimized version
    socket.on('show-screen', async ({ userId, subjectId, settings }) => {
      try {
        let captureInterval: NodeJS.Timeout | null = null;
        let lastCaptureTime = Date.now();
        let frameCount = 0;
        let droppedFrames = 0;

        const cleanup = () => {
          if (captureInterval) clearInterval(captureInterval);
          new Notification({
            title: 'Screen Sharing',
            body: 'Screen sharing has been stopped'
          }).show();
        };

        process.on('exit', cleanup);
        socket.on('disconnect', cleanup);

        const capture = async () => {
          const now = Date.now();
          const frameDelay = now - lastCaptureTime;
          const targetFrameTime = 1000 / (settings?.targetFPS || 30);

          // Skip frame if we're behind schedule
          if (frameDelay < targetFrameTime) {
            droppedFrames++;
            return null;
          }

          try {
            const sources = await desktopCapturer.getSources({
              types: ['screen'],
              thumbnailSize: settings?.resolution || { width: 854, height: 480 }
            });

            const display = sources[0];
            if (!display?.thumbnail) return null;

            frameCount++;
            lastCaptureTime = now;

            // Optimize PNG compression
            return display.thumbnail.toPNG({
              scaleFactor: 6
            });
          } catch (error) {
            console.error('Capture error:', error);
            return null;
          }
        };

        captureInterval = setInterval(async () => {
          const startTime = Date.now();
          const buffer = await capture();
          
          if (!buffer) return;

          const metrics = {
            fps: frameCount / ((Date.now() - startTime) / 1000),
            dropped: droppedFrames,
            quality: settings?.quality || 0.8,
            captureTime: Date.now() - startTime
          };

          socket.volatile.emit('screen-data', {
            userId,
            subjectId,
            data: buffer,
            timestamp: Date.now(),
            metrics
          });

        }, 1000 / (settings?.targetFPS || 30));

      } catch (error) {
        console.error('Screen share error:', error);
        socket.emit('screen-share-error', {
          error: error instanceof Error ? error.message : 'Screen capture failed',
          userId
        });
      }
    });

    socket.on('hide-screen', () => {
      // Cleanup is handled by show-screen's cleanup function
      socket.emit('screen-share-ended');
    });
    
    // Helper functions
    socket.on('show-screen', async ({ userId, subjectId, settings }) => {
      try {
        let captureInterval: NodeJS.Timeout | null = null;
        const lastFrameTime = new Map<string, number>();
        const frameMetrics = {
          dropped: 0,
          total: 0,
          lastQuality: settings?.quality || 0.8
        };

        const cleanup = () => {
          if (captureInterval) {
            clearInterval(captureInterval);
            captureInterval = null;
          }
          lastFrameTime.clear();
          new Notification({
            title: 'Screen Sharing',
            body: 'Screen sharing has been stopped'
          }).show();
        };

        process.on('exit', cleanup);
        socket.on('disconnect', cleanup);

        const capture = async () => {
          const now = Date.now();
          const lastTime = lastFrameTime.get(userId) || 0;
          const frameDelay = now - lastTime;
          const targetDelay = 1000 / (settings?.targetFPS || 30);

          if (frameDelay < targetDelay) {
            frameMetrics.dropped++;
            return null;
          }

          try {
            const sources = await desktopCapturer.getSources({
              types: ['screen'],
              thumbnailSize: settings?.resolution || { width: 854, height: 480 }
            });

            const display = sources[0];
            if (!display?.thumbnail) return null;

            frameMetrics.total++;
            lastFrameTime.set(userId, now);

            const quality = Math.round(frameMetrics.lastQuality * 100);
            return display.thumbnail.toPNG({ scaleFactor: quality });
          } catch (error) {
            console.error('Capture error:', error);
            return null;
          }
        };

        captureInterval = setInterval(async () => {
          const buffer = await capture();
          if (!buffer) return;

          const metrics = {
            fps: frameMetrics.total / ((Date.now() - lastFrameTime.get(userId)) / 1000),
            dropped: frameMetrics.dropped,
            quality: frameMetrics.lastQuality,
            timestamp: Date.now()
          };

          socket.emit('screen-data', {
            userId,
            subjectId,
            screenData: buffer,
            timestamp: Date.now(),
            metrics
          });
        }, 1000 / (settings?.targetFPS || 30));

        socket.on('adjust-quality', ({ quality }) => {
          frameMetrics.lastQuality = quality;
        });

        new Notification({
          title: 'Screen Sharing',
          body: 'Screen sharing has started'
        }).show();

      } catch (error) {
        console.error('Screen share error:', error);
        socket.emit('screen-share-error', {
          error: error instanceof Error ? error.message : 'Screen capture failed',
          userId
        });
      }
    });

    socket.on('hide-screen', () => {
      // Cleanup is handled by show-screen's cleanup function
      socket.emit('screen-share-ended', {
        timestamp: Date.now()
      });
    });
  }

  ipcMain.handle(IPCRoute.TEST_SOCKET_URL, async (_, url: string) => {
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
  });

  //handle device initiated event
  ipcMain.on(IPCRoute.DEVICE_INITIATED, async () => {
    const device = await Database.prisma.device.findFirst({
      where: { id: deviceId },
    });

    if (!device) {
      WindowManager.get(WindowManager.WINDOW_CONFIGS.setup_window.id);
    }

    setupSocketEventListeners({ id: deviceId });


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
}
