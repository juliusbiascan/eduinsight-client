// Import statements reorganized and grouped
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Peer as PeerClient } from 'peerjs';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Device,
  DeviceUser,
  Quiz,
  QuizRecord,
  Subject,
  DeviceUserRole,
} from '@prisma/client';
import {
  LogOut,
  RefreshCw,
  Book,
  PlusCircle,
  Minimize2,
  Folders,
  Settings2Icon,
  Trash2Icon,
  Download,
  FileDown,
  AlertCircle,
  Folder,
  Bell,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Local imports
import logo from '@/renderer/assets/passlogo-small.png';
import { WindowIdentifier } from '@/shared/constants';
import { useSocket } from '@/renderer/components/socket-provider';
import { useToast } from '../../../hooks/use-toast';
import { useNotifications } from '../../../hooks/use-notifications';
import { NotificationPanel } from '../../../components/notification/notification-panel';

// UI Components imports
import { Toaster } from '../../../components/ui/toaster';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Avatar, AvatarFallback } from '@/renderer/components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Label } from '@/renderer/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/renderer/components/ui/alert-dialog';

// Add these type definitions
interface ApiInterface {
  database: {
    getDevice: () => Promise<Device>;
    getActiveUserByDeviceId: (deviceId: string, labId: string) => Promise<any>;
    userLogout: (userId: string) => Promise<void>;
    getStudentSubjects: (
      userId: string,
    ) => Promise<(Subject & { quizzes: Quiz[]; quizRecord: QuizRecord[] })[]>;
    joinSubject: (
      subjectCode: string,
      userId: string,
      labId: string,
    ) => Promise<{ success: boolean; subjectId?: string; message?: string }>;
    leaveSubject: (
      subjectId: string,
      userId: string,
    ) => Promise<{ success: boolean; message?: string }>;
    getActiveUserByUserId: (userId: string) => Promise<any>;
  };
  window: {
    open: (identifier: string) => void;
    close: (identifier: string) => void;
    hide: (identifier: string) => void;
    receive: (channel: string, callback: (...args: any[]) => void) => void;
  };
  files: {
    openFile: (path: string) => void;
    openDownloadsFolder: () => void;
    getDownloads: () => Promise<Downloads>;
  };
  screen: {
    getScreenSourceId: () => Promise<string>;
  };
  quiz: {
    play: (quizId: string) => void;
  };
}

// Add a declaration for the api object if it's not already typed
declare const api: ApiInterface;

// Add a type for openDownloadsFolder if it's missing
const openDownloadsFolder = (): void => {
  api.files.openDownloadsFolder();
};

// Types and Interfaces
interface FileTransfer {
  id: string;
  filename: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
  subjectName?: string;
  error?: string;
}

interface VideoOverlayProps {
  showVideo: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onClose: () => void;
}

interface FileTransferProgressProps {
  fileTransfers: Record<string, FileTransfer>;
}

interface Downloads {
  files: {
    name: string;
    path: string;
    subjectName: string;
    date: string;
  }[];
  subjects: string[];
  isEmpty: boolean;
  error?: string;
}

// Helper Components
const VideoOverlay: React.FC<VideoOverlayProps> = ({
  showVideo,
  videoRef,
  onClose,
}) => {
  if (!showVideo) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-end p-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          muted={false}
          controls // Add controls to allow manual playback
        />
      </div>
    </div>
  );
};

