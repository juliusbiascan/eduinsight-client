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
    defaultValues: { deviceName: "", labId: "", networkName: "" },
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
    api.database.registerDevice(values.deviceName, values.labId, values.networkName)
      .then(() => {
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="p-4">
      <div className="text-center mb-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
          <FiMonitor className="text-4xl mx-auto text-blue-500" />
        </motion.div>
        <h2 className="text-xl font-bold text-blue-600">Device Setup</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
          <div className="flex justify-center space-x-4 my-3">
            <FiServer className="text-2xl text-blue-500" />
            <FiWifi className="text-2xl text-purple-500" />
          </div>
          <div className="flex flex-col space-y-2">
            <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
              Setup Device
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={!!status} onOpenChange={() => setStatus(null)}>
        <DialogContent className="sm:max-w-[300px] bg-white rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-600">{status}</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Toaster />
    </motion.div>
  );
}
