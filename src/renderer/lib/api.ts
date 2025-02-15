import {
  ActiveDeviceUser,
  ActiveUserLogs,
  Device,
  DeviceUser,
  Labaratory,
  Quiz,
  QuizQuestion,
  QuizRecord,
  Subject,
  SubjectRecord,
} from '@prisma/client';
import { IPCRoute, LoginData } from '../../shared/constants';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import type AppInfo from 'package.json';
import { Notification as NotificationType } from '../types/notification';

export default {
  app: {
    info: () =>
      ipcRenderer.invoke(IPCRoute.APP_INFO) as Promise<typeof AppInfo>,
    setOpenAtLogin: (openAtLogin: boolean) => ipcRenderer.send(IPCRoute.APP_OPEN_AT_LOGIN, openAtLogin),
    update: () => ipcRenderer.send(IPCRoute.APP_UPDATE),
  },
  updater: {
    install: () => ipcRenderer.send(IPCRoute.UPDATER_INSTALL),
    on: (eventName: string, cb: () => void) => ipcRenderer.on(eventName, cb),
    start: () => ipcRenderer.send(IPCRoute.UPDATER_START),
  },
  window: {
    openExternalLink: (url: string) => ipcRenderer.send(IPCRoute.OPEN_EXTERNAL_LINK, url),
    close: (id: string) => ipcRenderer.send(IPCRoute.WINDOW_CLOSE, id),
    hide: (id: string) => ipcRenderer.send(IPCRoute.WINDOW_HIDE, id),
    open: (id: string) => ipcRenderer.send(IPCRoute.WINDOW_OPEN, id),

    send: <T = unknown>(id: string, data: T) =>
      ipcRenderer.send(IPCRoute.WINDOW_SEND, id, data),
    receive: <T = unknown>(
      channel: string,
      listener: (event: IpcRendererEvent, ...args: T[]) => void,
    ) => ipcRenderer.on(channel, listener),
    closeSetup: () => ipcRenderer.send(IPCRoute.WINDOW_CLOSE_SETUP),
    openSetup: (data: string) =>
      ipcRenderer.send(IPCRoute.WINDOW_OPEN_SETUP, data),
    openInTray: (id: string) =>
      ipcRenderer.send(IPCRoute.WINDOW_OPEN_IN_TRAY, id),
    // createTray: () => ipcRenderer.send(IPCRoute.WINDOW_CREATE_TRAY),
    // removeTray: () => ipcRenderer.send(IPCRoute.WINDOW_REMOVE_TRAY),
  },
  database: {
    connect: (url: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_CONNECT, url) as Promise<{
        success: boolean;
        error?: string;
      }>,
    disconnect: () => ipcRenderer.invoke(IPCRoute.DATABASE_DISCONNECT),
    verifyDevice: () => ipcRenderer.invoke(IPCRoute.DATABASE_VERIFY_DEVICE),
    registerDevice: (
      deviceName: string, 
      labSecretKey: string, 
      networkName: string,
      connectionMode: string,
      devicePurpose: string
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_REGISTER_DEVICE,
        deviceName,
        labSecretKey,
        networkName,
        connectionMode,
        devicePurpose,
      ) as Promise<Device>,
    getNetworkNames: () =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_NETWORK_NAMES) as Promise<
        Array<string>
      >,
    getLabs: () =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_LABS) as Promise<
        Array<Labaratory>
      >,
    getDevice: () =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_DEVICE) as Promise<Device>,
    getDeviceByMac: (macAddress: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_DEVICE_BY_MAC,
        macAddress,
      ) as Promise<Array<Device>>,
    getDeviceById: (id: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_DEVICE_BY_ID, id) as Promise<
        Array<Device>
      >,
    getDeviceUserById: (id: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_DEVICE_USER_BY_ID,
        id,
      ) as Promise<DeviceUser>,

    getActiveUserByDeviceId: (deviceId: string, labId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_ACTIVE_USER_BY_DEVICE_ID_AND_LAB_ID,
        deviceId,
        labId,
      ) as Promise<ActiveDeviceUser & { user: DeviceUser & { subjects: Subject[], ActiveUserLogs: ActiveUserLogs[] } | null } | null>,
    getActiveUserByUserId: (userId: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_ACTIVE_USER_BY_USER_ID, userId) as Promise<ActiveDeviceUser & { user: DeviceUser, device: Device } | null>,
    getDeviceUserByActiveUserId: (userId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_DEVICE_USER_BY_ACTIVE_USER_ID,
        userId,
      ) as Promise<Array<DeviceUser & { subjects: Subject[] }>>,
    getUserRecentLoginByUserId: (userId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_USER_RECENT_LOGIN_BY_USER_ID,
        userId,
      ) as Promise<Array<ActiveUserLogs>>,
    getAllDeviceUsersByLabId: (labId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_ALL_DEVICE_USERS_BY_LAB_ID,
        labId,
      ) as Promise<Array<DeviceUser>>,
    getAllActiveDeviceUsersByLabId: (labId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_ALL_ACTIVE_DEVICE_USERS_BY_LAB_ID,
        labId,
      ) as Promise<Array<ActiveDeviceUser>>,
    getSubjectsByLabId: (labId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_SUBJECTS_BY_LAB_ID,
        labId,
      ) as Promise<Array<Subject>>,
    getSubjectsByUserId: (userId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_SUBJECTS_BY_USER_ID,
        userId,
      ) as Promise<Array<Subject>>,
    getSubjectById: (subjectId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_SUBJECT_BY_ID,
        subjectId,
      ) as Promise<Array<Subject>>,
    userLogout: (userId: string) =>
      ipcRenderer.send(IPCRoute.DATABASE_USER_LOGOUT, userId),
    createSubject: (subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_CREATE_SUBJECT,
        subject,
      ) as Promise<Subject>,
    deleteSubject: (subjectId: string) =>
      ipcRenderer.send(IPCRoute.DATABASE_DELETE_SUBJECT, subjectId),
    getStudentSubjects: (studentId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_STUDENT_SUBJECTS,
        studentId,
      ) as Promise<
        Array<
          Subject & {
            quizzes: Quiz[];
            quizRecord: QuizRecord[];
          }
        >
      >,
    getSubjectData: (subjectId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_SUBJECT_DATA,
        subjectId,
      ) as Promise<
        Array<
          Subject & {
            quizzes: Array<Quiz & { questions: QuizQuestion[] }>;
            quizRecord: QuizRecord[];
          }
        >
      >,
    getSubjectRecordsBySubjectId: (subjectId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_SUBJECT_RECORDS_BY_SUBJECT_ID,
        subjectId,
      ) as Promise<Array<SubjectRecord>>,
    getActiveUsersBySubjectId: (subjectId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_ACTIVE_USERS_BY_SUBJECT_ID,
        subjectId,
      ) as Promise<Array<ActiveDeviceUser>>,
    getQuizzesByUserId: (userId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_QUIZZES_BY_USER_ID,
        userId,
      ) as Promise<
        Array<Quiz & { questions: Array<QuizQuestion>; subject: Subject }>
      >,
    getQuizById: (quizId: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_QUIZ_BY_ID, quizId) as Promise<
        Array<Quiz & { questions: Array<QuizQuestion> }>
      >,
    getQuizSubjectId: (subjectId: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_QUIZ_BY_SUBJECT_ID, subjectId) as Promise<
        Array<Quiz & { questions: Array<QuizQuestion> }>
      >,
    deleteQuiz: (quizId: string) =>
      ipcRenderer.send(IPCRoute.DATABASE_DELETE_QUIZ, quizId),
    createQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_CREATE_QUIZ, quiz) as Promise<Quiz>,
    updateQuiz: (
      quizId: string,
      quiz: Partial<Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>>,
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_UPDATE_QUIZ,
        quizId,
        quiz,
      ) as Promise<Quiz | Quiz[]>,
    createQuizQuestionByQuizId: (
      quizId: string,
      question: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>,
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_CREATE_QUIZ_QUESTION,
        quizId,
        question,
      ) as Promise<Partial<QuizQuestion>>,
    updateQuizQuestion: (
      questionId: string,
      question: Partial<Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>>,
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_UPDATE_QUIZ_QUESTION,
        questionId,
        question,
      ) as Promise<Partial<QuizQuestion>>,
    deleteQuizQuestion: (questionId: string) =>
      ipcRenderer.send(IPCRoute.DATABASE_DELETE_QUIZ_QUESTION, questionId),
    joinSubject: (subjectCode: string, studentId: string, labId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_JOIN_SUBJECT,
        subjectCode,
        studentId,
        labId,
      ) as Promise<{ success: boolean; message: string, subjectId: string }>,
    leaveSubject: (subjectId: string, studentId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_LEAVE_SUBJECT,
        subjectId,
        studentId,
      ) as Promise<{ success: boolean; message: string }>,
    publishQuiz: (quizId: string) =>
      ipcRenderer.send(IPCRoute.DATABASE_PUBLISH_QUIZ, quizId),
    saveQuizRecord: (
      quizRecord: Omit<QuizRecord, 'id' | 'createdAt' | 'updatedAt'>,
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_SAVE_QUIZ_RECORD,
        quizRecord,
      ) as Promise<QuizRecord>,
    importQuestions: {
      fromGoogleForms: (file: File) =>
        ipcRenderer.invoke(
          IPCRoute.DATABASE_IMPORT_GOOGLE_FORMS,
          file,
        ) as Promise<QuizQuestion[]>,
      fromSpreadsheet: (file: File) =>
        ipcRenderer.invoke(
          IPCRoute.DATABASE_IMPORT_SPREADSHEET,
          file,
        ) as Promise<QuizQuestion[]>,
    },
    addQuestionsToQuiz: (quizId: string, questions: QuizQuestion[]) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_ADD_QUESTIONS_TO_QUIZ,
        quizId,
        questions,
      ) as Promise<Quiz & { questions: QuizQuestion[] }>,
    updateQuizQuestionsOrder: (
      quizId: string,
      questions: Array<{ id: string; order: number }>,
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_UPDATE_QUIZ_QUESTIONS_ORDER,
        quizId,
        questions,
      ) as Promise<Quiz & { questions: QuizQuestion[] }>,
    updateQuizQuestionsBulk: (
      quizId: string,
      questions: Array<Partial<QuizQuestion>>,
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_UPDATE_QUIZ_QUESTIONS_BULK,
        quizId,
        questions,
      ) as Promise<Quiz & { questions: QuizQuestion[] }>,
    getQuizRecordsByUserAndSubject: (userId: string, subjectId: string) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_GET_QUIZ_RECORDS_BY_USER_AND_SUBJECT,
        userId,
        subjectId,
      ) as Promise<
        Array<
          QuizRecord & {
            quiz: Quiz & {
              questions: QuizQuestion[];
            };
          }
        >
      >,
    getNotifications: (userId: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_GET_NOTIFICATIONS, userId) as Promise<NotificationType[]>,

    addNotification: (userId: string, notification: Omit<NotificationType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_ADD_NOTIFICATION, userId, notification) as Promise<NotificationType>,

    markNotificationRead: (id: string | 'all', userId: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_MARK_NOTIFICATION_READ, id, userId) as Promise<{
        success: boolean;
        notification?: NotificationType;
        count?: number;
        error?: string;
      }>,

    removeNotification: (id: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_REMOVE_NOTIFICATION, id) as Promise<{
        success: boolean;
        notification?: NotificationType;
        error?: string;
      }>,

    clearNotifications: (userId: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_CLEAR_NOTIFICATIONS, userId) as Promise<{
        count: number;
      }>,

    markAllNotificationsRead: (userId: string) =>
      ipcRenderer.invoke(IPCRoute.DATABASE_MARK_ALL_NOTIFICATIONS_READ, userId) as Promise<{
        success: boolean;
        count: number;
        error?: string;
      }>,
    updateUser: ({ userId, email, contactNo, password, emailVerified }: {
      userId: string;
      email?: string;
      contactNo?: string;
      password?: string;
      emailVerified?: Date;  // Add this line
    }) => ipcRenderer.invoke(
      IPCRoute.DATABASE_UPDATE_USER,
      { userId, email, contactNo, password, emailVerified }
    ) as Promise<{ success: boolean; message: string }>,
    verifyUser: (identifier: string) =>
      ipcRenderer.invoke(IPCRoute.AUTH_VERIFY_USER, identifier) as Promise<{
        success: boolean;
        message: string;
        allowDirectLogin?: boolean;
        userId?: string;
      }>,
    getLaboratoryStatus: async () => {
      return ipcRenderer.invoke(IPCRoute.DATABASE_GET_LABORATORY_STATUS) as Promise<{
        isRegistrationDisabled: boolean;
      }>;
    },
    updateDevice: (
      deviceId: string,
      deviceName: string,
      labSecretKey: string,
      networkName: string,
      connectionMode: string,
      devicePurpose: string
    ) =>
      ipcRenderer.invoke(
        IPCRoute.DATABASE_UPDATE_DEVICE,
        deviceId,
        deviceName,
        labSecretKey,
        networkName,
        connectionMode,
        devicePurpose,
      ) as Promise<Device>,
  },
  device: {
    init: () => ipcRenderer.send(IPCRoute.DEVICE_INITIATED),
    startMonitoring: (userId: string, deviceId: string, labId: string) =>
      ipcRenderer.send(
        IPCRoute.DEVICE_START_MONITORING,
        userId,
        deviceId,
        labId,
      ),
    stopMonitoring: () => ipcRenderer.send(IPCRoute.DEVICE_STOP_MONITORING),
  },
  quiz: {
    play: (quizId: string) => ipcRenderer.send(IPCRoute.QUIZ_PLAY, quizId),
    getQuizId: (callback: (event: IpcRendererEvent, quizId: string) => void) =>
      ipcRenderer.on(IPCRoute.QUIZ_GET_QUIZ_ID, callback),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke(IPCRoute.STORE_GET, key),
    set: (key: string, value: any) =>
      ipcRenderer.invoke(IPCRoute.STORE_SET, key, value),
    delete: (key: string) => ipcRenderer.invoke(IPCRoute.STORE_DELETE, key),
    clear: () => ipcRenderer.invoke(IPCRoute.STORE_CLEAR),
    has: (key: string) => ipcRenderer.invoke(IPCRoute.STORE_HAS, key),
  },
  socket: {
    test: (url: string) =>
      ipcRenderer.invoke(IPCRoute.TEST_SOCKET_URL, url) as Promise<boolean>,
    initialize: () =>
      ipcRenderer.invoke(IPCRoute.INITIALIZE_SOCKET) as Promise<string>,
    connectionStatus: (callback: (status: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: string) =>
        callback(status);
      ipcRenderer.on(IPCRoute.CONNECTION_STATUS_UPDATE, listener);
      return () => {
        ipcRenderer.removeListener(IPCRoute.CONNECTION_STATUS_UPDATE, listener);
      };
    },
  },
  auth: {
    register: (data: {
      deviceId: string;
      firstName: string;
      lastName: string;
      schoolId: string;
      course: string;
      yearLevel: string;
      role: string;
    }) =>
      ipcRenderer.invoke(IPCRoute.AUTH_REGISTER, data) as Promise<{
        success: boolean;
        message: string;
      }>,
    login: (data: LoginData) =>
      ipcRenderer.invoke(IPCRoute.AUTH_LOGIN, data) as Promise<{
        success: boolean;
        message: string;
      }>,

    sendOtp: async (email: string) => {
      const response = (await ipcRenderer.invoke(IPCRoute.SEND_OTP, email)) as {
        success: boolean;
        message?: string;
      };
      if (!response.success) {
        // Handle the error appropriately in your UI, e.g., show a toast notification
        console.error('Failed to send OTP:', response.message);
      }
      return response;
    },
    verifyOtpAndResetPassword: (payload: {
      userId: string;
      email: string;
      otp: string;
      newPassword: string;
    }) =>
      ipcRenderer.invoke(
        IPCRoute.VERIFY_OTP_AND_RESET_PASSWORD,
        payload,
      ) as Promise<{ success: boolean; message?: string }>,
    verifyOtp: (payload: { 
      userId: string; 
      email: string; 
      otp: string;
      skipVerification?: boolean  // Add skipVerification flag
    }) =>
      ipcRenderer.invoke('VERIFY_OTP', payload) as Promise<{
        success: boolean;
        message?: string;
      }>,
    verifyUserEmail: (email: string) =>
      ipcRenderer.invoke(IPCRoute.VERIFY_USER_EMAIL, email) as Promise<{
        success: boolean;
        message?: string;
        userId?: string;
      }>,
    verifyPersonalInfo: (data: {
      email: string;
      firstName: string;
      lastName: string;
      schoolId: string;
    }) => 
      ipcRenderer.invoke(IPCRoute.VERIFY_PERSONAL_INFO, data) as Promise<{
        success: boolean;
        message?: string;
        userId?: string;
      }>,
    verifyUser: (identifier: string) =>
      ipcRenderer.invoke(IPCRoute.AUTH_VERIFY_USER, identifier) as Promise<{
        success: boolean;
        message: string;
        allowDirectLogin?: boolean;
      }>,
  },
  screen: {
    getScreenSourceId: () => ipcRenderer.invoke(IPCRoute.SCREEN_ID) as Promise<string>,
    stopScreenShare: () => ipcRenderer.send(IPCRoute.SCREEN_SHARE_STOP),
  },
  files: {
    getDownloads: () =>
      ipcRenderer.invoke(IPCRoute.GET_DOWNLOADS) as Promise<{
        files: { name: string; path: string; subjectName: string; date: string }[];
        subjects: string[];
        isEmpty: boolean;
        error?: string;
      }>,
    openDownloadsFolder: () =>
      ipcRenderer.invoke(IPCRoute.OPEN_DOWNLOADS_FOLDER),
    openFile: (filePath: string) =>
      ipcRenderer.invoke(IPCRoute.OPEN_FILE, filePath),
  },
};

