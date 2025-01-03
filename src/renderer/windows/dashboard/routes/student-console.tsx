import logo from '@/renderer/assets/passlogo-small.png';
import { Device, DeviceUser, Quiz, QuizRecord, Subject } from '@prisma/client';
import { useToast } from '../../../hooks/use-toast';
import {
  LogOut,
  RefreshCw,
  Book,
  PlusCircle,
  Clock,
  Minimize2,
  Folders,
  Menu,
  Settings2Icon,
  Trash2Icon,
} from 'lucide-react';
import { Toaster } from '../../../components/ui/toaster';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/renderer/components/ui/sidebar';
import { ScrollArea } from '@/renderer/components/ui/scroll-area';

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
import Peer from 'simple-peer';

export const StudentConsole = () => {
  const { toast } = useToast();
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
  const [screenSharing, setScreenSharing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

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
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });

      if (selectedSubject) {
        socket.emit('logout-user', {
          userId: user.id,
          subjectId: selectedSubject.id,
        });
      }
    }
  };

  useEffect(() => {
    if (!user || !socket || !isConnected) {
      return;
    }

    socket.emit('join-server', user.id);

    fetchSubjects();
  }, [user, socket, isConnected]);

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const peer = new Peer({
      trickle: false,
    });

    const handleScreenShareOffer = ({
      senderId,
      signalData,
    }: {
      senderId: string;
      receiverId: string;
      signalData: Peer.SignalData;
    }) => {
      console.log('Received screen share offer:', senderId);
      peer.signal(signalData);
    };

    peer.on('signal', (data) => {
      socket.emit('screen-share-offer', {
        senderId: user.id,
        receiverId: selectedSubject?.id || '',
        signalData: data,
      });
    });

    peer.on('stream', (stream: MediaStream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScreenSharing(true);
    });

    const handleScreenShareStopped = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setScreenSharing(false);
    };

    socket.on('screen-share-offer', handleScreenShareOffer);
    socket.on('screen-share-stopped', handleScreenShareStopped);

    return () => {
      peer.destroy();
      socket.off('screen-share-offer', handleScreenShareOffer);
      socket.off('screen-share-stopped', handleScreenShareStopped);
    };
  }, [socket, isConnected, user]);

  const fetchSubjects = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.database.getStudentSubjects(user.id);
      if (data.length > 0) {
        setSubjects(data);
        setSelectedSubject(data[0]);
        socket.emit('join-subject', {
          userId: user.id,
          subjectId: data[0].id,
        });
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
  }, [user]);

  const handleJoinSubject = async () => {
    if (!subjectCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a subject code',
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
    const subject = subjects.find((s) => s.id.toString() === value);
    setSelectedSubject(subject || null);
    socket.emit('join-subject', {
      userId: user.id,
      subjectId: subject.id,
    });
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
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#EAEAEB] flex">
        <Sidebar className="border-r bg-white w-64">
          <SidebarHeader>
            <div className="flex items-center space-x-2 px-4 py-4">
              <Book className="h-5 w-5 text-[#C9121F]" />
              <h2 className="text-lg font-semibold">Student Dashboard</h2>
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
                      onClick={() => handleSubjectChange(subject.id.toString())}
                      className="w-full flex items-center"
                    >
                      <Folders className="h-4 w-4 mr-2" />
                      <span className="truncate">{subject.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsJoinDialogOpen(true)}
                    className="text-muted-foreground hover:bg-gray-100 w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    <span>Join Subject</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
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
                    <p className="text-sm text-[#EBC42E]">Student Console</p>
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
                          Student Profile
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
                                  Year:
                                </span>
                                <span className="text-sm font-medium">
                                  {user?.yearLevel}
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

          {selectedSubject && (
            <div className="bg-white border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14">
                  <div className="flex space-x-4">
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
                                  Are you sure you want to leave{' '}
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
                                  onClick={handleLeaveSubject}
                                  className="bg-red-600 hover:bg-red-700 text-white mt-2"
                                  disabled={isLeavingSubject}
                                >
                                  {isLeavingSubject
                                    ? 'Leaving...'
                                    : 'Leave Subject'}
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
          )}

          <main className="px-4 sm:px-6 lg:px-8 py-4 relative h-[calc(100vh-8rem)] overflow-y-auto">
            {subjects.length === 0 ? (
              // No subjects state
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Subjects Available
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Join a subject to get started with your classes.
                  </p>
                  <Button
                    onClick={() => setIsJoinDialogOpen(true)}
                    className="inline-flex items-center"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Join New Subject
                  </Button>
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
                    Select a subject from the sidebar to view its details.
                  </p>
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
                            {selectedSubject.quizzes.length}
                          </p>
                          <p className="text-xs text-gray-600">Quizzes</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-green-600">
                            {selectedSubject.quizRecord.length}
                          </p>
                          <p className="text-xs text-gray-600">Records</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-amber-600">
                            {calculateProgress().overall}%
                          </p>
                          <p className="text-xs text-gray-600">Progress</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Quizzes List */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#EBC42E]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-[#C9121F]" />
                  <h2 className="text-xl font-semibold">Available Quizzes</h2>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-24rem)] w-full rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                  {selectedSubject?.quizzes
                    .filter((quiz) => quiz.published)
                    .map((quiz) => {
                      const quizRecord = selectedSubject.quizRecord.find(
                        (record) =>
                          record.quizId === quiz.id &&
                          record.userId === user.id,
                      );
                      const isQuizDone = !!quizRecord;

                      return (
                        <div
                          key={quiz.id}
                          className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div
                            className="h-32 rounded-t-lg flex items-center justify-center"
                            style={{
                              backgroundColor:
                                quiz.color ||
                                `hsl(${Math.random() * 360}, 70%, 90%)`,
                            }}
                          >
                            <h3 className="text-lg font-semibold text-gray-800 px-4 text-center">
                              {quiz.title}
                            </h3>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant={isQuizDone ? 'secondary' : 'outline'}
                              >
                                {isQuizDone ? 'Completed' : 'Not Started'}
                              </Badge>
                              {isQuizDone && (
                                <Badge
                                  variant="success"
                                  className="bg-green-100 text-green-800"
                                >
                                  Score: {quizRecord.score}/
                                  {quizRecord.totalPoints}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              {!isQuizDone && quiz.visibility === 'public' && (
                                <Button
                                  className="w-full"
                                  onClick={() => handleStartQuiz(quiz.id)}
                                >
                                  Start Quiz
                                </Button>
                              )}
                              {isQuizDone && (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleStartQuiz(quiz.id)}
                                >
                                  Review Quiz
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>
            <Toaster />
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Join a Subject</DialogTitle>
                  <DialogDescription>
                    Enter the subject code to join a new subject.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="subject-code" className="text-right">
                      Code
                    </Label>
                    <Input
                      id="subject-code"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleJoinSubject} disabled={isJoining}>
                    {isJoining ? 'Joining...' : 'Join Subject'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="relative">
              {screenSharing && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full rounded-lg"
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
