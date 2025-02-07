import '@/renderer/styles/globals.css';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/renderer/components/ui/form';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/renderer/components/ui/select';
import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { WindowIdentifier, ConnectionMode } from '@/shared/constants';
import { Labaratory } from '@prisma/client';
import { Toaster } from '@/renderer/components/ui/toaster';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMonitor, FiServer, FiWifi, FiRefreshCw } from 'react-icons/fi';
import { Skeleton } from "@/renderer/components/ui/skeleton"; // Add this import
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"

const formSchema = z.object({
  connectionMode: z.string().min(1, { message: "Please select a connection mode." }),
  deviceName: z.string().min(1, { message: "Device name is required." }),
  labId: z.string().min(1, { message: "Please select a lab." }),
  networkName: z.string().min(1, { message: "Please select a network." }),
  devicePurpose: z.string().min(1, { message: "Please select device purpose." }), // Add this line
});

enum SetupStatus {
  Setup = 'Setting up device...',
  SetupFailed = 'Setup failed.',
  SetupSuccessful = 'Setup successful.',
  CheckingConnections = 'Checking connections...',
  ConnectionFailed = 'Connection failed. Please check your database and network settings.',
  CheckingServer = 'Checking server connection...',
  CheckingDatabase = 'Checking database connection...',
  GatheringData = 'Gathering lab information...', // Modified text
  ConnectionComplete = 'Connection established',
  Retrying = 'Retrying connection...',
}

enum SetupStage {
  ConnectionMode,
  DeviceSetup
}

interface ConnectionState {
  server: boolean | null;
  database: boolean | null;
  error?: {
    message: string;
    hints: string[];
  };
}

interface ConnectionModeOption {
  mode: ConnectionMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  requirements: string[];
}

const CONNECTION_MODE_OPTIONS: ConnectionModeOption[] = [
  {
    mode: ConnectionMode.Local,
    title: "Local Network",
    description: "Connect to EduInsight server within your institution's network",
    icon: <FiServer className="w-5 h-5" />,
    benefits: [
      "Faster connection speeds",
      "Lower latency",
      "More secure internal network",
      "Works without internet access"
    ],
    requirements: [
      "Must be on the same network as the server",
      "Local server must be running",
      "Valid network configuration"
    ]
  },
  {
    mode: ConnectionMode.Remote,
    title: "Remote Access",
    description: "Connect to EduInsight server from anywhere via the internet",
    icon: <FiWifi className="w-5 h-5" />,
    benefits: [
      "Access from anywhere",
      "No local network required",
      "Automatic failover support",
      "Cloud-based synchronization"
    ],
    requirements: [
      "Stable internet connection",
      "Minimum 1Mbps bandwidth",
      "Valid remote access credentials"
    ]
  }
];

