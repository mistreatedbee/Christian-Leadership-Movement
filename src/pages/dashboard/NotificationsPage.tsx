import React, { useEffect, useState } from 'react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  related_id: string | null;
}

export function NotificationsPage() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    fetchNotifications();
  }, [user, isLoaded]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await insforge.database
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await insforge.database
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await insforge.database
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await insforge.database
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isLoaded || !user) {
    return <div className="text-center py-12">Please log in to view notifications.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">
            Notifications
          </h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`bg-white p-6 rounded-card shadow-soft border-l-4 ${
                notification.read
                  ? 'border-gray-300'
                  : notification.type === 'application'
                  ? 'border-blue-500'
                  : notification.type === 'payment'
                  ? 'border-green-500'
                  : notification.type === 'event'
                  ? 'border-purple-500'
                  : 'border-gold'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-bold text-navy-ink">{notification.title}</h3>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{notification.message}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                      title="Mark as read"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-card"
                    title="Delete"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

