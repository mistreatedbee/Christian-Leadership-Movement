import React, { useEffect, useState } from 'react';
import { Users, FileText, BookOpen, Calendar, TrendingUp, Award, DollarSign, Bell, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

export function AdminDashboardHome() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApplications: 0,
    activeCourses: 0,
    upcomingEvents: 0,
    totalDonations: 0,
    totalPayments: 0,
    bibleSchoolApplications: 0,
    membershipApplications: 0,
    pendingMentors: 0,
    pendingPrayerRequests: 0
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all stats
        const [
          users, 
          applications, 
          courses, 
          events, 
          donations, 
          payments,
          mentors,
          prayerRequests
        ] = await Promise.all([
          insforge.database.from('user_profiles').select('*', { count: 'exact' }),
          insforge.database.from('applications').select('*', { count: 'exact' }),
          insforge.database.from('courses').select('*', { count: 'exact' }),
          insforge.database.from('events').select('*', { count: 'exact' }).gte('event_date', new Date().toISOString()),
          insforge.database.from('donations').select('amount').eq('status', 'confirmed'),
          insforge.database.from('payments').select('amount').eq('status', 'confirmed'),
          insforge.database.from('mentors').select('id').eq('status', 'pending'),
          insforge.database.from('prayer_requests').select('id').eq('status', 'pending')
        ]);

        const allApps = applications.data || [];
        const pendingApps = allApps.filter((a: any) => a.status === 'pending') || [];
        const bibleSchoolApps = allApps.filter((a: any) => a.program_type === 'bible_school') || [];
        const membershipApps = allApps.filter((a: any) => a.program_type === 'membership') || [];

        setStats({
          totalUsers: users.count || 0,
          pendingApplications: pendingApps.length,
          activeCourses: courses.count || 0,
          upcomingEvents: events.count || 0,
          totalDonations: donations.data?.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0) || 0,
          totalPayments: payments.data?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0,
          bibleSchoolApplications: bibleSchoolApps.length,
          membershipApplications: membershipApps.length,
          pendingMentors: mentors.data?.length || 0,
          pendingPrayerRequests: prayerRequests.data?.length || 0
        });

        // Fetch recent applications with full details
        const { data: recentApps } = await insforge.database
          .from('applications')
          .select('*, programs(title)')
          .order('created_at', { ascending: false })
          .limit(10);

        setRecentApplications(recentApps?.map((app: any) => ({
          id: app.id,
          name: app.full_name,
          email: app.email,
          phone: app.phone || app.contact_number,
          program: app.programs?.title || app.program_type,
          programType: app.program_type,
          date: new Date(app.created_at).toLocaleString(),
          status: app.status,
          paymentStatus: app.payment_status,
          idNumber: app.id_number,
          address: app.physical_address || app.address
        })) || []);

        // Fetch recent notifications
        const { data: recentNotifications } = await insforge.database
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setNotifications(recentNotifications || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const statsData = [{
    icon: Users,
    label: 'Total Registered Users',
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
    label: 'Bible School Applications',
    value: stats.bibleSchoolApplications.toString(),
    change: '',
    color: 'bg-blue-600'
  }, {
    icon: Users,
    label: 'Membership Applications',
    value: stats.membershipApplications.toString(),
    change: '',
    color: 'bg-purple-600'
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
          {/* Notifications Section */}
          {(stats.pendingApplications > 0 || stats.pendingMentors > 0 || stats.pendingPrayerRequests > 0) && (
            <div className="bg-white p-6 rounded-card shadow-soft border-l-4 border-amber-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Bell className="text-amber-500" size={24} />
                  <h2 className="text-xl font-bold text-navy-ink">Notifications</h2>
                </div>
              </div>
              <div className="space-y-2">
                {stats.pendingApplications > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-card">
                    <div className="flex items-center space-x-3">
                      <FileText className="text-amber-600" size={20} />
                      <div>
                        <p className="font-medium text-navy-ink">
                          {stats.pendingApplications} {stats.pendingApplications === 1 ? 'application' : 'applications'} pending review
                        </p>
                        <p className="text-sm text-gray-600">Bible School: {stats.bibleSchoolApplications} | Membership: {stats.membershipApplications}</p>
                      </div>
                    </div>
                    <Link to="/admin/applications">
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </div>
                )}
                {stats.pendingMentors > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-card">
                    <div className="flex items-center space-x-3">
                      <Users className="text-blue-600" size={20} />
                      <div>
                        <p className="font-medium text-navy-ink">
                          {stats.pendingMentors} {stats.pendingMentors === 1 ? 'mentor application' : 'mentor applications'} pending approval
                        </p>
                      </div>
                    </div>
                    <Link to="/admin/mentorship">
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </div>
                )}
                {stats.pendingPrayerRequests > 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-card">
                    <div className="flex items-center space-x-3">
                      <FileText className="text-green-600" size={20} />
                      <div>
                        <p className="font-medium text-navy-ink">
                          {stats.pendingPrayerRequests} {stats.pendingPrayerRequests === 1 ? 'prayer request' : 'prayer requests'} pending
                        </p>
                      </div>
                    </div>
                    <Link to="/admin/prayer-requests">
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            {recentApplications.map(app => (
              <div key={app.id} className="p-4 bg-muted-gray rounded-card hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-white font-bold flex-shrink-0">
                      {app.name?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-navy-ink">{app.name || 'N/A'}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          app.programType === 'bible_school' ? 'bg-blue-100 text-blue-800' :
                          app.programType === 'membership' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {app.programType?.replace('_', ' ').toUpperCase() || app.program}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Email:</span> {app.email || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {app.phone || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">ID:</span> {app.idNumber || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(app.date).toLocaleDateString()}
                        </div>
                      </div>
                      {app.address && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Address:</span> {app.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      app.status === 'approved' ? 'bg-green-100 text-green-800' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {app.status}
                    </span>
                    {app.paymentStatus && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        app.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                        app.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Payment: {app.paymentStatus}
                      </span>
                    )}
                    <Link to={`/admin/applications`}>
                      <Button variant="outline" size="sm">
                        <Eye size={14} className="mr-1" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>;
}