const ConnectionModeCard: React.FC<{
  option: ConnectionModeOption;
  onSelect: (mode: ConnectionMode) => void;
}> = ({ option, onSelect }) => (
  <motion.div
    key={option.mode}
    className="group relative rounded-xl border-2 border-gray-100 hover:border-blue-200 
               transition-all duration-200 h-full"
  >
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(option.mode)}
      className="w-full h-full p-4 text-left"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            {option.icon}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 flex items-center">
              {option.title}
              {option.mode === ConnectionMode.Local ? (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full">
                  Recommended
                </span>
              ) : (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full">
                  Beta
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-4">
          <div>
            <h4 className="text-xs font-medium text-gray-900 mb-2">Benefits</h4>
            <ul className="space-y-1.5">
              {option.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center text-xs text-gray-600">
                  <span className="mr-1.5 text-green-500">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-900 mb-2">Requirements</h4>
            <ul className="space-y-1.5">
              {option.requirements.map((req, idx) => (
                <li key={idx} className="flex items-center text-xs text-gray-600">
                  <span className="mr-1.5 text-amber-500">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.button>
    <div className="absolute inset-x-0 -bottom-px h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 
                   opacity-0 transition-opacity group-hover:opacity-100" />
  </motion.div>
);

export const DeviceSetup: React.FC = () => {
  const [stage, setStage] = useState<SetupStage>(SetupStage.ConnectionMode);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [labs, setLabs] = useState<Labaratory[]>([]);
  const [networkNames, setNetworkNames] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    server: null,
    database: null
  });
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      connectionMode: ConnectionMode.Local,
      deviceName: "",
      labId: "",
      networkName: "",
      devicePurpose: "" // Add this line
    },
  });

  const checkConnections = async () => {
    setStatus(SetupStatus.CheckingConnections);

    // Reset states but keep retry count
    setIsConnected(false);
    setConnectionState(() => ({
      server: null,
      database: null,
      error: undefined
    }));

    // Add exponential backoff delay based on retry count
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));

    // Step 1: Check server connection
    setStatus(SetupStatus.CheckingServer);
    const connectionMode = form.getValues('connectionMode');
    const socketUrl = connectionMode === ConnectionMode.Local ? process.env.LOCAL_SOCKET_URL : process.env.REMOTE_SOCKET_URL;
    const socketConnected = await api.socket.test(socketUrl);
    setConnectionState(prev => ({ ...prev, server: socketConnected }));
    if (!socketConnected) {
      setConnectionState(prev => ({
        ...prev,
        error: {
          message: 'Unable to connect to server',
          hints: [
            'Check your internet connection',
            'Verify server URL configuration',
            'Make sure server is running'
          ]
        }
      }));
      setStatus(SetupStatus.ConnectionFailed);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Check database connection
    setStatus(SetupStatus.CheckingDatabase);
    const dbUrl = connectionMode === ConnectionMode.Local ? process.env.LOCAL_DATABASE_URL : process.env.REMOTE_DATABASE_URL;
    const dbConnected = await api.database.connect(dbUrl);
    setConnectionState(prev => ({ ...prev, database: dbConnected.success }));
    if (!dbConnected.success) {
      setConnectionState(prev => ({
        ...prev,
        error: {
          message: 'Database connection failed',
          hints: [
            'Check database credentials',
            'Verify database URL configuration',
            'Ensure database server is running',
          ]
        }
      }));
      setStatus(SetupStatus.ConnectionFailed);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Step 3: Gather data
      setStatus(SetupStatus.GatheringData);
      const [labsData, networksData] = await Promise.all([
        api.database.getLabs(),
        api.database.getNetworkNames()
      ]);

      setLabs(labsData);
      setNetworkNames(networksData);

      // Load saved form data
      const savedData = await api.store.get('deviceSetupData') as z.infer<typeof formSchema>;
      if (savedData) {
        form.reset(savedData);
      } else if (labsData.length > 0) {
        // Set the first lab as the default value if no saved data
        form.setValue('labId', labsData[0].id);
      }

      // Connection complete
      setStatus(SetupStatus.ConnectionComplete);
      setIsConnected(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus(null);

    } catch (error) {
      console.error('Data gathering error:', error);
      setConnectionState(prev => ({
        ...prev,
        error: {
          message: 'Failed to load required data',
          hints: [
            'Check network connectivity',
            'Verify database permissions',
            'Try restarting the application'
          ]
        }
      }));
      setStatus(SetupStatus.ConnectionFailed);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setStatus(SetupStatus.Retrying);
    await checkConnections();
    setIsRetrying(false);
  };

  // Disable form submission if not connected
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isConnected) {
      setStatus(SetupStatus.ConnectionFailed);
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    setFormData(values);
    setShowConfirmation(true);
  }

  const handleConfirmedSubmit = () => {
    if (!formData) return;
    
    setStatus(SetupStatus.Setup);
    // Save form data
    api.store.set('deviceSetupData', formData);
    api.database.registerDevice(
      formData.deviceName,
      formData.labId,
      formData.networkName,
    )
      .then(() => {
        api.store.set('devicePurpose', formData.devicePurpose);
        setStatus(SetupStatus.SetupSuccessful);
        setTimeout(() => {
          setStatus(null);
          api.window.closeSetup();
          api.window.open(WindowIdentifier.Main);
        }, 1000);
      })
      .catch((error) => {
        console.error("Setup failed:", error);
        setStatus(SetupStatus.SetupFailed);
        setTimeout(() => setStatus(null), 1000);
      });
  };

  const renderChangeConnectionButton = () => {

    return (

      <Button
        onClick={() => setStage(SetupStage.ConnectionMode)}

        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5"
      >
        <FiWifi className="w-3 h-3" />
        Change Connection Mode
      </Button>
    );
  };

  const renderConnectionError = () => {
    if (!connectionState.error) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-[2px] rounded-xl z-50"
      >
        <div className="w-full max-w-[280px] p-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-3xl mb-1"
            >
              😕
            </motion.div>
            <div className="space-y-2.5 w-full">
              <h3 className="text-sm font-medium text-red-800/90">
                {connectionState.error.message}
              </h3>
              <div className="w-full">
                <p className="text-[11px] uppercase tracking-wider font-medium text-red-700/75 mb-2">
                  Troubleshooting Steps
                </p>
                <ul className="space-y-1.5">
                  {connectionState.error.hints.map((hint, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-[11px] leading-relaxed text-red-600/90 bg-red-50/50 px-3 py-2 rounded-md border border-red-100/50"
                    >
                      {hint}
                    </motion.li>
                  ))}
                </ul>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-2"
              >
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full bg-red-500/90 hover:bg-red-600/90 text-white text-xs py-1.5 h-8 rounded-md"
                >
                  <FiRefreshCw className={`w-3 h-3 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? `Retrying...` : 'Try Again'}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };


  const renderFormSkeleton = () => {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="pb-3 mb-2 border-b">
          <Skeleton className="h-5 w-32 mb-1.5" />
          <Skeleton className="h-3.5 w-40" />
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-3">
            {/* Device Purpose Field */}
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>

            {/* Device Name Field */}
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>

            {/* Lab Field */}
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>

            {/* Network Field */}
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        <div className="pt-3 mt-2 border-t">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    );
  };

  const renderConnectionModeSelection = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full w-full flex items-center justify-center"
    >
      <div className="w-[800px] bg-white rounded-xl p-6 shadow-lg">
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Select Connection Mode</h2>
            <p className="text-sm text-gray-500">Choose how your device will connect to the EduInsight network</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {CONNECTION_MODE_OPTIONS.map((option) => (
              <ConnectionModeCard
                key={option.mode}
                option={option}
                onSelect={(mode) => {
                  form.setValue('connectionMode', mode);
                  setStage(SetupStage.DeviceSetup);
                  checkConnections();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderConfirmationDialog = () => (
    <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Device Setup</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to complete the device setup? Please verify the following details:
            <div className="mt-4 space-y-2 text-sm text-gray-900">
              <p><span className="font-medium">Device Purpose:</span> {formData?.devicePurpose === 'TEACHING' ? 'Teaching Device' : 'Student Device'}</p>
              <p><span className="font-medium">Device Name:</span> {formData?.deviceName}</p>
              <p><span className="font-medium">Lab:</span> {labs.find(lab => lab.id === formData?.labId)?.name}</p>
              <p><span className="font-medium">Network:</span> {formData?.networkName}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmedSubmit}
            className="bg-gradient-to-r from-[#C9121F] to-[#EBC42E] hover:opacity-90"
          >
            Confirm Setup
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full w-full p-4" // Reduced padding
    >
      <AnimatePresence mode="wait">
        {stage === SetupStage.ConnectionMode ? (
          renderConnectionModeSelection()
        ) : (
          <div className="h-full grid grid-cols-[300px_1fr] gap-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-3"> {/* Adjusted grid and spacing */}
            {/* Status Panel */}
            <div className="bg-gray-50/80 rounded-xl p-3 flex flex-col gap-3"> {/* Adjusted padding and gap */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="p-2 rounded-lg bg-gradient-to-br from-[#C9121F] to-[#EBC42E]"
                >
                  <FiMonitor className="text-xl text-white" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Device Setup</h2>
                  <p className="text-sm text-gray-500">Configure your device settings</p>
                </div>
              </div>

              <motion.div
                key={status || 'ready'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${!status ? 'bg-white text-gray-600' :
                    status === SetupStatus.SetupSuccessful ? 'bg-green-50 text-green-700 border border-green-200' :
                      status === SetupStatus.SetupFailed || status === SetupStatus.ConnectionFailed ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
              >
                {status || 'Ready to setup'}
              </motion.div>

              <div className="flex-1 bg-white rounded-lg p-3 space-y-2 overflow-y-auto">
                {/* Connection Status Items */}
                {[
                  {
                    title: 'Server Connection',
                    status: connectionState.server,
                    icon: <FiServer />,
                    active: status === SetupStatus.CheckingServer,
                    description: "Connecting to server..."
                  },
                  {
                    title: 'Database Connection',
                    status: connectionState.database,
                    icon: <FiWifi />,
                    active: status === SetupStatus.CheckingDatabase,
                    description: "Establishing database connection..."
                  },
                  {
                    title: 'Lab Info',
                    status: labs.length > 0,
                    icon: <FiMonitor />,
                    active: status === SetupStatus.GatheringData,
                    description: "Getting lab information..."
                  }
                ].map(({ title, status, icon, active, description }) => (
                  <motion.div
                    key={title}
                    className={`flex items-center p-2.5 rounded-lg transition-all ${active ? 'bg-blue-50 shadow-sm' : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="relative">
                      <div className={`p-2 rounded-lg ${status === null ? 'bg-gray-100' :
                          status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                        {icon}
                      </div>
                      {status && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white"
                        />
                      )}
                    </div>
                    <div className="ml-4">
                      <span className="font-medium text-gray-900">{title}</span>
                      {active && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-gray-500 block mt-0.5"
                        >
                          {description}
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

            
                <div className="pt-2 border-t space-y-2">
                  {renderChangeConnectionButton()}
                </div>
              
            </div>

            {/* Form Panel */}
            <div className="bg-white rounded-xl shadow-sm p-3 flex flex-col relative"> {/* Added relative */}
              <AnimatePresence mode="wait">
                {isConnected ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col h-full relative" // Added relative
                  >
                    <div className="pb-3 mb-2 border-b"> {/* Reduced spacing */}
                      <h3 className="text-base font-semibold text-gray-900">Device Configuration</h3> {/* Smaller text */}
                      <p className="text-xs text-gray-500">Enter the required information</p> {/* Smaller text */}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3"> {/* Reduced spacing */}
                          {/* Form Fields remain the same but with updated styles */}
                          <FormField
                            control={form.control}
                            name="devicePurpose"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium">Device Purpose</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9 text-sm bg-white/50 border-gray-200"> {/* Smaller height */}
                                      <SelectValue placeholder="Select device purpose" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="TEACHING">Teaching Device</SelectItem>
                                    <SelectItem value="STUDENT">Student Device</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" /> {/* Smaller error message */}
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
                        </form>
                      </Form>
                    </div>

                    <div className="pt-3 mt-2 border-t"> {/* Reduced spacing */}
                      <Button
                        type="submit"
                        onClick={form.handleSubmit(onSubmit)}
                        className="w-full bg-gradient-to-r from-[#C9121F] to-[#EBC42E] hover:opacity-90 text-white py-2 rounded-lg text-sm"
                      >
                        Complete Setup
                      </Button>
                    </div>
                    {connectionState.error && renderConnectionError()}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full w-full px-1" // Added padding to match form
                  >
                    {!status?.includes('failed') ? renderFormSkeleton() : renderConnectionError()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </AnimatePresence>
      {renderConfirmationDialog()}
      <Toaster />
    </motion.div>
  );
};
