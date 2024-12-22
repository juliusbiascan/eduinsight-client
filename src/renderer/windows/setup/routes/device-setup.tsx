import '@/renderer/styles/globals.css';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/renderer/components/ui/form';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/renderer/components/ui/select';
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { WindowIdentifier } from '@/shared/constants';
import { Labaratory } from '@prisma/client';
import { Toaster } from '@/renderer/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/renderer/components/ui/dialog';
import { motion } from 'framer-motion';
import { FiMonitor, FiServer, FiWifi } from 'react-icons/fi';

const formSchema = z.object({
  deviceName: z.string().min(1, { message: "Device name is required." }),
  labId: z.string().min(1, { message: "Please select a lab." }),
  networkName: z.string().min(1, { message: "Please select a network." }),
  devicePurpose: z.string().min(1, { message: "Please select device purpose." }), // Add this line
});

enum SetupStatus {
  Setup = 'Setting up device...',
  SetupFailed = 'Setup failed.',
  SetupSuccessful = 'Setup successful.',
}

export const DeviceSetup: React.FC = () => {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [labs, setLabs] = useState<Labaratory[]>([]);
  const [networkNames, setNetworkNames] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      deviceName: "", 
      labId: "", 
      networkName: "",
      devicePurpose: "" // Add this line
    },
  });

  useEffect(() => {
    const fetch = async () => {
      setLabs(await api.database.getLabs());
      setNetworkNames(await api.database.getNetworkNames());
    };
    fetch();

    // Load saved form data
    const loadSavedData = async () => {
      const savedData = await api.store.get('deviceSetupData') as z.infer<typeof formSchema>;
      if (savedData) {
        form.reset(savedData);
      }
    };
    loadSavedData();
  }, [form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setStatus(SetupStatus.Setup);
    // Save form data
    api.store.set('deviceSetupData', values);
    api.database.registerDevice(
      values.deviceName, 
      values.labId, 
      values.networkName,
    )
      .then(() => {
        api.store.set('devicePurpose',  values.devicePurpose );
        setStatus(SetupStatus.SetupSuccessful);
        setTimeout(() => {
          setStatus(null);
          api.window.closeSetup();
          api.window.open(WindowIdentifier.Splash);
        }, 1000);
      })
      .catch((error) => {
        console.error("Setup failed:", error);
        setStatus(SetupStatus.SetupFailed);
        setTimeout(() => setStatus(null), 1000);
      });
  }

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
          <FiMonitor className="text-5xl mx-auto text-[#C9121F]" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900">Device Setup</h2>
        <p className="text-gray-500">Configure your device settings</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="devicePurpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Device Purpose</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white/50 border-gray-200 hover:bg-white/80 transition-colors">
                      <SelectValue placeholder="Select device purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TEACHING">Teaching Device</SelectItem>
                    <SelectItem value="STUDENT">Student Device</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deviceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Device Name</FormLabel>
                <FormControl>
                  <Input placeholder="Device name" {...field} className="bg-white border border-blue-200 rounded focus:border-purple-400" />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="labId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Lab</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white border border-blue-200 rounded focus:border-purple-400">
                      <SelectValue placeholder="Select a lab" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {labs.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>{lab.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="networkName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Network</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white border border-blue-200 rounded focus:border-purple-400">
                      <SelectValue placeholder="Select a network" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {networkNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />
          <div className="flex justify-center spacse-x-4 my-3">
            <FiServer className="text-2xl text-blue-500" />
            <FiWifi className="text-2xl text-purple-500" />
          </div>
          <div className="flex flex-col space-y-2">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#C9121F] to-[#EBC42E] hover:opacity-90 transition-opacity text-white"
            >
              Setup Device
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={!!status}>
        <DialogContent className="bg-white/80 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {status}
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Toaster />
    </motion.div>
  );
}
