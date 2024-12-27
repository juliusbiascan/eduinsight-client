import { PeerProvider } from '@/renderer/components/peer-provider';
import { Device, DeviceUser, DeviceUserRole } from '@prisma/client';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const DashboardLayout = () => {
  const [user, setUser] = useState<DeviceUser>()
  
  const navigate = useNavigate();
  
  useEffect(() => {
    api.database.getDevice().then((device: Device) => {
      api.database
        .getActiveUserByDeviceId(device.id, device.labId)
        .then((activeUser) => {
          if (activeUser.user.role === DeviceUserRole.STUDENT) {
            navigate('/student');
          } else if (activeUser.user.role === DeviceUserRole.TEACHER) {
            navigate('/teacher');
          } else {
            navigate('/guest');
          }
          setUser(activeUser.user);
        });
    });
  }, []);


  return (
    <PeerProvider userId={user?.id}>
      <Outlet />
    </PeerProvider>
  );
};

export default DashboardLayout;
