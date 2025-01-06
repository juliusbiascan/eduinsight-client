import React, { useState, useCallback, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";
import { FiWifi } from "react-icons/fi";
import { Button } from "@/renderer/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/renderer/components/ui/form";
import { Input } from "@/renderer/components/ui/input";
import { useToast } from "@/renderer/hooks/use-toast";
import { Toaster } from "@/renderer/components/ui/toaster";

const formSchema = z.object({
  socketUrl: z.string().url("Please enter a valid URL"),
});

const SocketSetup: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      socketUrl: "https://192.168.1.142:4000",
    },
  });

  useEffect(() => {
    const loadSavedData = async () => {
      const savedData = await api.store.get('socketSetupData') as z.infer<typeof formSchema>;
      if (savedData) {
        form.reset(savedData);
      }
    };
    loadSavedData();
  }, [form]);

  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    setIsConnecting(true);
    setConnectionStatus("Initializing...");

    try {
      // Save form data
      await api.store.set('socketSetupData', values);
      
      const status = await api.socket.update(values.socketUrl);
      
      if (status === 'connected') {
        setConnectionStatus("Connected");
        toast({
          title: "Success",
          description: "Socket connection established successfully.",
          variant: "default",
        });
        
        // Close the setup window after successful connection
        setTimeout(() => {
          api.database.initialize();
        }, 2000);
      } else {
        throw new Error("Failed to establish socket connection");
      }
    } catch (error) {
      console.error("Error:", error);
      setConnectionStatus("Connection Failed");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <FiWifi className="text-5xl mx-auto text-[#C9121F]" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900">Socket Connection</h2>
        <p className="text-gray-500">Configure your socket server connection</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="socketUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Socket Server URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://your-server:4000"
                    {...field}
                    className="bg-white/50 border-gray-200 hover:bg-white/80 transition-colors"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          {connectionStatus && (
            <div className={`p-3 rounded-lg ${
              connectionStatus === "Connected" 
                ? "bg-green-50 text-green-600" 
                : "bg-yellow-50 text-yellow-600"
            } text-sm text-center`}>
              {connectionStatus}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-[#C9121F] to-[#EBC42E] hover:opacity-90 transition-opacity text-white"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </span>
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

export default SocketSetup;