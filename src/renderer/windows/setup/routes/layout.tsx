import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiMinus, FiX, FiRefreshCw } from 'react-icons/fi';
import { WindowIdentifier } from '@/shared/constants';

const SetupLayout: React.FC = () => {
  const navigate = useNavigate();

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
    api.window.closeSetup();
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
        </div>
      </motion.div>
    </div>
  );
};

export default SetupLayout;