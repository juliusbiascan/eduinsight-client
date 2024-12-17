import logo from "@/renderer/assets/passlogo-small.png";

import { Button } from "@/renderer/components/ui/button";
import { Toaster } from "@/renderer/components/ui/toaster";
import { useToast } from "@/renderer/hooks/use-toast";
import { ActiveDeviceUser, ActiveUserLogs, DeviceUser, Subject, SubjectRecord } from "@prisma/client";
import { useEffect, useState, useCallback } from "react";
import { WindowIdentifier } from "@/shared/constants";
import { formatDistance } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/renderer/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/renderer/components/ui/dialog"
import { Input } from "@/renderer/components/ui/input"
import { Label } from "@/renderer/components/ui/label"
import { Textarea } from "@/renderer/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/renderer/components/ui/alert-dialog"
import { generateSubjectCode } from "@/shared/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/renderer/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/renderer/components/ui/avatar"
import { Trash2, Stars, LogOut, PlusCircle, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/renderer/components/ui/badge"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { useNavigate } from "react-router-dom";

interface TeacherViewProps {
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

export const TeacherView: React.FC<TeacherViewProps> = ({
  user,
  recentLogin,
  handleLogout,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('');
  const [newSubjectDescription, setNewSubjectDescription] = useState<string>('');
  const [subjectRecords, setSubjectRecords] = useState<SubjectRecord[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveDeviceUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isCreateSubjectDialogOpen, setIsCreateSubjectDialogOpen] = useState(false);
  const [studentInfo, setStudentInfo] = useState<Record<string, StudentInfo>>({});

  const fetchStudentInfo = useCallback(async (userId: string) => {
    try {
      const student = await api.database.getDeviceUserById(userId);
      setStudentInfo(prev => ({
        ...prev,
        [userId]: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          schoolId: student.schoolId
        }
      }));
    } catch (error) {
      console.error("Error fetching student info:", error);
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
        console.error("Error fetching subjects:", error);
        toast({
          title: "Error",
          description: "Failed to fetch subjects. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, [user.labId, toast]);

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

        setSubjects(prevSubjects => [...prevSubjects, createdSubject]);
        setSelectedSubject(createdSubject);
        toast({
          title: "Subject Created",
          description: `You've created the ${newSubjectName} subject`,
        });
        setNewSubjectName('');
        setNewSubjectCode('');
        setNewSubjectDescription('');
        setIsCreateSubjectDialogOpen(false);
      } catch (error) {
        console.error("Error creating subject:", error);
        let errorMessage = "Failed to create subject. Please try again.";
        if (error instanceof Error) {
          if (error.message.includes("Unique constraint failed")) {
            errorMessage = "A subject with this code already exists. Please use a different subject code.";
          } else {
            errorMessage = error.message;
          }
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid Input",
        description: "Please ensure subject name is filled.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedSubject) {
      const fetchActiveUsers = async () => {
        const subjectRecords = await api.database.getSubjectRecordsBySubjectId(selectedSubject.id);
        setSubjectRecords(subjectRecords);

        const activeUsers = await api.database.getActiveUsersBySubjectId(selectedSubject.id);
        setActiveUsers(activeUsers);

        // Fetch student info for all records
        subjectRecords.forEach(record => {
          fetchStudentInfo(record.userId);
        });
      };
      fetchActiveUsers();
    }
  }, [selectedSubject, fetchStudentInfo]);

  // Add this new function to handle subject change
  const handleSubjectChange = async (value: string) => {
    const newSelectedSubject = subjects.find(s => s.id === value) || null;
    setSelectedSubject(newSelectedSubject);

    const subjectRecords = await api.database.getSubjectRecordsBySubjectId(value);
    setSubjectRecords(subjectRecords);

    const activeUsers = await api.database.getActiveUsersBySubjectId(value);
    setActiveUsers(activeUsers);
  };

  const handleDeleteSubject = async () => {
    if (selectedSubject) {
      try {
        await api.database.deleteSubject(selectedSubject.id);
        setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== selectedSubject.id));
        setSelectedSubject(null);
        toast({
          title: "Subject Deleted",
          description: `You've deleted the ${selectedSubject.name} subject`,
        });
      } catch (error) {
        console.error("Error deleting subject:", error);
        toast({
          title: "Error",
          description: "Failed to delete subject. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateAssignment = (type: 'quiz' | 'activity') => {
    if (selectedSubject) {
      if (type === 'quiz') {
        api.window.openInTray(WindowIdentifier.QuizTeacher);
        api.window.send(WindowIdentifier.QuizTeacher, {
          subjectId: selectedSubject.id,
        });
      } else {
        toast({
          title: "Coming Soon",
          description: "Activity creation will be available in a future update.",
          variant: "default",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please select a subject before creating an assignment.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    window.location.reload();
    toast({ title: "Refreshed", description: "Page content has been updated." });
  };

  return (
    <div className="min-h-screen bg-[#EAEAEB]">
      {/* Header */}
      <header className="bg-[#C9121F] border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="PASS College Logo" className="h-10 w-auto" />
              <div>
                <h1 className="text-xl font-semibold text-white">EduInsight</h1>
                <p className="text-sm text-[#EBC42E]">Teacher Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-white hover:bg-[#EBC42E]/20">
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={'/default-avatar.png'} />
                      <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-white">{user.firstName} {user.lastName}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Teacher Information</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name:</p>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">TeacherID:</p>
                      <p className="font-medium">{user.schoolId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Login:</p>
                      <p className="font-medium">
                        {recentLogin
                          ? formatDistance(new Date(recentLogin.createdAt), new Date(), { addSuffix: true })
                          : "No recent login"}
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-[#EBC42E]/20">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subject Selection Area */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-[#C9121F]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Subjects</h2>
            <Button variant="outline" onClick={() => setIsCreateSubjectDialogOpen(true)}>
              <PlusCircle className="h-5 w-5 mr-2" />
              New Subject
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="flex space-x-2">
                <Select value={selectedSubject?.id} onValueChange={handleSubjectChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.subjectCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" disabled={!selectedSubject}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedSubject?.name}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSubject} className="bg-red-600 hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {selectedSubject && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">{selectedSubject.name}</h3>
                  <p className="text-sm text-blue-700">Code: {selectedSubject.subjectCode}</p>
                  <p className="text-sm text-gray-600 mt-2">{selectedSubject.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Statistics Card */}
          <Card className="bg-gradient-to-br from-white to-[#EAEAEB] border-t-4 border-[#C9121F]">
            <CardHeader>
              <CardTitle className="text-blue-900">Class Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{activeUsers.length}</p>
                  <p className="text-sm text-gray-600">Active Students</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{subjectRecords.length}</p>
                  <p className="text-sm text-gray-600">Total Enrolled</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {subjectRecords.length > 0
                      ? `${((activeUsers.length / subjectRecords.length) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignments Card */}
          <Card className="bg-gradient-to-br from-white to-[#EAEAEB] border-t-4 border-[#EBC42E]">
            <CardHeader>
              <CardTitle className="text-purple-900">Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  className="w-full justify-start"
                  onClick={() => handleCreateAssignment('quiz')}
                  disabled={!selectedSubject}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Quiz
                </Button>
                <Button
                  className="w-full justify-start"
                  disabled={!selectedSubject}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Activity
                </Button>
                {/* Add more assignment options */}
              </div>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <Card className="bg-gradient-to-br from-white to-[#EAEAEB] border-t-4 border-[#C9121F]">
            <CardHeader>
              <CardTitle className="text-amber-900">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => selectedSubject ? navigate(`/analytics/student-progress/${selectedSubject.id}`) : null}
                  disabled={!selectedSubject}
                >
                  <Stars className="mr-2 h-4 w-4" />
                  View Student Progress Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student List Section */}
        {selectedSubject && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#EBC42E]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Student List</h2>
              </div>
              <Badge variant="outline" className="text-sm">
                {subjectRecords.length} Students
              </Badge>
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {subjectRecords.map((record) => {
                  const isActive = activeUsers.some(user => user.userId === record.userId);
                  const student = studentInfo[record.userId];

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {student?.firstName?.[0] || ''}{student?.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {student?.firstName || 'Loading...'} {student?.lastName || ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            Student ID: {student?.schoolId || 'Loading...'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={isActive ? "default" : "outline"}
                        className={isActive ? "bg-green-500" : "text-gray-500"}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <Toaster />
        {/* Add this new Dialog component for creating a subject */}
        <Dialog open={isCreateSubjectDialogOpen} onOpenChange={setIsCreateSubjectDialogOpen}>
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
      </main>
    </div>
  );
}