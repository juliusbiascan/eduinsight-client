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
import { ChevronLeft, GraduationCap, BookOpen, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/renderer/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Dialog, DialogTrigger } from "@/renderer/components/ui/dialog";
import { AssessmentDialog } from "./assessment-dialog";
import { Quiz, QuizQuestion, QuizRecord, Subject } from "@prisma/client";

// Types based on Prisma schema
interface QuizDetail {
  id: string;
  title: string;
  totalQuestions: number;
  score: number;
  completedAt: Date;
}

interface PendingQuiz {
  id: string;
  title: string;
  totalQuestions: number;
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
  overallProgress: number;
}

interface ExtendedQuizRecord {
  quizId: string;
  quiz: {
    id: string;
    title: string;
    questions: Array<{
      id: string;
      question: string;
    }>;
  };
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

// Add interface for the extended Subject type that includes relations
interface ExtendedSubject extends Subject {
  quizzes: Array<Quiz & { questions: QuizQuestion[] }>;
  quizRecord: QuizRecord[];
}

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
        const subjectData = await api.database.getSubjectData(id);
        const subject = subjectData[0] as ExtendedSubject; // Cast to ExtendedSubject

        if (!subject) throw new Error('Subject not found');

        // Get all quiz records with proper filtering and type casting
        const quizRecords = (await api.database.getQuizRecordsByUserAndSubject(record.userId, id)) as ExtendedQuizRecord[];

        const publishedQuizzes = subject.quizzes?.filter(quiz => quiz.published) || [];

        // Calculate statistics with null checks
        const completedQuizzes = quizRecords?.length || 0;
        const totalQuestions = quizRecords?.reduce((sum, record) => sum + record.totalQuestions, 0) || 0;
        const averageScore = completedQuizzes > 0
          ? (quizRecords.reduce((sum, record) => sum + record.score, 0) / completedQuizzes)
          : 0;

        // Calculate progress with null checks
        const quizProgress = publishedQuizzes.length > 0 
          ? (completedQuizzes / publishedQuizzes.length) * 100 
          : 0;

        // Calculate overall progress with weighted average
        const totalItems = publishedQuizzes.length;
        const overallProgress = totalItems === 0 ? 0 : (
          (quizProgress * publishedQuizzes.length) / totalItems
        );

        // Prepare quiz details with proper type checking
        const quizDetails = quizRecords?.map(record => ({
          id: record.quizId,
          title: record.quiz?.title || 'Unknown Quiz',
          totalQuestions: record.totalQuestions,
          score: record.score,
          completedAt: record.completedAt
        })) || [];

        // Get pending items with proper type checking
        const pendingQuizzes = publishedQuizzes
          .filter((quiz: { id: string; }) => !quizRecords?.some(r => r.quizId === quiz.id))
          .map((quiz: { id: any; title: any; questions: string | any[]; }) => ({
            id: quiz.id,
            title: quiz.title,
            totalQuestions: quiz.questions?.length || 0,
          }));

        return {
          userId: user.id,
          studentName: `${user.firstName} ${user.lastName}`,
          quizzes: {
            completed: completedQuizzes,
            total: publishedQuizzes.length,
            averageScore: Math.round(averageScore * 100) / 100,
            totalQuestions,
            details: quizDetails,
            pending: pendingQuizzes,
          },
          overallProgress: Math.round(overallProgress * 100) / 100
        };
      }));

      setProgressData(progressData);
    } catch (error) {
      console.error('Error fetching progress data:', error);
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
      // Prepare detailed quiz data for export
      const exportData = progressData.flatMap(student => {
        // Export all quiz details for the student
        const quizDetails = student.quizzes.details.map(quiz => ({
          'Student Name': student.studentName,
          'Quiz Title': quiz.title,
          'Total Questions': quiz.totalQuestions,
          'Score': quiz.score,
          'Percentage': `${(quiz.score / quiz.totalQuestions * 100).toFixed(1)}%`,
          'Completion Date': new Date(quiz.completedAt).toLocaleDateString(),
          'Status': quiz.score >= 90 ? 'Excellent' :
            quiz.score >= 75 ? 'Good' : 'Needs Improvement'
        }));

        // Export pending quizzes
        const pendingQuizzes = student.quizzes.pending.map(quiz => ({
          'Student Name': student.studentName,
          'Quiz Title': quiz.title,
          'Total Questions': quiz.totalQuestions,
          'Score': 'N/A',
          'Percentage': 'N/A',
          'Completion Date': 'Not attempted',
          'Status': 'Pending'
        }));

        return [...quizDetails, ...pendingQuizzes];
      });

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();

      // Add summary sheet
      const summaryData = progressData.map(student => ({
        'Student Name': student.studentName,
        'Quiz Average': `${student.quizzes.averageScore}%`,
        'Quizzes Completed': `${student.quizzes.completed}/${student.quizzes.completed + student.quizzes.pending.length}`,
        'Overall Progress': `${student.overallProgress}%`,
        'Overall Status': student.overallProgress >= 90 ? 'Excellent' :
          student.overallProgress >= 75 ? 'Good' : 'Needs Improvement'
      }));

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Add detailed quiz records sheet
      const detailsWs = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, detailsWs, 'Quiz Details');

      // Set column widths for better readability
      const wscols = [
        { wch: 20 }, // Student Name
        { wch: 30 }, // Quiz Title
        { wch: 15 }, // Total Questions
        { wch: 10 }, // Score
        { wch: 12 }, // Percentage
        { wch: 15 }, // Completion Date
        { wch: 15 }, // Status
      ];

      detailsWs['!cols'] = wscols;
      summaryWs['!cols'] = wscols;

      // Generate filename with current date
      const fileName = `student_progress_report_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Success",
        description: "Progress report exported successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
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