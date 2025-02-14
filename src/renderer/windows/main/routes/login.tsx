import '../../../styles/globals.css';
import { useCallback, useEffect, useState } from 'react';
import { Device } from '@prisma/client';
import { Button } from '../../../components/ui/button';
import { WindowIdentifier } from '@/shared/constants';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Message from '../../../components/ui/message';
import { Eye, EyeOff } from 'lucide-react';

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

  const checkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || isLoading) return;
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await api.auth.verifyUser(identifier);
      
      if (response.success && response.allowDirectLogin) {
        // Perform direct login for users without password
        if (device) {
          const { success, message } = await api.auth.login({ 
            deviceId: device.id, 
            email: /\S+@\S+\.\S+/.test(identifier) ? identifier : undefined,
            studentId: !/\S+@\S+\.\S+/.test(identifier) ? identifier : undefined,
            password: '', // Empty password for direct login
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

        {message && (
          <Message type={message.type} message={message.text} />
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
                  disabled={userFound}
                />
                {formErrors.identifier && (
                  <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.identifier}</p>
                )}
              </div>
              <Button 
                type={userFound ? "button" : "submit"}
                onClick={userFound ? handleIdentifierChange : undefined}
                disabled={!identifier || isLoading}
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
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                disabled={isLoading}
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
              >
                Register
              </button>
            </p>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default LoginPage;
