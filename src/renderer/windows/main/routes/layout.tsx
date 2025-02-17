import { useSocket } from '@/renderer/components/socket-provider';
import logo from '../../../assets/passlogo-small.png';
import { Toaster } from '@/renderer/components/ui/toaster';
import { motion } from 'framer-motion';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/renderer/components/ui/loading-spinner';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

const ConnectionStatus = ({ isConnected }: { isConnected: boolean }) => (
  <div className="inline-flex items-center space-x-3 bg-white px-5 py-3 rounded-full shadow-md border border-[#1A1617]/5">
    <motion.div
      className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-[#C9121F]'
        }`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.7, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <span className="text-sm font-semibold text-[#1A1617] capitalize">
      {isConnected ? 'Online' : 'Offline'}
    </span>
  </div>
);

const MainLayout = () => {
  const [version, setVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { isConnected } = useSocket();

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Minimum loading time
      const appInfo = await api.app.info();
      setVersion(appInfo.version);
      api.window.receive('shutdown', () => {
        navigate('/logout');
      });
    } catch (error) {
      console.error('Connection check failed:', error);
      navigate('/error');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, navigate]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingSpinner />}>
        <div className="relative min-h-screen bg-[#F5F5F5] overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#EBC42E]/10 rounded-bl-full -z-10" />
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#C9121F]/5 rounded-tr-full -z-10" />

          <div className="container mx-auto flex flex-col p-4 md:p-6 lg:p-8 min-h-screen">
            <motion.div
              layout
              className="my-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 lg:gap-12 items-center"
            >
              <div className="flex flex-col justify-center space-y-8 md:pr-8">
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
                      CLIENT <span className="text-sm text-[#1A1617]/50">v{version}</span>
                    </span>
                  </h1>

                  <p className="text-lg font-medium leading-relaxed text-[#1A1617]/70 xl:w-4/5">
                    A Computer Lab Monitoring System for Enhanced Learning in Pass
                    College Philippine Accountancy and Science School.
                  </p>
                </motion.div>

                <ConnectionStatus isConnected={isConnected} />
              </div>

              <motion.div
                layout
                className="relative w-full max-w-2xl mx-auto md:mx-0"
              >
                <Outlet />
              </motion.div>
            </motion.div>
          </div>
          <Toaster />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="p-6 bg-white rounded-lg shadow-xl">
    <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
    <p className="mt-2 text-gray-600">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md"
    >
      Try again
    </button>
  </div>
);

export default MainLayout;
