import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/renderer/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/renderer/components/ui/table";
import { Loader2, DownloadIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/renderer/components/ui/select";

interface QuizResultData {
  studentId: string;
  studentName: string;
  score: number;
  total: number;
  percentage: number;
  completedAt: Date;
  quizTitle: string;
  quizId: string; // Add this new field
}

const StudentQuizResults = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResultData[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
  const [filteredResults, setFilteredResults] = useState<QuizResultData[]>([]);

  useEffect(() => {
    fetchQuizResults();
  }, [id]);

  const fetchQuizResults = async () => {
    try {
      setLoading(true);
      const records = await api.database.getSubjectRecordsBySubjectId(id);
      const subjectData = await api.database.getSubjectData(id);
      const subject = subjectData[0];
      setSubjectName(subject.name);

      // Get unique quizzes for the filter dropdown
      const uniqueQuizzes = subject.quizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title
      }));
      setQuizzes(uniqueQuizzes);

      const resultsData: QuizResultData[] = [];

      for (const record of records) {
        const user = await api.database.getDeviceUserById(record.userId);
        const quizRecords = await api.database.getQuizRecordsByUserAndSubject(record.userId, id);

        quizRecords.forEach((qr) => {
          const totalPoints = qr.quiz.questions.reduce((sum, q) => sum + q.points, 0);
          resultsData.push({
            quizId: qr.quiz.id,
            studentId: user.schoolId,
            studentName: `${user.firstName} ${user.lastName}`,
            score: qr.score,
            total: totalPoints,
            percentage: (qr.score / totalPoints) * 100,
            completedAt: new Date(qr.completedAt),
            quizTitle: qr.quiz.title
          });
        });
      }

      // Sort by percentage in descending order
      resultsData.sort((a, b) => b.percentage - a.percentage);
      setResults(resultsData);
      setFilteredResults(resultsData);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add this new function to handle quiz filtering
  const handleQuizFilter = (quizId: string) => {
    setSelectedQuizId(quizId);
    if (quizId === 'all') {
      setFilteredResults(results);
    } else {
      setFilteredResults(results.filter(result => result.quizId === quizId));
    }
  };

  // Modify the export function to use filtered results
  const exportToExcel = () => {
    const exportData = filteredResults.map((r, index) => ({
      Rank: index + 1,
      'Student ID': r.studentId,
      'Student Name': r.studentName,
      'Quiz Title': r.quizTitle,
      Score: r.score,
      Total: r.total,
      'Percentage (%)': r.percentage.toFixed(2),
      'Completed Date': format(r.completedAt, 'yyyy-MM-dd HH:mm:ss')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz Results');
    XLSX.writeFile(wb, `${subjectName}-Quiz-Results.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{subjectName} - Quiz Results</h1>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Add Quiz Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Results</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Select value={selectedQuizId} onValueChange={handleQuizFilter}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select Quiz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quizzes</SelectItem>
                {quizzes.map((quiz) => (
                  <SelectItem key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToExcel}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {new Set(filteredResults.map(r => r.studentId)).size}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {filteredResults.length > 0 
                  ? (filteredResults.reduce((acc, r) => acc + r.percentage, 0) / filteredResults.length).toFixed(2)
                  : "0"}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Quizzes Taken</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{filteredResults.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Detailed Results 
              {selectedQuizId !== 'all' && ` - ${quizzes.find(q => q.id === selectedQuizId)?.title}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Rank</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Quiz Title</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                  <TableHead className="text-right">Completed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result, index) => (
                  <TableRow key={`${result.studentId}-${index}`}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{result.studentId}</TableCell>
                    <TableCell>{result.studentName}</TableCell>
                    <TableCell>{result.quizTitle}</TableCell>
                    <TableCell className="text-right">{result.score}</TableCell>
                    <TableCell className="text-right">{result.total}</TableCell>
                    <TableCell className="text-right">{result.percentage.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      {format(result.completedAt, 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentQuizResults;