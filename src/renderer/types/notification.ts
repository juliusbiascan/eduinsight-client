export type NotificationType = 'file' | 'quiz' | 'announcement' | 'alert' | 'warning';

export interface BaseNotification {
  id?: string;  // Make id optional since it might be generated later
  userId?: string;  // Make userId optional as it might be added later
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  icon?: string;
  sound?: boolean;
  count?: number;
  subjectName?: string;
}

export interface FileNotification extends BaseNotification {
  type: 'file';
  status: 'pending' | 'downloading' | 'uploading' | 'completed' | 'error';
  progress?: number;
  filePath?: string;
  error?: string;
  targetCount?: number;
}

export interface QuizNotification extends BaseNotification {
  type: 'quiz';
  quizId: string;
  status: 'pending' | 'started' | 'completed';
  score?: number;
  totalPoints?: number;
}

export interface AnnouncementNotification extends BaseNotification {
  type: 'announcement';
  teacherName: string;
}

export type Notification = FileNotification | QuizNotification | AnnouncementNotification;

export type NotificationInput =
  | Omit<FileNotification, 'id' | 'userId'>
  | Omit<QuizNotification, 'id' | 'userId'>
  | Omit<AnnouncementNotification, 'id' | 'userId'>;
