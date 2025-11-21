import React, { useEffect, useState } from 'react';
import { Users, FileText, BookOpen, Calendar, TrendingUp, Award, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { insforge } from '../../lib/insforge';

export function AdminDashboardHome() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApplications: 0,
    activeCourses: 0,
    upcomingEvents: 0,
    totalDonations: 0,
    totalPayments: 0
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all stats
        const [users, applications, courses, events, donations, payments] = await Promise.all([
          insforge.database.from('user_profiles').select('*', { count: 'exact' }),
          insforge.database.from('applications').select('*', { count: 'exact' }),
          insforge.database.from('courses').select('*', { count: 'exact' }),
          insforge.database.from('events').select('*', { count: 'exact' }).gte('event_date', new Date().toISOString()),
          insforge.database.from('donations').select('amount').eq('status', 'confirmed'),
          insforge.database.from('payments').select('amount').eq('status', 'confirmed')
        ]);

        const pendingApps = applications.data?.filter((a: any) => a.status === 'pending') || [];

        setStats({
          totalUsers: users.count || 0,
          pendingApplications: pendingApps.length,
          activeCourses: courses.count || 0,
          upcomingEvents: events.count || 0,
          totalDonations: donations.data?.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0) || 0,
          totalPayments: payments.data?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0
        });

        // Fetch recent applications
        const { data: recentApps } = await insforge.database
          .from('applications')
          .select('*, programs(title)')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentApplications(recentApps?.map((app: any) => ({
          id: app.id,
          name: app.full_name,
          program: app.programs?.title || app.program_type,
          date: new Date(app.created_at).toLocaleString(),
          status: app.status
        })) || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statsData = [{
    icon: Users,
    label: 'Total Users',
    value: stats.totalUsers.toString(),
    change: '',
    color: 'bg-blue-500'
  }, {
    icon: FileText,
    label: 'Pending Applications',
    value: stats.pendingApplications.toString(),
    change: '',
    color: 'bg-amber-500'
  }, {
    icon: BookOpen,
    label: 'Active Courses',
    value: stats.activeCourses.toString(),
    change: '',
    color: 'bg-green-500'
  }, {
    icon: Calendar,
    label: 'Upcoming Events',
    value: stats.upcomingEvents.toString(),
    change: '',
    color: 'bg-purple-500'
  }, {
    icon: DollarSign,
    label: 'Total Donations',
    value: `R${stats.totalDonations.toFixed(2)}`,
    change: '',
    color: 'bg-gold'
  }, {
    icon: TrendingUp,
    label: 'Total Payments',
    value: `R${stats.totalPayments.toFixed(2)}`,
    change: '',
    color: 'bg-pink-500'
  }];

  // Quick actions with dynamic data
  const quickActions = [{
    title: 'Review Applications',
    description: `${stats.pendingApplications} ${stats.pendingApplications === 1 ? 'application' : 'applications'} awaiting review`,
    link: '/admin/applications',
    color: 'bg-amber-500'
  }, {
    title: 'Manage Users',
    description: `${stats.totalUsers} ${stats.totalUsers === 1 ? 'user' : 'users'} registered`,
    link: '/admin/users',
    color: 'bg-blue-500'
  }, {
    title: 'Create Event',
    description: `${stats.upcomingEvents} ${stats.upcomingEvents === 1 ? 'event' : 'events'} scheduled`,
    link: '/admin/events',
    color: 'bg-green-500'
  }, {
    title: 'Issue Certificates',
    description: 'Generate and send certificates',
    link: '/admin/certificates',
    color: 'bg-gold'
  }];

  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Overview of system activity and key metrics
        </p>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsData.map(stat => <div key={stat.label} className="bg-white p-6 rounded-card shadow-soft">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.color} w-12 h-12 rounded-card flex items-center justify-center`}>
                    <stat.icon className="text-white" size={24} />
                  </div>
                  {stat.change && (
                    <span className="text-green-600 text-sm font-medium">
                      {stat.change}
                    </span>
                  )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(action => <Link key={action.title} to={action.link} className="p-4 border border-gray-200 rounded-card hover:shadow-md transition-shadow">
              <div className={`${action.color} w-10 h-10 rounded-card flex items-center justify-center mb-3`}>
                <span className="text-white text-xl">→</span>
              </div>
              <h3 className="font-bold text-navy-ink mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </Link>)}
        </div>
      </div>
      {/* Recent Applications */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy-ink">
            Recent Applications
          </h2>
          <Link to="/admin/applications" className="text-gold hover:underline text-sm font-medium">
            View All
          </Link>
        </div>
        {recentApplications.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No recent applications</p>
        ) : (
          <div className="space-y-3">
            {recentApplications.map(app => <div key={app.id} className="flex items-center justify-between p-4 bg-muted-gray rounded-card">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold">
                    {app.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-navy-ink">{app.name}</p>
                    <p className="text-sm text-gray-600">{app.program}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{app.date}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                    app.status === 'approved' ? 'bg-green-100 text-green-800' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {app.status}
                  </span>
                </div>
              </div>)}
          </div>
        )}
      </div>
    </div>;
}