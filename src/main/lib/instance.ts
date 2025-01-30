import { Database, WindowManager } from ".";
import StoreManager from "./store";

export const handleSecondinstance = async () => {
    const store = StoreManager.getInstance();
    const deviceId = store.get('deviceId') as string;
    const device = await Database.prisma.device.findFirst({
        where: { id: deviceId },
    });

    if (!device) {
        WindowManager.get(WindowManager.WINDOW_CONFIGS.setup_window.id);
    }

    const activeUser = await Database.prisma.activeDeviceUser.findFirst({
        where: { deviceId: device.id },
    });

    if (activeUser) {

        const dashboard = WindowManager.get(
            WindowManager.WINDOW_CONFIGS.dashboard_window.id,
        );

        if (dashboard) {
            dashboard.show()
            dashboard.focus()
        }

    } else {

        const myWindow = WindowManager.get(WindowManager.WINDOW_CONFIGS.main_window.id);

        if (myWindow) {
            if (myWindow.isMinimized()) myWindow.restore()
            myWindow.focus()
        }
    }
};