import logo from '@/renderer/assets/passlogo-small.png';
import { Peer as PeerClient, MediaConnection } from 'peerjs';
import { Button } from '@/renderer/components/ui/button';
import { Toaster } from '@/renderer/components/ui/toaster';
import { useToast } from '@/renderer/hooks/use-toast';
import {
  ActiveDeviceUser,
  ActiveUserLogs,
  Device,
  DeviceUser,
  Quiz,
  QuizQuestion,
  Subject,
  SubjectRecord,
  DeviceUserRole,
} from '@prisma/client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { FileConfig, WindowIdentifier } from '@/shared/constants';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog';
import { generateSubjectCode } from '@/shared/utils';
import { Avatar, AvatarFallback } from '@/renderer/components/ui/avatar';
import {
  LogOut,
  PlusCircle,
  Users,
  Menu,
  Share,
  MonitorPlay,
  FileUp,
  Globe2,
  MonitorOff,
  AppWindow,
  BrainCircuit,
  PenBox,
  Eye,
  ChartColumn,
  ChartColumnIncreasingIcon,
  BookOpen,
  Folders,
  Settings2Icon,
  Trash2Icon,
  Minimize2,
  PlayIcon,
  Bell,
  Maximize2,
  X,
  RefreshCcw,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/renderer/components/ui/badge';
import { ScrollArea } from '@/renderer/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/renderer/components/ui/sidebar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/renderer/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/renderer/components/ui/tabs';
import { useSocket } from '@/renderer/components/socket-provider';
import { formatDistance } from 'date-fns';
import { CreateSubjectModal } from '../../../components/modals/create-subject-modal';
import { WebpageModal } from '../../../components/modals/webpage-modal';
import { BeginQuizModal } from '../../../components/modals/begin-quiz-modal';
import { ShareScreenModal } from '../../../components/modals/share-screen-modal';
import { NotificationPanel } from '../../../components/notification/notification-panel';
import { useNotifications } from '../../../hooks/use-notifications';
import { Textarea } from '@/renderer/components/ui/textarea';
import { Checkbox } from '@/renderer/components/ui/checkbox';

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  schoolId: string;
}

interface StudentScreenState {
  [userId: string]: {
    remoteStream: MediaStream;
    lastUpdate?: number;
  };
}

interface FileTransfer {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface LayoutSettings {
  option: 'Auto' | 'Tiled' | 'Spotlight' | 'Sidebar';
  maxTiles: number;
  hideNoVideo: boolean;
}

export const TeacherConsole = () => {
  // Core state
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<
    DeviceUser & {
      subjects: Subject[];
      ActiveUserLogs: ActiveUserLogs[];
    }
  >();

  // Subject management state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjectRecords, setSubjectRecords] = useState<SubjectRecord[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isCreateSubjectDialogOpen, setIsCreateSubjectDialogOpen] =
    useState(false);

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [studentScreenState, setStudentScreenState] =
    useState<StudentScreenState>({});
  const [maximizedScreen, setMaximizedScreen] = useState<string | null>(null);


  // File transfer state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileTransfers, setFileTransfers] = useState<
    Record<string, FileTransfer>
  >({});
  const [globalFileProgress, setGlobalFileProgress] = useState<number>(0);
  const [transferQueue, setTransferQueue] = useState<string[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<string | null>(null);

  // Other state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isWebLimited, setIsWebLimited] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [callInfo, setCallInfo] = useState<MediaConnection[]>([]);

  // Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<PeerClient | null>(null);

  // Add these state declarations
  const [activeUsers, setActiveUsers] = useState<ActiveDeviceUser[]>([]);
  const [studentInfo, setStudentInfo] = useState<Record<string, StudentInfo>>(
    {},
  );
  const [quizzes, setQuizzes] =
    useState<Array<Quiz & { questions: Array<QuizQuestion> }>>();
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('');
  const [newSubjectDescription, setNewSubjectDescription] =
    useState<string>('');
  const [webpageUrl, setWebpageUrl] = useState<string>('');
  const [isWebpageDialogOpen, setIsWebpageDialogOpen] = useState(false);
  const [isBeginQuizDialogOpen, setIsBeginQuizDialogOpen] = useState(false);
  const [isShareScreenDialogOpen, setIsShareScreenDialogOpen] = useState(false);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] =
    useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Add these state declarations
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  // Add notifications hook
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    removeNotification,
  } = useNotifications(user?.id || '');

