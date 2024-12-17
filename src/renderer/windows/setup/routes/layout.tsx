import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiMinus, FiX } from 'react-icons/fi';
import { WindowIdentifier } from '@/shared/constants';

const SetupLayout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkMode = () => {
      api.window.receive('mode', (event, mode) => {
        switch (mode) {
          case "setup-device":
            navigate("/device-setup");
            break;
          case "setup-socket":
            navigate("/socket-setup");
            break;
          case "setup-complete":
            navigate("/setup-complete");
            break;
          case "setup-error":
            navigate("/setup-error");
            break;
          case "setup-db":
            navigate("/database-setup");
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
    api.window.closeSetup();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 flex items-center justify-between">
            <div className="flex items-center">
              <FiSettings className="text-white text-4xl animate-spin-slow" />
              <h1 className="text-3xl font-bold text-white ml-4">Setup Wizard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={handleMinimize} className="text-white hover:text-gray-200 transition-colors">
                <FiMinus className="text-xl" />
              </button>
              <button onClick={handleExit} className="text-white hover:text-gray-200 transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default SetupLayout;