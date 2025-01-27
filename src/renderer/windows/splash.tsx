import logo from '../assets/passlogo-small.png';
import '../styles/globals.css';
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { IPCRoute, WindowIdentifier } from '../../shared/constants';
import { sleep } from '../../shared/utils';
import { motion, AnimatePresence } from 'framer-motion';

const BackgroundPattern = () => (
  <div className="fixed inset-0 overflow-hidden opacity-20">
    <div className="absolute w-full h-full">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-blue-500/10 rounded-full"
          style={{
            width: Math.random() * 300 + 50,
            height: Math.random() * 300 + 50,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  </div>
);

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
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const initializeApp = async () => {
    try {
      setError(null);
      setProgress(0);
      setIsRetrying(false);
      
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

  useEffect(() => {
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
      throw new Error('Database URL not found');
    }
    const dbConnected = await api.database.connect(databaseUrl);
    if (!dbConnected.success) {
      throw new Error('Failed to connect to the database');
    }
  };

  const verifyDevice = async () => {
    await api.database.verifyDevice().catch(error => {
      throw error;
    });
  };

  const finalizeInitialization = () => {
    api.device.init();
    api.window.close(WindowIdentifier.Splash);
  };

  const handleError = async (message?: string) => {
    const errorMessage = message || Status.Error;
    setError(errorMessage);
    setStatus(errorMessage);
    setProgress(100);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await sleep(500); // Add small delay for animation
    initializeApp();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <BackgroundPattern />
      
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="absolute top-0 left-0 w-full bg-red-500/90 backdrop-blur-sm text-white p-4 shadow-lg z-50"
          >
            <div className="flex items-center justify-center gap-4">
              <p className="text-center">{error}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-1 bg-white text-red-500 rounded-full text-sm font-medium hover:bg-red-50 transition-colors"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full"
                  />
                ) : (
                  'Retry'
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center justify-center h-full z-10">
        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 1.5
          }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <img
              src={logo}
              alt="SMNHS Logo"
              className="w-48 h-48 relative z-10 drop-shadow-2xl"
            />
          </div>
        </motion.div>

        <motion.div 
          className="w-full max-w-lg px-8 mt-16 space-y-8"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            transition={{ delay: 0.8 }}
          >
            <motion.h1 
              className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 1 }}
            >
              {status}
            </motion.h1>
          </motion.div>
          
          <div className="relative">
            <div className="h-3 bg-blue-100 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                style={{
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s linear infinite",
                }}
              />
            </div>
            <motion.div 
              className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <motion.p 
            className="text-center text-blue-800 font-medium text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {`${Math.round(progress)}%`}
          </motion.p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-blue-500 text-white rounded-full text-lg font-medium hover:bg-blue-600 transition-colors shadow-lg"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Retrying...</span>
                  </div>
                ) : (
                  'Try Again'
                )}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
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