import { IPCRoute } from "@/shared/constants";
import { ipcMain } from "electron";
import { startMonitoring } from "../lib/monitoring";

export default function () {
  ipcMain.on(IPCRoute.DEVICE_START_MONITORING, async (event, userId: string, deviceId: string, labId: string) => {
    console.log('Starting monitoring...', userId, deviceId, labId);
    startMonitoring(userId, deviceId, labId);
  });

  
}