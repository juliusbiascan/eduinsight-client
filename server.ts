import { Bonjour } from "bonjour-service";
import cors from "cors";
import express from "express";
import fs from "fs";
import https from "https";
import path from "path";
import { PeerServer } from "peer";
import { Server } from "socket.io";

const bonjourService = new Bonjour();

const advertisedPort = 4000;

const bonjourServiceName = "EduInsight Server";

const publish = bonjourService.publish({
  name: bonjourServiceName,
  type: "http",
  port: advertisedPort,
});

publish.on("up", () => {
  console.log("bonjour service up");
});

const app = express();

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  console.log("req path...", req.path);
  res.sendFile(path.join(__dirname, "index.html"));
});

app.set("port", advertisedPort);

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use((_req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE",
  );
  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type",
  );
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", "true");
  // Pass to next layer of middleware
  next();
});

const privateKey = fs.readFileSync(
  path.join(__dirname, "my_ssl_key.key"),
  "utf8",
);
const certificate = fs.readFileSync(
  path.join(__dirname, "my_ssl_cert.crt"),
  "utf8",
);

const credentials = {
  key: privateKey,
  cert: certificate,
  requestCert: false,
  rejectUnauthorized: false,
};

const httpServer = https.createServer(credentials, app);

httpServer.listen(advertisedPort, "0.0.0.0");
httpServer.on("error", () => console.log("error"));
httpServer.on("listening", () => console.log("listening....."));

const peerServer = PeerServer({
  port: 9001,
  path: "/peerjs",
  ssl: { key: privateKey, cert: certificate },
});
peerServer.on("connection", (client) => {
  console.log("peer connection established: ", client.getId());
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e8, // 100MB
  pingTimeout: 120000, // Increase to 120 seconds
  pingInterval: 25000, // Keep at 25 seconds
  transports: ["websocket", "polling"], // Explicitly define transports
  connectTimeout: 60000, // 60 second connection timeout
});

// Add max listeners configuration
process.setMaxListeners(15); // Increase default limit to accommodate our needs

let userCount = 0;

const CHUNK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface IFileTransfer {
  chunks: Array<string | undefined>;
  totalChunks: number;
  receivedChunks: number;
  targets: string[];
  subjectName: string;
  filename: string;
  fileType: string;
  fileSize: number;
  lastUpdate: number;
  buffer: Buffer[];
  startTime: number;
  chunkSize: number;
  timeoutHandle?: NodeJS.Timeout;
}

const fileTransfers = new Map<string, IFileTransfer>();

const TRANSFER_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Move cleanup handler outside connection scope
process.on("exit", () => {
  // Cleanup all file transfers
  for (const [_, transfer] of fileTransfers.entries()) {
    if (transfer.timeoutHandle) {
      clearTimeout(transfer.timeoutHandle);
    }
  }
  fileTransfers.clear();
});

interface ScreenMetrics {
  fps: number;
  quality: number;
  networkDelay: number;
  droppedFrames: number;
  lastUpdate: number;
  totalFrames: number;
}

const screenMetrics = new Map<string, ScreenMetrics>();

const updateMetrics = (userId: string, metrics: Partial<ScreenMetrics>) => {
  const current = screenMetrics.get(userId) || {
    fps: 0,
    quality: 0.8,
    networkDelay: 0,
    droppedFrames: 0,
    lastUpdate: Date.now(),
    totalFrames: 0
  };

  screenMetrics.set(userId, {
    ...current,
    ...metrics,
    lastUpdate: Date.now()
  });
};

const screenSharing = new Map<string, {
  startTime: number;
  frames: number;
  quality: number;
  lastUpdate: number;
  settings: any;
}>();

