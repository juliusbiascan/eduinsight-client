import { Toaster } from "@/renderer/components/ui/toaster";
import { useToast } from "@/renderer/hooks/use-toast";
import { DeviceUserRole } from "@prisma/client";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

const DashboardLayout = () => {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast()
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const devices = await api.database.getDevice();
        if (devices && devices.length > 0) {
          const activeUsers = await api.database.getActiveUserByDeviceId(devices[0].id, devices[0].labId);
          if (activeUsers && activeUsers.length > 0) {
            const users = await api.database.getDeviceUserByActiveUserId(activeUsers[0].userId);
            if (users && users.length > 0) {
              if (users[0].role === DeviceUserRole.STUDENT) {
                navigate("/student");
              } else if (users[0].role === DeviceUserRole.TEACHER) {
                navigate("/teacher");
              }else{
                navigate("/guest");
              }
            }
          }
        }
      } catch (error) {
        navigate("/guest");
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

  return (
    <Outlet />
  );
}

export default DashboardLayout;