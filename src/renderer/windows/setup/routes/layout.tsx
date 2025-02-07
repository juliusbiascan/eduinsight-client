import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiMinus, FiX, FiRefreshCw } from 'react-icons/fi';
import { WindowIdentifier } from '@/shared/constants';

const SetupLayout: React.FC = () => {
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    const checkMode = () => {
      api.window.receive('mode', (event, mode) => {
        switch (mode) {
          case "setup-complete":
            navigate("/setup-complete");
            break;
          case "setup-error":
            navigate("/setup-error");
            break;
        }
      });
    };
    checkMode();
  }, [navigate]);

  const handleMinimize = () => {
    api.window.hide(WindowIdentifier.Setup);
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    api.window.closeSetup();
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full"
      >
        <div className="bg-white/80 backdrop-blur-lg h-full w-full border border-gray-200/50 shadow-2xl flex flex-col">
          <div className="bg-gradient-to-r from-[#C9121F] to-[#EBC42E] px-4 py-3 flex items-center justify-between z-50">
            <div className="flex items-center">
              <FiSettings className="text-white text-2xl animate-spin-slow" />
              <h1 className="text-lg font-semibold text-white ml-3">EduInsight Setup</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleRefresh} 
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded"
              >
                <FiRefreshCw className="text-lg" />
              </button>
              <button 
                onClick={handleMinimize} 
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded"
              >
                <FiMinus className="text-lg" />
              </button>
              <button 
                onClick={handleExit} 
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded"
              >
                <FiX className="text-lg" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
          {showExitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
              >
                <h3 className="text-lg font-semibold mb-2">Exit Setup?</h3>
                <p className="text-gray-600 mb-4">Are you sure you want to exit the setup process? Any unsaved progress will be lost.</p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={cancelExit}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmExit}
                    className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded"
                  >
                    Exit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SetupLayout;