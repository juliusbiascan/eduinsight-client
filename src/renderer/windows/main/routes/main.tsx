import '../../../styles/globals.css';
import { useEffect, useState } from 'react';
import { Device } from '@prisma/client';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../hooks/use-toast';
import { WindowIdentifier } from '@/shared/constants';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Message from '../../../components/ui/message';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.database.getDevice().then((devices) => {
      if (devices.length > 0) {
        setDevice(devices[0]);
      }
    });
  }, []);

  const handleGuestMode = () => {
    api.window.close(WindowIdentifier.Main);
    api.window.openInTray(WindowIdentifier.Dashboard);
    toast({
      title: 'Guest Mode Activated',
      description: 'You are now using the device in guest mode. ',
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const { success, message } = await api.auth.login({ 
        deviceId: device?.id, 
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
          api.window.close(WindowIdentifier.Main);
        }, 1500);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              className="w-full"
            />
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? "Hide" : "Show"}
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#1A1617]/70">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGuestMode}
            className="w-full py-4 text-lg font-semibold bg-white hover:bg-gray-50 text-[#1A1617] border border-gray-300 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Guest Mode
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default MainPage;
