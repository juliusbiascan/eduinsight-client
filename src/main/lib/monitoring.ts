import { activeWindow } from 'get-windows';
import { powerMonitor } from "electron";
import { Database } from '.';
import { ActivityManager } from './activity';
import { getSocketInstance } from './socket-manager';

/**
 * Gets the current timestamp in the format "YYYY-MM-DD HH:MM:SS".
 * @returns {string} The formatted timestamp.
 */
function getTimeStamp() {
  const today = new Date();
  const date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  const time =
    today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  return date + " " + time;
}

let monitoringInterval: NodeJS.Timeout;

/**
 * Sets up activity logging for a specific user, device, and lab.
 * This function initializes activity logging and power state monitoring.
 * @param {string} userId - The user ID.
 * @param {string} deviceId - The device ID.
 * @param {string} labId - The lab ID.
 */
export async function startMonitoring(userId: string, deviceId: string, labId: string) {
  console.log("Starting monitoring for:", { userId, deviceId, labId });
  setPowerMonitor(userId, deviceId, labId);

  const socket = getSocketInstance();

  if (!userId || !deviceId || !labId) {
    console.error("User ID, device ID, and lab ID are required for monitoring.");
    return;
  }

  const activityManager = new ActivityManager();
  let lastTitle = ''; // Track the last window title
  let lastUpdateTime = Date.now(); // Track last update time

  monitoringInterval = setInterval(async () => {
    try {
      const result = await activeWindow();
      if (result) {
        const currentTime = Date.now();
        // Only proceed if the title is different or more than 60 seconds have passed
        if (result.title !== lastTitle || (currentTime - lastUpdateTime) >= 60000) {
          const activity = {
            title: result.title,
            time: new Date(),
            owner: result.owner.name,
            memoryUsage: result.memoryUsage,
          }

          const activitySaved = await activityManager.save(activity);

          if (activitySaved) {
            lastTitle = result.title;
            lastUpdateTime = currentTime;
            socket.emit("activity-update", deviceId);
          }
        }
      }
    } catch (error) {
      console.error("Error tracking activity:", error);
    }
  }, 1000);
}

/**
 * Pushes power monitoring logs to the database.
 * @param {string} pm_status - The power monitoring status.
 * @param {string} pm_log_ts - The timestamp of the log.
 * @param {string} userId - The user ID.
 * @param {string} deviceId - The device ID.
 * @param {string} labId - The lab ID.
 * @returns {Promise<void>}
 */
async function pushPowerLogsToDB(pm_status: string, pm_log_ts: string, userId: string, deviceId: string, labId: string) {
  
  try {
    await Database.prisma.powerMonitoringLogs.create({
      data: {
        pm_status,
        pm_log_ts,
        userId,
        deviceId,
        labId
      }
    });
    
    const socket = getSocketInstance();
    if (socket) {
      socket.emit("power-monitoring-update", { deviceId });
    }
  } catch (error) {
    console.error("Error pushing power log to DB:", error);
  }
}

/**
 * Sets up power monitoring for a specific user, device, and lab.
 * This function initializes activity logging and power state monitoring.
 * @param {string} userId - The user ID.
 * @param {string} deviceId - The device ID.
 * @param {string} labId - The lab ID.
 */
export function setPowerMonitor(userId: string, deviceId: string, labId: string) {
  powerMonitor.on("suspend", () => {
    console.log("System: Sleep");
    pushPowerLogsToDB("0", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("resume", () => {
    console.log("System: Resume");
    pushPowerLogsToDB("1", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("on-ac", () => {
    pushPowerLogsToDB("2", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("on-battery", () => {
    pushPowerLogsToDB("3", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("shutdown", () => {
    console.log("System: Shutdown");
    pushPowerLogsToDB("4", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("lock-screen", () => {
    pushPowerLogsToDB("5", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("unlock-screen", () => {
    pushPowerLogsToDB("6", getTimeStamp(), userId, deviceId, labId);
  });
}

/**
 * Stops all power monitoring activities.
 * This function clears the interval and removes all power monitor event listeners.
 */
export const stopPowerMonitoring = (): void => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }

  powerMonitor.removeAllListeners("suspend");
  powerMonitor.removeAllListeners("resume");
  powerMonitor.removeAllListeners("on-ac");
  powerMonitor.removeAllListeners("on-battery");
  powerMonitor.removeAllListeners("shutdown");
  powerMonitor.removeAllListeners("lock-screen");
  powerMonitor.removeAllListeners("unlock-screen");
}
