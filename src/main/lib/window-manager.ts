import { app, BrowserWindow } from 'electron';
import { WindowIdentifier } from '@/shared/constants';
import ElectronShutdownHandler from '@paymoapp/electron-shutdown-handler';
import { machineIdSync } from 'node-machine-id';
import { Database } from '.';
/**
 * @interface
 */
interface WindowConfig {
  id: string;
  url: string;
  options: Electron.BrowserWindowConstructorOptions;
}

/**
 * BrowserWindow base configuration.
 *
 * @constant
 */
const kioskWindowConfig: Electron.BrowserWindowConstructorOptions = {
  kiosk: true,
  focusable: true,
  fullscreen: true,
  show: true,
  frame: false,
  resizable: false,
  minimizable: false,
  maximizable: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  center: true,
  webPreferences: {
    preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    nodeIntegration: true,
    allowRunningInsecureContent: true,
    webSecurity: false,
  },
};

/**
 * BrowserWindow base configuration.
 *
 * @constant
 */
const baseWindowConfig: Electron.BrowserWindowConstructorOptions = {
  webPreferences: {
    preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    nodeIntegration: true,
    allowRunningInsecureContent: true,
    webSecurity: false,
  },
};

/**
 * BrowserWindow shared configurations.
 *
 * @constant
 */
const sharedWindowConfigs: Record<
  string,
  Electron.BrowserWindowConstructorOptions
> = {
  frameless: {
    ...baseWindowConfig,
    frame: false,
    maximizable: false,
    resizable: true,
    movable: false,
    useContentSize: true,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
  },
};

/**
 * Contains a collection of the BrowserWindow instances created.
 *
 * Each instance is stored by a unique name
 * so it can later be retrieved on by name.
 *
 * @constant
 */
const windows: Record<string, Electron.BrowserWindow> = {};

/**
 * Holds application window configs.
 *
 * @constant
 */
const WINDOW_CONFIGS: Record<string, WindowConfig> = {

  [WindowIdentifier.Main]: {
    id: WindowIdentifier.Main,
    url: MAIN_WINDOW_WEBPACK_ENTRY,
    options: {
      ...kioskWindowConfig,
      title: 'Main',
    },
  },
  [WindowIdentifier.Setup]: {
    id: WindowIdentifier.Setup,
    url: SETUP_WINDOW_WEBPACK_ENTRY,
    options: {
      ...baseWindowConfig,
      title: 'Setup Wizard',
      width: 900,
      height: 600,
      center: true,
      show: true,
      frame: false,
      skipTaskbar: false,
      useContentSize: true,
      webPreferences: {
        ...baseWindowConfig.webPreferences,
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  },
  [WindowIdentifier.Dashboard]: {
    id: WindowIdentifier.Dashboard,
    url: DASHBOARD_WINDOW_WEBPACK_ENTRY,
    options: {
      ...kioskWindowConfig,
      title: 'Dashboard',
    },
  },
  [WindowIdentifier.QuizPlayer]: {
    id: WindowIdentifier.QuizPlayer,
    url: QUIZ_PLAYER_WINDOW_WEBPACK_ENTRY,
    options: {
      ...kioskWindowConfig,
      title: 'Quiz Player',
    },
  },
  [WindowIdentifier.About]: {
    id: WindowIdentifier.About,
    url: null,
    options: {
      ...sharedWindowConfigs.frameless,
      height: 600,
      width: 500,
      title: 'About',
    },
  },
};

/**
 * Creates the BrowserWindow. Re-uses existing
 * window if it has already been created.
 *
 * @function
 * @param id      The unique identifier for the window.
 * @param url     The url to the window's html page.
 * @param options Browser Window options object.
 */
function create(
  id: string,
  url: string,
  options: Electron.BrowserWindowConstructorOptions,
) {
  // if the provided screen id already exists with
  // an active handle then return that instead
  if (windows[id]) {
    return windows[id];
  }

  // create the browser window
  const window = new BrowserWindow(options);

  window.loadURL(url);

  window.webContents.on('before-input-event', (event, input) => {
    if (input.code === 'F4' && input.alt) {
      event.preventDefault();
    } else if (input.control && input.alt && input.code === 'DELETE') {
      event.preventDefault();
    }else  if(input.code == "F11") event.preventDefault();
  });

  
  if (id === WindowIdentifier.Setup) {
    window.once('ready-to-show', () => {
      window.show();
      window.focus();
    });

    window.on('close', (event) => {
      event.preventDefault();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }
  ElectronShutdownHandler.setWindowHandle(window.getNativeWindowHandle());
  ElectronShutdownHandler.blockShutdown(
    'Logging out device please wait...',
  );

  ElectronShutdownHandler.on('shutdown', () => {
    console.log('Shutting down!');
    Database.prisma.device.findFirst({ where: { devMACaddress: machineIdSync(true) } }).then((device) => {
      Database.prisma.deviceUser.findFirst({ where: { id: device.id } }).then((deviceUser) => {
        Database.prisma.activeDeviceUser
        .deleteMany({
          where: {
            deviceId: device.id,
            userId: deviceUser.id,
          },
        })
        .then(() => {
          Database.prisma.device
            .update({ where: { id: device.id }, data: { isUsed: false } })
            .then(() => {
              ElectronShutdownHandler.releaseShutdown();
              window.webContents.send('shutdown');
              app.quit();
            });
        });
      });
    });
  });

  // de-reference the window object when its closed
  window.on('closed', () => delete windows[id]);

  // add to the collection of window objects
  windows[id] = window;
  return window;
}

/**
 * Gets a window by specified id.
 *
 * Creates it if it does not already exist.
 *
 * @function
 * @param id The id of the window.
 */
function get(id: string) {
  if (id in windows) {
    return windows[id];
  }

  // create the window using its found config
  const config = WINDOW_CONFIGS[id];
  return create(id, config.url, config.options);
}

function getWindow(id: string) {
  return windows[id];
}
/**
 * Exports this module.
 *
 * @exports
 */
export default {
  create,
  get,
  getWindow,
  WINDOW_CONFIGS,
};
