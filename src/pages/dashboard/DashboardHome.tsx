import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Award, TrendingUp, FileText, Users, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Link } from 'react-router-dom';

export function DashboardHome() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState({
    courses: 0,
    events: 0,
    applications: 0,
    notifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingGroups, setPendingGroups] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchData = async () => {
      try {
        // Fetch user's courses
        const { data: courses } = await insforge.database
          .from('user_course_progress')
          .select('course_id')
          .eq('user_id', user.id);
        
        // Fetch upcoming events user registered for
        const now = new Date().toISOString();
        const { data: events } = await insforge.database
          .from('event_registrations')
          .select('event_id, events(*)')
          .eq('user_id', user.id)
          .gte('events.event_date', now);
        
        // Fetch applications
        const { data: applications } = await insforge.database
          .from('applications')
          .select('*')
          .eq('user_id', user.id);
        
        // Fetch unread notifications
        const { data: notifications } = await insforge.database
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('read', false);

        // Fetch pending groups created by user
        const { data: pendingGroupsData } = await insforge.database
          .from('groups')
          .select('*')
          .eq('created_by', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        setPendingGroups(pendingGroupsData || []);
        setStats({
          courses: courses?.length || 0,
          events: events?.length || 0,
          applications: applications?.length || 0,
          notifications: notifications?.length || 0
        });

        // Build recent activity from notifications (prioritize blog/news/announcement notifications)
        const { data: recentNotifs } = await insforge.database
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        // Sort to show blog/news/announcement notifications first
        const sortedNotifs = (recentNotifs || []).sort((a: any, b: any) => {
          const aIsBlog = a.type === 'blog' || a.title?.toLowerCase().includes('news') || a.title?.toLowerCase().includes('announcement');
          const bIsBlog = b.type === 'blog' || b.title?.toLowerCase().includes('news') || b.title?.toLowerCase().includes('announcement');
          if (aIsBlog && !bIsBlog) return -1;
          if (!aIsBlog && bIsBlog) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setRecentActivity(sortedNotifs.slice(0, 5).map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          date: new Date(n.created_at).toLocaleString(),
          link: n.link_url
        })));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isLoaded]);

  const statsData = [{
    icon: BookOpen,
    label: 'Active Courses',
    value: stats.courses.toString(),
    color: 'bg-blue-500'
  }, {
    icon: Calendar,
    label: 'Upcoming Events',
    value: stats.events.toString(),
    color: 'bg-green-500'
  }, {
    icon: FileText,
    label: 'Applications',
    value: stats.applications.toString(),
    color: 'bg-amber-500'
  }, {
    icon: Award,
    label: 'Notifications',
    value: stats.notifications.toString(),
    color: 'bg-purple-500'
  }];
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">
          Welcome Back, {user?.name || user?.email || 'User'}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your learning journey
        </p>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      ) : (
        <>
      {/* Pending Groups Alert */}
      {pendingGroups.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-card shadow-soft">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-amber-600 mr-3 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-2">Group Creation Status</h3>
              {pendingGroups.map((group) => (
                <div key={group.id} className="mb-3 last:mb-0">
                  <p className="text-amber-800 font-medium mb-1">
                    ✅ Your group "<strong>{group.name}</strong>" has successfully been created!
                  </p>
                  <p className="text-amber-700 text-sm">
                    It is currently waiting for admin approval. You will be notified once it's approved or rejected.
                  </p>
                  <Link to="/groups" className="text-amber-900 hover:underline text-sm font-medium mt-1 inline-block">
                    View your groups →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsData.map(stat => <div key={stat.label} className="bg-white p-6 rounded-card shadow-soft">
            <div className={`${stat.color} w-12 h-12 rounded-card flex items-center justify-center mb-4`}>
              <stat.icon className="text-white" size={24} />
            </div>
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-navy-ink">{stat.value}</p>
          </div>)}
      </div>
        </>
      )}
      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button href="/dashboard/courses" variant="primary" className="w-full">
            Continue Learning
          </Button>
          <Button href="/dashboard/events" variant="secondary" className="w-full">
            Browse Events
          </Button>
          <Button href="/dashboard/applications" variant="outline" className="w-full">
            View Applications
          </Button>
        </div>
      </div>
      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No recent activity</p>
        ) : (
        <div className="space-y-4">
          {recentActivity.map(activity => (
            <Link
              key={activity.id}
              to={activity.link || '#'}
              className="flex items-start space-x-4 p-4 bg-muted-gray rounded-card hover:bg-gray-200 transition-colors cursor-pointer block"
            >
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.type === 'blog' || activity.title?.toLowerCase().includes('news') || activity.title?.toLowerCase().includes('announcement')
                  ? 'bg-blue-500' 
                  : 'bg-gold'
              }`}></div>
              <div className="flex-1">
                <p className="font-medium text-navy-ink">{activity.title}</p>
                <p className="text-sm text-gray-600">{activity.date}</p>
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>
    </div>;
}