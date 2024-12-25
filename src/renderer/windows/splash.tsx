import logo from '../assets/passlogo-small.png';
import '../styles/globals.css';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { IPCRoute, WindowIdentifier } from '../../shared/constants';
import { sleep } from '../../shared/utils';

/**
 * Status messages.
 *
 * @enum
 */
enum Status {
  Initializing = 'Initializing...',
  CheckingUpdates = 'Checking for updates...',
  Updating = 'Updating...',
  ConnectingDatabase = 'Connecting to database...',
  VerifyingDevice = 'Verifying device...',
  Ready = 'Ready!',
  Error = 'An error occurred. Please try again.',
}

/**
 * The Splash component
 *
 * @component
 */
function Splash() {
  const [status, setStatus] = useState<Status | string>(Status.Initializing);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await simulateProgress(Status.Initializing, 0, 20)
          .then(() => simulateProgress(Status.CheckingUpdates, 20, 40))
          .then(() => checkForUpdates())
          .then(() => simulateProgress(Status.ConnectingDatabase, 40, 60))
          .then(() => connectToDatabase())
          .then(() => simulateProgress(Status.VerifyingDevice, 60, 80))
          .then(() => verifyDevice())
          .then(() => simulateProgress(Status.Ready, 80, 100))
          .then(() => finalizeInitialization());
      } catch (error) {
        console.error("Error during initialization:", error);
        if (error instanceof Error) {
          await handleError(error.message);
        } else {
          await handleError();
        }
      }
    };

    initializeApp();
  }, []);

  const simulateProgress = async (status: Status, start: number, end: number) => {
    setStatus(status);
    for (let i = start; i <= end; i++) {
      setProgress(i);
      await sleep(20);
    }
  };

  const checkForUpdates = () => {
    return new Promise<void>((resolve) => {
      api.updater.start();
      api.updater.on(IPCRoute.UPDATER_NO_UPDATE, resolve);
      api.updater.on(IPCRoute.UPDATER_DOWNLOADING, () => setStatus(Status.Updating));
      api.updater.on(IPCRoute.UPDATER_FINISHED, () => {
        api.updater.install();
        resolve();
      });
    });
  };

  const connectToDatabase = async () => {
    const databaseUrl = await api.store.get('databaseUrl');
    if (!databaseUrl) {
      api.window.openSetup("setup-database")
      throw new Error('Database URL not found');
    }
    await api.database.connect(databaseUrl);
  };

  const verifyDevice = async () => {
    await api.database.verifyDevice().catch(error => {
      api.window.openSetup("setup-device")
      throw error;
    });
  };

  const finalizeInitialization = () => {
    api.device.init();
    api.window.close(WindowIdentifier.Splash);
  };

  const handleError = async (message?: string) => {
    setStatus(message || Status.Error);
    setProgress(100);
    api.window.close(WindowIdentifier.Splash);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center space-y-6 p-6 bg-white rounded-lg shadow-lg">
        <img
          src={logo}
          alt="SMNHS Logo"
          className="w-24 h-24 mx-auto"
        />
        <h1 className="text-2xl font-semibold text-gray-800">{status}</h1>
        <div className="relative w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 transition-width duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-gray-700">{`${progress}%`}</p>
      </div>
    </div>
  );
}

/**
 * React bootstrapping logic.
 *
 * @function
 * @name anonymous
 */
(() => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Failed to find the root element.');
  }
  ReactDOM.createRoot(container).render(<Splash />);
})();