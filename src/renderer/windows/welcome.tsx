import '../styles/globals.css';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import { DeviceUser } from '@prisma/client';
import { Sparkles, Waves } from 'lucide-react';

/**
 *Welcome Page
 */
function Welcome() {
  const [user, setUser] = useState<DeviceUser>();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const devices = await api.database.getDevice();
        if (devices && devices.length > 0) {
          const activeUsers = await api.database.getActiveUserByDeviceId(devices[0].id, devices[0].labId);
          if (activeUsers && activeUsers.length > 0) {
            api.device.startMonitoring(activeUsers[0].userId, activeUsers[0].deviceId, activeUsers[0].labId);
            const users = await api.database.getDeviceUserByActiveUserId(activeUsers[0].userId);
            if (users && users.length > 0) {
              setUser(users[0]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="bg-gradient-to-r from-[#C9121F] to-[#EBC42E] rounded-lg shadow-lg p-8 w-[600px] h-[200px] flex items-center justify-start overflow-hidden">
      <div className="text-white flex-grow">
        <h1 className="text-4xl font-bold mb-3 flex items-center">
          Welcome, {user?.firstName}! <Sparkles className="ml-3 h-8 w-8 text-yellow-300" />
        </h1>
        <p className="text-xl opacity-90 flex items-center">
          You've successfully logged in. Have a great day! <Waves className="ml-3 h-6 w-6" />
        </p>
      </div>
    </div>
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
  ReactDOM.createRoot(container).render(<Welcome />);
})();