const FileTransferProgress: React.FC<FileTransferProgressProps> = ({
  fileTransfers,
}) => {
  const transfers = Object.values(fileTransfers).filter(
    (transfer) => transfer.status === 'downloading',
  );

  if (transfers.length === 0) return null;

  const getProgressDisplay = (progress: number) => {
    return progress >= 100 ? 'Done' : `${progress.toFixed(0)}%`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-4 right-4 w-[400px] bg-white rounded-lg shadow-lg z-50 border border-gray-200"
      >
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Downloads</h3>
            <span className="text-xs text-gray-500">
              {transfers.length} {transfers.length === 1 ? 'file' : 'files'}{' '}
              downloading
            </span>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {transfers.map((transfer) => (
            <motion.div
              key={transfer.id}
              className="p-4 border-b last:border-b-0"
              exit={
                transfer.progress >= 100
                  ? {
                      opacity: 0,
                      height: 0,
                      marginTop: 0,
                      marginBottom: 0,
                      padding: 0,
                    }
                  : undefined
              }
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {transfer.filename}
                  </p>
                  {transfer.subjectName && (
                    <p className="text-xs text-gray-500">
                      From: {transfer.subjectName}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium ml-2 ${
                    transfer.progress >= 100
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {getProgressDisplay(transfer.progress)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full transition-colors ${
                    transfer.status === 'error'
                      ? 'bg-red-500'
                      : transfer.progress >= 100
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${transfer.progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              {transfer.error && (
                <p className="text-xs text-red-500 mt-1">{transfer.error}</p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const StudentConsole: React.FC = () => {
  // State Management
  const [user, setUser] = useState<DeviceUser>();
  const [subjects, setSubjects] = useState<
    (Subject & { quizzes: Quiz[]; quizRecord: QuizRecord[] })[]
  >([]);
  const [selectedSubject, setSelectedSubject] = useState<
    (Subject & { quizzes: Quiz[]; quizRecord: QuizRecord[] }) | null
  >(null);
  const [subjectCode, setSubjectCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLeavingSubject, setIsLeavingSubject] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [downloads, setDownloads] = useState<Downloads>({
    files: [],
    subjects: [],
    isEmpty: true,
  });
  const [fileTransfers, setFileTransfers] = useState<
    Record<string, FileTransfer>
  >({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Refs
  const peerRef = useRef<PeerClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Hooks
  const { toast } = useToast();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    removeNotification,
  } = useNotifications(user?.id || '');

  // Add this before the useEffect hooks
  const fetchSubjects = useCallback(async () => {
    if (!user || !socket || !isConnected) return;
    try {
      const data = await api.database.getStudentSubjects(user.id);
      if (data.length > 0) {
        setSubjects(data);
        setSelectedSubject(data[0]);
        // Only emit if socket is connected
        if (socket && isConnected) {
          socket.emit('join-subject', {
            userId: user.id,
            subjectId: data[0].id,
          });
        }
      } else {
        setSubjects([]);
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
    }
  }, [user, socket, isConnected, toast]); // Add dependencies

  // Add fetchDownloads before the useEffect hooks
  const fetchDownloads = useCallback(async (): Promise<void> => {
    try {
      const result = await api.files.getDownloads();
      setDownloads(result);
    } catch (error) {
      console.error('Error fetching downloads:', error);
      setDownloads({
        files: [],
        subjects: [],
        isEmpty: true,
        error: 'Failed to load downloads',
      });
    }
  }, []); // No dependencies since it only uses the API

  // Effects
  useEffect(() => {
    // Access validation effect
    const validateAccess = async () => {
      try {
        const device = await api.database.getDevice();
        const activeUser = await api.database.getActiveUserByDeviceId(
          device.id,
          device.labId,
        );

        if (!activeUser || activeUser.user.role !== DeviceUserRole.STUDENT) {
          navigate('/');

          window.close();
        }
      } catch (error) {
        console.error('Access validation error:', error);
        navigate('/');
        window.close();
      }
    };

    validateAccess();
  }, [navigate]);

  useEffect(() => {
    // User initialization effect
    api.database.getDevice().then((device: Device) => {
      api.database
        .getActiveUserByDeviceId(device.id, device.labId)
        .then((activeUser) => {
          if (activeUser) {
            setUser(activeUser.user);
          } else {
            toast({
              title: 'Error',
              description: 'No active user found for this device.',
              variant: 'destructive',
            });
          }
        });
    });
  }, []);

  useEffect(() => {
    // Socket connection effect
    let mounted = true;

    const initializeSocket = async () => {
      if (!user || !socket || !isConnected) return;

      try {
        if (mounted) {
          socket.emit('join-server', user.id);
          await fetchSubjects();
        }
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initializeSocket();

    return () => {
      mounted = false;
    };
  }, [user, socket, isConnected, fetchSubjects]);
  useEffect(() => {
    // Peer connection setup effect
    const userId = selectedSubject?.userId; // Make sure to use teacherId instead of userId
    if (!userId) {
      console.log('No teacher found for this subject');
      return;
    }

    // Cleanup previous peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Stop any existing media streams
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    api.database.getActiveUserByUserId(userId).then((activeUser) => {
      if (!activeUser || !user?.id) {
        console.error('No active user found or missing user ID');
        return;
      }

      console.log(
        'Creating new peer connection with host:',
        activeUser.device.devHostname,
      );

      const newPeer = new PeerClient(user.id, {
        host: activeUser.device.devHostname,
        port: 9001,
        path: '/eduinsight',
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      newPeer.on('open', async (id) => {
        console.log('Peer connection established with ID:', id);
        const screen = await api.screen.getScreenSourceId();
        const mediaStream = await (navigator.mediaDevices as any).getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: screen,
              maxWidth: 1920,
              maxHeight: 1080,
              frameRate: { ideal: 30, max: 60 },
            },
          },
        });

        // Store stream reference for cleanup
        mediaStreamRef.current = mediaStream;

        const call = newPeer.call(activeUser.userId, mediaStream);
        console.log('Screen share call:', call);

        call.on('error', (err) => {
          console.error(`Call error for user ${activeUser.userId}:`, err);
        });

        peerRef.current = newPeer;
      });

      // Rest of the peer connection code remains the same...
      // (Keep all the existing event handlers for 'call', 'error', 'disconnected', etc.)

      return () => {
        // Cleanup function
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (peerRef.current) {
          console.log('Cleaning up peer connection');
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (
              videoRef.current.srcObject as MediaStream
            ).getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
          }
          peerRef.current.destroy();
          peerRef.current = null;
        }
        setShowVideo(false); // Hide video when cleaning up
      };
    });
  }, [selectedSubject, user?.id]); // Update dependencies to include selectedSubject

  // Add useEffect to fetch downloads on mount
  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  // Event Handlers
  const handleLogout = () => {
    if (!user || !socket || !isConnected) return;

    try {
      api.database.userLogout(user.id);
      if (selectedSubject) {
        socket.emit('logout-user', {
          userId: user.id,
          subjectId: selectedSubject.id,
        });
      }
      api.window.open(WindowIdentifier.Main);
      window.close();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleJoinSubject = async () => {
    if (!subjectCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a subject code',
        variant: 'destructive',
      });
      return;
    }

    if (!socket || !isConnected) {
      toast({
        title: 'Error',
        description: 'Not connected to server',
        variant: 'destructive',
      });
      return;
    }

    setIsJoining(true);
    try {
      const existingSubjects = await api.database.getStudentSubjects(user.id);
      const alreadyJoined = existingSubjects.some(
        (subject) => subject.subjectCode === subjectCode,
      );

      if (alreadyJoined) {
        toast({
          title: 'Info',
          description: 'You have already joined this subject',
          variant: 'default',
        });
        setSubjectCode('');
      } else {
        const result = await api.database.joinSubject(
          subjectCode,
          user.id,
          user.labId,
        );
        if (result.success) {
          socket.emit('join-subject', {
            userId: user.id,
            subjectId: result.subjectId,
          });
          toast({
            title: 'Success',
            description: 'Subject joined successfully',
          });
          setSubjectCode('');
          fetchSubjects();
        } else {
          toast({
            title: 'Error',
            description: result.message || 'Failed to join subject',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error joining subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to join subject',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
      setIsJoinDialogOpen(false);
    }
  };

  const handleSubjectChange = (value: string) => {
    if (!socket || !isConnected || !user) return;

    const subject = subjects.find((s) => s.id.toString() === value);
    setSelectedSubject(subject || null);

    if (subject) {
      socket.emit('join-subject', {
        userId: user.id,
        subjectId: subject.id,
      });
    }
  };

  const calculateProgress = () => {
    if (!selectedSubject) return { quizzes: 0, overall: 0 };

    const userQuizRecords = selectedSubject.quizRecord.filter(
      (record) => record.userId === user.id,
    );
    const completedQuizzes = userQuizRecords.length;
    const totalQuizzes = selectedSubject.quizzes.filter(
      (quiz) => quiz.published,
    ).length;

    const quizProgress =
      totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;

    const overallProgress = quizProgress;

    return {
      quizzes: completedQuizzes,
      overall: Math.round(overallProgress),
    };
  };

  const handleLeaveSubject = async () => {
    if (!selectedSubject) {
      toast({
        title: 'Error',
        description: 'Please select a subject to leave',
        variant: 'destructive',
      });
      return;
    }
    setIsLeavingSubject(true);
    try {
      const result = await api.database.leaveSubject(
        selectedSubject.id,
        user.id,
      );
      if (result.success) {
        socket.emit('leave-subject', {
          userId: user.id,
          subjectId: selectedSubject.id,
        });
        toast({ title: 'Success', description: 'Subject left successfully' });
        setSelectedSubject(null);
        fetchSubjects();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to leave subject',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error leaving subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave subject',
        variant: 'destructive',
      });
    } finally {
      setIsLeavingSubject(false);
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    api.quiz.play(quizId);
  };

  const handleRefresh = () => {
    window.location.reload();
    toast({
      title: 'Refreshed',
      description: 'Page content has been updated.',
    });
  };

  const handleMinimizeWindow = () => {
    api.window.hide(WindowIdentifier.Dashboard);
  };

  const handleOpenFile = (filePath: string): void => {
    if (filePath) {
      api.files.openFile(filePath);
    }
  };

  const openFile = (filePath: string): void => {
    api.files.openFile(filePath);
  };

  const renderDownloadsButton = () => (
    <Dialog open={isDownloadsOpen} onOpenChange={setIsDownloadsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Folder className="h-4 w-4" />
          <span className="sr-only">Downloads</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Downloaded Files</DialogTitle>
          <DialogDescription>
            Access your downloaded course materials and resources
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto mt-4">
          {downloads.error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <p className="text-red-600">
                Error loading files: {downloads.error}
              </p>
            </div>
          ) : downloads.isEmpty ? (
            <div className="text-center py-8">
              <Folder className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 font-medium">No Files Found</p>
              <p className="text-gray-400 text-sm mt-1">
                Downloaded files will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {downloads.subjects.map((subject) => (
                <div key={subject} className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-900">
                    {subject}
                  </h3>
                  <div className="space-y-2">
                    {downloads.files
                      .filter((file) => file.subjectName === subject)
                      .map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <FileDown className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(file.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openFile(file.path)}
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Open file</span>
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={openDownloadsFolder}
            className="w-full sm:w-auto"
          >
            Open Downloads Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderSubjectMaterials = () => (
    <div className="bg-white rounded-xl shadow-sm mt-6">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Subject Materials</h2>
        <p className="text-sm text-gray-500">
          Access your downloaded files and resources
        </p>
      </div>

      <div className="p-6">
        {downloads.error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600">
              Error loading files: {downloads.error}
            </p>
          </div>
        ) : !downloads.files.some(
            (file) =>
              !selectedSubject || file.subjectName === selectedSubject.name,
          ) ? (
          <div className="text-center py-8 text-gray-500">
            <FileDown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">No Files Found</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedSubject
                ? `No files downloaded for ${selectedSubject.name} yet`
                : 'Select a subject to view its files'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {downloads.files
              .filter(
                (file) =>
                  !selectedSubject || file.subjectName === selectedSubject.name,
              )
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-50 rounded-full">
                      <FileDown className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {file.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {file.subjectName}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(file.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openFile(file.path)}
                    className="ml-4"
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Open file</span>
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  // Add state to control body scroll
  useEffect(() => {
    if (showNotifications) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showNotifications]);

  // Update notification handling in useEffect
  useEffect(() => {
    api.window.receive(
      'file-progress',
      async (
        event: unknown,
        fileId: string,
        filename: string,
        progress: number,
        subjectName: string,
      ) => {
        // Update file transfer state
        setFileTransfers((prev) => ({
          ...prev,
          [fileId]: {
            id: fileId,
            filename,
            progress,
            status: 'downloading',
            subjectName,
          },
        }));

        // Add download progress notification
        await addNotification({
          type: 'file',
          title: 'Downloading File',
          message: `Downloading "${filename}" - ${progress.toFixed(0)}%`,
          time: new Date().toISOString(),
          read: false,
          status: 'downloading',
          progress,
          subjectName,
        });
      },
    );

    api.window.receive(
      'file-received',
      async (
        event: unknown,
        fileId: string,
        filename: string,
        path: string,
        subjectName: string,
      ) => {
        console.log('File received:', { fileId, filename, path, subjectName }); // Debug log

        // First update the transfer state
        setFileTransfers((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: 'completed',
            progress: 100,
          },
        }));

        try {
          // Add completion notification
          await addNotification({
            type: 'file',
            title: 'File Downloaded',
            message: `Successfully downloaded "${filename}"`,
            time: new Date().toISOString(),
            read: false,
            status: 'completed',
            filePath: path,
            subjectName,
          });
        } catch (error) {
          console.error('Error handling file received:', error);
        }

        // Remove the transfer after animation
        setTimeout(() => {
          setFileTransfers((prev) => {
            const newTransfers = { ...prev };
            delete newTransfers[fileId];
            return newTransfers;
          });
        }, 3000);
      },
    );

    api.window.receive(
      'file-receive-error',
      async (
        event: unknown,
        fileId: string,
        filename: string,
        error: string,
      ) => {
        setFileTransfers((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: 'error',
            error,
          },
        }));

        await addNotification({
          type: 'file' as const,
          title: 'Download Failed',
          message: `Failed to download "${filename}"`, // Add quotes around filename
          time: new Date().toISOString(),
          read: false,
          status: 'error',
          error: error as string,
        });
      },
    );
  }, [fetchDownloads]);

  // Main Render
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <VideoOverlay
        showVideo={showVideo}
        videoRef={videoRef}
        onClose={() => {
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (
              videoRef.current.srcObject as MediaStream
            ).getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
          }
          setShowVideo(false);
        }}
      />
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="PASS College Logo" className="h-8 w-auto" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  EduInsight
                </h1>
                <p className="text-sm text-gray-500">Student Console</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Add this connection status indicator before the other buttons */}
              <div className="flex items-center" title={isConnected ? 'Connected' : 'Disconnected'}>
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-[10px] font-medium text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute top-16 right-4 z-50">
                  <NotificationPanel
                    notifications={notifications}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                    onClose={() => setShowNotifications(false)}
                    onOpenFile={handleOpenFile}
                  />
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {renderDownloadsButton()}
              <Dialog
                open={isProfileDialogOpen}
                onOpenChange={setIsProfileDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.firstName[0]}
                        {user?.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#C9121F]">
                      Student Profile
                    </DialogTitle>
                  </DialogHeader>
                  <div className="pt-4">
                    <div className="flex items-center justify-center mb-6">
                      <Avatar className="h-24 w-24">
                        <AvatarFallback className="text-3xl">
                          {user?.firstName[0]}
                          {user?.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="space-y-4">
                      {/* Personal Information */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">
                          Personal Information
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Full Name:
                            </span>
                            <span className="text-sm font-medium">
                              {user?.firstName} {user?.lastName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Student ID:
                            </span>
                            <span className="text-sm font-medium">
                              {user?.schoolId}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Course:
                            </span>
                            <span className="text-sm font-medium">
                              {user?.course}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Year Level:
                            </span>
                            <span className="text-sm font-medium">
                              {user?.yearLevel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Academic Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">
                          Academic Summary
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Enrolled Subjects:
                            </span>
                            <span className="text-sm font-medium">
                              {subjects.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Active Subject:
                            </span>
                            <span className="text-sm font-medium">
                              {selectedSubject?.name || 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-6 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsProfileDialogOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleLogout}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimizeWindow}
                className="text-gray-600 hover:text-gray-900"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-6">
              <Book className="h-5 w-5 text-[#C9121F]" />
              <h2 className="text-lg font-semibold">My Subjects</h2>
            </div>

            <div className="space-y-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectChange(subject.id.toString())}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedSubject?.id === subject.id
                      ? 'bg-[#C9121F] text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <Folders className="h-4 w-4 mr-2" />
                    <span className="truncate">{subject.name}</span>
                  </div>
                </button>
              ))}

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setIsJoinDialogOpen(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Join Subject
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {selectedSubject && (
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedSubject.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Subject Code: {selectedSubject.subjectCode}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 hover:bg-gray-100"
                  >
                    <Settings2Icon className="h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-white border rounded-md shadow-md animate-in fade-in-80 z-50"
                  align="end"
                >
                  <div className="px-2 py-1.5 border-b">
                    <p className="text-sm font-medium text-gray-900">
                      Subject Options
                    </p>
                    <p className="text-xs text-gray-500">
                      Manage your subject settings
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 cursor-pointer px-2 py-1.5 m-1 rounded-md flex items-center"
                      >
                        <Trash2Icon className="h-4 w-4 mr-2" />
                        Leave Subject
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:max-w-[425px]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-semibold">
                          Leave {selectedSubject.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500">
                          Are you sure you want to leave this subject? Your quiz
                          records will be kept for reference, but you'll need to
                          rejoin to access the subject again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="hover:bg-gray-100">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleLeaveSubject}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={isLeavingSubject}
                        >
                          {isLeavingSubject ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Leaving...
                            </>
                          ) : (
                            'Leave Subject'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {subjects.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to EduInsight
                </h3>
                <p className="text-gray-500 mb-4">
                  Get started by joining your first subject.
                </p>
                <Button onClick={() => setIsJoinDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Join Your First Subject
                </Button>
              </div>
            </div>
          ) : !selectedSubject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a Subject
                </h3>
                <p className="text-gray-500">
                  Choose a subject from the sidebar to view its content.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subject Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Quizzes
                  </h3>
                  <p className="text-2xl font-bold text-[#C9121F]">
                    {selectedSubject.quizzes.filter((q) => q.published).length}
                  </p>
                  <p className="text-sm text-gray-600">Available</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Completed
                  </h3>
                  <p className="text-2xl font-bold text-green-600">
                    {calculateProgress().quizzes}
                  </p>
                  <p className="text-sm text-gray-600">Quizzes Done</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Progress
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {calculateProgress().overall}%
                  </p>
                  <p className="text-sm text-gray-600">Overall</p>
                </div>
              </div>

              {/* Available Quizzes */}
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold">Available Quizzes</h2>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedSubject.quizzes
                      .filter((quiz) => quiz.published)
                      .map((quiz) => {
                        const quizRecord = selectedSubject.quizRecord.find(
                          (record) =>
                            record.quizId === quiz.id &&
                            record.userId === user?.id,
                        );
                        const isQuizDone = !!quizRecord;

                        return (
                          <div
                            key={quiz.id}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="font-medium">{quiz.title}</h3>
                              <Badge
                                variant={isQuizDone ? 'success' : 'outline'}
                              >
                                {isQuizDone ? 'Completed' : 'Not Started'}
                              </Badge>
                            </div>

                            {isQuizDone ? (
                              <div className="text-sm text-gray-600">
                                Score: {quizRecord.score}/
                                {quizRecord.totalPoints}
                              </div>
                            ) : (
                              quiz.visibility === 'public' && (
                                <Button
                                  variant="outline"
                                  className="w-full mt-2"
                                  onClick={() => handleStartQuiz(quiz.id)}
                                >
                                  Start Quiz
                                </Button>
                              )
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Subject Materials */}
              {renderSubjectMaterials()}
            </div>
          )}
        </main>
      </div>
      {/* Existing Dialogs */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Join a Subject
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Enter the subject code provided by your teacher to join a new
              subject.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject-code">Subject Code</Label>
                <Input
                  id="subject-code"
                  placeholder="Enter code (e.g., MATH101)"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsJoinDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel{' '}
            </Button>{' '}
            <Button
              onClick={handleJoinSubject}
              disabled={isJoining}
              className="w-full sm:w-auto"
            >
              {' '}
              {isJoining ? (
                <>
                  {' '}
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Joining...{' '}
                </>
              ) : (
                'Join Subject'
              )}{' '}
            </Button>{' '}
          </DialogFooter>{' '}
        </DialogContent>{' '}
      </Dialog>{' '}
      <Toaster /> {/* Add FileTransferProgress at the end of the component */}{' '}
      <FileTransferProgress fileTransfers={fileTransfers} />{' '}
      {/* Update notification panel positioning */}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onRemove={removeNotification}
          onClose={() => setShowNotifications(false)}
          onOpenFile={handleOpenFile}
        />
      )}
    </div>
  );
};
