import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Send, Users, Filter, X, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { sendEmailNotification } from '../../lib/email';
import { useForm } from 'react-hook-form';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  user_name?: string;
}

interface User {
  id: string;
  user_id: string;
  nickname: string | null;
  phone: string | null;
}

interface MessageFormData {
  recipientType: string;
  specificUsers: string[];
  courseId: string;
  eventId: string;
  subject: string;
  message: string;
}

export function CommunicationPage() {
  const [messageType, setMessageType] = useState<'email' | 'notification'>('email');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalNotifications: 0,
    unreadNotifications: 0,
    totalUsers: 0
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<MessageFormData>({
    defaultValues: {
      recipientType: 'all',
      specificUsers: [],
      subject: '',
      message: ''
    }
  });

  const recipientType = watch('recipientType');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch notifications
      const { data: notifs, error: notifError } = await insforge.database
        .from('notifications')
        .select(`
          *,
          users!notifications_user_id_fkey(nickname)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifError) console.error('Error fetching notifications:', notifError);

      const formattedNotifs = (notifs || []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        created_at: n.created_at,
        user_name: n.users?.nickname || 'Unknown'
      }));

      setNotifications(formattedNotifs);

      // Fetch users for recipient selection
      const { data: usersData, error: usersError } = await insforge.database
        .from('user_profiles')
        .select(`
          user_id,
          users!inner(id, nickname, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (usersError) console.error('Error fetching users:', usersError);

      const formattedUsers = (usersData || []).map((u: any) => ({
        id: u.user_id,
        user_id: u.user_id,
        nickname: u.users?.nickname || 'Unknown',
        phone: null // Phone is in user_profiles, not users
      }));

      // Get phone numbers
      const userIds = formattedUsers.map(u => u.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await insforge.database
          .from('user_profiles')
          .select('user_id, phone')
          .in('user_id', userIds);

        const phoneMap = new Map(profiles?.map((p: any) => [p.user_id, p.phone]) || []);
        formattedUsers.forEach(u => {
          u.phone = phoneMap.get(u.user_id) || null;
        });
      }

      setUsers(formattedUsers);

      // Fetch courses
      const { data: coursesData } = await insforge.database
        .from('courses')
        .select('id, title')
        .order('title');

      setCourses(coursesData || []);

      // Fetch events
      const { data: eventsData } = await insforge.database
        .from('events')
        .select('id, title, event_date')
        .gte('event_date', new Date().toISOString())
        .order('event_date');

      setEvents(eventsData || []);

      // Calculate stats
      const totalNotifs = formattedNotifs.length;
      const unreadNotifs = formattedNotifs.filter(n => !n.read).length;

      setStats({
        totalNotifications: totalNotifs,
        unreadNotifications: unreadNotifs,
        totalUsers: formattedUsers.length
      });
    } catch (err) {
      console.error('Error fetching communication data:', err);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: MessageFormData) => {
    setSending(true);
    setMessage(null);

    try {
      let recipientUserIds: string[] = [];

      // Determine recipients based on selection
      switch (data.recipientType) {
        case 'all':
          recipientUserIds = users.map(u => u.user_id);
          break;
        case 'specific':
          recipientUserIds = data.specificUsers;
          break;
        case 'course':
          // Get users enrolled in the course
          const { data: courseUsers } = await insforge.database
            .from('user_course_progress')
            .select('user_id')
            .eq('course_id', data.courseId);
          recipientUserIds = courseUsers?.map((u: any) => u.user_id) || [];
          break;
        case 'event':
          // Get users registered for the event
          const { data: eventUsers } = await insforge.database
            .from('event_registrations')
            .select('user_id')
            .eq('event_id', data.eventId);
          recipientUserIds = eventUsers?.map((u: any) => u.user_id) || [];
          break;
        case 'admins':
          const { data: adminUsers } = await insforge.database
            .from('user_profiles')
            .select('user_id')
            .in('role', ['admin', 'super_admin']);
          recipientUserIds = adminUsers?.map((u: any) => u.user_id) || [];
          break;
      }

      if (recipientUserIds.length === 0) {
        setMessage({ type: 'error', text: 'No recipients selected' });
        setSending(false);
        return;
      }

      // Create notifications for all recipients
      const notificationsToCreate = recipientUserIds.map(userId => ({
        user_id: userId,
        type: messageType === 'email' ? 'system' : 'system',
        title: data.subject || 'System Notification',
        message: data.message,
        read: false
      }));

      const { error: notifError } = await insforge.database
        .from('notifications')
        .insert(notificationsToCreate);

      if (notifError) throw notifError;

      // Send emails if email type
      if (messageType === 'email') {
        for (const userId of recipientUserIds) {
          try {
            await sendEmailNotification(userId, {
              type: 'system',
              subject: data.subject || 'Notification from CLM',
              message: data.message
            });
          } catch (emailErr) {
            console.warn(`Failed to send email to user ${userId}:`, emailErr);
            // Continue with other users
          }
        }
      }

      setMessage({
        type: 'success',
        text: `Successfully sent ${messageType === 'email' ? 'email' : 'notification'} to ${recipientUserIds.length} recipient(s)`
      });

      reset();
      fetchData(); // Refresh data
    } catch (err: any) {
      console.error('Error sending message:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to send message' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Communication Tools</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">
          Communication Tools
        </h1>
        <p className="text-gray-600">
          Send messages and notifications to users
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <Mail className="text-blue-500" size={32} />
          </div>
          <p className="text-gray-600 text-sm">Total Notifications</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.totalNotifications}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="text-green-500" size={32} />
          </div>
          <p className="text-gray-600 text-sm">Unread Notifications</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.unreadNotifications}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-purple-500" size={32} />
          </div>
          <p className="text-gray-600 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.totalUsers}</p>
        </div>
      </div>

      {/* Message Composer */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">
          Compose Message
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">
              Message Type
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setMessageType('email')}
                className={`flex-1 p-3 rounded-card border-2 transition-colors ${
                  messageType === 'email' ? 'border-gold bg-gold/10' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Mail className="mx-auto mb-2" size={24} />
                <span className="text-sm font-medium">Email & Notification</span>
              </button>
              <button
                type="button"
                onClick={() => setMessageType('notification')}
                className={`flex-1 p-3 rounded-card border-2 transition-colors ${
                  messageType === 'notification' ? 'border-gold bg-gold/10' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="mx-auto mb-2" size={24} />
                <span className="text-sm font-medium">Notification Only</span>
              </button>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">
              Recipients
            </label>
            <select
              {...register('recipientType', { required: 'Please select recipient type' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="all">All Users</option>
              <option value="admins">Admins Only</option>
              <option value="specific">Specific Users</option>
              <option value="course">Course Participants</option>
              <option value="event">Event Registrants</option>
            </select>
          </div>

          {/* Specific Users Selection */}
          {recipientType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Select Users
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-card p-2">
                {users.map(user => (
                  <label key={user.user_id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      value={user.user_id}
                      {...register('specificUsers')}
                      className="rounded"
                    />
                    <span className="text-sm">{user.nickname || 'Unknown User'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Course Selection */}
          {recipientType === 'course' && (
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Select Course
              </label>
              <select
                {...register('courseId', { required: recipientType === 'course' ? 'Please select a course' : false })}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">Select a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event Selection */}
          {recipientType === 'event' && (
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Select Event
              </label>
              <select
                {...register('eventId', { required: recipientType === 'event' ? 'Please select an event' : false })}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">Select an event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {new Date(event.event_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">
              Subject
            </label>
            <input
              type="text"
              {...register('subject', { required: 'Subject is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Enter message subject..."
            />
            {errors.subject && (
              <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">
              Message
            </label>
            <textarea
              rows={8}
              {...register('message', { required: 'Message is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Compose your message..."
            />
            {errors.message && (
              <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
            >
              Clear
            </Button>
            <Button type="submit" variant="primary" disabled={sending}>
              <Send size={20} className="mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy-ink">
            Recent Notifications
          </h2>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Refresh
          </Button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No notifications sent yet</p>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 bg-muted-gray rounded-card"
              >
                <div className="flex items-center space-x-4">
                  {notif.type === 'email' || notif.type === 'system' ? (
                    <Mail className="text-blue-500" size={24} />
                  ) : (
                    <MessageSquare className="text-green-500" size={24} />
                  )}
                  <div>
                    <p className="font-medium text-navy-ink">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      To: {notif.user_name} • {new Date(notif.created_at).toLocaleString()}
                      {notif.read && <span className="ml-2 text-green-600">✓ Read</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
