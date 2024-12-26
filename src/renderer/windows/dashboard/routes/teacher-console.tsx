import logo from '@/renderer/assets/passlogo-small.png';

import { Button } from '@/renderer/components/ui/button';
import { Toaster } from '@/renderer/components/ui/toaster';
import { useToast } from '@/renderer/hooks/use-toast';
import {
  ActiveDeviceUser,
  ActiveUserLogs,
  DeviceUser,
  Subject,
  SubjectRecord,
} from '@prisma/client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { WindowIdentifier } from '@/shared/constants';
import { formatDistance } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Textarea } from '@/renderer/components/ui/textarea';
import { generateSubjectCode } from '@/shared/utils';
import {
  Avatar,
  AvatarFallback,
} from '@/renderer/components/ui/avatar';
import {
  LogOut,
  PlusCircle,
  RefreshCw,
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
  Maximize2,
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
import { Skeleton } from '@/renderer/components/ui/skeleton';
import { MediaConnection } from 'peerjs';
import { usePeer } from '@/renderer/components/peer-provider';
import { Switch } from '@/renderer/components/ui/switch';
import { useSocket } from '@/renderer/components/socket-provider';

interface TeacherConsoleProps {
  user: DeviceUser & { subjects: Subject[] };
  recentLogin: ActiveUserLogs | null;
  handleLogout: () => void;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  schoolId: string;
}

interface ScreenUpdate {
  timestamp: number;
  data: HTMLVideoElement;
}

interface StudentScreenState {
  [userId: string]: {
    loading: boolean;
    error: string | null;
    lastUpdate: ScreenUpdate | null;
  };
}

export const TeacherConsole: React.FC<TeacherConsoleProps> = ({
  user,
  recentLogin,
  handleLogout,
}) => {
  const {socket, isConnected} = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(
    null,
  );
  const [studentScreens, setStudentScreens] = useState<StudentScreenState>({});
  const { peer } = usePeer();
  const [isStudentScreenMaximized, setIsStudentScreenMaximized] =
    useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenShareStream = useRef<MediaStream | null>(null);
  const callConnections = useRef<Record<string, MediaConnection>>({});
  const [showScreens, setShowScreens] = useState<boolean>(false);
  const [isWebpageDialogOpen, setIsWebpageDialogOpen] = useState(false);
  const [webpageUrl, setWebpageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState<number>(0);

  const handleMaximizeStudentScreen = () => {
    setIsStudentScreenMaximized(true);
  };

  const handleMinimizeStudentScreen = () => {
    setIsStudentScreenMaximized(false);
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
    const fetchSubjects = () => {
      setIsLoading(true);
      try {
        const fetchedSubjects = user.subjects;
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
  }, [user.subjects, toast]); // Corrected dependency array

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

  const handleRefresh = () => {
    window.location.reload();
    toast({
      title: 'Refreshed',
      description: 'Page content has been updated.',
    });
  };

  const handleScreenUpdate = useCallback(
    (userId: string, stream: MediaStream) => {
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.onloadedmetadata = () => {
        videoElement.play().catch((error) => {
          console.error('Error playing video:', error);
        });
      };

      setStudentScreens((prev) => ({
        ...prev,
        [userId]: {
          loading: false,
          error: null,
          lastUpdate: {
            timestamp: Date.now(),
            data: videoElement,
          },
        },
      }));
    },
    [],
  );

  // Add this new useEffect to handle screen data for selected student
  useEffect(() => {
    if (selectedStudent) {
      const screenState = studentScreens[selectedStudent.id];
      if (screenState?.lastUpdate && selectedStudent) {
        setSelectedStudent((prev) =>
          prev
            ? {
                ...prev,
                screenData: screenState.lastUpdate.data,
              }
            : selectedStudent,
        );
      }
    }
  }, [selectedStudent, studentScreens]);

  useEffect(() => {
    const showStudentScreens = async () => {
      try {
        if (showScreens) {
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

          screenShareStream.current = stream;

          activeUsers.forEach((user) => {
            if (!callConnections.current[user.userId]) {
              const call = peer.call(user.userId, stream);
              callConnections.current[user.userId] = call;
              callConnections.current[user.userId]
                .on('stream', (remoteStream: MediaStream) => {
                  handleScreenUpdate(call.peer, remoteStream);
                })
                .on('close', () => {
                  // Handle call close
                  setStudentScreens((prev) => ({
                    ...prev,
                    [call.peer]: {
                      ...prev[call.peer],
                      error: 'Screen share connection closed',
                    },
                  }));
                })
                .on('error', (error) => {
                  // Handle call error
                  console.error('Call error:', error);
                  setStudentScreens((prev) => ({
                    ...prev,
                    [call.peer]: {
                      ...prev[call.peer],
                      error: 'Screen share connection error',
                    },
                  }));
                });
            }
          });

          toast({
            title: 'Screen Sharing Started',
            description: 'You are now sharing your screen with students.',
          });
        }
      } catch (error) {
        console.error('Error starting screen share:', error);
        toast({
          title: 'Error',
          description: 'Failed to start screen sharing. Please try again.',
          variant: 'destructive',
        });
      }
    };
    showStudentScreens();
  }, [showScreens]);

  const handleStartScreenShare = async () => {
    for (const user of activeUsers) {
      const conn = peer.connect(user.userId);
      conn.on('open', () => {
        conn.send({ type: 'teacherScreen', start: true });
        conn.close();
      });
    }
  };

  const handleStopScreenShare = () => {
    setIsScreenSharing(false);
  };

  const handleLaunchWebpage = () => {
    if (selectedSubject && peer) {
      for (const user of activeUsers) {
        socket.emit("launch-webpage", { deviceId: user.deviceId, url: webpageUrl });
      }
      toast({
        title: 'Webpage Launched',
        description: 'The webpage has been launched on student devices.',
      });
      setIsWebpageDialogOpen(false);
      setWebpageUrl('');
    }
  };

  const handleShareFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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
        for (const user of activeUsers) {
          socket.emit("upload-file", { deviceId: user.deviceId, file: { name: file.name, content: new Blob([content]) }, subjectName: selectedSubject.name });
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

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && selectedSubject && peer) {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setFileProgress(progress);
        }
      };
      reader.onload = () => {
        const content = reader.result as ArrayBuffer;
        for (const user of activeUsers) {
          const conn = peer.connect(user.userId);
          conn.on('open', () => {
            conn.send({ type: 'file', file: { name: file.name, content: new Blob([content]) } });
            conn.close();
          });
        }
        toast({
          title: 'File Shared',
          description: 'The file has been shared with student devices.',
        });
        setFileProgress(0);
      };
      reader.readAsArrayBuffer(file);
    }
  }, [selectedSubject, peer, activeUsers, toast]);

  // Update the renderStudentScreen function to include click handling
  const renderStudentScreen = useCallback(
    (userId: string, student: StudentInfo) => {
      const screenState = studentScreens[userId];

      return (
        <div
          key={userId}
          className={`flex flex-col p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer ${
            isStudentScreenMaximized ? 'fixed inset-0 z-50 bg-white' : ''
          }`}
          onClick={() => {
            setSelectedStudent(student);
          }}
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
                {screenState?.loading ? 'Connecting' : 'Active'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  isStudentScreenMaximized
                    ? handleMinimizeStudentScreen()
                    : handleMaximizeStudentScreen();
                }}
              >
                {isStudentScreenMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Screen Preview */}
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden group">
            {screenState?.loading ? (
              <Skeleton className="w-full h-full" />
            ) : screenState?.error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-red-500">{screenState.error}</p>
              </div>
            ) : screenState?.lastUpdate ? (
              <>
                <video
                  ref={(el) => {
                    if (el) {
                      el.srcObject = screenState.lastUpdate.data.srcObject;
                      el.onloadedmetadata = () => {
                        el.play().catch((error) => {
                          console.error('Error playing video:', error);
                        });
                      };
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">
                  Waiting for screen share...
                </p>
              </div>
            )}
          </div>

          {/* Last Update Timestamp */}
          {screenState?.lastUpdate && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Last updated:{' '}
                {new Date(
                  screenState.lastUpdate.timestamp,
                ).toLocaleTimeString()}
              </p>
              <Badge variant="outline" className="text-xs">
                Click to view details
              </Badge>
            </div>
          )}
        </div>
      );
    },
    [studentScreens, isStudentScreenMaximized],
  );


  useEffect(() => {
    if (socket && isConnected && selectedSubject) {
      socket.emit("join-server", selectedSubject.id);
      console.log("Joining server:", selectedSubject.name);

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
  
      return () => {
        socket.off('student-joined');
        socket.off('student-left');
        socket.off('student-logged-out');
      };
    }
  }, [socket, selectedSubject, fetchActiveUsers, handleScreenUpdate, toast]);

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
                      onClick={() => handleCreateAssignment('quiz')}
                      className="w-full"
                    >
                      <PenBox className="h-4 w-4 mr-2" />
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
                          : handleStartScreenShare
                      }
                      className="w-full"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      <span>
                        {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMinimizeWindow}
                    className="text-white hover:bg-[#EBC42E]/20"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="text-white hover:bg-[#EBC42E]/20"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

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
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden md:inline text-white">
                          {user.firstName} {user.lastName}
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
                              {user.firstName[0]}
                              {user.lastName[0]}
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
                                  {user.firstName} {user.lastName}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Teacher ID:
                                </span>
                                <span className="text-sm font-medium">
                                  {user.schoolId}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Department:
                                </span>
                                <span className="text-sm font-medium">
                                  {user.course}
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
                                  {recentLogin
                                    ? formatDistance(
                                        new Date(recentLogin.createdAt),
                                        new Date(),
                                        { addSuffix: true },
                                      )
                                    : 'No recent login'}
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
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-white hover:bg-[#EBC42E]/20"
                  >
                    <LogOut className="h-4 w-4" />
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
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative ${isDragging ? 'border-2 border-dashed border-blue-500' : ''}`}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center space-x-2">
                          <Share className="h-4 w-4" />
                          <span>Share</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={isScreenSharing ? handleStopScreenShare : handleStartScreenShare}
                        >
                          <MonitorPlay className="h-4 w-4 mr-2" />
                          {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
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
                    {isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                        <p className="text-lg font-semibold text-blue-500">Drop file to share</p>
                      </div>
                    )}
                    {fileProgress > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                        <p className="text-lg font-semibold text-blue-500">Uploading... {fileProgress.toFixed(0)}%</p>
                      </div>
                    )}
                  </div>
                  

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
                      <DropdownMenuItem onClick={() => setIsWebpageDialogOpen(true)}>
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
                        onClick={() => handleCreateAssignment('quiz')}
                      >
                        <PenBox className="h-4 w-4 mr-2" />
                        Begin a Quiz
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Student List
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {subjectRecords.length} Students
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Show Screens</span>
                    <Switch
                      checked={showScreens}
                      onCheckedChange={setShowScreens}
                    />
                  </div>
                </div>
              </div>

              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    Active ({activeUsers.length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    Inactive ({subjectRecords.length - activeUsers.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  <ScrollArea className="h-[calc(100vh-24rem)] rounded-md border p-2">
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
            {/* Add this new Dialog component for creating a subject */}
            <Dialog
              open={isCreateSubjectDialogOpen}
              onOpenChange={setIsCreateSubjectDialogOpen}
            >
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Subject</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new subject you want to create.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code" className="text-right">
                      Code
                    </Label>
                    <Input
                      id="code"
                      value={newSubjectCode}
                      readOnly
                      className="col-span-3 bg-gray-100"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newSubjectDescription}
                      onChange={(e) => setNewSubjectDescription(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateSubject}>Create Subject</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isWebpageDialogOpen}
              onOpenChange={setIsWebpageDialogOpen}
            >
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Launch Webpage</DialogTitle>
                  <DialogDescription>
                    Enter the URL of the webpage you want to launch on student
                    devices.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="webpage-url" className="text-right">
                      URL
                    </Label>
                    <Input
                      id="webpage-url"
                      value={webpageUrl}
                      onChange={(e) => setWebpageUrl(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleLaunchWebpage}>Launch</Button>
                  <Button variant="outline" onClick={() => setIsWebpageDialogOpen(false)}>Cancel</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
