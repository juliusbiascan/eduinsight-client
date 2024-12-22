import { ipcMain } from 'electron';
import { IPCRoute } from '@/shared/constants';
import { machineIdSync } from 'node-machine-id';
import { getIPAddress, getNetworkNames } from '../lib/ipaddress';
import { v4 as uuidv4 } from 'uuid';
import { DeviceUserRole, Quiz, QuizQuestion, QuizRecord, State, Subject } from '@prisma/client';
import { sleep } from '@/shared/utils';
import { getSocketInstance } from '../lib/socket-manager';
import { Database } from '../lib';
import StoreManager from '@/main/lib/store';
import fs from 'fs';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { hash, compare } from 'bcryptjs';
import { startMonitoring, stopPowerMonitoring } from '../lib/monitoring';

const store = StoreManager.getInstance();

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
    sleep(2000).then(() => Database.prisma.$disconnect())
  );

  ipcMain.on(IPCRoute.DATABASE_CHECK_CONNECTION, (_e, serverAddress: string) => {
    console.log("connection", serverAddress)
  });


  ipcMain.handle(IPCRoute.DATABASE_VERIFY_DEVICE, async (_) => {
    const deviceId = store.get('deviceId') as string;

    if (!deviceId) {
      return Promise.reject('Device not found');
    }

    const device = await Database.prisma.device.findFirst({ where: { id: deviceId } });

    if (device) {
      return Promise.resolve(device);
    } else {
      return Promise.reject('Device not found');
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_REGISTER_DEVICE, async (_e, deviceName: string, labId: string, networkName: string) => {
    try {
      const ipAddress = getIPAddress()
      const macAddress = machineIdSync(true);

      const existingDevice = await Database.prisma.device.findFirst({ where: { devMACaddress: macAddress } });
      if (existingDevice) {
        await Database.prisma.device.delete({ where: { id: existingDevice.id } })
      }

      const device = await Database.prisma.device.create({
        data: {
          name: deviceName,
          devId: uuidv4(),
          devHostname: ipAddress[networkName][0],
          devMACaddress: macAddress,
          isArchived: false,
          labId: labId
        }
      })

      store.set('deviceId', device.id);
      store.set('labId', device.labId);

      store.delete('userId');
      //reconnectSocket();
      return device;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_LABS, () => {
    try {
      const labs = Database.prisma.labaratory.findMany()
      return Promise.resolve(labs);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_NETWORK_NAMES, () =>
    getNetworkNames()
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE, () =>
    Database.prisma.device.findMany({ where: { devMACaddress: machineIdSync(true) } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE_BY_MAC, (_e, devMACaddress: string) =>
    Database.prisma.device.findMany({ where: { devMACaddress } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE_BY_ID, (_e, id: string) =>
    Database.prisma.device.findMany({ where: { id } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_ACTIVE_USER_BY_DEVICE_ID_AND_LAB_ID, (_e, deviceId: string, labId: string) =>
    Database.prisma.activeDeviceUser.findMany({ where: { deviceId, labId } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE_USER_BY_ID, (_e, id: string) =>
    Database.prisma.deviceUser.findFirst({ where: { id } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_DEVICE_USER_BY_ACTIVE_USER_ID, (_e, userId: string) =>
    Database.prisma.deviceUser.findMany({ where: { id: userId }, include: { subjects: true } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_ALL_DEVICE_USERS_BY_LAB_ID, (_e, labId: string) =>
    Database.prisma.deviceUser.findMany({ where: { labId } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_ALL_ACTIVE_DEVICE_USERS_BY_LAB_ID, (_e, labId: string) =>
    Database.prisma.activeDeviceUser.findMany({ where: { labId } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_SUBJECTS_BY_LAB_ID, (_e, labId: string) =>
    Database.prisma.subject.findMany({ where: { labId } })
  );

  ipcMain.handle(IPCRoute.DATABASE_GET_SUBJECTS_BY_USER_ID, (_e, userId: string) => {
    Database.prisma.subject.findMany({ where: { userId } });
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_USER_RECENT_LOGIN_BY_USER_ID, (_e, userId: string) =>
    Database.prisma.activeUserLogs.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  );

  ipcMain.handle(IPCRoute.DATABASE_CREATE_SUBJECT, async (_e, subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await Database.prisma.subject.create({
      data: subject
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_SUBJECT_DATA, async (_e, subjectId: string) => {
    try {
      const subject = await Database.prisma.subject.findFirst({
        where: { id: subjectId },
        include: {
          quizzes: {
            include: {
              questions: true
            }
          },
          activities: {
            where: {
              published: true
            }
          },
          quizRecord: true,
          activityRecord: true
        }
      });
      return subject ? [subject] : [];
    } catch (error) {
      console.error('Error fetching subject data:', error);
      return [];
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_SUBJECT_RECORDS_BY_SUBJECT_ID, async (_e, subjectId: string) => {
    return await Database.prisma.subjectRecord.findMany({ where: { subjectId } });
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_ACTIVE_USERS_BY_SUBJECT_ID, async (_e, subjectId: string) => {
    const subjectRecords = await Database.prisma.subjectRecord.findMany({ where: { subjectId } });
    return await Database.prisma.activeDeviceUser.findMany({ where: { userId: { in: subjectRecords.map(record => record.userId) } } });
  });



  ipcMain.on(IPCRoute.DATABASE_DELETE_SUBJECT, async (_e, subjectId: string) => {
    await Database.prisma.subject.delete({
      where: { id: subjectId }
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_STUDENT_SUBJECTS, async (_e, studentId: string) => {
    const subjectRecords = await Database.prisma.subjectRecord.findMany({ where: { userId: studentId } });
    const subjects = await Database.prisma.subject.findMany({
      where: { id: { in: subjectRecords.map(record => record.subjectId) } },
      include: {
        quizzes: true,
        activities: true,
        quizRecord: true,
        activityRecord: true
      }
    });
    return subjects;
  });


  ipcMain.handle(IPCRoute.DATABASE_JOIN_SUBJECT, async (_e, subjectCode: string, studentId: string, labId: string) => {
    const subject = await Database.prisma.subject.findFirst({ where: { subjectCode } });
    if (!subject) {
      return { success: false, message: 'Subject not found' };
    }
    try {
      await Database.prisma.subjectRecord.create({
        data: {
          subjectId: subject.id,
          userId: studentId,
          labId: labId
        }
      });
      return { success: true, message: 'Subject joined successfully' };
    } catch (error) {
      console.error('Error joining subject:', error);
      return { success: false, message: 'Failed to join subject' };
    }
  });


  ipcMain.handle(IPCRoute.DATABASE_LEAVE_SUBJECT, async (_e, subjectId: string, studentId: string) => {
    try {
      await Database.prisma.subjectRecord.deleteMany({
        where: {
          subjectId: subjectId,
          userId: studentId
        }
      });
      return { success: true, message: 'Subject left successfully' };
    } catch (error) {
      console.error('Error leaving subject:', error);
      return { success: false, message: 'Failed to leave subject' };
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_QUIZZES_BY_USER_ID, async (_e, userId: string) => {
    return await Database.prisma.quiz.findMany({
      where: { userId },
      include: {
        questions: true,
        subject: true
      }
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_QUIZ_BY_ID, async (_e, quizId: string) => {
    return await Database.prisma.quiz.findMany({
      where: { id: quizId },
      include: { questions: true }
    });
  });

  ipcMain.on(IPCRoute.DATABASE_DELETE_QUIZ, async (_e, quizId: string) => {
    await Database.prisma.quiz.delete({
      where: { id: quizId },
      include: { questions: true }
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_CREATE_QUIZ, async (_e, quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await Database.prisma.quiz.create({
      data: quiz
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_UPDATE_QUIZ, async (_e, quizId: string, quiz: Partial<Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>>) => {
    return await Database.prisma.quiz.update({
      where: { id: quizId },
      data: quiz
    });
  });

  ipcMain.on(IPCRoute.DATABASE_PUBLISH_QUIZ, async (_e, quizId: string) => {
    await Database.prisma.quiz.update({
      where: { id: quizId },
      data: { published: true }
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_CREATE_QUIZ_QUESTION, async (_e, quizId: string, question: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Get all questions for this quiz
      const allQuestions = await Database.prisma.quizQuestion.findMany({
        where: { quizId },
        orderBy: { order: 'asc' },
      });

      // Calculate the new order (max order + 1, or 0 if no questions exist)
      const nextOrder = allQuestions.length > 0 
        ? Math.max(...allQuestions.map(q => q.order)) + 1 
        : 0;

      // Create the new question with proper order
      const createdQuestion = await Database.prisma.quizQuestion.create({
        data: {
          ...question,
          quizId,
          order: nextOrder,
        }
      });

      return createdQuestion;
    } catch (error) {
      console.error('Error creating quiz question:', error);
      throw error;
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_UPDATE_QUIZ_QUESTION, async (_e, questionId: string, question: Partial<Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>>) => {
    return await Database.prisma.quizQuestion.update({
      where: { id: questionId },
      data: question
    });
  });


  ipcMain.on(IPCRoute.DATABASE_DELETE_QUIZ_QUESTION, async (_e, questionId: string) => {
    await Database.prisma.quizQuestion.delete({
      where: { id: questionId }
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_SAVE_QUIZ_RECORD, async (_e, quizRecord: Omit<QuizRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await Database.prisma.quizRecord.create({
      data: quizRecord
    });
  });

  ipcMain.handle(IPCRoute.DATABASE_IMPORT_GOOGLE_FORMS, async (_e, file: Electron.FilePathWithHeaders) => {
    try {
      const fileContent = fs.readFileSync(file.path, 'utf8');
      const jsonData = JSON.parse(fileContent);

      // Parse Google Forms JSON and convert to QuizQuestion format
      const questions: Omit<QuizQuestion, 'id' | 'quizId' | 'createdAt' | 'updatedAt'>[] = jsonData.items.map((item: any) => ({
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
  });

  ipcMain.handle(IPCRoute.DATABASE_IMPORT_SPREADSHEET, async (_e, file: Electron.FilePathWithHeaders) => {
    try {
      const questions: Omit<QuizQuestion, 'id' | 'quizId' | 'createdAt' | 'updatedAt'>[] = [];

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

        questions.push(...data.map((row: any) => ({
          question: row.question,
          type: row.type,
          order: parseInt(row.order) || 0,
          options: JSON.parse(row.options),
          time: parseInt(row.time) || 60,
          points: parseInt(row.points) || 1,
        })));
      }

      return questions;
    } catch (error) {
      console.error('Error importing from Spreadsheet:', error);
      throw error;
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_ADD_QUESTIONS_TO_QUIZ, async (_e, quizId: string, questions: Omit<QuizQuestion, 'id' | 'quizId' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      const updatedQuiz = await Database.prisma.quiz.update({
        where: { id: quizId },
        data: {
          questions: {
            create: questions.map(q => ({
              question: q.question,
              type: q.type,
              options: q.options,
              time: q.time,
              points: q.points,
            }))
          }
        },
        include: { questions: true }
      });

      return updatedQuiz;
    } catch (error) {
      console.error('Error adding questions to quiz:', error);
      throw error;
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_UPDATE_QUIZ_QUESTIONS_ORDER, async (_e, quizId: string, updatedQuestions: Array<{id: string, order: number}>) => {
    try {
      // Start a transaction
      const result = await Database.prisma.$transaction(async (prisma) => {
        // Update each question's order
        for (const question of updatedQuestions) {
          await prisma.quizQuestion.update({
            where: { id: question.id },
            data: { order: question.order }
          });
        }

        // Fetch and return the updated quiz with ordered questions
        return await prisma.quiz.findFirst({
          where: { id: quizId },
          include: {
            questions: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        });
      });

      return result;
    } catch (error) {
      console.error('Error updating question order:', error);
      throw error;
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_QUIZ_RECORDS_BY_USER_AND_SUBJECT, async (_e, userId: string, subjectId: string) => {
    try {
      return await Database.prisma.quizRecord.findMany({
        where: { 
          userId,
          subjectId
        },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: {
                  order: 'asc'
                }
              }
            }
          }
        },
        orderBy: {
          completedAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error fetching quiz records:', error);
      return [];
    }
  });

  ipcMain.handle(IPCRoute.DATABASE_GET_ACTIVITY_RECORDS_BY_USER_AND_SUBJECT, async (_e, userId: string, subjectId: string) => {
    try {
      return await Database.prisma.activityRecord.findMany({
        where: {
          userId,
          subjectId
        },
        include: {
          activity: true
        },
        orderBy: {
          completedAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error fetching activity records:', error);
      return [];
    }
  });

  ipcMain.handle(IPCRoute.AUTH_REGISTER, async (_, data) => {
    try {
      const device = await Database.prisma.device.findFirst({where: {id: data.deviceId}});
      
      const existingUser = await Database.prisma.deviceUser.findFirst({
        where: { email: data.email }
      });

      if (existingUser) {
        return { success: false, message: 'Email already exists' };
      }

      const hashedPassword = await hash(data.password, 10);

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
          email: data.email,
          contactNo: data.contactNo,
          password: hashedPassword
        }
      });

      return { success: true, message: 'Registration successful' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  });

  ipcMain.handle(IPCRoute.AUTH_LOGIN, async (_, data) => {
    try {
      const user = await Database.prisma.deviceUser.findFirst({
        where: {
          email: data.email,
        }
      });

      if (!user) {
        return { success: false, message: 'User not found!' };
      }

      const passwordMatch = await compare(data.password, user.password);
      if (!passwordMatch) {
        return { success: false, message: 'Invalid credentials' };
      }

      const device = await Database.prisma.device.findUnique({
        where: { id: data.deviceId }
      });
  
      if (!device) {
        return { success: false, message: 'Device not found.' };
      }

      if (device.isUsed) {
        return { success: false, message: 'Device already inused.' };
      }
  
      await Database.prisma.$transaction([
        Database.prisma.activeDeviceUser.create({
          data: {
            labId: device.labId,
            deviceId: device.id,
            userId: user.id,
            state: State.ACTIVE
          },
        }),
        Database.prisma.device.update({
          where: { id: data.deviceId },
          data: { isUsed: true }
        }),
        Database.prisma.activeUserLogs.create({
          data: {
            labId: device.labId,
            deviceId: device.id,
            userId: user.id,
          }
        })
      ]);
      store.set('userId', user.id);
      startMonitoring(device.id, user.id, device.labId);
      return { success: true, message: 'Login successful' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  });

  ipcMain.on(IPCRoute.DATABASE_USER_LOGOUT, async (_e, userId: string, deviceId: string) => {
    await Database.prisma.activeDeviceUser.deleteMany({
      where: {
        deviceId,
        userId
      }
    });

    await Database.prisma.device.update({ where: { id: deviceId }, data: { isUsed: false } })

    stopPowerMonitoring();
    // Get the socket instance
    const socket = getSocketInstance();

    // Emit the logout event to the server
    if (socket && socket.connected) {
      socket.emit('logout-user', deviceId);
    }
  })
}
