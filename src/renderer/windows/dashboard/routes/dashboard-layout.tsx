import { Device, DeviceUserRole } from '@prisma/client';
import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const DashboardLayout = () => {
  
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
        });
    });
  }, []);


  return (
    <Outlet />
  );
};

export default DashboardLayout;