  // Initialize validation
  useEffect(() => {
    const validateAccess = async () => {
      try {
        const device = await api.database.getDevice();
        const activeUser = await api.database.getActiveUserByDeviceId(
          device.id,
          device.labId,
        );

        if (!activeUser || activeUser.user.role !== DeviceUserRole.TEACHER) {
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

  // Initialize user data
  useEffect(() => {
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

  // Initialize peer connection
  useEffect(() => {
    if (!peerRef.current && user?.id) {
      const newPeer = new PeerClient(user.id, {

        host: 'proxy.eduinsight.systems',
        port: 9001,
        path: '/eduinsight',
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      newPeer.on('open', (id) => {
        console.log('Peer connection established:', id);
        peerRef.current = newPeer;
      });

      newPeer.on('call', async (call) => {
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

        console.log('Receiving call from teacher');
        call.answer(mediaStreamRef.current);
        call.on('stream', async (remoteStream) => {
          console.log('Received stream from teacher:', remoteStream);
          const timestamp = Date.now(); // Get current timestamp when stream is received
          handleScreenUpdate(call.peer, remoteStream, timestamp);
        });

        call.on('close', () => {
          setIsReconnecting(true);
          console.log('Call closed');
        });

        call.on('error', (err) => {
          setIsReconnecting(true);
          console.error('Call error:', err);
          toast({
            title: 'Stream Error',
            description: "Connection error with teacher's screen share",
            variant: 'destructive',
          });
        });
      });

      newPeer.on('error', (err) => {
        console.error('Peer connection error:', err);
        toast({
          title: 'Connection Error',
          description: 'Failed to establish peer connection. Please try again.',
          variant: 'destructive',
        });
      });

      // Cleanup function
      return () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
      };
    }
  }, [user?.id]); // Only depend on user ID

  const handleStartLiveQuiz = () => {
    for (const user of activeUsers) {
      socket.emit('start-live-quiz', {
        deviceId: user.deviceId,
        quizId: selectedQuiz,
      });
    }
    toast({
      title: 'Live Quiz',
      description: 'The quiz has been started on student devices.',
      variant: 'default',
    });

    addNotification({
      type: 'quiz',
      title: 'Quiz Started',
      message: 'A new quiz has been started for the class',
      time: new Date().toISOString(),
      read: false,
      quizId: selectedQuiz || '',
      status: 'started',
    });
  };

  const handleMinimizeWindow = () => {
    api.window.hide(WindowIdentifier.Dashboard);
  };

  const fetchStudentInfo = useCallback(async (userId: string) => {
    try {
      const student = await api.database.getDeviceUserById(userId);
      setStudentInfo((prev) => ({
        ...prev,
        [userId]: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          schoolId: student.schoolId,
        },
      }));
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  }, []);

  useEffect(() => {
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

  const handleLogout = () => {
    if (user) {
      api.database.userLogout(user.id);
      api.window.open(WindowIdentifier.Main);
      window.close();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
    }
  };

  useEffect(() => {
    if (user) {
      const fetchSubjects = () => {
        setIsLoading(true);
        try {
          const fetchedSubjects = user?.subjects;
          if (fetchedSubjects && fetchedSubjects.length > 0) {
            setSubjects(fetchedSubjects);
            setSelectedSubject(fetchedSubjects[0]);
          } else {
            setSubjects([]);
            setSelectedSubject(null);
          }
        } catch (error) {
          console.error('Error fetching subjects:', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch subjects. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchSubjects();
    }
  }, [user, toast]);

  useEffect(() => {
    const fetchPublishedQuizzes = async () => {
      try {
        if (selectedSubject) {
          const quizzes = await api.database.getQuizSubjectId(
            selectedSubject.id,
          );

          setQuizzes(quizzes);
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch quizzes. Please try again.',
          variant: 'destructive',
        });
      }
    };

    fetchPublishedQuizzes();
  }, [toast, selectedSubject]);

  useEffect(() => {
    if (newSubjectName) {
      const code = generateSubjectCode(newSubjectName);
      setNewSubjectCode(code);
    } else {
      setNewSubjectCode('');
    }
  }, [newSubjectName]);

  const handleCreateSubject = async () => {
    if (newSubjectName) {
      try {
        const newSubject = {
          name: newSubjectName,
          labId: user.labId,
          userId: user.id,
          description: newSubjectDescription,
          subjectCode: newSubjectCode,
        };

        const createdSubject = await api.database.createSubject(newSubject);

        setSubjects((prevSubjects) => [...prevSubjects, createdSubject]);
        setSelectedSubject(createdSubject);
        toast({
          title: 'Subject Created',
          description: `You've created the ${newSubjectName} subject`,
        });
        setNewSubjectName('');
        setNewSubjectCode('');
        setNewSubjectDescription('');
        setIsCreateSubjectDialogOpen(false);
      } catch (err) {
        console.error('Error creating subject:', err);
        let errorMessage = 'Failed to create subject. Please try again.';
        if (err && typeof err === 'object' && 'message' in err) {
          if (err.message.includes('Unique constraint failed')) {
            errorMessage =
              'A subject with this code already exists. Please use a different subject code.';
          } else {
            errorMessage = err.message;
          }
        }
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Invalid Input',
        description: 'Please ensure subject name is filled.',
        variant: 'destructive',
      });
    }
  };

  const fetchActiveUsers = useCallback(async () => {
    if (!selectedSubject) return;

    try {
      const subjectRecords = await api.database.getSubjectRecordsBySubjectId(
        selectedSubject.id,
      );
      setSubjectRecords(subjectRecords);

      const activeUsers = await api.database.getActiveUsersBySubjectId(
        selectedSubject.id,
      );
      setActiveUsers(activeUsers);

      // Immediately fetch student info for all active users
      for (const user of activeUsers) {
        try {
          const student = await api.database.getDeviceUserById(user.userId);
          setStudentInfo((prev) => ({
            ...prev,
            [user.userId]: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              schoolId: student.schoolId,
            },
          }));
        } catch (error) {
          console.error(
            `Error fetching student info for ${user.userId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedSubject) {
      fetchActiveUsers();
    }
  }, [selectedSubject, fetchActiveUsers]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSubjectChange = async (value: string) => {
    const newSelectedSubject = subjects.find((s) => s.id === value) || null;
    setSelectedSubject(newSelectedSubject);
    setIsSidebarOpen(false); // Close sidebar when subject is selected

    const subjectRecords =
      await api.database.getSubjectRecordsBySubjectId(value);
    setSubjectRecords(subjectRecords);

    const activeUsers = await api.database.getActiveUsersBySubjectId(value);
    setActiveUsers(activeUsers);

    for (const record of subjectRecords) {
      await fetchStudentInfo(record.userId);
    }
  };

  const handleDeleteSubject = async () => {
    if (selectedSubject) {
      try {
        await api.database.deleteSubject(selectedSubject.id);
        setSubjects((prevSubjects) =>
          prevSubjects.filter((s) => s.id !== selectedSubject.id),
        );
        setSelectedSubject(null);
        toast({
          title: 'Subject Deleted',
          description: `You've deleted the ${selectedSubject.name} subject`,
        });
      } catch (error) {
        console.error('Error deleting subject:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete subject. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCreateAssignment = (type: 'quiz' | 'activity') => {
    if (selectedSubject) {
      if (type === 'quiz') {
        navigate(`/quiz/library/${selectedSubject.id}`);
      } else {
        toast({
          title: 'Coming Soon',
          description:
            'Activity creation will be available in a future update.',
          variant: 'default',
        });
      }
    } else {
      toast({
        title: 'Error',
        description: 'Please select a subject before creating an assignment.',
        variant: 'destructive',
      });
    }
  };

  const handleLaunchWebpage = () => {
    if (selectedSubject) {
      for (const user of activeUsers) {
        socket.emit('launch-webpage', {
          deviceId: user.deviceId,
          url: webpageUrl,
        });
      }
      toast({
        title: 'Webpage Launched',
        description: 'The webpage has been launched on student devices.',
      });
      setIsWebpageDialogOpen(false);
      setWebpageUrl('');
    }
  };

  const createChunkedArray = (arrayBuffer: ArrayBuffer): string[] => {
    const chunks: string[] = [];
    const totalChunks = Math.ceil(
      arrayBuffer.byteLength / FileConfig.CHUNK_SIZE,
    );
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * FileConfig.CHUNK_SIZE;
      const end = Math.min(
        start + FileConfig.CHUNK_SIZE,
        arrayBuffer.byteLength,
      );
      const chunk = uint8Array.slice(start, end);

      const chunkArray: number[] = Array.from(chunk);
      const base64Chunk = btoa(
        chunkArray.reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );
      chunks.push(base64Chunk);
    }

    return chunks;
  };

  const processFileInChunks = async (
    file: File,
    subjectName: string | undefined,
    targetDevices: string[],
    socket: any,
    onProgress: (progress: number) => void,
  ): Promise<void> => {
    if (file.size > FileConfig.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum limit of ${FileConfig.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const chunks = createChunkedArray(arrayBuffer);
          const totalChunks = chunks.length;

          for (let i = 0; i < totalChunks; i++) {
            await new Promise<void>((chunkResolve) => {
              setTimeout(() => {
                socket.emit('upload-file-chunk', {
                  targets: targetDevices,
                  chunk: chunks[i],
                  filename: file.name,
                  subjectName: subjectName || 'Unknown Subject',
                  chunkIndex: i,
                  totalChunks,
                  fileType: file.type,
                  fileSize: file.size,
                });
                onProgress(((i + 1) / totalChunks) * 100);
                chunkResolve();
              }, 50);
            });
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSubject) {
      toast({
        title: 'Error',
        description: 'Please select a subject before sharing files.',
        variant: 'destructive',
      });
      return;
    }

    const fileId = `${file.name}-${Date.now()}`;

    addNotification({
      type: 'file',
      title: 'Preparing Upload',
      message: `Preparing to share "${file.name}"`,
      time: new Date().toISOString(),
      read: false,
      status: 'pending',
      progress: 0,
      subjectName: selectedSubject?.name || 'Unknown Subject',
    });

    try {
      setTransferQueue((prev) => [...prev, fileId]);

      setFileTransfers((prev) => ({
        ...prev,
        [fileId]: {
          id: fileId,
          filename: file.name,
          progress: 0,
          status: 'pending',
        },
      }));

      const targetDevices =
        selectedStudents.length > 0
          ? activeUsers
            .filter((user) => selectedStudents.includes(user.userId))
            .map((user) => user.deviceId)
          : activeUsers.map((user) => user.deviceId);

      if (targetDevices.length === 0) {
        throw new Error('No target devices selected');
      }

      await processFileInChunks(
        file,
        selectedSubject?.name,
        targetDevices,
        socket,
        (progress) => {
          setFileTransfers((prev) => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress,
              status: 'uploading',
            },
          }));
          setGlobalFileProgress(progress);
        },
      );
    } catch (err) {
      console.error('Error processing file:', err);

      setFileTransfers((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: 'error',
          error:
            err && typeof err === 'object' && 'message' in err
              ? err.message
              : 'Failed to process file',
        },
      }));

      setFileTransfers((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: 'error',
          error:
            err && typeof err === 'object' && 'message' in err
              ? err.message
              : 'Failed to process file',
        },
      }));

      setTransferQueue((prev) => prev.filter((id) => id !== fileId));

      toast({
        title: 'Error',
        description:
          err && typeof err === 'object' && 'message' in err
            ? err.message
            : 'Failed to process file',
        variant: 'destructive',
      });

      setGlobalFileProgress(0);

      addNotification({
        type: 'file',
        title: 'Upload Failed',
        message: `Failed to share "${file.name}"`,
        time: new Date().toISOString(),
        read: false,
        status: 'error',
        error:
          err && typeof err === 'object' && 'message' in err
            ? err.message
            : 'Unknown error occurred',
        subjectName: selectedSubject?.name || 'Unknown Subject',
      });
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  useEffect(() => {
    if (transferQueue.length > 0 && !currentTransfer) {
      const nextTransfer = transferQueue[0];
      setCurrentTransfer(nextTransfer);
      setTransferQueue((prev) => prev.slice(1));
    }
  }, [transferQueue, currentTransfer]);

  useEffect(() => {
    if (!socket) return;

    const safeSetFileTransfers = (
      updater: (
        prev: Record<string, FileTransfer>,
      ) => Record<string, FileTransfer>,
    ) => {
      setFileTransfers((prev) => {
        const next = updater(prev);
        return Object.is(prev, next) ? prev : next;
      });
    };

    const handleFileProgress = ({
      fileId,
      progress,
    }: {
      fileId: string;
      filename: string;
      progress: number;
    }) => {
      safeSetFileTransfers((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          progress,
          status: 'uploading',
        },
      }));
      setGlobalFileProgress(progress);

      addNotification({
        type: 'file',
        title: 'File Upload',
        message: `Uploading "${fileId}"`,
        time: new Date().toISOString(),
        read: false,
        status: 'uploading',
        progress,
        subjectName: selectedSubject?.name || 'Unknown Subject',
      });
    };

    const handleFileComplete = ({
      fileId,
      filename,
      targetCount,
    }: {
      fileId: string;
      filename: string;
      targetCount: number;
      filePath?: string;
    }) => {
      safeSetFileTransfers((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          progress: 100,
          status: 'completed',
        },
      }));

      setTimeout(() => {
        safeSetFileTransfers((prev) => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
        setCurrentTransfer(null);
        setGlobalFileProgress(0);
      }, 3000);

      addNotification({
        type: 'file',
        title: 'Upload Complete',
        message: `Successfully shared "${filename}" with ${targetCount} students`,
        time: new Date().toISOString(),
        read: false,
        status: 'completed',
        subjectName: selectedSubject?.name || 'Unknown Subject',
      });
    };

    const handleFileError = ({
      fileId,
      error,
      filename,
    }: {
      fileId: string;
      error: string;
      filename: string;
    }) => {
      safeSetFileTransfers((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: 'error',
          error,
        },
      }));

      setCurrentTransfer(null);
      setGlobalFileProgress(0);

      addNotification({
        type: 'file',
        title: 'Upload Failed',
        message: `Failed to share "${filename}"`,
        time: new Date().toISOString(),
        read: false,
        status: 'error',
        error: error,
        subjectName: selectedSubject?.name || 'Unknown Subject',
      });
    };

    socket.on('file-progress', handleFileProgress);
    socket.on('file-complete', handleFileComplete);
    socket.on('file-error', handleFileError);

    return () => {
      socket.off('file-progress', handleFileProgress);
      socket.off('file-complete', handleFileComplete);
      socket.off('file-error', handleFileError);
    };
  }, [socket, toast, selectedSubject]);

  const handleShareFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleMaximizeScreen = useCallback(
    (userId: string, event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }

      setMaximizedScreen((prev) => (prev === userId ? null : userId));
    },
    [],
  );

  const toggleStudentSelection = useCallback(
    (userId: string, event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }

      setSelectedStudents((prev) => {
        if (prev.includes(userId)) {
          return prev.filter((id) => id !== userId);
        } else {
          return [...prev, userId];
        }
      });
    },
    [],
  );

  // Update the renderStudentScreen function to use the new event handlers
  const renderStudentScreen = useCallback(
    (userId: string, student: StudentInfo) => {
      const screenState = studentScreenState[userId];
      const isMaximized = maximizedScreen === userId;
      const isSelected = selectedStudents.includes(userId);
      const isDisconnected = !activeUsers.some(user => user.userId === userId);

      return (
        <div
          key={userId}
          className={`relative group rounded-xl overflow-hidden transition-all duration-300 ${isMaximized ? 'fixed inset-4 z-50' : 'h-full'
            } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="relative w-full h-full bg-gray-900">
            {screenState?.remoteStream && !isDisconnected ? (
              // Video stream available
              <>
                <video
                  ref={(video) => {
                    if (video) {
                      video.srcObject = screenState.remoteStream;
                      video.play().catch(console.error);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isMaximized ? 'fixed inset-0 z-50' : ''
                    }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            ) : (
              <>
                <video
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isMaximized ? 'fixed inset-0 z-50' : ''
                    }`}
                />
              // Disconnected or No video state
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center space-y-6">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-2 border-gray-700">
                          <AvatarFallback className="bg-gray-800 text-gray-300 text-2xl">
                            {student?.firstName?.[0]}
                            {student?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-2.5 border-2 border-gray-900">
                          {isDisconnected ? (
                            <WifiOff className="h-5 w-5 text-red-400" />
                          ) : (
                            <MonitorOff className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <h3 className="text-gray-300 font-medium text-lg">
                          {student?.firstName} {student?.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{student?.schoolId}</p>

                        <div className="flex items-center justify-center space-x-2 bg-gray-800/50 px-3 py-1.5 rounded-full">
                          {isDisconnected ? (
                            <>
                              <WifiOff className="h-4 w-4 text-red-400" />
                              <span className="text-sm text-red-400">Disconnected</span>
                            </>
                          ) : (
                            <>
                              <MonitorOff className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-400">No Video Feed</span>
                            </>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mt-4">
                          {isDisconnected
                            ? 'Student has left the session'
                            : 'Waiting for screen share...'}
                        </p>
                      </div>
                    </div>

                    {/* Screen power indicator */}
                    <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isDisconnected ? 'bg-red-500' : 'bg-gray-600'}`}></div>
                      <span className="text-xs text-gray-500">
                        {isDisconnected ? 'Offline' : 'Standby'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Control overlay */}
            <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleStudentSelection(userId)}
                  className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <Badge
                  variant={isDisconnected ? 'destructive' : isReconnecting ? 'secondary' : 'default'}
                  className="bg-black/50 text-white text-xs"
                >
                  {isDisconnected ? 'Offline' : isReconnecting ? 'Reconnecting...' : 'Live'}
                </Badge>
              </div>
              {!isDisconnected && (
                <div className="flex items-center space-x-2">
                  {isMaximized && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaximizedScreen(null)}
                      className="text-white hover:bg-white/20"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleMaximizeScreen(userId, e)}
                    className="text-white hover:bg-white/20"
                  >
                    {isMaximized ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Info bar */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-gray-900/90 to-transparent z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8 border-2 border-white/20">
                    <AvatarFallback className="bg-gray-700 text-white">
                      {student?.firstName?.[0]}
                      {student?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-white">
                    <p className="text-sm font-medium leading-none">
                      {student?.firstName} {student?.lastName}
                    </p>
                    <p className="text-xs text-gray-300">{student?.schoolId}</p>
                  </div>
                </div>
                {!isDisconnected && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-300">
                      {screenState?.lastUpdate
                        ? formatDistance(screenState.lastUpdate, new Date(), {
                          addSuffix: true,
                        })
                        : 'Not connected'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Maximized view close button */}
          {isMaximized && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMaximizedScreen(null)}
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-20"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    },
    [
      studentScreenState,
      isReconnecting,
      maximizedScreen,
      selectedStudents,
      toggleStudentSelection,
      handleMaximizeScreen,
      activeUsers, // Added activeUsers dependency
    ],
  );

  const handleStartScreenShare = async () => {
    try {
      if (!peerRef.current) {
        throw new Error('Peer connection not established');
      }

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

      // Create calls for each active user
      const newCalls = activeUsers.map((user) => {
        const call = peerRef.current?.call(user.userId, mediaStream);
        console.log('Screen share call:', call);
        // Add error handling for each call
        call.on('error', (err) => {
          console.error(`Call error for user ${user.userId}:`, err);
        });

        return call;
      });

      setCallInfo(newCalls);
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Screen share error:', error);
      toast({
        title: 'Screen Share Error',
        description: 'Failed to start screen sharing. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStopScreenShare = () => {
    try {
      // Stop all active calls
      callInfo.forEach((call) => call.close());
      setCallInfo([]);

      // Stop media stream tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  useEffect(() => {
    if (socket && isConnected && selectedSubject) {
      socket.emit('join-server', selectedSubject.id);

      socket.on('student-joined', async ({ subjectId, userId }) => {
        if (selectedSubject.id === subjectId) {
          await fetchActiveUsers();
          await fetchStudentInfo(userId);

          const student = studentInfo[userId];
          if (student) {
            addNotification({
              type: 'announcement',
              title: 'Student Joined',
              message: `${student.firstName} ${student.lastName} joined the class`,
              time: new Date().toISOString(),
              read: false,
              subjectName: selectedSubject.name,
              teacherName: `${user?.firstName} ${user?.lastName}`,
            });
          }
        }
      });

      socket.on('student-left', async ({ subjectId, userId }) => {
        if (selectedSubject.id === subjectId) {
          fetchActiveUsers();
          await fetchStudentInfo(userId);
          const student = studentInfo[userId];
          if (student) {
            addNotification({
              type: 'announcement',
              title: 'Student Left',
              message: `${student.firstName} ${student.lastName} left the subject`,
              time: new Date().toISOString(),
              read: false,
              subjectName: selectedSubject.name,
              teacherName: `${user?.firstName} ${user?.lastName}`,
            });
          }
        }
      });

      socket.on('student-logged-out', async ({ subjectId, userId }) => {
        if (selectedSubject.id === subjectId) {
          fetchActiveUsers();
          await fetchStudentInfo(userId);
        }
      });

      // socket.on('screen-data', ({ userId, screenData, timestamp }) => {
      //   handleScreenUpdate(userId, screenData, timestamp);
      // });

      socket.on('screen-share-error', ({ error, userId }) => {
        toast({
          title: 'Screen Share Error',
          description: `Error capturing screen for student ${studentInfo[userId]?.firstName}: ${error}`,
          variant: 'destructive',
        });
      });

      return () => {
        socket.off('screen-share-offer');
        socket.off('student-joined');
        socket.off('student-left');
        socket.off('student-logged-out');
        socket.off('screen-data');
        socket.off('screen-share-error');
      };
    }
  }, [socket, selectedSubject, fetchActiveUsers, studentInfo]);

  const handleScreenUpdate = useCallback(
    (userId: string, remoteStream: MediaStream, timestamp: number) => {
      if (!remoteStream) {
        console.warn('Received empty screen data for user:', userId);
        return;
      }

      console.log(
        'Received screen update for user:',
        userId,
        'timestamp:',
        timestamp,
      );

      setStudentScreenState((prev) => ({
        ...prev,
        [userId]: {
          remoteStream,
          lastUpdate: timestamp,
        },
      }));
    },
    [],
  );

  const handleConfirmShareScreen = () => {
    setIsShareScreenDialogOpen(false);
    handleStartScreenShare();
  };

  const FileTransferProgress = () => {
    if (Object.keys(fileTransfers).length === 0) return null;

    return (
      <div className="fixed bottom-4 right-4 max-w-md w-full bg-white rounded-lg shadow-lg p-4 space-y-2">
        {transferQueue.length > 0 && (
          <div className="text-sm text-gray-500 mb-2">
            {transferQueue.length} file(s) queued
          </div>
        )}
        {Object.entries(fileTransfers).map(([fileId, transfer]) => (
          <div key={fileId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate">{transfer.filename}</span>
              <span className="text-gray-500">
                {transfer.status === 'pending'
                  ? 'Queued'
                  : `${transfer.progress.toFixed(0)}%`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${transfer.status === 'error'
                  ? 'bg-red-500'
                  : transfer.status === 'completed'
                    ? 'bg-green-500'
                    : transfer.status === 'pending'
                      ? 'bg-gray-400'
                      : 'bg-blue-500'
                  }`}
                style={{ width: `${transfer.progress}%` }}
              />
            </div>
            {transfer.status === 'error' && (
              <p className="text-xs text-red-500">{transfer.error}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (!socket) return;

    const handleFileProgress = ({
      filename,
      progress,
    }: {
      fileId: string;
      filename: string;
      progress: number;
    }) => {
      addNotification({
        type: 'file',
        title: 'Uploading File',
        message: `Uploading "${filename}"...`,
        time: new Date().toISOString(),
        read: false,
        status: 'uploading',
        progress,
        subjectName: selectedSubject?.name || 'Unknown Subject',
      });
    };

    const handleFileComplete = ({
      filename,
      targetCount,
    }: {
      fileId: string;
      filename: string;
      targetCount: number;
    }) => {
      addNotification({
        type: 'file',
        title: 'File Transfer Complete',
        message: `Successfully shared "${filename}" with ${targetCount} student${targetCount !== 1 ? 's' : ''}`,
        time: new Date().toISOString(),
        read: false,
        status: 'completed',
        progress: 100,
        subjectName: selectedSubject?.name || 'Unknown Subject',
      });
    };

    const handleFileError = ({
      error,
      filename,
    }: {
      fileId: string;
      error: string;
      filename: string;
    }) => {
      addNotification({
        type: 'file',
        title: 'File Transfer Failed',
        message: `Error sharing "${filename}": ${error}`,
        time: new Date().toISOString(),
        read: false,
        status: 'error',
        subjectName: selectedSubject?.name || 'Unknown Subject',
      });
    };

    socket.on('file-progress', handleFileProgress);
    socket.on('file-complete', handleFileComplete);
    socket.on('file-error', handleFileError);

    return () => {
      socket.off('file-progress', handleFileProgress);
      socket.off('file-complete', handleFileComplete);
      socket.off('file-error', handleFileError);
    };
  }, [socket, selectedSubject?.name]);

  const handleOpenFile = (filePath: string) => {
    if (filePath) {
      api.files.openFile(filePath);
    }
  };

  useEffect(() => {
    if (socket) {
      socket.emit('get-web-limit-status');

      const handleWebLimitStatus = ({
        success,
        limited,
        error,
      }: {
        success: boolean;
        limited: boolean;
        error?: string;
      }) => {
        if (success) {
          setIsWebLimited(limited);
        } else {
          console.error('Failed to get web limit status:', error);
        }
      };

      socket.on('web-limit-status', handleWebLimitStatus);
      socket.on('web-limited', ({ success, enabled, error }) => {
        if (success) {
          setIsWebLimited(enabled);
          toast({
            title: enabled ? 'Web Access Limited' : 'Web Access Restored',
            description: enabled
              ? 'Students can now only access educational websites'
              : 'Normal web access has been restored',
          });
        } else {
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
        }
      });

      return () => {
        socket.off('web-limit-status', handleWebLimitStatus);
        socket.off('web-limited');
      };
    }
  }, [socket]);

  const handleToggleWebLimit = () => {
    socket.emit('limit-web', { enabled: !isWebLimited });
  };

  const handleSendAnnouncement = () => {
    if (!announcementMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an announcement message.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedSubject) {
      socket.emit('send-announcement', {
        message: announcementMessage,
        subjectId: selectedSubject.id,
        teacherName: `${user?.firstName} ${user?.lastName}`,
        subjectName: selectedSubject.name,
      });

      addNotification({
        type: 'announcement',
        title: 'Announcement Sent',
        message: announcementMessage,
        time: new Date().toISOString(),
        read: false,
        subjectName: selectedSubject.name,
        teacherName: `${user?.firstName} ${user?.lastName}`,
      });

      setAnnouncementMessage('');
      setIsAnnouncementDialogOpen(false);

      toast({
        title: 'Announcement Sent',
        description: 'Your announcement has been sent to all students.',
      });
    }
  };

  const handleRefreshConnections = useCallback(() => {
    if (selectedSubject && socket) {
      activeUsers.forEach((activeUser) => {
        socket.emit('refresh-connections', {
          deviceId: activeUser.deviceId,
        });
      });

      toast({
        title: 'Refreshing Connections',
        description: 'Checking for active student connections...',
      });

      // Refresh the active users list
      fetchActiveUsers();
    }
  }, [selectedSubject, socket, toast, fetchActiveUsers]);

  const [isStudentListExpanded, setIsStudentListExpanded] = useState(true);
  const [isStudentListMaximized, setIsStudentListMaximized] = useState(false);

  const handleLayoutChange = (option: string) => {
    setLayoutSettings((prev) => ({
      ...prev,
      option: option as LayoutSettings['option'],
    }));
  };

  const handleMaxTilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(16, Number(event.target.value)));
    setLayoutSettings((prev) => ({
      ...prev,
      maxTiles: value,
    }));
  };

  const handleHideNoVideoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setLayoutSettings((prev) => ({
      ...prev,
      hideNoVideo: event.target.checked,
    }));
  };

  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    option: 'Auto',
    maxTiles: 4,
    hideNoVideo: false,
  });

  const getGridLayout = (totalStudents: number, layout: LayoutSettings) => {
    switch (layout.option) {
      case 'Tiled':
        return {
          gridTemplateColumns: `repeat(${Math.min(Math.ceil(Math.sqrt(totalStudents)), Math.ceil(layout.maxTiles / 2))}, 1fr)`,
        };
      case 'Spotlight':
        return {
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: 'auto',
          gridAutoRows: '1fr',
        };
      case 'Sidebar':
        return {
          gridTemplateColumns: '3fr 1fr',
          gridAutoRows: '1fr',
        };
      default: // Auto
        return totalStudents <= 2
          ? { gridTemplateColumns: 'repeat(2, 1fr)' }
          : totalStudents <= 4
            ? { gridTemplateColumns: 'repeat(2, 1fr)' }
            : { gridTemplateColumns: 'repeat(3, 1fr)' };
    }
  };

  return (
    <SidebarProvider
      defaultOpen={false}
      open={isSidebarOpen}
      onOpenChange={setIsSidebarOpen}
    >
      <div className="min-h-screen w-screen bg-[#EAEAEB] flex">
        <Sidebar className="border-r bg-white w-64">
          <SidebarHeader>
            <div className="flex items-center space-x-2 px-4 py-4">
              <BookOpen className="h-5 w-5 text-[#C9121F]" />
              <h2 className="text-lg font-semibold">Class Management</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <div className="px-3 py-2">
              <h3 className="text-sm font-medium text-gray-500 px-2 mb-2">
                My Subjects
              </h3>
              <SidebarMenu>
                {subjects.map((subject) => (
                  <SidebarMenuItem key={subject.id}>
                    <SidebarMenuButton
                      isActive={selectedSubject?.id === subject.id}
                      onClick={() => handleSubjectChange(subject.id)}
                      className="w-full flex items-center"
                    >
                      <Folders className="h-4 w-4 mr-2" />
                      <span className="truncate">{subject.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsCreateSubjectDialogOpen(true)}
                    className="text-muted-foreground hover:bg-gray-100 w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    <span>Create Subject</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>

            {selectedSubject && (
              <div className="px-3 py-2 border-t">
                <h3 className="text-sm font-medium text-gray-500 px-2 mb-2">
                  Quick Actions
                </h3>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setIsBeginQuizDialogOpen(true)}
                      className="w-full"
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      <span>Begin Quiz</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() =>
                        selectedSubject &&
                        navigate(`/results/quiz-results/${selectedSubject.id}`)
                      }
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      <span>View Results</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            )}

            {selectedSubject && (
              <div className="px-3 py-2 border-t">
                <h3 className="text-sm font-medium text-gray-500 px-2 mb-2">
                  Tools
                </h3>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={
                        isScreenSharing
                          ? handleStopScreenShare
                          : () => setIsShareScreenDialogOpen(true)
                      }
                      className="w-full"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      <span>
                        {isScreenSharing
                          ? 'Stop Sharing'
                          : 'Share Screen (Beta)'}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled className="w-full opacity-50">
                      <MonitorOff className="h-4 w-4 mr-2" />
                      <span>Focus Mode</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled className="w-full opacity-50">
                      <ChartColumn className="h-4 w-4 mr-2" />
                      <span>Analytics</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            )}
          </SidebarContent>
        </Sidebar>

        <div className="flex-1">
          <header className="bg-[#C9121F] border-b shadow-lg sticky top-0 z-50">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger className="text-white hover:bg-[#EBC42E]/20">
                    <Menu className="h-5 w-5" />
                  </SidebarTrigger>
                  <img
                    src={logo}
                    alt="PASS College Logo"
                    className="h-10 w-auto"
                  />
                  <div>
                    <h1 className="text-xl font-semibold text-white">
                      EduInsight
                    </h1>
                    <p className="text-sm text-[#EBC42E]">Teacher Console</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Add this connection status indicator before the other buttons */}
                  <div
                    className="flex items-center"
                    title={isConnected ? 'Connected' : 'Disconnected'}
                  >
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
                    <Bell className="h-5 w-5 text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#EBC42E] text-[10px] font-medium text-white flex items-center justify-center">
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
                        <span className="hidden md:inline text-white">
                          {user?.firstName} {user?.lastName}
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-[#C9121F]">
                          Teacher Profile
                        </DialogTitle>
                      </DialogHeader>
                      <div className="pt-4">
                        <div className="flex items-center justify-center mb-6">
                          <Avatar className="h-24 w-24">
                            <AvatarFallback className="text-2xl">
                              {user?.firstName[0]}
                              {user?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="space-y-4">
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
                                  Teacher ID:
                                </span>
                                <span className="text-sm font-medium">
                                  {user?.schoolId}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Department:
                                </span>
                                <span className="text-sm font-medium">
                                  {user?.course}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">
                              System Access
                            </h3>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Last Login:
                                </span>
                                <span className="text-sm font-medium">
                                  {user?.ActiveUserLogs.length > 1
                                    ? formatDistance(
                                      new Date(
                                        user?.ActiveUserLogs[1]?.createdAt,
                                      ),
                                      new Date(),
                                      { addSuffix: true },
                                    )
                                    : 'No last login'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Subjects:
                                </span>
                                <span className="text-sm font-medium">
                                  {subjects.length} active
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsProfileDialogOpen(false)}
                        >
                          Close
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleLogout}
                          className="text-red-600 hover:bg-red-100"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMinimizeWindow}
                    className="text-white hover:bg-[#EBC42E]/20"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-14">
                <div className="flex space-x-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center space-x-2"
                      >
                        <Share className="h-4 w-4" />
                        <span>Share (Beta)</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          isScreenSharing
                            ? handleStopScreenShare()
                            : setIsShareScreenDialogOpen(true)
                        }
                      >
                        <MonitorPlay className="h-4 w-4 mr-2" />
                        {isScreenSharing
                          ? 'Stop Sharing'
                          : 'Share Screen (Beta)'}
                        {!isScreenSharing && (
                          <Badge variant="outline" className="ml-2">
                            Start Now
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareFile}>
                        <FileUp className="h-4 w-4 mr-2" />
                        Share Files
                        <Badge variant="outline" className="ml-2">
                          {selectedStudents.length > 0
                            ? `${selectedStudents.length} selected`
                            : 'All'}
                        </Badge>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center space-x-2"
                      >
                        <Globe2 className="h-4 w-4" />
                        <span>Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setIsWebpageDialogOpen(true)}
                      >
                        Launch Webpage
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsAnnouncementDialogOpen(true)}
                      >
                        Send Announcement
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center space-x-2"
                      >
                        <BrainCircuit className="h-4 w-4" />
                        <span>Assess</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setIsBeginQuizDialogOpen(true)}
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Begin a Quiz
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCreateAssignment('quiz')}
                      >
                        <PenBox className="h-4 w-4 mr-2" />
                        Manage Quiz
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          selectedSubject &&
                          navigate(
                            `/results/quiz-results/${selectedSubject.id}`,
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Quiz Result
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center space-x-2"
                      >
                        <MonitorOff className="h-4 w-4" />
                        <span>Focus</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleToggleWebLimit}>
                        <Globe2 className="h-4 w-4 mr-2" />
                        {isWebLimited ? 'Restore Web Access' : 'Limit Web'}
                        <Badge
                          variant={isWebLimited ? 'destructive' : 'outline'}
                          className="ml-2"
                        >
                          {isWebLimited ? 'Active' : 'Inactive'}
                        </Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled className="opacity-50">
                        <AppWindow className="h-4 w-4 mr-2" />
                        Limit Apps
                        <Badge variant="outline" className="ml-2">
                          Coming Soon
                        </Badge>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center space-x-2"
                      >
                        <ChartColumnIncreasingIcon className="h-4 w-4" />
                        <span>Analytics</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          selectedSubject &&
                          navigate(
                            `/analytics/student-progress/${selectedSubject.id}`,
                          )
                        }
                      >
                        <ChartColumn className="h-4 w-4 mr-2" />
                        See Students Performance
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {selectedSubject && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center space-x-2"
                        >
                          <Settings2Icon className="h-4 w-4" />
                          <span>Settings</span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2Icon className="h-4 w-4 mr-2" />
                              Delete Subject
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[425px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Subject
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete{' '}
                                {selectedSubject.name}? This will remove all
                                associated data, including quizzes and student
                                records. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="mt-2">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteSubject}
                                className="bg-red-600 hover:bg-red-700 text-white mt-2"
                              >
                                Delete Subject
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </div>
          <main className="px-4 sm:px-6 lg:px-8 py-4 relative h-[calc(100vh-8rem)] overflow-y-auto">
            {/* <main className="relative h-[calc(100vh-8rem)] overflow-y-auto"> */}
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9121F] mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading subjects...</p>
                </div>
              </div>
            ) : !selectedSubject ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Subject Selected
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {subjects.length === 0
                      ? 'Create a new subject to get started with managing your class.'
                      : 'Select a subject from the sidebar to view its details and manage your class.'}
                  </p>
                  <Button
                    onClick={() => setIsCreateSubjectDialogOpen(true)}
                    className="inline-flex items-center"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Subject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#C9121F]">
                  <div className="flex justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">
                            {selectedSubject.name}
                          </h2>
                          <p className="text-xs text-blue-700">
                            Code: {selectedSubject.subjectCode}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {selectedSubject.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 border-l pl-4">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2">
                        Class Statistics
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-blue-600">
                            {activeUsers.length}
                          </p>
                          <p className="text-xs text-gray-600">Active</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-green-600">
                            {subjectRecords.length}
                          </p>
                          <p className="text-xs text-gray-600">Total</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-amber-600">
                            {subjectRecords.length > 0
                              ? `${((activeUsers.length / subjectRecords.length) * 100).toFixed(0)}%`
                              : '0%'}
                          </p>
                          <p className="text-xs text-gray-600">Rate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-[#EBC42E] flex-1 ${isStudentListMaximized ? 'fixed inset-4 z-50 bg-white' : ''
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() =>
                    setIsStudentListExpanded(!isStudentListExpanded)
                  }
                >
                  {isStudentListExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Student List
                    </h2>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setIsStudentListMaximized(!isStudentListMaximized)
                    }
                    className="hover:bg-gray-100"
                  >
                    {isStudentListMaximized ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLayoutDialogOpen(true)}
                    className="hover:bg-gray-100"
                  >
                    <Settings2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isStudentListExpanded && (
                <Tabs
                  defaultValue="active"
                  className={`w-full ${isStudentListMaximized ? 'h-[calc(100vh-6rem)]' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <TabsList className="grid grid-cols-2 rounded-full">
                      <TabsTrigger className="rounded-full" value="active">
                        Active ({activeUsers.length})
                      </TabsTrigger>
                      <TabsTrigger className="rounded-full" value="inactive">
                        Inactive ({subjectRecords.length - activeUsers.length})
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {subjectRecords.length} Students
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">
                          Refresh Connection
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshConnections}
                          className="ml-2"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <TabsContent value="active">
                    <div className="rounded-md border p-2 ">
                      {activeUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[calc(100vh-28rem)]">
                          <Users className="h-12 w-12 mb-2 text-gray-400" />
                          <p className="text-gray-500 font-medium">
                            No active users
                          </p>
                          <p className="text-sm text-gray-400">
                            Students will appear here when they join the class
                          </p>
                        </div>
                      ) : (
                        <div
                          className="grid gap-4 auto-rows-fr h-full"
                          style={getGridLayout(
                            activeUsers.length,
                            layoutSettings,
                          )}
                        >
                          {subjectRecords
                            .filter((record) =>
                              activeUsers.some(
                                (user) => user.userId === record.userId,
                              ),
                            )
                            .map((record, index) => {
                              // Check if we have the student info
                              const student = studentInfo[record.userId];

                              // If we don't have student info yet, show a loading state
                              if (!student) {
                                return (
                                  <div
                                    key={record.userId}
                                    className="relative group rounded-xl overflow-hidden transition-all duration-300 h-full bg-gray-900"
                                  >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/95">
                                      <div className="flex flex-col items-center space-y-6 p-4">
                                        <div className="relative">
                                          <Avatar className="h-24 w-24 border-2 border-gray-700">
                                            <AvatarFallback className="bg-gray-700 text-gray-300 text-3xl">
                                              ...
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="absolute -bottom-2 -right-2 bg-gray-700 rounded-full p-2.5 border-2 border-gray-800">
                                            <MonitorOff className="h-5 w-5 text-gray-400" />
                                          </div>
                                        </div>
                                        <div className="text-center space-y-2">
                                          <p className="text-gray-300 font-medium text-lg">
                                            Loading Student Info...
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Render the student screen with the info we have
                              const isSpotlighted =
                                layoutSettings.option === 'Spotlight' &&
                                index === 0;
                              const isSidebar =
                                layoutSettings.option === 'Sidebar' &&
                                index !== 0;

                              return (
                                <div
                                  key={record.userId}
                                  className={`${isSpotlighted
                                    ? 'col-span-2 row-span-2'
                                    : isSidebar
                                      ? 'col-start-2'
                                      : ''
                                    }`}
                                >
                                  {renderStudentScreen(record.userId, student)}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="inactive">
                    <ScrollArea className="h-[calc(100vh-24rem)] rounded-md border p-2">
                      <div className="space-y-2">
                        {subjectRecords
                          .filter(
                            (record) =>
                              !activeUsers.some(
                                (user) => user.userId === record.userId,
                              ),
                          )
                          .map((record) => {
                            const student = studentInfo[record.userId];

                            return (
                              <div
                                key={record.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                              >
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {student?.firstName?.[0] || ''}
                                      {student?.lastName?.[0] || ''}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {student?.firstName || 'Loading...'}{' '}
                                      {student?.lastName || ''}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ID: {student?.schoolId || 'Loading...'}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs text-gray-500"
                                >
                                  Inactive
                                </Badge>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </div>
            {isStudentListMaximized && (
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setIsStudentListMaximized(false)}
              />
            )}
            <Toaster />
            <CreateSubjectModal
              isOpen={isCreateSubjectDialogOpen}
              onOpenChange={setIsCreateSubjectDialogOpen}
              newSubjectName={newSubjectName}
              setNewSubjectName={setNewSubjectName}
              newSubjectCode={newSubjectCode}
              newSubjectDescription={newSubjectDescription}
              setNewSubjectDescription={setNewSubjectDescription}
              handleCreateSubject={handleCreateSubject}
            />
            <WebpageModal
              isOpen={isWebpageDialogOpen}
              onOpenChange={setIsWebpageDialogOpen}
              webpageUrl={webpageUrl}
              setWebpageUrl={setWebpageUrl}
              handleLaunchWebpage={handleLaunchWebpage}
            />
            <BeginQuizModal
              isOpen={isBeginQuizDialogOpen}
              onOpenChange={setIsBeginQuizDialogOpen}
              quizzes={quizzes}
              selectedQuiz={selectedQuiz}
              setSelectedQuiz={setSelectedQuiz}
              handleStartLiveQuiz={handleStartLiveQuiz}
            />
            <ShareScreenModal
              isOpen={isShareScreenDialogOpen}
              onOpenChange={setIsShareScreenDialogOpen}
              handleConfirmShareScreen={handleConfirmShareScreen}
            />
            {/* <ShowScreensModal
              isOpen={isShowScreensDialogOpen}
              onOpenChange={setIsShowScreensDialogOpen}
              handleConfirmShowScreens={handleConfirmShowScreens}
              screenSettings={screenSettings}
              setScreenSettings={setScreenSettings}
            /> */}
            <Dialog
              open={isAnnouncementDialogOpen}
              onOpenChange={setIsAnnouncementDialogOpen}
            >
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Send Announcement</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="announcement"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Message
                    </label>
                    <Textarea
                      id="announcement"
                      placeholder="Type your announcement message here..."
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAnnouncementDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSendAnnouncement}>
                    Send Announcement
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isLayoutDialogOpen}
              onOpenChange={setIsLayoutDialogOpen}
            >
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Change Layout</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Layout Options
                    </label>
                    <select
                      value={layoutSettings.option}
                      onChange={(e) => handleLayoutChange(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="Auto">Auto (Recommended)</option>
                      <option value="Tiled">Tiled Grid</option>
                      <option value="Spotlight">Spotlight</option>
                      <option value="Sidebar">Sidebar</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      {layoutSettings.option === 'Auto' &&
                        'Automatically adjusts based on the number of students'}
                      {layoutSettings.option === 'Tiled' &&
                        'Displays students in an equal-sized grid'}
                      {layoutSettings.option === 'Spotlight' &&
                        'Features one student prominently with others in sidebar'}
                      {layoutSettings.option === 'Sidebar' &&
                        'Shows one main view with others in a vertical sidebar'}
                    </p>
                  </div>
                  {layoutSettings.option !== 'Auto' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">
                        Maximum tiles to display
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="1"
                          max="16"
                          value={layoutSettings.maxTiles}
                          onChange={handleMaxTilesChange}
                          className="w-full"
                        />
                        <span className="text-sm text-gray-600 min-w-[2rem] text-center">
                          {layoutSettings.maxTiles}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hide-no-video"
                      checked={layoutSettings.hideNoVideo}
                      onCheckedChange={(checked) =>
                        handleHideNoVideoChange({
                          target: { checked: checked === true },
                        } as any)
                      }
                    />
                    <label
                      htmlFor="hide-no-video"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Hide tiles without video
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsLayoutDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => setIsLayoutDialogOpen(false)}>
                    Apply
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </main>
          {globalFileProgress > 0 && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <div className="space-y-4">
                  <p className="text-lg font-semibold text-center">
                    Uploading Files...
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${globalFileProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-gray-500">
                    {globalFileProgress.toFixed(0)}% Complete
                  </p>
                </div>
              </div>
            </div>
          )}
          <FileTransferProgress />

          {maximizedScreen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setMaximizedScreen(null)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMaximizedScreen(null)}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </Button>
            </>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};
