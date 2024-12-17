import React, { useState, useEffect } from 'react';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/renderer/components/ui/form';
import { Input } from '@/renderer/components/ui/input';
import { Button } from '@/renderer/components/ui/button';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useToast } from '@/renderer/hooks/use-toast';
import { Toaster } from '@/renderer/components/ui/toaster';
import { motion } from 'framer-motion';
import { FiDatabase } from 'react-icons/fi';

interface DatabaseFormData {
  hostname: string;
  port: string;
  username: string;
  password: string;
  databaseName: string;
}

const DatabaseSetup: React.FC = () => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<DatabaseFormData>();

  useEffect(() => {
    api.window.receive('error', (event, error) => {
      setError(error as any);
    });
  }, []);

  useEffect(() => {
    const loadSavedData = async () => {
      const savedData = await api.store.get('databaseSetupData') as DatabaseFormData;
      if (savedData) {
        form.reset(savedData);
      }
    };
    loadSavedData();
  }, [form]);

  const onSubmit = async (data: DatabaseFormData) => {
    setIsConnecting(true);
    setError(null);

    try {
      const url = `mysql://${data.username}:${data.password}@${data.hostname}:${data.port}/${data.databaseName}`;

      // Save form data
      await api.store.set('databaseSetupData', data);

      // Test the connection
      const { success, error } = await api.database.connect(url);

      if (success) {
        setIsConnected(true);
        // If connection is successful, save the URL and navigate to the next setup step
        toast({
          title: 'Database connected successfully',
          description: 'You can now proceed to the next step',
          duration: 3000, // Display for 3 seconds
        });

        // Close the current window after 2 seconds
        setTimeout(() => {
          // Send a signal to the main process
          api.database.initialize();
        }, 2000);
      } else {
        setError(error);
        toast({
          title: 'Connection failed',
          description: error,
          variant: 'destructive',
          duration: 5000, // Display for 5 seconds
        });
      }
    } catch (err) {
      const errorMessage = 'An error occurred while connecting to the database.';
      setError(errorMessage);
      console.error('Database connection error:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000, // Display for 5 seconds
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center space-y-4 pb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <FiDatabase className="text-6xl mx-auto text-blue-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-blue-600">Database Setup</h2>
        <p className="text-sm text-gray-600">Configure your database connection</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="hostname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Hostname</FormLabel>
                  <FormControl>
                    <Input placeholder="localhost" {...field} className="h-8 text-sm" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Port</FormLabel>
                  <FormControl>
                    <Input placeholder="3306" {...field} className="h-8 text-sm" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Username</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-sm" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      {...field}
                      className="h-8 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="databaseName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Database Name</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-sm" />
                </FormControl>
              </FormItem>
            )}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white" disabled={isConnecting || isConnected}>
            {isConnected ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Connected
              </>
            ) : isConnecting ? (
              'Connecting...'
            ) : (
              'Connect'
            )}
          </Button>
        </form>
      </Form>
      <Toaster />
    </motion.div>
  );
};

export default DatabaseSetup;