import "../../styles/globals.css";
import ReactDOM from "react-dom/client";
import { Routes, Route, HashRouter } from "react-router-dom";
import DashboardLayout from "./routes/dashboard-layout";
import { GuestView } from "./routes/guest-view";
import { Toaster } from "@/renderer/components/ui/toaster";
import { useEffect, useState } from "react";
import { ActiveUserLogs, Device, DeviceUser, Subject } from "@prisma/client";
import { useToast } from "@/renderer/hooks/use-toast";
import { WindowIdentifier } from "@/shared/constants";
import { StudentView } from "./routes/student-view";
import { TeacherView } from "./routes/teacher-view";
import StudentProgressReport from "./routes/analytics/student-progress";


function Index() {
  const [user, setUser] = useState<DeviceUser & { subjects: Subject[] } | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [recentLogin, setRecentLogin] = useState<ActiveUserLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast()


  useEffect(() => {

    const fetchUserData = async () => {
      try {
        const devices = await api.database.getDevice();
        if (devices && devices.length > 0) {
          setDevice(devices[0]);
          const activeUsers = await api.database.getActiveUserByDeviceId(devices[0].id, devices[0].labId);
          if (activeUsers && activeUsers.length > 0) {
            const users = await api.database.getDeviceUserByActiveUserId(activeUsers[0].userId);
            if (users && users.length > 0) {
              setUser(users[0]);
              const recentLogin = await api.database.getUserRecentLoginByUserId(users[0].id);
              if (recentLogin && recentLogin.length > 0) {
                setRecentLogin(recentLogin[1]);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user data",
          variant: "destructive",
        })
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-lg font-semibold text-indigo-600">Loading...</p>
        <Toaster />
      </div>
    );
  }

  const handleLogout = () => {
    // Implement logout logic here
    api.database.userLogout(user.id, device.id);

    api.window.open(WindowIdentifier.Main);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });

    // Reset user state or redirect to login page
    setUser(null);
    setDevice(null);
  };

  return <HashRouter>
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<GuestView />} />
        <Route path="student" element={<StudentView user={user} handleLogout={handleLogout} />} />
        <Route path="teacher" element={<TeacherView user={user} recentLogin={recentLogin} handleLogout={handleLogout} />} />
        <Route path="analytics/student-progress/:id" element={<StudentProgressReport />} />
      </Route>
    </Routes>
    <Toaster />
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