import logo from '@/renderer/assets/passlogo-small.png';
import { Device, DeviceUser, Quiz, QuizRecord, Subject, DeviceUserRole } from '@prisma/client';
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
//import Peer from 'simple-peer';
import { useNavigate } from 'react-router-dom';

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
  //const [screenSharing, setScreenSharing] = useState(false);

  //const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const validateAccess = async () => {
      try {
        const device = await api.database.getDevice();
        const activeUser = await api.database.getActiveUserByDeviceId(device.id, device.labId);
        
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
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Simplified Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="PASS College Logo" className="h-8 w-auto" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">EduInsight</h1>
                <p className="text-sm text-gray-500">Student Console</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMinimizeWindow}
                className="text-gray-600 hover:text-gray-900"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user?.firstName[0]}{user?.lastName[0]}</AvatarFallback>
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
                            <span className="text-sm text-gray-600">Full Name:</span>
                            <span className="text-sm font-medium">
                              {user?.firstName} {user?.lastName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Student ID:</span>
                            <span className="text-sm font-medium">{user?.schoolId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Course:</span>
                            <span className="text-sm font-medium">{user?.course}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Year Level:</span>
                            <span className="text-sm font-medium">{user?.yearLevel}</span>
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
                            <span className="text-sm text-gray-600">Enrolled Subjects:</span>
                            <span className="text-sm font-medium">{subjects.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Active Subject:</span>
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
                <h2 className="text-2xl font-bold text-gray-900">{selectedSubject.name}</h2>
                <p className="text-sm text-gray-500">Subject Code: {selectedSubject.subjectCode}</p>
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
                    <p className="text-sm font-medium text-gray-900">Subject Options</p>
                    <p className="text-xs text-gray-500">Manage your subject settings</p>
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
                          Are you sure you want to leave this subject? Your quiz records will be kept for reference, but you'll need to rejoin to access the subject again.
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
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Quizzes</h3>
                  <p className="text-2xl font-bold text-[#C9121F]">
                    {selectedSubject.quizzes.filter(q => q.published).length}
                  </p>
                  <p className="text-sm text-gray-600">Available</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Completed</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {calculateProgress().quizzes}
                  </p>
                  <p className="text-sm text-gray-600">Quizzes Done</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Progress</h3>
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
                          (record) => record.quizId === quiz.id && record.userId === user?.id
                        );
                        const isQuizDone = !!quizRecord;

                        return (
                          <div
                            key={quiz.id}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="font-medium">{quiz.title}</h3>
                              <Badge variant={isQuizDone ? 'success' : 'outline'}>
                                {isQuizDone ? 'Completed' : 'Not Started'}
                              </Badge>
                            </div>
                            
                            {isQuizDone ? (
                              <div className="text-sm text-gray-600">
                                Score: {quizRecord.score}/{quizRecord.totalPoints}
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
            </div>
          )}
        </main>
      </div>

      {/* Existing Dialogs */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Join a Subject</DialogTitle>
            <DialogDescription className="text-gray-500">
              Enter the subject code provided by your teacher to join a new subject.
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
    </div>
  );
};