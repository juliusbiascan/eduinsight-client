import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/renderer/components/ui/card";
import { Button } from "@/renderer/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/renderer/components/ui/select";
import { Badge } from "@/renderer/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/renderer/components/ui/table";
import { ChevronLeft, GraduationCap, BookOpen, Trophy, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/renderer/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/renderer/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/renderer/components/ui/tabs";

// Types based on Prisma schema
interface QuizDetail {
  id: string;
  title: string;
  totalQuestions: number;
  score: number;
  completedAt: Date;
}

// Add new interface for activity details
interface ActivityDetail {
  id: string;
  name: string;
  description: string;
  completedAt: Date;
  status: boolean;
}

interface PendingQuiz {
  id: string;
  title: string;
  totalQuestions: number;
  dueDate?: Date;
}

interface PendingActivity {
  id: string;
  name: string;
  description: string;
  dueDate?: Date;
}

interface StudentProgress {
  userId: string;
  studentName: string;
  quizzes: {
    completed: number;
    averageScore: number;
    totalQuestions: number;
    details: QuizDetail[]; // Add this new property
    pending: PendingQuiz[];
  };
  activities: {
    completed: number;
    totalActivities: number;
    completionRate: number;
    details: ActivityDetail[]; // Add this new property
    pending: PendingActivity[];
  };
  overallProgress: number;
}

interface AssessmentDialogProps {
  student: StudentProgress;
}

const AssessmentDialog = ({ student }: AssessmentDialogProps) => {
  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "text-green-600";
    if (progress >= 75) return "text-blue-600";
    return "text-amber-600";
  };

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Student Assessment - {student.studentName}</DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Overall Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{student.overallProgress}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quiz Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{student.quizzes.averageScore}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Activity Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{student.activities.completionRate}%</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment Type</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Average Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Quizzes</TableCell>
                      <TableCell>{student.quizzes.completed}</TableCell>
                      <TableCell>{student.quizzes.totalQuestions - student.quizzes.completed}</TableCell>
                      <TableCell>
                        <span className={getProgressColor(student.quizzes.averageScore)}>
                          {student.quizzes.averageScore}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.quizzes.averageScore >= 90 ? "secondary" :
                          student.quizzes.averageScore >= 75 ? "default" : "destructive"}>
                          {student.quizzes.averageScore >= 90 ? "Excellent" :
                            student.quizzes.averageScore >= 75 ? "Good" : "Needs Improvement"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Activities</TableCell>
                      <TableCell>{student.activities.completed}</TableCell>
                      <TableCell>{student.activities.totalActivities - student.activities.completed}</TableCell>
                      <TableCell>
                        <span className={getProgressColor(student.activities.completionRate)}>
                          {student.activities.completionRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.activities.completionRate >= 90 ? "secondary" :
                          student.activities.completionRate >= 75 ? "default" : "destructive"}>
                          {student.activities.completionRate >= 90 ? "Excellent" :
                            student.activities.completionRate >= 75 ? "Good" : "Needs Improvement"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quizzes">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Completed Quizzes</h4>
                    <p className="text-2xl font-bold">{student.quizzes.completed}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Total Questions</h4>
                    <p className="text-2xl font-bold">{student.quizzes.totalQuestions}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Average Score</h4>
                    <p className="text-2xl font-bold text-blue-600">{student.quizzes.averageScore}%</p>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz Name</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Completion Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ...student.quizzes.details.map(quiz => ({
                          ...quiz,
                          isPending: false
                        })),
                        ...student.quizzes.pending.map(quiz => ({
                          ...quiz,
                          isPending: true,
                          score: 0,
                          completedAt: null as Date | null
                        }))
                      ].map((quiz) => (
                        <TableRow key={quiz.id} className={quiz.isPending ? "bg-orange-50" : undefined}>
                          <TableCell className="font-medium">{quiz.title}</TableCell>
                          <TableCell>{quiz.totalQuestions}</TableCell>
                          <TableCell>
                            {!quiz.isPending ? (
                              <span className={getProgressColor(quiz.score)}>
                                {quiz.score}%
                              </span>
                            ) : (
                              <span className="text-orange-600">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {quiz.completedAt ?
                              new Date(quiz.completedAt).toLocaleDateString() :
                              <span className="text-orange-600">Not attempted</span>
                            }
                          </TableCell>
                          <TableCell>
                            {quiz.isPending ? (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Pending
                              </Badge>
                            ) : (
                              <Badge
                                variant={quiz.score >= 90 ? "secondary" :
                                  quiz.score >= 75 ? "default" : "destructive"}
                              >
                                {quiz.score >= 90 ? "Excellent" :
                                  quiz.score >= 75 ? "Good" : "Needs Improvement"}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activity Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Completed Activities</h4>
                    <p className="text-2xl font-bold">{student.activities.completed}/{student.activities.totalActivities}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Completion Rate</h4>
                    <p className="text-2xl font-bold text-green-600">{student.activities.completionRate}%</p>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Activity Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.activities.details.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-medium">{activity.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {activity.description}
                          </TableCell>
                          <TableCell>
                            {new Date(activity.completedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={activity.status ? "secondary" : "destructive"}
                            >
                              {activity.status ? "Completed" : "Incomplete"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {student.activities.pending.length > 0 && (
                  <div className="border rounded-lg mt-6">
                    <CardHeader>
                      <CardTitle className="text-sm text-orange-600">Pending Activities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Activity Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {student.activities.pending.map((activity) => (
                            <TableRow key={activity.id}>
                              <TableCell className="font-medium">{activity.name}</TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {activity.description}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  Pending
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
};

const StudentProgressReport = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgressData = async () => {
    try {
      setIsLoading(true);
      const records = await api.database.getSubjectRecordsBySubjectId(id);

      const progressData = await Promise.all(records.map(async record => {
        const user = await api.database.getDeviceUserById(record.userId);
        const data = await api.database.getStudentSubjects(user.id);
        const subject = data.find(s => s.id.toString() === id);

        const userQuizRecords = subject.quizRecord.filter(record => record.userId === user.id);
        const completedQuizzes = userQuizRecords.length;
        const totalQuizzes = subject.quizzes.filter(quiz => quiz.published).length;
        const completedActivities = subject.activityRecord.filter(activity => activity.completed && activity.userId === user.id).length;
        const totalActivities = subject.activities.length;

        const totalQuestions = userQuizRecords.reduce((sum, record) => sum + record.totalQuestions, 0);
        const averageScore = userQuizRecords.length > 0
          ? (userQuizRecords.reduce((sum, record) => sum + record.score, 0) / userQuizRecords.length)
          : 0;

        const quizProgress = totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;
        const activityProgress = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

        const overallProgress = totalActivities === 0 ? quizProgress : (quizProgress + activityProgress) / 2;

        const quizDetails = userQuizRecords.map(record => ({
          id: record.quizId,
          title: subject.quizzes.find(q => q.id === record.quizId)?.title || 'Unknown Quiz',
          totalQuestions: record.totalQuestions,
          score: record.score,
          completedAt: record.completedAt
        }));

        const activityDetails = subject.activityRecord.map(record => ({
          id: record.activityId,
          name: subject.activities.find(a => a.id === record.activityId)?.name || 'Unknown Activity',
          description: subject.activities.find(a => a.id === record.activityId)?.description || '',
          completedAt: record.completedAt,
          status: record.completed
        }));

        const pendingQuizzes = subject.quizzes
          .filter(quiz => quiz.published && !userQuizRecords.some(r => r.quizId === quiz.id))
          .map(quiz => ({
            id: quiz.id,
            title: quiz.title,
            totalQuestions: 0,
          }));

        const pendingActivities = subject.activities
          .filter(activity => activity.published && !subject.activityRecord.some(r => r.activityId === activity.id && r.userId === user.id))
          .map(activity => ({
            id: activity.id,
            name: activity.name,
            description: activity.description,
          }));

        return {
          userId: user.id,
          studentName: `${user.firstName} ${user.lastName}`,
          quizzes: {
            completed: completedQuizzes,
            averageScore: Math.round(averageScore * 100) / 100,
            totalQuestions: totalQuestions,
            details: quizDetails, // Add this new property
            pending: pendingQuizzes,
          },
          activities: {
            completed: completedActivities,
            totalActivities: totalActivities,
            completionRate: Math.round(activityProgress * 100) / 100,
            details: activityDetails,
            pending: pendingActivities,
          },
          overallProgress: Math.round(overallProgress)
        };
      }));

      setProgressData(progressData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load progress data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, [id, selectedPeriod]);

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "text-green-600";
    if (progress >= 75) return "text-blue-600";
    return "text-amber-600";
  };

  const handleExportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = progressData.map(student => ({
        'Student Name': student.studentName,
        'Quiz Average': `${student.quizzes.averageScore}%`,
        'Quizzes Completed': student.quizzes.completed,
        'Activities Completion Rate': `${student.activities.completionRate}%`,
        'Activities Completed': `${student.activities.completed}/${student.activities.totalActivities}`,
        'Overall Progress': `${student.overallProgress}%`,
        'Status': student.overallProgress >= 90 ? 'Excellent' :
          student.overallProgress >= 75 ? 'Good' : 'Needs Improvement'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Student Progress');

      // Generate filename with current date
      const fileName = `student_progress_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Success",
        description: "Progress report exported successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export progress report",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  // Calculate class averages
  const classAverages = {
    quizAverage: progressData.reduce((acc, curr) => acc + curr.quizzes.averageScore, 0) / progressData.length,
    activityCompletion: progressData.reduce((acc, curr) => acc + curr.activities.completionRate, 0) / progressData.length,
    overallProgress: progressData.reduce((acc, curr) => acc + curr.overallProgress, 0) / progressData.length,
  };

  return (
    <div className="min-h-screen bg-[#EAEAEB] p-8">
      {/* Header section remains the same */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex flex-col space-y-4"></div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Student Progress Report
        </h1>
        <p className="text-gray-500">
          Track and analyze student performance across quizzes and activities
        </p>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            {progressData.length} Students
          </Badge>
          <Badge variant="outline" className="text-sm">
            {selectedPeriod === 'all' ? 'All Time' :
              selectedPeriod === 'month' ? 'This Month' : 'This Week'}
          </Badge>
        </div>
      </div>


      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-center">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleExportToExcel}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Updated Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white border-l-4 border-blue-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Class Average</CardTitle>
            <GraduationCap className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classAverages.overallProgress.toFixed(1)}%</div>
            <p className="text-xs text-gray-500">Overall Performance</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Quiz Performance</CardTitle>
            <BookOpen className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {classAverages.quizAverage.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">Average Quiz Score</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-purple-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Activity Completion</CardTitle>
            <Trophy className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {classAverages.activityCompletion.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Progress Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Detailed Student Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Quiz Performance</TableHead>
                <TableHead>Activities</TableHead>
                <TableHead>Overall Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progressData.map((student) => (
                <TableRow key={student.userId}>
                  <TableCell className="font-medium">{student.studentName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={getProgressColor(student.quizzes.averageScore)}>
                        {student.quizzes.averageScore}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {student.quizzes.completed} quizzes
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={getProgressColor(student.activities.completionRate)}>
                        {student.activities.completionRate}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {student.activities.completed}/{student.activities.totalActivities} completed
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${student.overallProgress >= 90 ? 'bg-green-600' :
                          student.overallProgress >= 75 ? 'bg-blue-600' : 'bg-amber-600'
                          }`}
                        style={{ width: `${student.overallProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{student.overallProgress}%</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={student.overallProgress >= 90 ? "secondary" :
                        student.overallProgress >= 75 ? "default" : "destructive"}
                    >
                      {student.overallProgress >= 90 ? "Excellent" :
                        student.overallProgress >= 75 ? "Good" : "Needs Improvement"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          View Assessment
                        </Button>
                      </DialogTrigger>
                      <AssessmentDialog student={student} />
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentProgressReport;