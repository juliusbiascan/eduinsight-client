import logo from '@/renderer/assets/passlogo-small.png';
import {
  Device,
  DeviceUser,
  Quiz,
  QuizRecord,
  Subject,
  DeviceUserRole,
} from '@prisma/client';
import { useToast } from '../../../hooks/use-toast';
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
} from 'lucide-react';
import { Toaster } from '../../../components/ui/toaster';
import { useState, useEffect, useCallback } from 'react';
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
import { WindowIdentifier } from '@/shared/constants';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { useSocket } from '@/renderer/components/socket-provider';
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
import { Progress } from '@/renderer/components/ui/progress';
//import Peer from 'simple-peer';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/renderer/components/ui/scroll-area';
import { formatDistance } from 'date-fns/formatDistance';

interface FileNotification {
  id: string;
  type: 'file';
  title: string;
  message: string;
  time: string;
  read: boolean;
  status: 'downloading' | 'completed' | 'error';
  progress?: number;
  path?: string;
  subjectName?: string;
  error?: string;
  filePath?: string;  // Add this new property
}

interface StandardNotification {
  id: string;
  type: 'standard';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

type Notification = FileNotification | StandardNotification;

interface FileTransfer {
  id: string;
  filename: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
  subjectName?: string;
  error?: string;
}

export const StudentConsole = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState<DeviceUser>();
  const [subjectCode, setSubjectCode] = useState('');
  const [subjects, setSubjects] = useState<
    (Subject & {
      quizzes: Quiz[];
      quizRecord: QuizRecord[];
    })[]
  >([]);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<
    | (Subject & {
        quizzes: Quiz[];
        quizRecord: QuizRecord[];
      })
    | null
  >(null);
  const [isLeavingSubject, setIsLeavingSubject] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [downloads, setDownloads] = useState<{
    files: { name: string; path: string; subjectName: string; date: string }[];
    subjects: string[];
    isEmpty: boolean;
    error?: string;
  }>({ files: [], subjects: [], isEmpty: true });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fileTransfers, setFileTransfers] = useState<Record<string, FileTransfer>>({});

  const fetchDownloads = useCallback(async () => {
    const result = await api.files.getDownloads();
    setDownloads(result);
  }, []);

  const openDownloadsFolder = () => {
    api.window.close(WindowIdentifier.Dashboard);
    api.files.openDownloadsFolder();
  };

  const openFile = (filePath: string) => {
    api.files.openFile(filePath);
  };

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  //const [screenSharing, setScreenSharing] = useState(false);

  //const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
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
  }, [user, socket, isConnected]); // Add socket and isConnected to dependencies

  useEffect(() => {
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
    api.window.receive(
      'file-received',
      (event, fileId: string, filename, path, subjectName) => {
        const notification: FileNotification = {
          id: fileId,
          type: 'file',
          title: 'File Downloaded',
          message: filename,
          time: new Date().toISOString(),
          read: false,
          status: 'completed',
          filePath: path,  // Store the file path
          subjectName
        };

        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

      },
    );

    api.window.receive(
      'file-receive-error',
      (event, fileId, filename, error) => {
        const notification: FileNotification = {
          id: fileId as string,
          type: 'file',
          title: 'Download Failed',
          message: filename as string,
          time: new Date().toISOString(),
          read: false,
          status: 'error',
          error: error as string
        };

        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        toast({
          title: 'Download Failed',
          description: `Failed to download ${filename}: ${error}`,
          variant: 'destructive',
        });
      },
    );

    api.window.receive(
      'file-progress',
      (event, fileId: string, filename: string, progress: number, subjectName: string) => {
        setNotifications(prev => {
          const existing = prev.find(n => n.type === 'file' && n.id === fileId);
          if (existing && existing.type === 'file') {
            return prev.map(n => 
              n.id === fileId && n.type === 'file'
                ? { ...n, progress, status: 'downloading' as const }
                : n
            );
          }
          
          const notification: FileNotification = {
            id: fileId,
            type: 'file',
            title: 'Downloading File',
            message: filename,
            time: new Date().toISOString(),
            read: false,
            status: 'downloading',
            progress,
            subjectName
          };
          
          return [notification, ...prev];
        });
      },
    );
  }, [selectedSubject]);

  useEffect(() => {
    api.window.receive(
      'file-progress',
      (event, fileId: string, filename: string, progress: number, subjectName: string) => {
        setFileTransfers(prev => ({
          ...prev,
          [fileId]: {
            id: fileId,
            filename,
            progress,
            status: 'downloading',
            subjectName
          }
        }));
      },
    );

    api.window.receive(
      'file-received',
      (event, fileId: string) => {
        setFileTransfers(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: 'completed',
            progress: 100
          }
        }));

        // Remove the transfer after a delay
        setTimeout(() => {
          setFileTransfers(prev => {
            const newTransfers = { ...prev };
            delete newTransfers[fileId];
            return newTransfers;
          });
        }, 3000);
      },
    );

    api.window.receive(
      'file-receive-error',
      (event, fileId: string, filename: string, error: string) => {
        setFileTransfers(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: 'error',
            error
          }
        }));
      },
    );
  }, []);

  // useEffect(() => {
  //   if (!socket || !isConnected || !user) return;

  //   const peer = new Peer({
  //     initiator: false,
  //     trickle: false,
  //     config: {
  //       iceServers: [
  //         {
  //           urls: 'stun:192.168.1.142:3478',
  //         },
  //         {
  //           urls: 'turn:192.168.1.142:3478',
  //           username: 'eduinsight',
  //           credential: 'jlzk21dev',
  //         },
  //       ],
  //       iceTransportPolicy: 'all',
  //     },
  //   });

  //   const handleScreenShareOffer = ({
  //     senderId,
  //     signalData,
  //   }: {
  //     senderId: string;
  //     receiverId: string;
  //     signalData: Peer.SignalData;
  //   }) => {
  //     console.log('Received screen share offer:', senderId);
  //     peer.signal(signalData);
  //   };

  //   peer.on('signal', (data) => {
  //     socket.emit('screen-share-offer', {
  //       senderId: user.id,
  //       receiverId: selectedSubject?.id || '',
  //       signalData: data,
  //     });
  //   });

  //   peer.on('stream', (stream: MediaStream) => {
  //     if (videoRef.current) {
  //       videoRef.current.srcObject = stream;
  //     }
  //     setScreenSharing(true);
  //   });

  //   const handleScreenShareStopped = () => {
  //     if (videoRef.current) {
  //       videoRef.current.srcObject = null;
  //     }
  //     setScreenSharing(false);
  //   };

  //   socket.on('screen-share-offer', handleScreenShareOffer);
  //   socket.on('screen-share-stopped', handleScreenShareStopped);

  //   return () => {
  //     peer.destroy();
  //     socket.off('screen-share-offer', handleScreenShareOffer);
  //     socket.off('screen-share-stopped', handleScreenShareStopped);
  //   };
  // }, [socket, isConnected, user]);

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

  const handleOpenFile = (filePath: string) => {
    if (filePath) {
      api.files.openFile(filePath);
    }
  };

  const renderNotificationContent = (notification: Notification) => {
    if (notification.type === 'file') {
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium mb-1">{notification.title}</p>
              <p className="text-sm text-gray-600">{notification.message}</p>
              {notification.subjectName && (
                <Badge variant="outline" className="mt-2">
                  {notification.subjectName}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
              {formatDistance(new Date(notification.time), new Date(), { addSuffix: true })}
            </span>
          </div>

          {notification.status === 'downloading' && notification.progress !== undefined && (
            <div className="space-y-2">
              <Progress value={notification.progress} className="h-2" />
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Downloading...</span>
                <span>{notification.progress.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {notification.status === 'completed' && notification.filePath && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 flex items-center justify-center"
              onClick={() => notification.filePath && handleOpenFile(notification.filePath)}
            >
              <Download className="h-4 w-4 mr-2" />
              Open File
            </Button>
          )}

          {notification.status === 'error' && notification.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md">
              <p className="text-xs text-red-600">{notification.error}</p>
            </div>
          )}
        </div>
      );
    }

    // Standard notification
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium mb-1">{notification.title}</p>
            <p className="text-sm text-gray-600">{notification.message}</p>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
            {formatDistance(new Date(notification.time), new Date(), { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  };

  const renderNotifications = () => (
    <DropdownMenuContent align="end" className="w-[400px] bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div>
          <h3 className="font-semibold text-lg">Notifications</h3>
          <p className="text-sm text-gray-500">Stay updated with your class activities</p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600 hover:text-blue-800"
            onClick={() => {
              setNotifications(notifications.map(n => ({ ...n, read: true })));
              setUnreadCount(0);
            }}
          >
            Mark all as read
          </Button>
        )}
      </div>
      <ScrollArea className="h-[600px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium text-lg">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">New notifications will appear here</p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-4 mb-2 rounded-lg transition-all ${
                  !notification.read 
                    ? 'bg-white border-l-4 border-blue-500 shadow-sm' 
                    : 'bg-white/60 hover:bg-white'
                }`}
                onClick={() => {
                  if (!notification.read) {
                    setUnreadCount(Math.max(0, unreadCount - 1));
                    setNotifications(
                      notifications.map(n =>
                        n.id === notification.id ? { ...n, read: true } : n
                      )
                    );
                  }
                }}
              >
                {renderNotificationContent(notification)}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </DropdownMenuContent>
  );

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
              <p className="text-red-600">Error loading files: {downloads.error}</p>
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
                  <h3 className="font-medium text-sm text-gray-900">{subject}</h3>
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
        <p className="text-sm text-gray-500">Access your downloaded files and resources</p>
      </div>

      <div className="p-6">
        {downloads.error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600">Error loading files: {downloads.error}</p>
          </div>
        ) : !downloads.files.some(file => 
            (!selectedSubject || file.subjectName === selectedSubject.name)
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
              .filter(file => (!selectedSubject || file.subjectName === selectedSubject.name))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
                      <h4 className="text-sm font-medium text-gray-900">{file.name}</h4>
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

  // Add FileTransferProgress component
  const FileTransferProgress = () => {
    const transfers = Object.values(fileTransfers).filter(
      transfer => transfer.status === 'downloading'
    );

    if (transfers.length === 0) return null;

    return (
      <div className="fixed bottom-4 right-4 w-[400px] bg-white rounded-lg shadow-lg z-50 border border-gray-200">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Downloads</h3>
            <span className="text-xs text-gray-500">
              {transfers.length} {transfers.length === 1 ? 'file' : 'files'} downloading
            </span>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="p-4 border-b last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{transfer.filename}</p>
                  {transfer.subjectName && (
                    <p className="text-xs text-gray-500">
                      From: {transfer.subjectName}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-500 ml-2">
                  {transfer.progress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    transfer.status === 'error'
                      ? 'bg-red-500'
                      : transfer.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>
              {transfer.error && (
                <p className="text-xs text-red-500 mt-1">{transfer.error}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Simplified Header */}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-[10px] font-medium text-white flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                {renderNotifications()}
              </DropdownMenu>
              
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
              Cancel
            </Button>
            <Button
              onClick={handleJoinSubject}
              disabled={isJoining}
              className="w-full sm:w-auto"
            >
              {isJoining ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Subject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
      {/* Add FileTransferProgress at the end of the component */}
      <FileTransferProgress />
    </div>
  );
};