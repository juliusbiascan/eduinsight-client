import { IPCRoute } from '@/shared/constants';
import { desktopCapturer, ipcMain } from 'electron';

export default function () {
  ipcMain.handle(IPCRoute.SCREEN_ID, async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 }
    });
    
    return sources[0].id; // Return the screen source ID
  });

  ipcMain.on(IPCRoute.SCREEN_SHARE_STOP, () => {
    // Handle screen share stop if needed
  });
}
