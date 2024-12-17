import "../../styles/globals.css";
import ReactDOM from "react-dom/client";
import { Routes, Route, HashRouter } from "react-router-dom";
import SetupLayout from "./routes/layout";
import SocketSetup from "./routes/socket-setup";
import DatabaseSetup from "./routes/database-setup";
import { DeviceSetup } from "./routes/device-setup";

function Index() {
  return <HashRouter>
    <Routes>
      <Route path="/" element={<SetupLayout />}>
        <Route index element={<SocketSetup />} />
        <Route path="database-setup" element={<DatabaseSetup />} />
        <Route path="device-setup" element={<DeviceSetup />} />
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