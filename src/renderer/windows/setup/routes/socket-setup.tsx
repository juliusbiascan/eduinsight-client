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

import logo from "../../../assets/passlogo-small.png";

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
      socketUrl: "",
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
      const isConnected = await api.socket.test(values.socketUrl);
      if (isConnected) {
        const status = await api.socket.update(values.socketUrl);
        if (status === 'connected') {
          // Save form data
          await api.store.set('socketSetupData', values);
          toast({
            title: "Success",
            description: "Socket connection established and URL updated successfully.",
            variant: "default",
          });
          setConnectionStatus("Connected");
        } else {
          throw new Error("Failed to update socket URL");
        }
      } else {
        throw new Error("Unable to establish socket connection");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setConnectionStatus("Connection Failed");
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-center mb-6">
        <img src={logo} alt="SMNHS Logo" className="w-32 h-auto" />
      </div>
      <h2 className="text-2xl font-bold text-center mb-6">Socket.io Setup</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="socketUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Socket.io Client URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://127.0.0.1:4000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={!form.formState.isValid || isConnecting}
            className="w-full"
          >
            {isConnecting ? "Connecting..." : "Connect and Save"}
          </Button>
        </form>
      </Form>
      {connectionStatus && (
        <div className={`mt-4 text-center ${connectionStatus === "Connected" ? "text-green-500" : "text-red-500"}`}>
          <FiWifi className="inline-block mr-2" />
          Connection status: {connectionStatus}
        </div>
      )}
    </motion.div>
  );
};

export default SocketSetup;