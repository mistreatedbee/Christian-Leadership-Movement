import React, { useEffect, useState } from 'react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Bell, Check, X, BookOpen, Calendar, MessageSquare, FileText, Users, Award, AlertCircle, Megaphone, Newspaper } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  related_id: string | null;
  link_url: string | null;
}

export function NotificationsPage() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');


  const fetchNotifications = async () => {
    try {
      let query = insforge.database
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isLoaded) {
      fetchNotifications();
    }
  }, [user, isLoaded, filterType]);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'blog':
      case 'announcement':
        return <Megaphone className="w-5 h-5" />;
      case 'news':
        return <Newspaper className="w-5 h-5" />;
      case 'event':
        return <Calendar className="w-5 h-5" />;
      case 'course':
      case 'system':
        return <BookOpen className="w-5 h-5" />;
      case 'group':
        return <Users className="w-5 h-5" />;
      case 'application':
        return <FileText className="w-5 h-5" />;
      case 'payment':
        return <Award className="w-5 h-5" />;
      case 'certificate':
        return <Award className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'blog':
      case 'announcement':
        return 'border-blue-500 bg-blue-50';
      case 'news':
        return 'border-green-500 bg-green-50';
      case 'event':
        return 'border-purple-500 bg-purple-50';
      case 'course':
        return 'border-amber-500 bg-amber-50';
      case 'group':
        return 'border-indigo-500 bg-indigo-50';
      case 'application':
        return 'border-blue-500 bg-blue-50';
      case 'payment':
        return 'border-green-500 bg-green-50';
      case 'certificate':
        return 'border-gold bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filterType);

  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)));

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

      {/* Filter Tabs */}
      {notificationTypes.length > 0 && (
        <div className="bg-white p-4 rounded-card shadow-soft">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-gold text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            {notificationTypes.map(type => {
              const count = notifications.filter(n => n.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    filterType === type
                      ? 'bg-gold text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'blog' ? 'Blog/News' : type === 'group' ? 'Groups' : type} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">
            {filterType === 'all' ? 'No notifications yet' : `No ${filterType} notifications`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map(notification => {
            const NotificationContent = notification.link_url ? Link : 'div';
            const linkProps = notification.link_url ? { to: notification.link_url } : {};
            
            return (
              <NotificationContent
                key={notification.id}
                {...linkProps}
                className={`block bg-white p-6 rounded-card shadow-soft border-l-4 transition-all hover:shadow-lg ${
                  notification.read
                    ? `border-gray-300 ${getNotificationColor(notification.type).split(' ')[1]}`
                    : getNotificationColor(notification.type)
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      notification.read ? 'bg-gray-200 text-gray-600' : 'bg-white text-blue-600'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`font-bold ${notification.read ? 'text-gray-700' : 'text-navy-ink'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                          notification.read 
                            ? 'bg-gray-200 text-gray-600' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {notification.type === 'blog' ? 'Blog/News' : notification.type}
                        </span>
                      </div>
                      <p className={`mb-2 ${notification.read ? 'text-gray-600' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-card transition-colors"
                        title="Mark as read"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-card transition-colors"
                      title="Delete"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </NotificationContent>
            );
          })}
        </div>
      )}
    </div>
  );
}

