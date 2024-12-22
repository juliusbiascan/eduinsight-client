import { activeWindow } from 'get-windows';
import { powerMonitor } from "electron";
import { Database } from '.';
import { ActivityManager } from './activity';
import { getSocketInstance, isSocketConnected } from './socket-manager';

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
  const dateTime = date + " " + time;

  console.log("Generated timestamp:", dateTime);
  return dateTime;
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
  console.log("Socket instance:", socket ? "obtained" : "not available");

  if (!userId || !deviceId || !labId) {
    console.error("User ID, device ID, and lab ID are required for monitoring.");
    return;
  }

  const activityManager = new ActivityManager();
  console.log("Activity manager initialized");

  monitoringInterval = setInterval(async () => {
    try {
      console.log("Attempting to get active window");
      const result = await activeWindow();
      if (result) {
        console.log("Active window detected:", result.title);

        const activity = {
          title: result.title,
          time: new Date(),
          owner: result.owner.name,
          memoryUsage: result.memoryUsage,
        }

        console.log("Saving activity:", activity);
        const activitySaved = await activityManager.save(activity);

        if (activitySaved) {
          console.log("Activity saved successfully");
          if (isSocketConnected()) {
            console.log("Emitting activity update for device:", deviceId);
            socket.emit("activity-update", deviceId);
          } else {
            console.log("Socket not connected, skipping activity update emission");
          }
        } else {
          console.log("Failed to save activity");
        }
      } else {
        console.log("No active window detected");
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
    console.log("Power log pushed successfully");
    
    // Emit 'power-monitoring-update' event
    const socket = getSocketInstance();
    if (socket && isSocketConnected()) {
      socket.emit("power-monitoring-update", { deviceId });
      console.log("Emitted 'power-monitoring-update' event");
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
  console.log("Setting up power monitor for:", { userId, deviceId, labId });

  powerMonitor.on("suspend", () => {
    console.log("The system is going to sleep");
    pushPowerLogsToDB("0", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("resume", () => {
    console.log("The system is resuming");
    pushPowerLogsToDB("1", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("on-ac", () => {
    console.log("The system is on AC Power (charging)");
    pushPowerLogsToDB("2", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("on-battery", () => {
    console.log("The system is on Battery Power");
    pushPowerLogsToDB("3", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("shutdown", () => {
    console.log("The system is Shutting Down");
    pushPowerLogsToDB("4", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("lock-screen", () => {
    console.log("The system is about to be locked");
    pushPowerLogsToDB("5", getTimeStamp(), userId, deviceId, labId);
  });

  powerMonitor.on("unlock-screen", () => {
    console.log("The system is unlocked");
    pushPowerLogsToDB("6", getTimeStamp(), userId, deviceId, labId);
  });

  console.log("Power monitor setup complete");
}

/**
 * Stops all power monitoring activities.
 * This function clears the interval and removes all power monitor event listeners.
 */
export const stopPowerMonitoring = (): void => {
  console.log("Stopping monitoring");
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    console.log("Monitoring interval cleared");
  }

  powerMonitor.removeAllListeners("suspend");
  powerMonitor.removeAllListeners("resume");
  powerMonitor.removeAllListeners("on-ac");
  powerMonitor.removeAllListeners("on-battery");
  powerMonitor.removeAllListeners("shutdown");
  powerMonitor.removeAllListeners("lock-screen");
  powerMonitor.removeAllListeners("unlock-screen");
  console.log("All power monitor listeners removed");
}
