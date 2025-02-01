/**
 * @file index.ts
 * @description Main entry point for the EduInsight Client application.
 */
import { PeerServer } from "peer";
import { app, BrowserWindow } from 'electron';
import { WindowManager } from './lib';
import * as IPCHandlers from './handlers';
import StoreManager from '@/main/lib/store';
import Store from 'electron-store';
import { handleSecondinstance } from "./lib/instance";

const store = StoreManager.getInstance();
const deviceId = store.get('deviceId') as string;
const labId = store.get('labId') as string;

function handleOnReady() {
  Object.values(IPCHandlers).forEach((handler) => handler());
  Store.initRenderer();

  const peerServer = PeerServer({
    path: '/eduinsight',
    port: 9001,
    host: '0.0.0.0',
    proxied: true,
    allow_discovery: true,
  });

  peerServer.on('connection', (client) => {
    console.log(`Client connected: ${client.getId()}`);
  });

  peerServer.on('error', (error) => {
    console.error('PeerServer error:', error);
  });

  //connect to database
  if (!deviceId || !labId) {
    WindowManager.get(WindowManager.WINDOW_CONFIGS.setup_window.id);
  } else {
    WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);
  }
}

(async () => {
  if (require('electron-squirrel-startup')) {
    app.quit();
    return;
  }

  // // This line configures the app to start automatically on system login
  // // It sets the 'openAtLogin' setting to true if the app is not running in development mode
  // // This ensures that the app starts automatically when the user logs in, but only in production
  // app.setLoginItemSettings({ openAtLogin: true });

  // SSL/TSL: this is the self signed certificate support
  app.on(
    'certificate-error',
    (event, _webContents, _url, _error, _certificate, callback) => {
      // On certificate error we disable default behaviour (stop loading the page)
      // and we then say "it is all fine - true" to the callback
      event.preventDefault();
      callback(true);
    },
  );

  // Ignore Chromium selfsigned warning errors
  app.commandLine.appendSwitch('ignore-certificate-errors');

  app.commandLine.appendSwitch('allow-insecure-localhost');

  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
     
      handleSecondinstance();
    })

    app.on('ready', () => {
      handleOnReady();
    });
  }
  
  app.on('window-all-closed', () => {
    if (!store.get('deviceId')) app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);
    }
  });
})();
