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
import { Eye, EyeOff } from 'lucide-react'; // Add import for eye icons

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formErrors, setFormErrors] = useState<{email?: string; password?: string}>({});

  useEffect(() => {
    api.database.getDevice().then((device) => {
      setDevice(device);
    });
  }, []);

  const validateForm = () => {
    const errors: {email?: string; password?: string} = {};
    if (!email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Invalid email format';
    if (!password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = useCallback( async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      if (device) {
        console.log(device.name);
        const { success, message } = await api.auth.login({ 
          deviceId: device.id, 
          email, 
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
  }, [device, email, password]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="absolute inset-0 bg-[#EBC42E]/20 blur-3xl rounded-full transform -rotate-12" />
      <div className="relative flex flex-col items-center bg-white p-10 rounded-2xl border border-[#1A1617]/5 shadow-xl">
        <h2 className="text-3xl font-bold text-[#1A1617] mb-8">
          Welcome <span className="text-[#C9121F]">Back!</span>
        </h2>

        {message && (
          <Message type={message.type} message={message.text} />
        )}

        <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full ${formErrors.email ? 'border-red-500' : ''}`}
            />
            {formErrors.email && <p className="text-red-500 text-sm">{formErrors.email}</p>}
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full ${formErrors.password ? 'border-red-500' : ''}`}
            />
            {formErrors.password && <p className="text-red-500 text-sm">{formErrors.password}</p>}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                navigate('/reset');
              }}
              className="text-sm text-[#C9121F] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          <div className="text-center">
            <p className="text-[#1A1617]/70">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  navigate('/signup');
                }}
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
