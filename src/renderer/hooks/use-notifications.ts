import { useState, useEffect } from 'react';
import { FileNotification, Notification, NotificationInput, QuizNotification } from '../types/notification';
import { useToast } from './use-toast';

export const useNotifications = (userId: string) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const convertToNotification = (dbNotification: any): Notification => {
    switch (dbNotification.type) {
      case 'file':
        return {
          id: dbNotification.id,
          type: 'file',
          title: dbNotification.title,
          message: dbNotification.message,
          time: new Date(dbNotification.time).toISOString(),
          read: dbNotification.read,
          category: dbNotification.category,
          priority: dbNotification.priority,
          icon: dbNotification.icon,
          sound: dbNotification.sound,
          count: dbNotification.count,
          status: dbNotification.status as FileNotification['status'],
          progress: dbNotification.progress,
          filePath: dbNotification.filePath,
          subjectName: dbNotification.subjectName,
          error: dbNotification.error,
          targetCount: dbNotification.targetCount
        };
      case 'quiz':
        return {
          id: dbNotification.id,
          type: 'quiz',
          title: dbNotification.title,
          message: dbNotification.message,
          time: new Date(dbNotification.time).toISOString(),
          read: dbNotification.read,
          category: dbNotification.category,
          priority: dbNotification.priority,
          icon: dbNotification.icon,
          sound: dbNotification.sound,
          count: dbNotification.count,
          quizId: dbNotification.quizId,
          status: dbNotification.status as QuizNotification['status'],
          score: dbNotification.score,
          totalPoints: dbNotification.totalPoints
        };
      case 'announcement':
        return {
          id: dbNotification.id,
          type: 'announcement',
          title: dbNotification.title,
          message: dbNotification.message,
          time: new Date(dbNotification.time).toISOString(),
          read: dbNotification.read,
          category: dbNotification.category,
          priority: dbNotification.priority,
          icon: dbNotification.icon,
          sound: dbNotification.sound,
          count: dbNotification.count,
          subjectName: dbNotification.subjectName,
          teacherName: dbNotification.teacherName
        };
      default:
        throw new Error(`Unknown notification type: ${dbNotification.type}`);
    }
  };

  const fetchNotifications = async () => {
    if (!userId) return;
    
    try {
      const data = await api.database.getNotifications(userId);
      const converted = data.map(convertToNotification);
      setNotifications(converted);
      setUnreadCount(converted.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const addNotification = async (notification: NotificationInput) => {
    try {
      if (!userId) {
        console.error('No user ID provided');
        return;
      }

      if (notification.sound) {
        const audio = new Audio("/assets/notification.mp3");
        audio.play().catch(console.error);
      }

      await api.database.addNotification(userId, notification);
      await fetchNotifications();
      
    } catch (error) {
      console.error('Error adding notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive'
      });
    }
  };

  const markAsRead = async (id: string | 'all') => {
    try {
      if (!userId) return;

      if (id === 'all') {
        // Mark all notifications as read
        await api.database.markAllNotificationsRead(userId);
      } else {
        // Mark single notification as read
        await api.database.markNotificationRead(id, userId);
      }

      // Update local state
      setNotifications(prev => 
        id === 'all'
          ? prev.map(n => ({ ...n, read: true }))
          : prev.map(n => n.id === id ? { ...n, read: true } : n)
      );

      // Update unread count
      setUnreadCount(prev => 
        id === 'all' ? 0 : Math.max(0, prev - 1)
      );

    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification',
        variant: 'destructive'
      });
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await api.database.removeNotification(id);

      // Update local state
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== id);
        return filtered;
      });

      // Update unread count if removed notification was unread
      setUnreadCount(prev => {
        const wasUnread = notifications.find(n => n.id === id)?.read === false;
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });

    } catch (error) {
      console.error('Error removing notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove notification',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    removeNotification,
  };
};