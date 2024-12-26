import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const formatQuizzesForExport = (quizzes: any[]) => {
  return quizzes.map(quiz => ({
    'Quiz Name': quiz.title,
    'Total Questions': quiz.totalQuestions,
    'Score': quiz.isPending ? 'Pending' : `${quiz.score}%`,
    'Completion Date': quiz.completedAt ? new Date(quiz.completedAt).toLocaleDateString() : 'Not attempted',
    'Status': quiz.isPending ? 'Pending' : 
      (quiz.score >= 90 ? 'Excellent' : 
       quiz.score >= 75 ? 'Good' : 'Needs Improvement')
  }));
};