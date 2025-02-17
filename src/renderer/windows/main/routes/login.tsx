import '../../../styles/globals.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Device } from '@prisma/client';
import { Button } from '../../../components/ui/button';
import { WindowIdentifier } from '@/shared/constants';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Message from '../../../components/ui/message';
import { Eye, EyeOff } from 'lucide-react';
import IdentityConfirmDialog from '../../../components/ui/identity-confirm-dialog';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device>();
  const [identifier, setIdentifier] = useState(''); // Combined input for email/studentId
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formErrors, setFormErrors] = useState<{identifier?: string; password?: string}>({});
  const [userFound, setUserFound] = useState(false); // Add this state
  const [showIdentityConfirm, setShowIdentityConfirm] = useState(false);
  const [identityAttempts, setIdentityAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const MAX_ATTEMPTS = 5;
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>('');

  const getLockoutDuration = useMemo(() => (attempts: number) => {
    const durations = {
      1: 15 * 1000,      // 15 seconds
      2: 30 * 1000,      // 30 seconds
      3: 60 * 1000,      // 1 minute
      4: 300 * 1000,     // 5 minutes
      5: 1800 * 1000     // 30 minutes
    };
    return durations[attempts as keyof typeof durations] || 1800 * 1000; // default to 30 minutes
  }, []);

  const formatLockoutTime = (ms: number) => {
    if (ms < 60000) {
      return `${Math.ceil(ms / 1000)} seconds`;
    }
    return `${Math.ceil(ms / 60000)} minutes`;
  };

  useEffect(() => {
    api.database.getDevice().then((device) => {
      setDevice(device);
    });
  }, []);

  const validateForm = () => {
    const errors: {identifier?: string; password?: string} = {};
    
    if (!identifier) {
      errors.identifier = 'Email or Student ID is required';
    }
    
    if (userFound && !password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      if (device) {
        // Check if input is email or student ID using regex
        const isEmail = /\S+@\S+\.\S+/.test(identifier);
        
        const { success, message } = await api.auth.login({ 
          deviceId: device.id, 
          email: isEmail ? identifier : undefined,
          studentId: !isEmail ? identifier : undefined,
          password 
        });

        setMessage({
          type: success ? 'success' : 'error',
          text: message
        });
  
        if (success) {
          setTimeout(() => {
            api.window.openInTray(WindowIdentifier.Dashboard);
            window.close();
          }, 1500);
        }
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [device, identifier, password, userFound]);

  useEffect(() => {
    if (!lockoutEndTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const timeLeft = lockoutEndTime - now;

      if (timeLeft <= 0) {
        setIsLocked(false);
        setLockoutEndTime(null);
        setRemainingTime('');
        localStorage.removeItem(`lockout_${identifier}`);
        if (identityAttempts >= MAX_ATTEMPTS) {
          setIdentityAttempts(0);
        }
      } else {
        setRemainingTime(formatLockoutTime(timeLeft));
      }
    };

    updateTimer(); // Initial update
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [lockoutEndTime, identifier, identityAttempts]);

  const handleIdentityConfirm = async (firstName: string, lastName: string) => {
    try {
      const response = await api.auth.verifyPersonalInfo({
        email: identifier,
        firstName,
        lastName,
        schoolId: identifier  // This will be ignored in the verification
      });

      if (response.success) {
        // Clear lockout state on successful verification
        setIsLocked(false);
        setLockoutEndTime(null);
        setRemainingTime('');
        setIdentityAttempts(0);
        localStorage.removeItem(`lockout_${identifier}`);

        // Proceed with login
        if (device) {
          const { success, message } = await api.auth.login({
            deviceId: device.id,
            email: /\S+@\S+\.\S+/.test(identifier) ? identifier : undefined,
            studentId: !/\S+@\S+\.\S+/.test(identifier) ? identifier : undefined,
            password: '',
            allowDirectLogin: true
          });

          setMessage({
            type: success ? 'success' : 'error',
            text: message
          });

          if (success) {
            setTimeout(() => {
              api.window.openInTray(WindowIdentifier.Dashboard);
              window.close();
            }, 1500);
          }
        }
      } else {
        const newAttempts = identityAttempts + 1;
        setIdentityAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutDuration = getLockoutDuration(newAttempts);
          const endTime = Date.now() + lockoutDuration;
          
          setIsLocked(true);
          setLockoutEndTime(endTime);
          localStorage.setItem(`lockout_${identifier}`, endTime.toString());
          
          setMessage({
            type: 'error',
            text: `Too many failed attempts. Account is temporarily locked. Please try again in ${formatLockoutTime(lockoutDuration)}.`
          });
        } else {
          throw new Error(`Name verification failed. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to verify identity');
    }
  };

  const checkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || isLoading) return;

    // Check if user is locked out
    const lockoutTime = localStorage.getItem(`lockout_${identifier}`);
    if (lockoutTime) {
      const endTime = parseInt(lockoutTime);
      const now = Date.now();
      if (endTime > now) {
        setLockoutEndTime(endTime);
        setIsLocked(true);
        return;
      } else {
        localStorage.removeItem(`lockout_${identifier}`);
        setIsLocked(false);
        setLockoutEndTime(null);
        // Only reset attempts if maximum attempts were reached
        if (identityAttempts >= MAX_ATTEMPTS) {
          setIdentityAttempts(0);
        }
      }
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await api.auth.verifyUser(identifier);
      
      if (response.success && response.allowDirectLogin) {
        setShowIdentityConfirm(true);
        return;
      }
      
      setUserFound(response.success);
      if (!response.success) {
        setMessage({ type: 'error', text: response.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifierChange = () => {
    setUserFound(false);
    setIdentifier('');
    setPassword('');
    setFormErrors({});
    setMessage(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-[#EBC42E]/20 blur-3xl rounded-full transform -rotate-12" />
        <div className="relative flex flex-col items-center bg-white p-10 rounded-2xl border border-[#1A1617]/5 shadow-xl max-w-md w-full">
          <h2 className="text-3xl font-bold text-[#1A1617] mb-8">
            Welcome <span className="text-[#C9121F]">Back!</span>
          </h2>

          <p className="text-[#1A1617]/70 mb-6 text-center">
            In order to use this device, you must be signed in.
          </p>

          {message && !remainingTime && (
            <Message type={message.type} message={message.text} />
          )}
          {remainingTime && (
            <Message 
              type="error" 
              message={`Account is locked. Please try again in ${remainingTime}.`}
            />
          )}

          <form onSubmit={userFound ? handleLogin : checkUser} className="w-full space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Student ID</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Enter your email or student ID"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (userFound) {
                        setUserFound(false);
                        setPassword('');
                      }
                      setFormErrors({});
                      setMessage(null);
                    }}
                    className={formErrors.identifier ? 'border-red-500' : ''}
                    aria-invalid={!!formErrors.identifier}
                    disabled={userFound || isLocked}
                  />
                  {formErrors.identifier && (
                    <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.identifier}</p>
                  )}
                </div>
                <Button 
                  type={userFound ? "button" : "submit"}
                  onClick={userFound ? handleIdentifierChange : undefined}
                  disabled={!identifier || isLoading || isLocked}
                  aria-label={userFound ? "Change identifier" : "Verify identifier"}
                >
                  {userFound ? "Change" : "Next"}
                </Button>
              </div>
            </div>

            {userFound && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormErrors({...formErrors, password: ''});
                    }}
                    className={formErrors.password ? 'border-red-500' : ''}
                    aria-invalid={!!formErrors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {formErrors.password && (
                    <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.password}</p>
                  )}
                </div>
              </div>
            )}

            {userFound && (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/reset')}
                    className="text-sm text-[#C9121F] hover:underline"
                    disabled={isLocked}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || isLocked}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </>
            )}

            <div className="text-center">
              <p className="text-[#1A1617]/70">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-[#C9121F] hover:underline font-semibold"
                  disabled={isLocked}
                >
                  Register
                </button>
              </p>
            </div>
          </form>
        </div>
      </motion.div>

      <IdentityConfirmDialog
        isOpen={showIdentityConfirm && !isLocked}
        onClose={() => setShowIdentityConfirm(false)}
        onConfirm={handleIdentityConfirm}
        attempts={identityAttempts}
        maxAttempts={MAX_ATTEMPTS}
      />
    </>
  );
};

export default LoginPage;
