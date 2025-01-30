import { Bell, Check, Download, Trash2, X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { formatDistance } from 'date-fns';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Notification, FileNotification } from '../../types/notification';
import { useState } from 'react';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string | 'all') => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onOpenFile?: (path: string) => void;
  onClose: () => void;
}

export const NotificationPanel = ({
  notifications,
  onMarkAsRead,
  onRemove,
  onOpenFile,
  onClose
}: NotificationPanelProps) => {
  // Add loading state for mark all action
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Add handler for mark all
  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      await onMarkAsRead('all');
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };



  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.time).toLocaleDateString();
    acc[date] = acc[date] || [];
    acc[date].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const isFileNotification = notification.type === 'file';

    return (
      <div 
        className={`
          p-4 rounded-lg 
          ${!notification.read ? 'bg-blue-50/60' : 'bg-white'} 
          relative group
          border border-gray-100
          hover:border-gray-200
          transition-all
          shadow-sm
        `}
      >
        {/* Action buttons */}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-100"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Mark as read</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-100 text-red-500"
            onClick={() => onRemove(notification.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>

        {/* Content section */}
        <div className="pr-16"> {/* Added padding for action buttons */}
          <h4 className="font-medium text-sm text-gray-900">{notification.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          
          <div className="flex items-center space-x-2 mt-2">
            {notification.subjectName && (
              <Badge variant="secondary" className="text-xs">
                {notification.subjectName}
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              {formatDistance(new Date(notification.time), new Date(), { addSuffix: true })}
            </span>
          </div>

          {/* File-specific UI */}
          {isFileNotification && notification.status === 'downloading' && notification.progress && (
            <div className="mt-3">
              <Progress value={notification.progress} className="h-1.5" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Downloading...</span>
                <span>{notification.progress.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {isFileNotification && notification.filePath && notification.status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full text-xs"
              onClick={() => onOpenFile?.(notification.filePath)}
            >
              <Download className="h-3 w-3 mr-1" />
              Open File
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <div 
        className="fixed top-16 right-4 z-50 w-[400px] bg-white rounded-lg shadow-lg border overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 5rem)' }}
      >
        {/* Header remains fixed */}
        <div className="py-4 px-6 bg-gray-50/50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-500">Stay updated with your class activities</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content area with ScrollArea */}
        <div className="flex-1" style={{ height: 'calc(100vh - 13rem)' }}>
          <ScrollArea className="h-full">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Bell className="h-12 w-12 text-gray-200" />
                <p className="mt-2 text-gray-500 font-medium">No notifications yet</p>
                <p className="text-sm text-gray-400">New notifications will appear here</p>
              </div>
            ) : (
              <div className="p-4">
                {Object.entries(groupedNotifications).map(([date, items]) => (
                  <div key={date} className="mb-6 last:mb-0">
                    <h4 className="text-xs font-medium text-gray-500 mb-3 px-2">{date}</h4>
                    <div className="space-y-2">
                      {items.map(notification => (
                        <NotificationItem 
                          key={notification.id} 
                          notification={notification} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer stays at bottom */}
        {notifications.length > 0 && (
          <div className="p-3 bg-gray-50/50 border-t">
            <div className="flex justify-between items-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-xs hover:bg-blue-50"
              >
                {isMarkingAll ? (
                  <>
                    <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                    Marking...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Mark all as read
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => notifications.forEach(n => onRemove(n.id))}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
