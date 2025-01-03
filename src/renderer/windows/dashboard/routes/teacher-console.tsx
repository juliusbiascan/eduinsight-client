import logo from '@/renderer/assets/passlogo-small.png';

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
} from '@prisma/client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { WindowIdentifier } from '@/shared/constants';
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

import { Switch } from '@/renderer/components/ui/switch';
import { useSocket } from '@/renderer/components/socket-provider';
import { formatDistance } from 'date-fns';
import { CreateSubjectModal } from '../../../components/modals/create-subject-modal';
import { WebpageModal } from '../../../components/modals/webpage-modal';
import { BeginQuizModal } from '../../../components/modals/begin-quiz-modal';
import { ShareScreenModal } from '../../../components/modals/share-screen-modal';
import { ShowScreensModal } from '../../../components/modals/show-screen-modal';
import Peer from 'simple-peer';

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  schoolId: string;
}

interface StudentScreenState {
  [userId: string]: {
    screenData: string;
  };
}

export const TeacherConsole = () => {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<
    DeviceUser & {
      subjects: Subject[];
      ActiveUserLogs: ActiveUserLogs[];
    }
  >();
  const localStreamRef = useRef<MediaStream | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('');
  const [newSubjectDescription, setNewSubjectDescription] =
    useState<string>('');
  const [subjectRecords, setSubjectRecords] = useState<SubjectRecord[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveDeviceUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isCreateSubjectDialogOpen, setIsCreateSubjectDialogOpen] =
    useState(false);
  const [studentInfo, setStudentInfo] = useState<Record<string, StudentInfo>>(
    {},
  );
  const [studentScreenState, setStudentScreenState] =
    useState<StudentScreenState>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showScreens, setShowScreens] = useState<boolean>(false);
  const [isWebpageDialogOpen, setIsWebpageDialogOpen] = useState(false);
  const [webpageUrl, setWebpageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileProgress, setFileProgress] = useState<number>(0);
  const [isBeginQuizDialogOpen, setIsBeginQuizDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [quizzes, setQuizzes] =
    useState<Array<Quiz & { questions: Array<QuizQuestion> }>>();
  const [isShareScreenDialogOpen, setIsShareScreenDialogOpen] = useState(false);
  const [isShowScreensDialogOpen, setIsShowScreensDialogOpen] = useState(false);
 
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
      // Add null check for user
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
  }, [user, toast]); // Corrected dependency array

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
      } catch (error) {
        console.error('Error creating subject:', error);
        let errorMessage = 'Failed to create subject. Please try again.';
        if (error instanceof Error) {
          if (error.message.includes('Unique constraint failed')) {
            errorMessage =
              'A subject with this code already exists. Please use a different subject code.';
          } else {
            errorMessage = error.message;
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

  const fetchActiveUsers = async () => {
    const subjectRecords = await api.database.getSubjectRecordsBySubjectId(
      selectedSubject.id,
    );
    setSubjectRecords(subjectRecords);

    const activeUsers = await api.database.getActiveUsersBySubjectId(
      selectedSubject.id,
    );
    setActiveUsers(activeUsers);

    // Fetch student info for all records
    subjectRecords.forEach((record: { userId: string }) => {
      fetchStudentInfo(record.userId);
    });
  };

  useEffect(() => {
    if (selectedSubject) {
      fetchActiveUsers();
    }
  }, [selectedSubject, fetchStudentInfo]);

  // Add this new function to handle subject change
  const handleSubjectChange = async (value: string) => {
    const newSelectedSubject = subjects.find((s) => s.id === value) || null;
    setSelectedSubject(newSelectedSubject);

    const subjectRecords =
      await api.database.getSubjectRecordsBySubjectId(value);
    setSubjectRecords(subjectRecords);

    const activeUsers = await api.database.getActiveUsersBySubjectId(value);
    setActiveUsers(activeUsers);
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

  const CHUNK_SIZE = 1024 * 1024; // 1MB

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file && selectedSubject) {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setFileProgress(progress);
        }
      };
      reader.onload = () => {
        const content = reader.result as ArrayBuffer;
        const totalChunks = Math.ceil(content.byteLength / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = content.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const base64Chunk = btoa(
            String.fromCharCode(...new Uint8Array(chunk)),
          );
          for (const user of activeUsers) {
            socket.emit('upload-file-chunk', {
              deviceId: user.deviceId,
              chunk: base64Chunk,
              filename: file.name,
              subjectName: selectedSubject.name,
              chunkIndex: i,
              totalChunks,
            });
          }
        }
        toast({
          title: 'File Shared',
          description: 'The file has been shared with student devices.',
        });
        setFileProgress(0);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleShareFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Update the renderStudentScreen function to include click handling
  const renderStudentScreen = useCallback(
    (userId: string, student: StudentInfo) => {
      const screenState = studentScreenState[userId];

      return (
        <div
          key={userId}
          className={`flex flex-col p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer`}
        >
          {/* Student Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {student?.firstName?.[0]}
                  {student?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {student?.firstName} {student?.lastName}
                </p>
                <p className="text-xs text-gray-500">ID: {student?.schoolId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            </div>
          </div>

          {/* Screen Preview */}
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden group">
            <div className="flex items-center justify-center h-full">
              {screenState?.screenData ? (
                <img
                  src={screenState.screenData}
                  alt="Student Screen"
                  className="object-cover w-full h-full"
                />
              ) : (
                <p className="text-sm text-gray-400">
                  No screen data available
                </p>
              )}
            </div>
          </div>
        </div>
      );
    },
    [studentScreenState],
  );



  const handleStartScreenShare = async () => {
    try {
      const sourceId = await api.screen.getScreenSourceId();
      const stream = await (navigator.mediaDevices as any).getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      });
      
      localStreamRef.current = stream;
      setIsScreenSharing(true);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
      });

      peer.on('signal', (data) => {
        activeUsers.forEach((activeUser) => {
          socket.emit('screen-share-offer', {
            senderId: user.id,
            receiverId: activeUser.userId,
            signalData: data,
          });
        });
      });

      
    } catch (error) {
      console.error('Error starting screen share:', error);
      setIsScreenSharing(false);
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      
      toast({
        title: 'Error',
        description: 'Failed to start screen sharing',
        variant: 'destructive',
      });
    }
  };

  const handleStopScreenShare = () => {
    try {
      // Stop all tracks in the local stream
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      
      setIsScreenSharing(false);
      
      // Notify students that screen sharing has stopped
      activeUsers.forEach((activeUser) => {
        socket.emit('screen-share-stopped', {
          senderId: user.id,
          receiverId: activeUser.userId,
        });
      });
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };


  useEffect(() => {
    if (socket && isConnected && selectedSubject) {
      socket.emit('join-server', selectedSubject.id);

      socket.on('student-joined', ({ _userId, subjectId }) => {
        if (selectedSubject.id === subjectId) {
          fetchActiveUsers();
          toast({
            title: 'Student Joined',
            description: `A student has joined the subject.`,
          });
        }
      });

      socket.on('student-left', ({ _userId, subjectId }) => {
        if (selectedSubject.id === subjectId) {
          fetchActiveUsers();
          toast({
            title: 'Student Left',
            description: `A student has left the subject.`,
          });
        }
      });

      socket.on('student-logged-out', ({ _userId, subjectId }) => {
        if (selectedSubject.id === subjectId) {
          fetchActiveUsers();
          toast({
            title: 'Student Logged Out',
            description: `A student has logged out.`,
          });
        }
      });

      socket.on('screen-data', ({ userId, screenData }) => {
        handleScreenUpdate(userId, screenData);
      });


      return () => {
        socket.off('student-joined');
        socket.off('student-left');
        socket.off('student-logged-out');
        socket.off('screen-data');
      };
    }
  }, [socket, selectedSubject, fetchActiveUsers]);

  useEffect(() => {
    if (showScreens) {
      activeUsers.forEach((user) => {
        socket.emit('show-screen', {
          deviceId: user.deviceId,
          userId: user.userId,
          subjectId: selectedSubject.id,
        });
      });
    } else {
      activeUsers.forEach((user) => {
        socket.emit('hide-screen', {
          deviceId: user.deviceId,
        });
      });
    }
  }, [showScreens]);

  const handleScreenUpdate = useCallback(
    (userId: string, screenData: string) => {
      setStudentScreenState((prev) => ({
        ...prev,
        [userId]: {
          screenData,
        },
      }));
    },
    [],
  );

  const handleConfirmShareScreen = () => {
    setIsShareScreenDialogOpen(false);
    handleStartScreenShare();
  };

  const handleConfirmShowScreens = () => {
    setIsShowScreensDialogOpen(false);
    setShowScreens(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#EAEAEB] flex">
        <Sidebar className="border-r bg-white w-64">
          <SidebarHeader>
            <div className="flex items-center space-x-2 px-4 py-4">
              <BookOpen className="h-5 w-5 text-[#C9121F]" />
              <h2 className="text-lg font-semibold">Class Management</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {/* Subjects Section */}
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

            {/* Quick Actions Section */}
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

            {/* Tools Section */}
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
                  {/* Share Button */}

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
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {/* Actions Button */}
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
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Assess Button */}
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

                  {/* Focus Button */}
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
                      <DropdownMenuItem>
                        <Globe2 className="h-4 w-4 mr-2" />
                        Limit Web
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <AppWindow className="h-4 w-4 mr-2" />
                        Limit Apps
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Analytics */}
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
          {fileProgress > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
              <p className="text-lg font-semibold text-blue-500">
                Uploading... {fileProgress.toFixed(0)}%
              </p>
            </div>
          )}

          <main className="px-4 sm:px-6 lg:px-8 py-4 relative h-[calc(100vh-8rem)] overflow-y-auto">
            {isLoading ? (
              // Loading state
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9121F] mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading subjects...</p>
                </div>
              </div>
            ) : !selectedSubject ? (
              // No subject selected state
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
              // Existing subject view content
              <div className="grid gap-4">
                {/* Combined Subject Details and Statistics Card */}
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#C9121F]">
                  <div className="flex justify-between gap-4">
                    {/* Subject Details - Made more compact */}
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

                    {/* Statistics - Made more compact */}
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
            {/* Student List - Adjusted height */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#EBC42E] flex-1">
              <Tabs defaultValue="active" className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Student List
                    </h2>
                    <TabsList className="grid grid-cols-2 rounded-full">
                      <TabsTrigger className="rounded-full" value="active">
                        Active ({activeUsers.length})
                      </TabsTrigger>
                      <TabsTrigger className="rounded-full" value="inactive">
                        Inactive ({subjectRecords.length - activeUsers.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {subjectRecords.length} Students
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">
                        Show Screens (Beta)
                      </span>
                      <Switch
                        checked={showScreens}
                        onCheckedChange={() =>
                          showScreens
                            ? setShowScreens(false)
                            : setIsShowScreensDialogOpen(true)
                        }
                      />
                    </div>
                  </div>
                </div>

                <TabsContent value="active">
                  <ScrollArea className="h-[calc(100vh-24rem)] rounded-md border p-2">
                    {activeUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Users className="h-12 w-12 mb-2" />
                        <p>No active users</p>
                      </div>
                    ) : (
                      <div
                        className={
                          showScreens ? 'grid grid-cols-2 gap-4' : 'space-y-2'
                        }
                      >
                        {subjectRecords
                          .filter((record) =>
                            activeUsers.some(
                              (user) => user.userId === record.userId,
                            ),
                          )
                          .map((record) => {
                            const student = studentInfo[record.userId];
                            return student ? (
                              showScreens ? (
                                renderStudentScreen(record.userId, student)
                              ) : (
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
                                    Active
                                  </Badge>
                                </div>
                              )
                            ) : null;
                          })}
                      </div>
                    )}
                  </ScrollArea>
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
            </div>
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
              navigate={navigate}
              selectedSubject={selectedSubject}
            />
            <ShareScreenModal
              isOpen={isShareScreenDialogOpen}
              onOpenChange={setIsShareScreenDialogOpen}
              handleConfirmShareScreen={handleConfirmShareScreen}
            />
            <ShowScreensModal
              isOpen={isShowScreensDialogOpen}
              onOpenChange={setIsShowScreensDialogOpen}
              handleConfirmShowScreens={handleConfirmShowScreens}
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
