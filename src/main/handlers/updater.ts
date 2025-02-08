/**
 * IPC handlers for interfacing with Electron's auto-updater.
 *
 * @see https://www.electronjs.org/docs/latest/tutorial/updates
 * @module
 */
import log from 'electron-log';
import is from 'electron-is';
//import AppInfo from 'package.json';
import { app, autoUpdater, ipcMain } from 'electron';
import { IPCRoute } from '@/shared/constants';

// /**
//  * Repo information extracted from the package info file.
//  *
//  * @constant
//  */
// const repoInfo = AppInfo.homepage.match(/github\.com\/([\w-]+)\/([\w-]+)/);

/**
 * Register the IPC event handlers for the auto-updater.
 *
 * @function
 */
export default function () {
  /**
   * Handle the UPDATER_INSTALL event.
   * Quits the app and installs the update.
   */
  ipcMain.on(IPCRoute.UPDATER_INSTALL, () => autoUpdater.quitAndInstall());

  /**
   * Handle the UPDATER_START event.
   * Initiates the update checking process.
   * 
   * @param {Electron.IpcMainEvent} event - The IPC event object.
   */
  ipcMain.on(IPCRoute.UPDATER_START, (event) => {
    // bail early if we're in dev mode
    // eslint-disable-next-line no-constant-condition
    if (is.dev()) {
      event.reply(IPCRoute.UPDATER_NO_UPDATE);
      return;
    }

    /**
     * Configure the auto updater with the feed URL.
     */
    autoUpdater.setFeedURL({
      url:
        'https://update.electronjs.org/juliusbiascan/eduinsight-client' +
        `${process.platform}-${process.arch}/${app.getVersion()}`,
    });

    // start checking for updates
    log.info('Checking for updates: %s', autoUpdater.getFeedURL());
    
    autoUpdater.checkForUpdates();

    /**
     * Register the auto updater event handlers.
     */
    autoUpdater.on('checking-for-update', () => event.reply(IPCRoute.UPDATER_CHECKING));
    autoUpdater.on('update-not-available', () => event.reply(IPCRoute.UPDATER_NO_UPDATE));
    autoUpdater.on('update-available', () => event.reply(IPCRoute.UPDATER_DOWNLOADING));
    autoUpdater.on('update-downloaded', () => event.reply(IPCRoute.UPDATER_FINISHED));

    /**
     * Handle errors during the update process.
     * 
     * @param {Error} message - The error message.
     */
    autoUpdater.on('error', (message) => {
      log.error(message);
      event.reply(IPCRoute.UPDATER_NO_UPDATE);
    });
  });
}