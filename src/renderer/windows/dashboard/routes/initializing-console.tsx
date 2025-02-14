import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Device, DeviceUser, DeviceUserRole } from '@prisma/client';
import { motion } from 'framer-motion';
import logo from "@/renderer/assets/passlogo-small.png";
import { ActivationForm } from '@/renderer/components/activation-form';
import { WindowIdentifier } from '@/shared/constants';

export const InitializingConsole = () => {
  const navigate = useNavigate();
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [needsActivation, setNeedsActivation] = useState(false);
  const [currentUser, setCurrentUser] = useState<DeviceUser | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      setNeedsConfirmation(false);
      setNeedsActivation(true);
    } else {
      if (currentUser?.id) {
        api.database.userLogout(currentUser.id);
      }
      api.window.open(WindowIdentifier.Main);
      window.close();
    }
  };

  const handleActivation = async (data: { email: string; contactNo: string; password: string }) => {
    try {
      if (!currentUser) return;

      // Prepare update data with all fields that have values
      const updateData: any = {};
      
      // Only include fields that have values and are different from current user data
      if (data.email && data.email !== currentUser.email) {
        updateData.email = data.email;
      }
      
      if (data.contactNo && data.contactNo !== currentUser.contactNo) {
        updateData.contactNo = data.contactNo;
      }
      
      if (!currentUser.password) {
        updateData.password = data.password;
      }

      const response = await api.database.updateUser({
        userId: currentUser.id,
        ...updateData
      });

      if (response.success) {
        setLoadingText('Account activated successfully!');
        // Add delay for user feedback
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Redirect based on user role
        if (currentUser.role === DeviceUserRole.STUDENT) {
          navigate('/student');
        } else if (currentUser.role === DeviceUserRole.TEACHER) {
          navigate('/teacher');
        }
      } else {
        setError(response.message || 'Failed to activate account');
      }
    } catch (error) {
      setError('Failed to activate account');
      console.error('Activation error:', error);
    }
  };

  useEffect(() => {
    const redirectToMain = (message: string) => {
      setError(message);
      setTimeout(() => {
        navigate('/');
        api.window.open(WindowIdentifier.Main);
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

        // Check if user needs activation or email verification
        if (!user.email || !user.contactNo || !user.password || !user.emailVerified) {
          setCurrentUser(user);
          
          // Different messages for different missing information
          if (!user.email || !user.emailVerified) {
            setLoadingText('Email verification required');
          } else if (!user.contactNo) {
            setLoadingText('Contact number verification required');
          } else if (!user.password) {
            setLoadingText('Password change required');
          }
          
          setNeedsConfirmation(true);
          return;
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

  if (needsConfirmation && currentUser) {
    return (
      <div className="relative min-h-screen bg-[#F5F5F5] overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#EBC42E]/10 rounded-bl-full -z-10" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#C9121F]/5 rounded-tr-full -z-10" />
        
        <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="flex items-center space-x-4 mb-6"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <img className="h-10 drop-shadow-sm" src={logo} alt="PASS Logo" />
                </div>
                <h2 className="text-2xl font-bold text-[#1A1617]">Confirm Identity</h2>
              </motion.div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Name</span>
                    <span className="font-medium text-[#1A1617]">{currentUser.firstName} {currentUser.lastName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">ID Number</span>
                    <span className="font-medium text-[#1A1617]">{currentUser.schoolId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Role</span>
                    <span className="font-medium text-[#1A1617] capitalize">{currentUser.role.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Course</span>
                    <span className="font-medium text-[#1A1617]">{currentUser.course || 'N/A'}</span>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3 pt-4"
                >
                  <button
                    onClick={() => handleConfirmation(true)}
                    className="w-full px-6 py-3 bg-[#1A1617] text-white rounded-lg hover:bg-[#2A2627] transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => handleConfirmation(false)}
                    className="w-full px-6 py-3 bg-[#C9121F] text-white rounded-lg hover:bg-[#D9222F] transition-colors"
                  >
                    Logout
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (needsActivation && currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ActivationForm 
          user={currentUser} 
          onActivate={handleActivation} 
          onBack={() => {
            setNeedsActivation(false);
            setNeedsConfirmation(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F5F5F5] overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#EBC42E]/10 rounded-bl-full -z-10" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#C9121F]/5 rounded-tr-full -z-10" />
      
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="p-3 bg-white rounded-2xl shadow-md inline-block mb-8">
            <img src={logo} alt="PASS Logo" className="h-16 drop-shadow-sm" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-[#1A1617]">
              EDU<span className="text-[#C9121F]">INSIGHT</span>
            </h1>
            <div className="flex flex-col items-center space-y-2">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${error ? 'border-[#C9121F]' : 'border-[#1A1617]'}`} />
              <p className={`${error ? 'text-[#C9121F]' : 'text-[#1A1617]/70'} font-medium`}>
                {error || loadingText}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
