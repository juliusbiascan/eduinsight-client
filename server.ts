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

let userCount = 0;
const screenUpdateTimes = new Map<string, number>(); // Add this line to track screen update times
let lastPingTime = Date.now(); // Add this line to track last ping time

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

io.on("connection", (socket) => {
  console.log("a user connected");
  userCount++;
  io.emit("user count", userCount);

  // Reset lastPingTime on new connection
  lastPingTime = Date.now();

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

  // Clean up interval on process exit
  process.on("exit", () => {
    clearInterval(cleanupInterval);
  });

  // Add error type guard helper
  const isError = (error: unknown): error is Error => {
    return error instanceof Error;
  };

  // Add memory monitoring
  setInterval(() => {
    const used = process.memoryUsage();
    if (used.heapUsed > 0.8 * used.heapTotal) {
      console.warn("High memory usage detected:", used);
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }, 30000);

  const showScreen = ({
    deviceId,
    userId,
    subjectId,
  }: {
    deviceId: string;
    userId: string;
    subjectId: string;
  }) => {
    socket.to(deviceId).emit("show-screen", { deviceId, userId, subjectId });
  };

  const hideScreen = ({ deviceId }: { deviceId: string }) => {
    socket.to(deviceId).emit("hide-screen");
  };

  const screenData = ({
    userId,
    subjectId,
    screenData,
    timestamp,
  }: {
    userId: string;
    subjectId: string;
    screenData: string;
    timestamp: number;
  }) => {
    // Implement rate limiting
    const now = Date.now();
    const lastUpdate = screenUpdateTimes.get(userId) || 0;

    // Limit updates to one every 100ms per user
    if (now - lastUpdate >= 100) {
      screenUpdateTimes.set(userId, now);
      socket.to(subjectId).emit("screen-data", {
        userId,
        screenData,
        timestamp,
      });
    }
  };

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

  socket.on("ping", () => {
    lastPingTime = Date.now();
    socket.emit("pong");
  });

  // Add connection monitoring
  socket.on("disconnect", (reason) => {
    console.log("user disconnected, reason:", reason);
    userCount--;
    io.emit("user count", userCount);
    clearInterval(healthCheck);
    // Clean up screen update times for disconnected users
    screenUpdateTimes.clear();
  });

  socket.on("error", (error) => {
    console.error("socket error:", error);
  });

  // Monitor connection health
  const healthCheck = setInterval(() => {
    if (Date.now() - lastPingTime > 60000) { // 60 seconds without ping
      socket.disconnect(true);
      clearInterval(healthCheck);
    }
  }, 30000);

  socket.on("disconnect", () => {
    clearInterval(healthCheck);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    userCount--;
    io.emit("user count", userCount);
  });
});
