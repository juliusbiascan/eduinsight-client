import { ipcMain } from 'electron';
import { IPCRoute } from '@/shared/constants';
import StoreManager from '@/main/lib/store';

const store = StoreManager.getInstance();

/**
 * Sets up IPC handlers for store-related operations.
 * This function initializes various event listeners for getting, setting,
 * deleting, clearing, and checking the existence of store values.
 * 
 * @function
 */
export default function () {

  /**
   * Handles the STORE_GET event.
   * Retrieves a value from the store based on the provided key.
   * 
   * @param {string} key - The key of the value to retrieve.
   * @returns {any} The value associated with the key.
   */
  ipcMain.handle(IPCRoute.STORE_GET, (_, key: string) => {
    return store.get(key);
  });

  /**
   * Handles the STORE_SET event.
   * Sets a value in the store for the provided key.
   * 
   * @param {string} key - The key to set.
   * @param {any} value - The value to associate with the key.
   * @returns {boolean} True if the operation was successful.
   */
  ipcMain.handle(IPCRoute.STORE_SET, (_, key: string, value: any) => {
    store.set(key, value);
    return true;
  });

  /**
   * Handles the STORE_DELETE event.
   * Deletes a value from the store based on the provided key.
   * 
   * @param {string} key - The key of the value to delete.
   * @returns {boolean} True if the operation was successful.
   */
  ipcMain.handle(IPCRoute.STORE_DELETE, (_, key: string) => {
    store.delete(key);
    return true;
  });

  /**
   * Handles the STORE_CLEAR event.
   * Clears all values from the store.
   * 
   * @returns {boolean} True if the operation was successful.
   */
  ipcMain.handle(IPCRoute.STORE_CLEAR, () => {
    store.clear();
    return true;
  });

  /**
   * Handles the STORE_HAS event.
   * Checks if a key exists in the store.
   * 
   * @param {string} key - The key to check for existence.
   * @returns {boolean} True if the key exists, false otherwise.
   */
  ipcMain.handle(IPCRoute.STORE_HAS, (_, key: string) => {
    return store.has(key);
  });
}