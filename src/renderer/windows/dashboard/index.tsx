import '../../styles/globals.css';
import ReactDOM from 'react-dom/client';
import { Routes, Route, HashRouter } from 'react-router-dom';
import DashboardLayout from './routes/dashboard-layout';
import { GuestView } from './routes/guest-view';
import { Toaster } from '@/renderer/components/ui/toaster';
import { StudentConsole } from './routes/student-console';
import { TeacherConsole } from './routes/teacher-console';
import StudentProgressReport from './routes/analytics/student-progress';
import StudentQuizResults from './routes/results/quiz-results';
import QuizLibrary from './routes/quiz/quiz-library';
import QuizManager from './routes/quiz/quiz-manager';
import QuizQuestions from './routes/quiz/quiz-questions';
import { SocketProvider } from '@/renderer/components/socket-provider';

function Index() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<GuestView />} />
          <Route path="student" element={<StudentConsole />} />
          <Route path="teacher" element={<TeacherConsole />} />
          <Route
            path="analytics/student-progress/:id"
            element={<StudentProgressReport />}
          />
          <Route
            path="results/quiz-results/:id"
            element={<StudentQuizResults />}
          />
          <Route path="quiz/library/:id" element={<QuizLibrary />} />
          <Route path="quiz/manager" element={<QuizManager />} />
          <Route path="quiz/questions" element={<QuizQuestions />} />
        </Route>
      </Routes>
      <Toaster />
    </HashRouter>
  );
}

/**
 * React bootstrapping logic.
 *
 * @function
 * @name anonymous
 */
(() => {
  // grab the root container
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('Failed to find the root element.');
  }

  // render the react application
  ReactDOM.createRoot(container).render(
    <SocketProvider>
      <Index />
    </SocketProvider>,
  );
})();
