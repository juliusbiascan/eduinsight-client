import { ipcMain } from 'electron';
import { IPCRoute, LoginData } from '@/shared/constants';
import { machineIdSync } from 'node-machine-id';
import { getIPAddress, getNetworkNames } from '../lib/ipaddress';
import { v4 as uuidv4 } from 'uuid';
import {
  DeviceUserRole,
  Quiz,
  QuizQuestion,
  QuizRecord,
  State,
  Subject,
} from '@prisma/client';
import { sleep } from '@/shared/utils';
import { Database } from '../lib';
import { hash, compare } from 'bcryptjs';
import { startMonitoring, stopPowerMonitoring } from '../lib/monitoring';
import crypto from 'crypto';
import { sendOtpCodeEmail } from '../lib/mail';
import { createTray, removeTray } from '../lib/tray-menu';
import xlsx from 'xlsx';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import StoreManager from '@/main/lib/store';

const store = StoreManager.getInstance();

interface OtpRecord {
  email: string;
  otpHash: string;
  expiresAt: Date;
}

const otpStore: OtpRecord[] = []; // In-memory store. Consider using a persistent store for production.

/**
 * Removes expired OTPs from the store.
 */
function cleanUpOtps() {
  const now = new Date();
  for (let i = otpStore.length - 1; i >= 0; i--) {
    if (otpStore[i].expiresAt < now) {
      otpStore.splice(i, 1);
    }
  }
}

/**
 * Sets up IPC handlers for database-related operations.
 * This function initializes various event listeners for database connections,
 * device management, user authentication, subject handling, quiz management,
 * and other related functionalities.
 */
