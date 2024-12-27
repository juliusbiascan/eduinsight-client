import '../styles/globals.css';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import { Device, DeviceUser } from '@prisma/client';
import { Sparkles, Waves } from 'lucide-react';
import { PeerProvider, usePeer } from '../components/peer-provider';

/**
 *Welcome Page
 */

const ScreenLayout = () => {
  const [user, setUser] = useState<DeviceUser>();

  useEffect(() => {
    api.database.getDevice().then((device: Device) => {
      api.database
        .getActiveUserByDeviceId(device.id, device.labId)
        .then((activeUser) => {
          setUser(activeUser.user);
        });
    });
  }, []);

  return (
    <PeerProvider userId={user.id}>
      <Screen user={user} />
    </PeerProvider>
  );
};

export default ScreenLayout;
function Screen({ user }: { user: DeviceUser }) {
  const { peer } = usePeer();

  useEffect(() => {
    if (peer) {
      api.window.receive(
        'show-screen',
        (event, { _deviceId, userId }) => {
          api.screen.getScreenSourceId().then((sourceId) => {
            (navigator.mediaDevices as any)
              .getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId,
                  },
                },
              })
              .then((stream: MediaStream) => {
                peer.call(userId, stream);
              });
          });
        },
      );
    }
  }, [user, peer]);

  return (
    <div className="bg-gradient-to-r from-[#C9121F] to-[#EBC42E] rounded-lg shadow-lg p-8 w-[600px] h-[200px] flex items-center justify-start overflow-hidden">
      <div className="text-white flex-grow">
        <h1 className="text-4xl font-bold mb-3 flex items-center">
          Screen Monitoring
          <Sparkles className="ml-3 h-8 w-8 text-yellow-300" />
        </h1>
        <p className="text-xl opacity-90 flex items-center">
          Screen monitoring is actively running on this device.
          <Waves className="ml-3 h-6 w-6" />
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
  ReactDOM.createRoot(container).render(<ScreenLayout />);
})();
