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
    <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full"
      >
        <div className="bg-white/80 backdrop-blur-lg h-full w-full border border-gray-200 flex flex-col">
          <div className="bg-gradient-to-r from-[#C9121F] to-[#EBC42E] p-6 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center">
              <FiSettings className="text-white text-3xl animate-spin-slow" />
              <h1 className="text-2xl font-bold text-white ml-4">Setup Wizard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleMinimize} 
                className="text-white/80 hover:text-white transition-colors"
              >
                <FiMinus className="text-xl" />
              </button>
              <button 
                onClick={handleExit} 
                className="text-white/80 hover:text-white transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SetupLayout;