import logo from '../../../assets/passlogo-small.png';
import { Toaster } from '@/renderer/components/ui/toaster';
import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const MainLayout = () => {
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const hasNavigated = useRef(false);
  
  useEffect(() => {

    const unsubscribe = api.socket.connectionStatus((status) => {
      setConnectionStatus(status);
      if(status === "disconnected") {
        navigate('/server-down');
        hasNavigated.current = false;
      } else if(status === "connected" && !hasNavigated.current) {
        navigate('/');
        hasNavigated.current = true;
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="relative min-h-screen bg-[#F5F5F5] overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#EBC42E]/10 rounded-bl-full -z-10" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#C9121F]/5 rounded-tr-full -z-10" />

      <div className="container mx-auto flex flex-col p-4 md:p-6 lg:p-8 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={`my-auto w-full grid grid-cols-1 gap-8 lg:grid-cols-2 items-center`}
        >
       
            <div className="flex flex-col justify-center text-center lg:text-left space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="flex items-center justify-center lg:justify-start space-x-4"
              >
                <div className="p-3 bg-white rounded-2xl shadow-md">
                  <img
                    className="h-12 drop-shadow-sm"
                    src={logo}
                    alt="PASS College logo"
                  />
                </div>
                <h4 className="text-xl font-bold tracking-wider text-[#1A1617]">
                  PASS College
                </h4>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="space-y-6"
              >
                <h1 className="text-5xl font-extrabold leading-tight text-[#1A1617] lg:text-6xl xl:text-7xl">
                  EDU<span className="text-[#C9121F]">INSIGHT</span>
                  <span className="block text-3xl lg:text-4xl mt-2 text-[#1A1617]/80">
                    CLIENT
                  </span>
                </h1>

                <p className="text-lg font-medium leading-relaxed text-[#1A1617]/70 xl:w-4/5">
                  A Computer Lab Monitoring System for Enhanced Learning in Pass
                  College Philippine Accountancy and Science School.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="flex items-center justify-center lg:justify-start"
              >
                <div className="flex items-center space-x-3 bg-white px-5 py-3 rounded-full shadow-md border border-[#1A1617]/5">
                  <div
                    className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-[#C9121F]'} animate-pulse`}
                  ></div>
                  <span className="text-sm font-semibold text-[#1A1617] capitalize">
                    {connectionStatus}
                  </span>
                </div>
              </motion.div>
            </div>
          

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="relative"
          >
            <Outlet />
          </motion.div>
        </motion.div>
      </div>
      <Toaster />
    </div>
  );
};

export default MainLayout;
