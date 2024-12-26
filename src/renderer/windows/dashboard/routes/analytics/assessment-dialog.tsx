import { Card, CardContent, CardHeader, CardTitle } from "@/renderer/components/ui/card";
import { DialogContent, DialogHeader, DialogTitle } from "@/renderer/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/renderer/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/renderer/components/ui/table";
import { Badge } from "@/renderer/components/ui/badge";
import { exportToExcel, formatQuizzesForExport } from "@/renderer/utils/excel-export";
import { Button } from "@/renderer/components/ui/button";
  
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
interface AssessmentDialogProps {
  student: StudentProgress;
}

export const AssessmentDialog = ({ student }: AssessmentDialogProps) => {
  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "text-green-600";
    if (progress >= 75) return "text-blue-600";
    return "text-amber-600";
  };

  const handleExportQuizzes = () => {
    const quizData = [
      ...student.quizzes.details.map(quiz => ({
        ...quiz,
        isPending: false
      })),
      ...student.quizzes.pending.map(quiz => ({
        ...quiz,
        isPending: true,
        score: 0,
      
      }))
    ];
    const formattedData = formatQuizzesForExport(quizData);
    exportToExcel(formattedData, `${student.studentName}-quizzes`);
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
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quizzes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quiz Performance Details</CardTitle>
              <Button onClick={handleExportQuizzes} variant="outline" size="sm">
                Export to Excel
              </Button>
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
      </Tabs>
    </DialogContent>
  );
};