io.on("connection", (socket) => {
  console.log("a user connected");
  userCount++;
  io.emit("user count", userCount);

  const joinServer = (deviceId: string) => {
    socket.join(deviceId);
  };

  const leaveServer = (deviceId: string) => {
    socket.leave(deviceId);
  };

  const activityUpdate = ({ deviceId }: { deviceId: string }) => {
    socket.to(deviceId).emit("activity-update");
  };

  const shutdown = ({ deviceId }: { deviceId: string }) => {
    socket.to(deviceId).emit("shutdown", deviceId);
  };

  const logOff = ({ deviceId }: { deviceId: string }) => {
    socket.to(deviceId).emit("logoff", deviceId);
  };

  const reboot = ({ deviceId }: { deviceId: string }) => {
    socket.to(deviceId).emit("reboot", deviceId);
  };

  const powerMonitoringUpdate = ({ deviceId }: { deviceId: string }) => {
    socket.to(deviceId).emit("power-monitoring-update");
    socket.broadcast.emit("refresh-power-status");
  };

  const joinSubject = ({
    userId,
    subjectId,
  }: {
    userId: string;
    subjectId: string;
  }) => {
    socket.to(subjectId).emit("student-joined", { userId, subjectId });
  };

  const leaveSubject = ({
    userId,
    subjectId,
  }: {
    userId: string;
    subjectId: string;
  }) => {
    socket.to(subjectId).emit("student-left", { userId, subjectId });
  };

  const logoutUser = ({
    userId,
    subjectId,
  }: {
    userId: string;
    subjectId: string;
  }) => {
    socket.to(subjectId).emit("student-logged-out", { userId, subjectId });
  };

  const shareScreen = ({
    userId,
    subjectId,
    stream,
  }: {
    userId: string;
    subjectId: string;
    stream: MediaStream;
  }) => {
    socket.to(subjectId).emit("screen-share", { userId, stream });
  };

  const launchWebpage = ({
    deviceId,
    url,
  }: {
    deviceId: string;
    url: string;
  }) => {
    socket.to(deviceId).emit("launch-webpage", { url });
  };

  const uploadFileChunk = ({
    targets,
    chunk,
    filename,
    subjectName,
    chunkIndex,
    totalChunks,
    fileType,
    fileSize,
  }: {
    targets: string[];  // Array of device IDs to receive the file
    chunk: string;
    filename: string;
    subjectName: string;
    chunkIndex: number;
    totalChunks: number;
    fileType: string;
    fileSize: number;
  }) => {
    try {
      // Validate inputs
      if (!targets?.length || !filename || !subjectName) {
        throw new Error("Missing required parameters");
      }

      // Generate consistent file ID
      const fileId = `${filename}-${fileSize}-${totalChunks}`;
      let transfer = fileTransfers.get(fileId);

      if (!transfer) {
        transfer = {
          chunks: new Array(totalChunks),
          buffer: new Array(totalChunks),
          totalChunks,
          receivedChunks: 0,
          targets,
          subjectName,
          filename,
          fileType,
          fileSize,
          lastUpdate: Date.now(),
          startTime: Date.now(),
          chunkSize: Math.ceil(fileSize / totalChunks),
          timeoutHandle: setTimeout(() => {
            fileTransfers.delete(fileId);
            targets.forEach((deviceId) => {
              socket.to(deviceId).emit("file-error", {
                fileId,
                error: "Transfer timeout",
                filename,
              });
            });
          }, TRANSFER_TIMEOUT),
        };
        fileTransfers.set(fileId, transfer);
      }

      // Process chunk
      if (!transfer.chunks[chunkIndex]) {
        const chunkBuffer = Buffer.from(chunk, "base64");
        transfer.chunks[chunkIndex] = chunk;
        transfer.buffer[chunkIndex] = chunkBuffer;
        transfer.receivedChunks++;
        transfer.lastUpdate = Date.now();

        // Calculate progress and speed
        const progress = (transfer.receivedChunks / totalChunks) * 100;
        const elapsedTime = (Date.now() - transfer.startTime) / 1000;
        const bytesReceived = transfer.receivedChunks * transfer.chunkSize;
        const speed = bytesReceived / elapsedTime; // bytes per second

        // Send detailed progress
        targets.forEach((deviceId) => {
          socket.to(deviceId).emit("file-progress", {
            fileId,
            filename,
            progress: Math.round(progress),
            speed,
            remaining: totalChunks - transfer.receivedChunks,
          });
        });

        // Check if transfer is complete
        if (transfer.receivedChunks === totalChunks) {
          try {
            // Clear timeout
            if (transfer.timeoutHandle) {
              clearTimeout(transfer.timeoutHandle);
            }

            const completeBuffer = Buffer.concat(transfer.buffer);
            targets.forEach((deviceId) => {
              socket.to(deviceId).emit("upload-file-chunk", {
                fileId,
                file: completeBuffer,
                filename,
                subjectName: transfer.subjectName,
                fileType: transfer.fileType,
              });
            });

            socket.emit("file-complete", {
              fileId,
              filename,
              targetCount: targets.length,
              totalSize: completeBuffer.length,
            });
          } catch (error) {
            throw new Error(`Failed to process complete file: ${isError(error) ? error.message : "Unknown error"}`);
          } finally {
            // Cleanup
            transfer.buffer = [];
            transfer.chunks = [];
            fileTransfers.delete(fileId);
          }
        }
      }
    } catch (error) {
      console.error("Error in uploadFileChunk:", error);
      socket.emit("file-error", {
        fileId: `${filename}-${Date.now()}`,
        error: isError(error) ? error.message : "Internal server error during file transfer",
        filename,
      });
    }
  };

  // Add cleanup interval for stale transfers
  const cleanupInterval = setInterval(() => {
    try {
      const now = Date.now();
      for (const [fileId, transfer] of fileTransfers.entries()) {
        if (now - transfer.lastUpdate > CHUNK_TIMEOUT) {
          fileTransfers.delete(fileId);
          console.log(`Cleaned up stale transfer: ${fileId}`);
        }
      }
    } catch (error: unknown) {
      console.error("Error in cleanup interval:", isError(error) ? error.message : "Unknown error");
    }
  }, 60 * 1000);

  // Clean up interval on socket disconnect instead of process exit
  socket.on("disconnect", () => {
    clearInterval(cleanupInterval);
  });

  // Add error type guard helper
  const isError = (error: unknown): error is Error => {
    return error instanceof Error;
  };

  // Add performance tracking
  interface IScreenUpdate {
    count: number;
    totalSize: number;
    lastUpdate: number;
    droppedFrames: number;
    avgFPS: number;
    networkDelay: number;  // Add networkDelay property
  }

  const performanceMetrics = {
    screenUpdates: new Map<string, IScreenUpdate>(),
    resetMetrics: function (userId: string) {
      this.screenUpdates.set(userId, {
        count: 0,
        totalSize: 0,
        lastUpdate: Date.now(),
        droppedFrames: 0,
        avgFPS: 0,
        networkDelay: 0  // Initialize networkDelay
      });
    }
  };

  // Update the rate limiter type
  interface IScreenRateLimiter {
    lastUpdate: number;
    skippedUpdates: number;
    targetFPS: number;
    resolution: { width: number; height: number };
    quality: number;
    compression: number; // Add this property
    metrics: {
      droppedFrames: number;
      totalFrames: number;
      avgLatency: number;
      networkDelay?: number; // Add this optional property
    };
    adaptiveSettings: {
      minFPS: number;
      maxFPS: number;
      minCompression: number;
      maxCompression: number;
      targetLatency: number;
    };
  }

  const screenRateLimiter = new Map<string, IScreenRateLimiter>();

  const screenData = ({
    userId,
    subjectId,
    data,
    timestamp,
    metadata
  }: {
    userId: string;
    subjectId: string;
    data: Uint8Array;
    timestamp: number;
    metadata?: {
      frameRate?: number;
      quality?: number;
      networkDelay?: number;
    };
  }) => {
    
    try {
      // Update performance metrics
      updateMetrics(userId, {
        ...metadata,
        networkDelay: Date.now() - timestamp
      });

      // Get current metrics
      const currentMetrics = screenMetrics.get(userId);

      // Emit with metrics
      socket.to(subjectId).volatile.emit('screen-data', {
        userId,
        screenData: data,
        timestamp,
        metrics: currentMetrics
      });

      // Adaptive quality control
      if (currentMetrics && currentMetrics.networkDelay > 200) {
        socket.emit('adjust-quality', {
          targetFPS: Math.max(15, currentMetrics.fps - 5),
          quality: Math.max(0.5, currentMetrics.quality - 0.1)
        });
      }

    } catch (error) {
      console.error('Screen data error:', error);
    }
  };

  // Add cleanup for rate limiters and metrics
  socket.on("disconnect", (reason) => {
    // Clean up screen sharing related resources
    screenRateLimiter.delete(socket.id);
    performanceMetrics.screenUpdates.delete(socket.id);
    
    // Clean up intervals
    clearInterval(cleanupInterval);
    
    // Update user count
    console.log("user disconnected, reason:", reason);
    userCount--;
    io.emit("user count", userCount);
    
    // Log disconnect
    console.log(`Client ${socket.id} disconnected`);
  });

  // Update showScreen handler to initialize metrics
  const showScreen = ({
    deviceId,
    userId,
    subjectId,
  }: {
    deviceId: string;
    userId: string;
    subjectId: string;
  }) => {
    try {
      const settings = {
        targetFPS: 20,
        quality: 0.8,
        resolution: { width: 854, height: 480 },
        adaptiveThresholds: {
          latencyHigh: 200,
          latencyLow: 50,
          dropRateHigh: 0.1,
          dropRateLow: 0.05
        }
      };

      screenSharing.set(userId, {
        startTime: Date.now(),
        frames: 0,
        quality: settings.quality,
        lastUpdate: Date.now(),
        settings
      });

      socket.to(deviceId).emit('show-screen', { 
        userId, 
        subjectId,
        settings 
      });

      // Monitor performance and adjust settings
      const monitor = setInterval(() => {
        const sharing = screenSharing.get(userId);
        if (!sharing) return;

        const metrics = screenMetrics.get(userId);
        if (!metrics) return;

        const newQuality = adjustQuality(metrics, sharing.settings);
        if (newQuality !== sharing.quality) {
          sharing.quality = newQuality;
          socket.emit('adjust-quality', { quality: newQuality });
        }
      }, 5000);

      cleanupFunctions.set(userId, () => {
        clearInterval(monitor);
        screenSharing.delete(userId);
        screenMetrics.delete(userId);
      });

    } catch (error) {
      console.error('Error in showScreen:', error);
      socket.emit('screen-share-error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const hideScreen = ({ deviceId, userId }: { deviceId: string; userId: string }) => {
    const cleanup = cleanupFunctions.get(userId);
    if (cleanup) {
      cleanup();
      cleanupFunctions.delete(userId);
    }
    
    socket.to(deviceId).emit('hide-screen', {
      userId,
      timestamp: Date.now()
    });
  };

  const adjustQuality = (metrics: ScreenMetrics, settings: any) => {
    const { latencyHigh, latencyLow, dropRateHigh, dropRateLow } = settings.adaptiveThresholds;
    
    if (metrics.networkDelay > latencyHigh || metrics.droppedFrames / metrics.totalFrames > dropRateHigh) {
      return Math.max(0.5, metrics.quality - 0.1);
    } else if (metrics.networkDelay < latencyLow && metrics.droppedFrames / metrics.totalFrames < dropRateLow) {
      return Math.min(0.9, metrics.quality + 0.05);
    }
    
    return metrics.quality;
  };

  // Add at the top with other interface definitions
  const cleanupFunctions = new Map<string, () => void>();

  const startLiveQuiz = ({
    deviceId,
    quizId,
  }: {
    deviceId: string;
    quizId: string;
  }) => {
    socket.to(deviceId).emit("start-live-quiz", { quizId });
  };

  const handleScreenShareOffer = ({
    senderId,
    receiverId,
    signalData,
  }: {
    senderId: string;
    receiverId: string;
    signalData: any;
  }) => {
    socket.to(receiverId).emit("screen-share-offer", { senderId, signalData });
  };

  const handleScreenShareStopped = ({
    senderId,
    receiverId,
  }: {
    senderId: string;
    receiverId: string;
  }) => {
    socket.to(receiverId).emit("screen-share-stopped", { senderId });
  };

  const limitWeb = ({ enabled }: { enabled: boolean }) => {
    // Broadcast to all connected clients
    io.emit("limit-web", { enabled });
  };

  const getWebLimitStatus = () => {
    // Broadcast request to all connected clients
    io.emit("get-web-limit-status");
  };

  const webLimited = ({ success, enabled, error }: {
    success: boolean;
    enabled?: boolean;
    error?: string;
  }) => {
    // Broadcast response to all except sender
    socket.broadcast.emit("web-limited", { success, enabled, error });
  };

  const webLimitStatus = ({ success, limited, error }: {
    success: boolean;
    limited?: boolean;
    error?: string;
  }) => {
    // Broadcast status to all except sender
    socket.broadcast.emit("web-limit-status", { success, limited, error });
  };

  socket.on("ping", () => {
    socket.emit("pong");
  });
  socket.on("start-live-quiz", startLiveQuiz);
  socket.on("screen-data", screenData);
  socket.on("join-server", joinServer);
  socket.on("leave-server", leaveServer);
  socket.on("activity-update", activityUpdate);
  socket.on("shutdown", shutdown);
  socket.on("logoff", logOff);
  socket.on("reboot", reboot);
  socket.on("power-monitoring-update", powerMonitoringUpdate);
  socket.on("logout-user", logoutUser);
  socket.on("share-screen", shareScreen);
  socket.on("join-subject", joinSubject);
  socket.on("leave-subject", leaveSubject);
  socket.on("launch-webpage", launchWebpage);
  socket.on("upload-file-chunk", uploadFileChunk);
  socket.on("show-screen", showScreen);
  socket.on("hide-screen", hideScreen);
  socket.on("screen-share-offer", handleScreenShareOffer);
  socket.on("screen-share-stopped", handleScreenShareStopped);
  socket.on("leave-server", leaveServer);
  socket.on("limit-web", limitWeb);
  socket.on("get-web-limit-status", getWebLimitStatus);
  socket.on("web-limited", webLimited);
  socket.on("web-limit-status", webLimitStatus);

  // Single consolidated disconnect handler
  socket.once("disconnect", (reason) => {
    try {
      console.log(`Client ${socket.id} disconnected, reason:`, reason);
      
      // Clean up screen sharing resources
      screenRateLimiter.delete(socket.id);
      performanceMetrics.screenUpdates.delete(socket.id);
      screenMetrics.delete(socket.id);
      
      // Clear all cleanup functions for this socket
      for (const [userId, cleanup] of cleanupFunctions.entries()) {
        if (socket.rooms.has(userId)) {
          cleanup();
          cleanupFunctions.delete(userId);
        }
      }
      
      // Clean up intervals
      clearInterval(cleanupInterval);
      
      // Update user count
      userCount = Math.max(0, userCount - 1); // Prevent negative count
      io.emit("user count", userCount);
      
    } catch (error) {
      console.error("Error during disconnect cleanup:", error);
    }
  });

  // Error handler
  socket.on("error", (error) => {
    console.error("Socket error:", error);
    // Attempt cleanup on error
    screenRateLimiter.delete(socket.id);
    performanceMetrics.screenUpdates.delete(socket.id);
    screenMetrics.delete(socket.id);
  });

  // Remove all other disconnect handlers

});
