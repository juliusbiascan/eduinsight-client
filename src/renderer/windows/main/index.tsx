import '../../styles/globals.css';
import ReactDOM from 'react-dom/client';
import { Routes, Route, HashRouter } from 'react-router-dom';
import MainLayout from './routes/layout';
import LoginPage from './routes/login';
import LogoutPage from './routes/logout';
import ServerDown from './routes/down';
import { SomethingWentWrong } from './routes/sww';
import SignUpForm from './routes/signup';
import ResetPasswordPage from './routes/reset';
import TermsPage from './routes/terms'; // Import TermsPage
import { SocketProvider } from '@/renderer/components/socket-provider';
import { Splash } from './routes/splash';

function Index() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Splash />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignUpForm />} />
          <Route path="logout" element={<LogoutPage />} />
          <Route path="reset" element={<ResetPasswordPage />} />
          <Route path="terms" element={<TermsPage />} />{' '}
          {/* Add TermsPage route */}
          <Route path="server-down" element={<ServerDown />} />
          <Route path="error" element={<SomethingWentWrong />} />
        </Route>
      </Routes>
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
