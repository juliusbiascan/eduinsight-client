import logo from '@/renderer/assets/passlogo-small.png';
import {
  Activity,
  ActivityRecord,
  DeviceUser,
  Quiz,
  QuizRecord,
  Subject,
} from '@prisma/client';
import { useToast } from '../../../hooks/use-toast';
import {
  LogOut,
  RefreshCw,
  Book,
  ChevronDown,
  PlusCircle,
  Clock,
} from 'lucide-react';
import { Toaster } from '../../../components/ui/toaster';
import { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
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
} from '../../../components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/renderer/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/renderer/components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '@/renderer/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { usePeer } from '@/renderer/components/peer-provider';
import { MediaConnection } from 'peerjs';

interface StudentConsoleProps {
  user: DeviceUser;
  handleLogout: () => void;
}

export const StudentConsole: React.FC<StudentConsoleProps> = ({
  user,
  handleLogout,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { peer } = usePeer();
  const [subjectCode, setSubjectCode] = useState('');
  const [subjects, setSubjects] = useState<
    (Subject & {
      quizzes: Quiz[];
      activities: Activity[];
      quizRecord: QuizRecord[];
      activityRecord: ActivityRecord[];
    })[]
  >([]);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<
    | (Subject & {
        quizzes: Quiz[];
        activities: Activity[];
        quizRecord: QuizRecord[];
        activityRecord: ActivityRecord[];
      })
    | null
  >(null);
  const [isLeavingSubject, setIsLeavingSubject] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenShareInterval = useRef<NodeJS.Timeout>();
  const connection = useRef<MediaConnection | null>(null);
  const [teacherScreenStream, setTeacherScreenStream] =
    useState<MediaStream | null>(null);

  useEffect(() => {
    if (peer) {
      peer.on('connection', (conn) => {
        conn.on('data', (data: { type: string; url?: string }) => {
          console.log('Received data:', data);
          if (data.type === 'webpage' && data.url) {
            api.window.openExternalLink(data.url);
          }
        });
      });

      peer.on('call', (call) => {
        console.log('Received call from peer:', call.peer);
        if (screenStream) {
          call.answer(screenStream); // Answer the call without sending any stream
          call.on('stream', (remoteStream) => {
            console.log('Received stream from teacher');
            setTeacherScreenStream(remoteStream);
          });

          call.on('close', () => {
            console.log('Call closed');
            setTeacherScreenStream(null);
          });
          connection.current = call;
        }
      });

      peer.on('error', (error) => {
        console.error('PeerJS error:', error);
      });
    }
  }, [peer]);

  useEffect(() => {
    fetchSubjects();
  }, [user.id]);

  useEffect(() => {
    if (selectedSubject && !isScreenSharing) {
      const startScreenShare = async () => {
        try {
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

          setScreenStream(stream);
          setIsScreenSharing(true);

          return () => {
            if (screenShareInterval.current) {
              clearInterval(screenShareInterval.current);
            }
            if (screenStream) {
              screenStream.getTracks().forEach((track) => track.stop());
              setScreenStream(null);
            }
            setIsScreenSharing(false);
            api.screen.stopScreenShare();
          };
        } catch (error) {
          console.error('Error starting screen share:', error);
          toast({
            title: 'Screen Share Error',
            description: 'Failed to start screen sharing',
            variant: 'destructive',
          });
        }
      };

      startScreenShare();
    }
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const data = await api.database.getStudentSubjects(user.id);
      setSubjects(data);

      if (data.length > 0) {
        setSelectedSubject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
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
    if (!selectedSubject) return { quizzes: 0, activities: 0, overall: 0 };

    const userQuizRecords = selectedSubject.quizRecord.filter(
      (record) => record.userId === user.id,
    );
    const completedQuizzes = userQuizRecords.length;
    const totalQuizzes = selectedSubject.quizzes.filter(
      (quiz) => quiz.published,
    ).length;
    const completedActivities = selectedSubject.activityRecord.filter(
      (activity) => activity.completed && activity.userId === user.id,
    ).length;
    const totalActivities = selectedSubject.activities.length;

    const quizProgress =
      totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;
    const activityProgress =
      totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    // If there are no activities, only use quiz progress for overall
    const overallProgress =
      totalActivities === 0
        ? quizProgress
        : (quizProgress + activityProgress) / 2;

    return {
      quizzes: completedQuizzes,
      activities: completedActivities,
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

  const handleViewQuizResults = (subjectId: string) => {
    navigate(`/results/quiz-results/${subjectId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-[#EAEAEB]">
      {/* Header */}
      <header className="bg-[#C9121F] text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center">
          <img
            src={logo}
            alt="PASS College Logo"
            className="h-10 w-auto mr-2 rounded-full border-2 border-[#EBC42E]"
          />
          <h1 className="text-2xl font-bold">Student's Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog
            open={isProfileDialogOpen}
            onOpenChange={setIsProfileDialogOpen}
          >
            <DialogTrigger asChild>
              <div className="flex items-center cursor-pointer hover:bg-yellow-600 rounded-full p-2 transition-colors duration-200">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={'/default-avatar.png'} alt="User Avatar" />
                  <AvatarFallback>
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm ml-2 mr-1">
                  {user.firstName} {user.lastName}
                </span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Student Information</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name:</p>
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Student ID:</p>
                  <p className="font-medium">{user.schoolId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Course :</p>
                  <p className="font-medium">{user.course}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Year:</p>
                  <p className="font-medium">{user.yearLevel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Login:</p>
                  <p className="font-medium"></p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow p-4 overflow-y-auto relative no-scrollbar">
        {/* Teacher Screen */}
        {teacherScreenStream && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
            <video
              ref={(el) => {
                if (el) {
                  el.srcObject = teacherScreenStream;
                  el.onloadedmetadata = () => {
                    el.play().catch((error) => {
                      console.error('Error playing video:', error);
                    });
                  };
                }
              }}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Subject Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#C9121F]">
          <h2 className="text-xl font-bold mb-4 text-[#1A1617] flex items-center">
            <Book className="mr-2 h-6 w-6 text-[#C9121F]" /> Your Subjects
          </h2>
          {subjects.length > 0 ? (
            <div className="space-y-4">
              <div className="flex space-x-4 items-center">
                <Select
                  onValueChange={handleSubjectChange}
                  value={selectedSubject?.id.toString()}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem
                        key={subject.id}
                        value={subject.id.toString()}
                      >
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={!selectedSubject}>
                      Leave Subject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. You will need to rejoin
                        the subject if you want to access it again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLeaveSubject}
                        disabled={isLeavingSubject}
                      >
                        {isLeavingSubject ? 'Leaving...' : 'Leave Subject'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {selectedSubject && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">
                    {selectedSubject.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Subject Code: {selectedSubject.subjectCode}
                  </p>
                  <div className="flex space-x-4">
                    <div>
                      <span className="text-sm font-medium">Quizzes: </span>
                      <span className="text-sm">
                        {
                          selectedSubject.quizzes.filter(
                            (quiz) => quiz.published,
                          ).length
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Activities: </span>
                      <span className="text-sm">
                        {selectedSubject.activities.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 mb-4">
              No subjects available. Please join a subject first.
            </p>
          )}
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full mt-4 bg-green-100 hover:bg-green-200 text-green-600"
              >
                <PlusCircle className="h-5 w-5 mr-2" /> Join New Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Subject</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col space-y-4">
                <Input
                  placeholder="Enter subject code"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                />
                <Button onClick={handleJoinSubject} disabled={isJoining}>
                  {isJoining ? 'Joining...' : 'Join Subject'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <Card className="bg-white shadow-lg border-t-4 border-[#C9121F]">
            <CardHeader>
              <CardTitle className="text-[#1A1617]">
                Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSubject ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        Quizzes Completed
                      </span>
                      <span className="text-sm font-medium">
                        {calculateProgress().quizzes}/
                        {
                          selectedSubject.quizzes.filter(
                            (quiz) => quiz.published,
                          ).length
                        }
                      </span>
                    </div>
                    <Progress
                      value={
                        (calculateProgress().quizzes /
                          selectedSubject.quizzes.filter(
                            (quiz) => quiz.published,
                          ).length) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        Activities Finished
                      </span>
                      <span className="text-sm font-medium">
                        {calculateProgress().activities}/
                        {selectedSubject.activities.length}
                      </span>
                    </div>
                    <Progress
                      value={
                        (calculateProgress().activities /
                          selectedSubject.activities.length) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        Overall Progress
                      </span>
                      <span className="text-sm font-medium">
                        {calculateProgress().overall}%
                      </span>
                    </div>
                    <Progress
                      value={calculateProgress().overall}
                      className="h-2"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  Select a subject to view progress.
                </p>
              )}
            </CardContent>
          </Card>
          {/* Quizzes */}
          <Card className="bg-white shadow-lg border-t-4 border-[#EBC42E]">
            <CardHeader>
              <CardTitle className="text-[#1A1617]">Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length > 0 ? (
                selectedSubject ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-4 w-full flex items-center justify-center"
                      onClick={() => handleViewQuizResults(selectedSubject.id)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      View Quiz Results
                    </Button>
                    {selectedSubject.quizzes.filter((quiz) => quiz.published)
                      .length > 0 ? (
                      <ul className="space-y-4">
                        {selectedSubject.quizzes
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
                              <li
                                key={quiz.id}
                                className="bg-gray-50 rounded-lg p-3 shadow-sm"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-semibold">
                                    {quiz.title}
                                  </span>
                                  <Badge
                                    variant={
                                      isQuizDone ? 'secondary' : 'destructive'
                                    }
                                  >
                                    {isQuizDone ? 'Done' : 'Not Done'}
                                  </Badge>
                                </div>
                                {isQuizDone && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                      Score:
                                    </span>
                                    <span className="text-sm font-semibold">
                                      {quizRecord.score}/
                                      {quizRecord.totalQuestions}
                                    </span>
                                  </div>
                                )}
                                <Progress value={score} className="mt-2" />
                                {!isQuizDone && (
                                  <Button
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => handleStartQuiz(quiz.id)}
                                  >
                                    Start
                                  </Button>
                                )}
                              </li>
                            );
                          })}
                      </ul>
                    ) : (
                      <p className="text-gray-500">
                        No published quizzes available for this subject.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">
                    Please select a subject to view quizzes.
                  </p>
                )
              ) : (
                <p className="text-gray-500">
                  Join a subject to view available quizzes.
                </p>
              )}
            </CardContent>
          </Card>
          {/* Activities */}
          <Card className="bg-white shadow-lg border-t-4 border-[#C9121F]">
            <CardHeader>
              <CardTitle className="text-[#1A1617]">Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length > 0 ? (
                selectedSubject ? (
                  selectedSubject.activities.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedSubject.activities.map((activity) => (
                        <li
                          key={activity.id}
                          className="flex justify-between items-center"
                        >
                          <span>{activity.name}</span>
                          <Button
                            size="sm"
                            onClick={() =>
                              toast({
                                title: 'Activity Started',
                                description: `You've started ${activity.name}`,
                              })
                            }
                          >
                            Begin
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">
                      No activities available for this subject.
                    </p>
                  )
                ) : (
                  <p className="text-gray-500">
                    Please select a subject to view activities.
                  </p>
                )
              ) : (
                <p className="text-gray-500">
                  Join a subject to view available activities.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1617] text-white text-center p-2 relative">
        <p className="text-xs">
          &copy; 2024 PASS College. All rights reserved.
        </p>
      </footer>
      <Toaster />
    </div>
  );
};
