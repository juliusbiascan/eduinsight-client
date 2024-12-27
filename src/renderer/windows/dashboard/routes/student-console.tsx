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
  Globe2,
  Menu,
} from 'lucide-react';
import { Toaster } from '../../../components/ui/toaster';
import { useState, useEffect, useRef, useCallback } from 'react';
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
import { usePeer } from '@/renderer/components/peer-provider';
import { MediaConnection } from 'peerjs';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/renderer/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { useSocket } from '@/renderer/components/socket-provider';

export const StudentConsole = () => {
  const { toast } = useToast();
  const { peer } = usePeer();
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

  const connection = useRef<MediaConnection | null>(null);

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
    if (peer) {
      peer.on('call', async (call) => {
        console.log('Received call from peer:', call.peer);
        const sourceId = await api.screen.getScreenSourceId();
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: 1280,
              maxHeight: 720,
              frameRate: { ideal: 15, max: 30 },
            },
          },
        });
        if (stream) {
          call.answer(stream); // Answer the call with the screen stream
          call.on('stream', (_remoteStream) => {
            console.log('Received stream from teacher');
          });

          call.on('close', () => {
            console.log('Call closed');
          });

          connection.current = call;
        } else {
          console.log('No screen stream available to answer the call');
        }
      });

      peer.on('error', (error) => {
        console.error('PeerJS error:', error);
      });
    }
  }, [peer]);

  useEffect(() => {
    if (!user || !socket || !isConnected) {
      return;
    }
    socket.emit('join-server', user.id);
    fetchSubjects();
  }, [user, socket, isConnected]);

  const fetchSubjects = useCallback( async () => {
    if (!user) return;
    try {
      const data = await api.database.getStudentSubjects(user.id);
      if (data.length > 0) {
        setSubjects(data);
        setSelectedSubject(data[0]);
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
                    {/* Actions Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center space-x-2"
                        >
                          <Globe2 className="h-4 w-4" />
                          <span>Settings</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          disabled={isLeavingSubject}
                          onClick={handleLeaveSubject}
                        >
                          {isLeavingSubject ? 'Leaving...' : 'Leave Subject'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            {/* Quizzes List - Adjusted height */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#EBC42E] flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Quizzes
                  </h2>
                </div>
              </div>

              <Tabs defaultValue="published" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="published">
                    Published (
                    {
                      selectedSubject?.quizzes.filter((quiz) => quiz.published)
                        .length
                    }
                    )
                  </TabsTrigger>
                  <TabsTrigger value="unpublished">
                    Unpublished (
                    {
                      selectedSubject?.quizzes.filter((quiz) => !quiz.published)
                        .length
                    }
                    )
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="published">
                  <ScrollArea className="h-[calc(100vh-24rem)] rounded-md border p-2">
                    <div className="space-y-2">
                      {selectedSubject?.quizzes
                        .filter((quiz) => quiz.published)
                        .map((quiz) => {
                          const quizRecord = selectedSubject.quizRecord.find(
                            (record) =>
                              record.quizId === quiz.id &&
                              record.userId === user.id,
                          );
                          const isQuizDone = !!quizRecord;
                          const score = quizRecord
                            ? (quizRecord.score / quizRecord.totalQuestions) *
                              100
                            : 0;
                          return (
                            <div
                              key={quiz.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                            >
                              <div className="flex items-center space-x-2">
                                <div>
                                  <p className="text-sm font-medium">
                                    {quiz.title}
                                  </p>
                                  {isQuizDone && (
                                    <p className="text-xs text-gray-500">
                                      Score: {score}/{quizRecord.totalQuestions}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs text-gray-500"
                              >
                                {isQuizDone ? 'Done' : 'Not Done'}
                              </Badge>
                              {!isQuizDone && (
                                <Button
                                  size="sm"
                                  className="ml-2"
                                  onClick={() => handleStartQuiz(quiz.id)}
                                >
                                  Start
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="unpublished">
                  <ScrollArea className="h-[calc(100vh-24rem)] rounded-md border p-2">
                    <div className="space-y-2">
                      {selectedSubject?.quizzes
                        .filter((quiz) => !quiz.published)
                        .map((quiz) => (
                          <div
                            key={quiz.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                          >
                            <div className="flex items-center space-x-2">
                              <div>
                                <p className="text-sm font-medium">
                                  {quiz.title}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs text-gray-500"
                            >
                              Unpublished
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
