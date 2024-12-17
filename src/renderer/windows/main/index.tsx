import "../../styles/globals.css";
import ReactDOM from "react-dom/client";
import { Routes, Route, HashRouter } from "react-router-dom";
import MainLayout from "./routes/layout";
import MainPage from "./routes/main";
import ServerDown from "./routes/down";
import { SomethingWentWrong } from "./routes/sww";
import SignUpForm from "./routes/signup";
import ResetPasswordPage from "./routes/reset";

function Index() {
  return <HashRouter>
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<MainPage />} />
        <Route path="signup" element={<SignUpForm />} />
        <Route path="reset" element={<ResetPasswordPage />} />
        <Route path="server-down" element={<ServerDown />} />
        <Route path="error" element={<SomethingWentWrong />} />
      </Route>
    </Routes>
  </HashRouter>
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
  ReactDOM.createRoot(container).render(<Index />);
})();