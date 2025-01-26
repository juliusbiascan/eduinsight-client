import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Device, DeviceUser, DeviceUserRole } from '@prisma/client';
import logo from "@/renderer/assets/passlogo-small.png";

export const InitializingConsole = () => {
  const navigate = useNavigate();
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToMain = (message: string) => {
      setError(message);
      setTimeout(() => {
        navigate('/');
        api.window.open('main');
        window.close();
      }, 2000);
    };

    const initializeConsole = async () => {
      try {
        // Get current device
        setLoadingText('Getting device information...');
        const device: Device = await api.database.getDevice();
        
        if (!device) {
          throw new Error('No device information found');
        }

        // Get active user for this device
        setLoadingText('Getting user information...');
        const activeUser = await api.database.getActiveUserByDeviceId(
          device.id,
          device.labId
        );

        if (!activeUser || !activeUser.user) {
          throw new Error('No active user found');
        }

        const user: DeviceUser = activeUser.user;

        // Enhanced role validation
        if (!user.role || ![DeviceUserRole.STUDENT, DeviceUserRole.TEACHER].includes(user.role)) {
          throw new Error('Invalid or unauthorized user role');
        }

        // Set welcome message
        setLoadingText(`Welcome, ${user.firstName}!`);
        
        // Delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Safe URL validation using window.location.pathname
        try {
          const currentPath = window.location.pathname || '';
          
          if (user.role === DeviceUserRole.STUDENT) {
            if (currentPath.includes('teacher')) {
              throw new Error('Unauthorized access: Students cannot access teacher console');
            }
            navigate('/student');
          } else if (user.role === DeviceUserRole.TEACHER) {
            if (currentPath.includes('student')) {
              throw new Error('Unauthorized access: Teachers cannot access student console');
            }
            navigate('/teacher');
          } else {
            throw new Error('Unsupported user role');
          }
        } catch (urlError) {
          console.error('URL validation error:', urlError);
          // Default to role-based routing if URL validation fails
          navigate(user.role === DeviceUserRole.STUDENT ? '/student' : '/teacher');
        }

      } catch (error) {
        console.error('Initialization error:', error);
        redirectToMain(error instanceof Error ? error.message : 'Error initializing console');
      }
    };

    initializeConsole();
  }, [navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100">
      <div className="text-center">
        <img
          src={logo}
          alt="PASS Logo"
          className="w-32 h-32 mx-auto mb-8 animate-pulse"
        />
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">
            EduInsight Console
          </h1>
          <div className="flex flex-col items-center space-y-2">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${error ? 'border-red-600' : 'border-[#C9121F]'}`} />
            <p className={`${error ? 'text-red-600' : 'text-gray-600'}`}>
              {error || loadingText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