export default function () {
  // database connection handlers with faux timeout
  ipcMain.handle(IPCRoute.DATABASE_CONNECT, async (_, url: string) => {
    try {
      await sleep(2000).then(() => Database.connect(url));
      return { success: true };
    } catch (error) {
      console.error('Error connecting to database:', error);
      return { success: false, error: 'Failed to connect to database' };
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_DISCONNECT, () =>
    sleep(2000).then(() => Database.prisma.$disconnect()),
  );

  ipcMain.on(
    IPCRoute.DATABASE_CHECK_CONNECTION,
    (_e, serverAddress: string) => {
      console.log('connection', serverAddress);
    },
  );

  ipcMain.handle(IPCRoute.DATABASE_VERIFY_DEVICE, async (_) => {
    const deviceId = store.get('deviceId') as string;

    if (!deviceId) {
      return Promise.reject('Device not found');
    }

    const device = await Database.prisma.device.findFirst({
      where: { id: deviceId },
    });

    if (device) {
      return Promise.resolve(device);
    } else {
      return Promise.reject('Device not found');
    }
  });

  ipcMain.handle(
    IPCRoute.DATABASE_REGISTER_DEVICE,
    async (_e, deviceName: string, labSecretKey: string, networkName: string) => {
      try {
        // Find lab by secret key
        const lab = await Database.prisma.labaratory.findFirst({
          where: { secretKey: labSecretKey }
        });

        if (!lab) {
          throw new Error('Invalid lab secret key');
        }

        const ipAddress = getIPAddress();
        const macAddress = machineIdSync(true);

        const existingDevice = await Database.prisma.device.findFirst({
          where: { devMACaddress: macAddress },
        });

        if (existingDevice) {
          await Database.prisma.device.delete({
            where: { id: existingDevice.id },
          });
        }

        const device = await Database.prisma.device.create({
          data: {
            name: deviceName,
            devId: uuidv4(),
            devHostname: ipAddress[networkName][0],
            devMACaddress: macAddress,
            isArchived: false,
            labId: lab.id, // Use the found lab's ID
          },
        });

        store.set('deviceId', device.id);
        store.set('labId', device.labId);
        store.delete('userId');

        return device;
      } catch (error) {
        console.error('Error registering device:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_LABS, () => {
    try {
      const labs = Database.prisma.labaratory.findMany();
      return Promise.resolve(labs);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_NETWORK_NAMES, () => getNetworkNames());

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE, async () => {
    return await Database.prisma.device.findFirst({
      where: { devMACaddress: machineIdSync(true) },
    });
  });

  ipcMain.handle(
    IPCRoute.DATABASE_GET_DEVICE_BY_MAC,
    (_e, devMACaddress: string) =>
      Database.prisma.device.findMany({ where: { devMACaddress } }),
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE_BY_ID, (_e, id: string) =>
    Database.prisma.device.findMany({ where: { id } }),
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_ACTIVE_USER_BY_DEVICE_ID_AND_LAB_ID,
    (_e, deviceId: string, labId: string) =>
      Database.prisma.activeDeviceUser.findFirst({
        where: { deviceId, labId },
        include: {
          user: {
            include: {
              subjects: true,
              ActiveUserLogs: true,
            },
          },
        },
      }),
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_ACTIVE_USER_BY_USER_ID, (_e, userId: string) => {
    return Database.prisma.activeDeviceUser.findFirst({
      where: { userId },
      include: {
        user: true,
        device: true,
      },
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE_USER_BY_ID, (_e, id: string) => {
    return Database.prisma.deviceUser.findFirst({ where: { id } });
  });

  ipcMain.handle(
    IPCRoute.DATABASE_GET_DEVICE_USER_BY_ACTIVE_USER_ID,
    (_e, userId: string) =>
      Database.prisma.deviceUser.findMany({
        where: { id: userId },
        include: { subjects: true },
      }),
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_ALL_DEVICE_USERS_BY_LAB_ID,
    (_e, labId: string) =>
      Database.prisma.deviceUser.findMany({ where: { labId } }),
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_ALL_ACTIVE_DEVICE_USERS_BY_LAB_ID,
    (_e, labId: string) =>
      Database.prisma.activeDeviceUser.findMany({ where: { labId } }),
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_SUBJECTS_BY_LAB_ID,
    (_e, labId: string) =>
      Database.prisma.subject.findMany({ where: { labId } }),
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_SUBJECTS_BY_USER_ID,
    (_e, userId: string) => {
      Database.prisma.subject.findMany({ where: { userId } });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_USER_RECENT_LOGIN_BY_USER_ID,
    (_e, userId: string) =>
      Database.prisma.activeUserLogs.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
  );

  ipcMain.handle(
    IPCRoute.DATABASE_CREATE_SUBJECT,
    async (_e, subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await Database.prisma.subject.create({
        data: subject,
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_SUBJECT_DATA,
    async (_e, subjectId: string) => {
      try {
        const subject = await Database.prisma.subject.findFirst({
          where: { id: subjectId },
          include: {
            quizzes: {
              include: {
                questions: true,
              },
            },
            quizRecord: true,
          },
        });
        return subject ? [subject] : [];
      } catch (error) {
        console.error('Error fetching subject data:', error);
        return [];
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_SUBJECT_RECORDS_BY_SUBJECT_ID,
    async (_e, subjectId: string) => {
      return await Database.prisma.subjectRecord.findMany({
        where: { subjectId },
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_ACTIVE_USERS_BY_SUBJECT_ID,
    async (_e, subjectId: string) => {
      const subjectRecords = await Database.prisma.subjectRecord.findMany({
        where: { subjectId },
      });
      return await Database.prisma.activeDeviceUser.findMany({
        where: {
          userId: { in: subjectRecords.map((record) => record.userId) },
        },
      });
    },
  );

  ipcMain.on(
    IPCRoute.DATABASE_DELETE_SUBJECT,
    async (_e, subjectId: string) => {
      await Database.prisma.subject.delete({
        where: { id: subjectId },
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_STUDENT_SUBJECTS,
    async (_e, studentId: string) => {
      const subjectRecords = await Database.prisma.subjectRecord.findMany({
        where: { userId: studentId },
      });
      const subjects = await Database.prisma.subject.findMany({
        where: { id: { in: subjectRecords.map((record) => record.subjectId) } },
        include: {
          quizzes: true,
          quizRecord: true,
        },
      });
      return subjects;
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_JOIN_SUBJECT,
    async (_e, subjectCode: string, studentId: string, labId: string) => {
      const subject = await Database.prisma.subject.findFirst({
        where: { subjectCode },
      });
      if (!subject) {
        return { success: false, message: 'Subject not found' };
      }
      try {
        const result = await Database.prisma.subjectRecord.create({
          data: {
            subjectId: subject.id,
            userId: studentId,
            labId: labId,
          },
        });
        return {
          success: true,
          message: 'Subject joined successfully',
          subjectId: result.subjectId,
        };
      } catch (error) {
        console.error('Error joining subject:', error);
        return { success: false, message: 'Failed to join subject' };
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_LEAVE_SUBJECT,
    async (_e, subjectId: string, studentId: string) => {
      try {
        await Database.prisma.subjectRecord.deleteMany({
          where: {
            subjectId: subjectId,
            userId: studentId,
          },
        });
        return { success: true, message: 'Subject left successfully' };
      } catch (error) {
        console.error('Error leaving subject:', error);
        return { success: false, message: 'Failed to leave subject' };
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_QUIZZES_BY_USER_ID,
    async (_e, userId: string) => {
      return await Database.prisma.quiz.findMany({
        where: { userId },
        include: {
          questions: true,
          subject: true,
        },
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_QUIZ_BY_ID,
    async (_e, quizId: string) => {
      return await Database.prisma.quiz.findMany({
        where: { id: quizId },
        include: { questions: true },
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_QUIZ_BY_SUBJECT_ID,
    async (_e, subjectId: string) => {
      return await Database.prisma.quiz.findMany({
        where: { subjectId, published: true },
        include: { questions: true },
      });
    },
  );



  ipcMain.on(IPCRoute.DATABASE_DELETE_QUIZ, async (_e, quizId: string) => {
    await Database.prisma.quiz.delete({
      where: { id: quizId },
      include: { questions: true },
    });
  });

  ipcMain.handle(
    IPCRoute.DATABASE_CREATE_QUIZ,
    async (_e, quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await Database.prisma.quiz.create({
        data: quiz,
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_UPDATE_QUIZ,
    async (
      _e,
      quizId: string,
      quiz: Partial<Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>>,
    ) => {
      return await Database.prisma.quiz.update({
        where: { id: quizId },
        data: quiz,
      });
    },
  );

  ipcMain.on(IPCRoute.DATABASE_PUBLISH_QUIZ, async (_e, quizId: string) => {
    await Database.prisma.quiz.update({
      where: { id: quizId },
      data: { published: true },
    });
  });

  ipcMain.handle(
    IPCRoute.DATABASE_CREATE_QUIZ_QUESTION,
    async (
      _e,
      quizId: string,
      question: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      try {
        // Get all questions for this quiz
        const allQuestions = await Database.prisma.quizQuestion.findMany({
          where: { quizId },
          orderBy: { order: 'asc' },
        });

        // Calculate the new order (max order + 1, or 0 if no questions exist)
        const nextOrder =
          allQuestions.length > 0
            ? Math.max(...allQuestions.map((q) => q.order)) + 1
            : 0;

        // Create the new question with proper order
        const createdQuestion = await Database.prisma.quizQuestion.create({
          data: {
            ...question,
            quizId,
            order: nextOrder,
          },
        });

        return createdQuestion;
      } catch (error) {
        console.error('Error creating quiz question:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_UPDATE_QUIZ_QUESTION,
    async (
      _e,
      questionId: string,
      question: Partial<Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>>,
    ) => {
      return await Database.prisma.quizQuestion.update({
        where: { id: questionId },
        data: question,
      });
    },
  );

  ipcMain.on(
    IPCRoute.DATABASE_DELETE_QUIZ_QUESTION,
    async (_e, questionId: string) => {
      await Database.prisma.quizQuestion.delete({
        where: { id: questionId },
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_SAVE_QUIZ_RECORD,
    async (
      _e,
      quizRecord: Omit<QuizRecord, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      return await Database.prisma.quizRecord.create({
        data: quizRecord,
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_IMPORT_GOOGLE_FORMS,
    async (_e, file: Electron.FilePathWithHeaders) => {
      try {
        const fileContent = fs.readFileSync(file.path, 'utf8');
        const jsonData = JSON.parse(fileContent);

        // Parse Google Forms JSON and convert to QuizQuestion format
        const questions: Omit<
          QuizQuestion,
          'id' | 'quizId' | 'createdAt' | 'updatedAt'
        >[] = jsonData.items.map((item: any) => ({
          question: item.title,
          type: item.questionItem.question.type,
          options: item.questionItem.question.options,
          time: 60, // Default time in seconds, adjust as needed
          points: 1, // Default points, adjust as needed
        }));

        return questions;
      } catch (error) {
        console.error('Error importing from Google Forms:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_IMPORT_SPREADSHEET,
    async (_e, file: Electron.FilePathWithHeaders) => {
      try {
        const questions: Omit<
          QuizQuestion,
          'id' | 'quizId' | 'createdAt' | 'updatedAt'
        >[] = [];

        if (file.path.endsWith('.csv')) {
          // Handle CSV file
          await new Promise((resolve) => {
            fs.createReadStream(file.path)
              .pipe(csv())
              .on('data', (row) => {
                questions.push({
                  question: row.question,
                  type: row.type,
                  order: parseInt(row.order) || 0,
                  options: JSON.parse(row.options),
                  time: parseInt(row.time) || 60,
                  points: parseInt(row.points) || 1,
                });
              })
              .on('end', resolve);
          });
        } else if (file.path.endsWith('.xlsx')) {
          // Handle Excel file
          const workbook = xlsx.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(sheet);

          questions.push(
            ...data.map((row: any) => ({
              question: row.question,
              type: row.type,
              order: parseInt(row.order) || 0,
              options: JSON.parse(row.options),
              time: parseInt(row.time) || 60,
              points: parseInt(row.points) || 1,
            })),
          );
        }

        return questions;
      } catch (error) {
        console.error('Error importing from Spreadsheet:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_ADD_QUESTIONS_TO_QUIZ,
    async (
      _e,
      quizId: string,
      questions: Omit<
        QuizQuestion,
        'id' | 'quizId' | 'createdAt' | 'updatedAt'
      >[],
    ) => {
      try {
        const updatedQuiz = await Database.prisma.quiz.update({
          where: { id: quizId },
          data: {
            questions: {
              create: questions.map((q) => ({
                question: q.question,
                type: q.type,
                options: q.options,
                time: q.time,
                points: q.points,
              })),
            },
          },
          include: { questions: true },
        });

        return updatedQuiz;
      } catch (error) {
        console.error('Error adding questions to quiz:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_UPDATE_QUIZ_QUESTIONS_ORDER,
    async (
      _e,
      quizId: string,
      updatedQuestions: Array<{ id: string; order: number }>,
    ) => {
      try {
        // Start a transaction
        const result = await Database.prisma.$transaction(async (prisma) => {
          // Update each question's order
          for (const question of updatedQuestions) {
            await prisma.quizQuestion.update({
              where: { id: question.id },
              data: { order: question.order },
            });
          }

          // Fetch and return the updated quiz with ordered questions
          return await prisma.quiz.findFirst({
            where: { id: quizId },
            include: {
              questions: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
          });
        });

        return result;
      } catch (error) {
        console.error('Error updating question order:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_UPDATE_QUIZ_QUESTIONS_BULK,
    async (_e, quizId: string, updatedQuestions: Array<Partial<QuizQuestion>>) => {
      try {
        const result = await Database.prisma.$transaction(async (prisma) => {
          for (const question of updatedQuestions) {
            await prisma.quizQuestion.update({
              where: { id: question.id },
              data: question,
            });
          }

          return await prisma.quiz.findFirst({
            where: { id: quizId },
            include: { questions: true },
          });
        });

        return result;
      } catch (error) {
        console.error('Error updating questions in bulk:', error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_QUIZ_RECORDS_BY_USER_AND_SUBJECT,
    async (_e, userId: string, subjectId: string) => {
      try {
        return await Database.prisma.quizRecord.findMany({
          where: {
            userId,
            subjectId,
          },
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
        });
      } catch (error) {
        console.error('Error fetching quiz records:', error);
        return [];
      }
    },
  );

  ipcMain.handle(IPCRoute.AUTH_REGISTER, async (_, data) => {
    try {
      const device = await Database.prisma.device.findFirst({
        where: { id: data.deviceId },
      });

      const existingUser = await Database.prisma.deviceUser.findFirst({
        where: { schoolId: data.schoolId },
      });

      if (existingUser) {
        return { success: false, message: 'Email already exists' };
      }

      // Set default yearLevel for teachers
      const yearLevel = data.role === 'TEACHER' ? 'FIRST' : data.yearLevel;

      await Database.prisma.deviceUser.create({
        data: {
          labId: device.labId,
          schoolId: data.schoolId || 'TEACHER', // Set default schoolId for teachers
          firstName: data.firstName,
          lastName: data.lastName,
          course: data.course,
          yearLevel: yearLevel, // Use the modified yearLevel
          role: data.role as DeviceUserRole,
          email: '',
          contactNo: '',
          password: '',
        },
      });

      return { success: true, message: 'Registration successful' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  });

  ipcMain.handle(IPCRoute.AUTH_LOGIN, async (_, data: LoginData) => {
    try {
      const user = await Database.prisma.deviceUser.findFirst({
        where: data.email
          ? { email: data.email }
          : { schoolId: data.studentId }
      });

      if (!user) {
        return { success: false, message: 'User not found!' };
      }

      // Check if email verification is required
      // if (!user.emailVerified && !data.allowDirectLogin) {
      //   return { 
      //     success: true, 
      //     message: 'Please verify your email first.' 
      //   };
      // }

      // Handle users with no password
      if (!user.password || user.password === '') {
        if (!data.allowDirectLogin) {
          return {
            success: false,
            message: 'Please set up your account first.'
          };
        }
      } else {
        // For users with passwords, verify credentials
        const passwordMatch = await compare(data.password, user.password);
        if (!passwordMatch) {
          console.log('Invalid credentials: ', data, '-', user);
          return { success: false, message: 'Invalid credentials' };
        }
      }

      const device = await Database.prisma.device.findUnique({
        where: { id: data.deviceId },
      });

      if (!device) {
        return { success: false, message: 'Device not found.' };
      }

      if (device.isUsed) {
        return { success: false, message: 'Device already inused.' };
      }

      if (user.labId !== device.labId) {
        return { success: false, message: 'User does not belong to this lab.' };
      }

      const activeUser = await Database.prisma.activeDeviceUser.findFirst({
        where: { userId: user.id },
      });

      if (activeUser) {
        return { success: false, message: 'User already logged in.' };
      }

      await Database.prisma.$transaction([
        Database.prisma.activeDeviceUser.create({
          data: {
            labId: device.labId,
            deviceId: device.id,
            userId: user.id,
            state: State.ACTIVE,
          },
        }),
        Database.prisma.device.update({
          where: { id: data.deviceId },
          data: { isUsed: true },
        }),
        Database.prisma.activeUserLogs.create({
          data: {
            labId: device.labId,
            deviceId: device.id,
            userId: user.id,
          },
        }),
      ]);
      store.set('userId', user.id);
      startMonitoring(device.id, user.id, device.labId);
      createTray(path.join(__dirname, 'img/tray-icon.ico'));
      return { success: true, message: 'Login successful' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  });

  ipcMain.on(IPCRoute.DATABASE_USER_LOGOUT, async (_e, userId: string) => {
    const activeUser = await Database.prisma.activeDeviceUser.findFirst({
      where: { userId },
    });

    if (!activeUser) {
      return;
    }

    await Database.prisma.activeDeviceUser.deleteMany({
      where: {
        deviceId: activeUser.deviceId,
        userId: activeUser.userId,
      },
    });

    await Database.prisma.device.update({
      where: { id: activeUser.deviceId },
      data: { isUsed: false },
    });

    stopPowerMonitoring();
    removeTray();
  });

  ipcMain.handle(IPCRoute.SEND_OTP, async (_, email: string) => {
    try {
      // // Verify that the email exists in the DeviceUser table
      // const user = await Database.prisma.deviceUser.findFirst({
      //   where: { email },
      // });
      // if (!user) {
      //   return { success: false, message: 'Email does not exist.' };
      // }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash the OTP
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      // Set OTP expiration time (e.g., 10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Clean up expired OTPs
      cleanUpOtps();

      // Store the hashed OTP
      otpStore.push({ email, otpHash, expiresAt });

      // Send OTP via email
      const emailSent = await sendOtpCodeEmail(email, otp);
      if (emailSent) {
        return { success: true };
      } else {
        return { success: false, message: 'Failed to send OTP email.' };
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'An error occurred while sending OTP.',
      };
    }
  });

  ipcMain.handle(
    IPCRoute.VERIFY_OTP_AND_RESET_PASSWORD,
    async (_, payload: { userId: string, email: string; otp: string; newPassword: string }) => {
      try {
        cleanUpOtps();
        const { userId, email, otp, newPassword } = payload;

        // Find the OTP record
        const otpRecordIndex = otpStore.findIndex(
          (record) => record.email === email,
        );
        if (otpRecordIndex === -1) {
          return { success: false, message: 'OTP not found or expired.' };
        }

        const otpRecord = otpStore[otpRecordIndex];

        // Hash the provided OTP to compare
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        if (otpRecord.otpHash !== otpHash) {
          return { success: false, message: 'Invalid OTP.' };
        }

        // OTP is valid. Proceed to reset the password.

        // Find the user by email
        const user = await Database.prisma.deviceUser.findFirst({
          where: { email },
        });
        if (!user) {
          return { success: false, message: 'User not found.' };
        }

        // Hash the new password
        const hashedPassword = await hash(newPassword, 10);

        // Update the user's password
        await Database.prisma.deviceUser.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });

        // Remove the used OTP
        otpStore.splice(otpRecordIndex, 1);

        return { success: true };
      } catch (error) {
        console.error('Error resetting password:', error);
        return {
          success: false,
          message: 'An error occurred while resetting password.',
        };
      }
    },
  );

  ipcMain.handle(
    'VERIFY_OTP',
    async (_, payload: { userId: string; email: string; otp: string; skipVerification?: boolean }) => {
      try {
        if (payload.skipVerification) {
          // If verification is skipped, just update the email
          await Database.prisma.deviceUser.update({
            where: { id: payload.userId },
            data: { email: payload.email }
          });
          return { success: true, message: 'Email updated successfully' };
        }

        cleanUpOtps();
        const { userId, email, otp } = payload;

        // Find the OTP record
        const otpRecordIndex = otpStore.findIndex(
          (record) => record.email === email,
        );
        if (otpRecordIndex === -1) {
          return { success: false, message: 'OTP not found or expired.' };
        }

        const otpRecord = otpStore[otpRecordIndex];

        // Hash the provided OTP to compare
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        if (otpRecord.otpHash !== otpHash) {
          return { success: false, message: 'Invalid OTP.' };
        }

        // OTP is valid, update email and emailVerified timestamp
        await Database.prisma.deviceUser.update({
          where: { id: userId },
          data: {
            email: email,
            emailVerified: new Date()
          },
        });

        // Remove the used OTP
        otpStore.splice(otpRecordIndex, 1);

        return { success: true };
      } catch (error) {
        console.error('Error verifying OTP:', error);
        return {
          success: false,
          message: 'An error occurred while verifying OTP.',
        };
      }
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_GET_NOTIFICATIONS,
    async (_, userId: string) => {
      return await Database.prisma.notification.findMany({
        where: { userId },
        orderBy: { time: 'desc' },
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_ADD_NOTIFICATION,
    async (_, userId: string, notification: any) => {
      try {
        const dbNotification = {
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          time: new Date(notification.time),
          read: notification.read,
          category: notification.category,
          priority: notification.priority,
          icon: notification.icon,
          sound: notification.sound,
          count: notification.count || 1,
          status: notification.status,
          progress: notification.progress,
          filePath: notification.filePath,
          subjectName: notification.subjectName,
          error: notification.error,
          targetCount: notification.targetCount,
          quizId: notification.quizId,
          score: notification.score,
          totalPoints: notification.totalPoints,
          teacherName: notification.teacherName,
        };

        const result = await Database.prisma.notification.create({
          data: dbNotification,
        });

        return result;
      } catch (error) {
        console.error('Error adding notification:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    IPCRoute.DATABASE_MARK_NOTIFICATION_READ,
    async (_, id: string | 'all', userId: string) => {
      try {
        if (id === 'all') {
          // Mark all notifications as read for the user
          const result = await Database.prisma.notification.updateMany({
            where: {
              userId,
              read: false
            },
            data: { read: true }
          });
          return { success: true, count: result.count };
        }

        // Mark single notification as read
        const result = await Database.prisma.notification.update({
          where: { id },
          data: { read: true }
        });
        return { success: true, notification: result };
      } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: 'Failed to mark notification as read' };
      }
    }
  );

  ipcMain.handle(
    IPCRoute.DATABASE_REMOVE_NOTIFICATION,
    async (_, id: string) => {
      try {
        const result = await Database.prisma.notification.delete({
          where: { id }
        });
        return { success: true, notification: result };
      } catch (error) {
        console.error('Error removing notification:', error);
        return { success: false, error: 'Failed to remove notification' };
      }
    }
  );

  ipcMain.handle(
    IPCRoute.DATABASE_CLEAR_NOTIFICATIONS,
    async (_, userId: string) => {
      return await Database.prisma.notification.deleteMany({
        where: { userId },
      });
    },
  );

  ipcMain.handle(
    IPCRoute.DATABASE_MARK_ALL_NOTIFICATIONS_READ,
    async (_, userId: string) => {
      try {
        const result = await Database.prisma.notification.updateMany({
          where: {
            userId,
            read: false
          },
          data: { read: true }
        });
        return { success: true, count: result.count };
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: 'Failed to mark all notifications as read' };
      }
    }
  );

  ipcMain.handle(
    IPCRoute.DATABASE_UPDATE_USER,
    async (_, { userId, email, contactNo, password, emailVerified }) => {
      try {
        // Get current user to check password status
        const currentUser = await Database.prisma.deviceUser.findUnique({
          where: { id: userId }
        });

        if (!currentUser) {
          return { success: false, message: 'User not found' };
        }

        // Check if email is already in use by another user
        if (email) {
          const existingUser = await Database.prisma.deviceUser.findFirst({
            where: {
              email,
              NOT: {
                id: userId
              }
            }
          });

          if (existingUser) {
            return { success: false, message: 'Email already in use' };
          }
        }

        // Prepare update data
        const updateData: any = {};

        if (email) updateData.email = email;
        if (contactNo) updateData.contactNo = contactNo;
        // Only update password if user doesn't have one
        if (password && (!currentUser.password || currentUser.password === '')) {
          updateData.password = await hash(password, 10);
        }
        if (emailVerified !== undefined) {
          updateData.emailVerified = emailVerified;
        }

        // Only perform update if there's data to update
        if (Object.keys(updateData).length > 0) {
          await Database.prisma.deviceUser.update({
            where: { id: userId },
            data: updateData
          });
        }

        return { success: true, message: 'Account updated successfully' };
      } catch (error) {
        console.error('Error updating user:', error);
        return { success: false, message: 'Failed to update user' };
      }
    }
  );

  ipcMain.handle(IPCRoute.VERIFY_USER_EMAIL, async (_, email: string) => {
    try {
      const user = await Database.prisma.deviceUser.findFirst({
        where: { email }
      });

      if (!user) {
        return {
          success: false,
          message: 'No user found with this email address.'
        };
      }

      return {
        success: true,
        userId: user.id,
        message: 'Email verified successfully.'
      };
    } catch (error) {
      console.error('Error verifying email:', error);
      return {
        success: false,
        message: 'An error occurred while verifying email.'
      };
    }
  });

  ipcMain.handle(IPCRoute.VERIFY_PERSONAL_INFO, async (_, data: {
    email: string;
    firstName: string;
    lastName: string;
    schoolId: string;
  }) => {
    try {
      const user = await Database.prisma.deviceUser.findFirst({
        where: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          schoolId: data.schoolId
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'The information provided does not match our records.'
        };
      }

      return {
        success: true,
        userId: user.id,
        message: 'Identity verified successfully.'
      };
    } catch (error) {
      console.error('Error verifying personal information:', error);
      return {
        success: false,
        message: 'An error occurred while verifying your information.'
      };
    }
  });

  ipcMain.handle(IPCRoute.AUTH_VERIFY_USER, async (_, identifier: string) => {
    try {
      const isEmail = /\S+@\S+\.\S+/.test(identifier);

      const user = await Database.prisma.deviceUser.findFirst({
        where: isEmail ? { email: identifier } : { schoolId: identifier }
      });

      if (!user) {
        return {
          success: false,
          message: 'No user found with this credential.'
        };
      }

      // If user has no password, allow direct login
      if (!user.password || user.password === '') {
        return {
          success: true,
          message: 'User found successfully.',
          allowDirectLogin: true, // This will be included in the response type
          userId: user.id
        };
      }

      return {
        success: true,
        message: 'User found successfully.',
        allowDirectLogin: false
      };
    } catch (error) {
      console.error('Error verifying user:', error);
      return {
        success: false,
        message: 'An error occurred while verifying user.',
        allowDirectLogin: false
      };
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_LABORATORY_STATUS, async (_,) => {
    try {
      const deviceId = store.get('deviceId') as string;
      // Get the device to find its laboratory
      const device = await Database.prisma.device.findUnique({
        where: { id: deviceId },
        include: {
          lab: true
        }
      });

      if (!device || !device.lab) {
        throw new Error('Laboratory not found');
      }

      return {
        isRegistrationDisabled: device.lab.isRegistrationDisabled,
      };
    } catch (error) {
      console.error('Error getting laboratory status:', error);
      throw error;
    }
  });
}