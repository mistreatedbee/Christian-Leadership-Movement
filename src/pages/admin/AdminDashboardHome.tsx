import React, { useEffect, useState } from 'react';
import { Users, FileText, BookOpen, Calendar, TrendingUp, Award, DollarSign, Bell, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';

export function AdminDashboardHome() {
  const { user } = useUser();
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
    pendingPrayerRequests: 0,
    pendingGroups: 0
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return; // Don't fetch if user is not loaded
    
    const fetchData = async () => {
      try {
        // Fetch all stats with proper counts - handle errors individually
        const [
          usersRes, 
          allApplicationsRes,
          pendingAppsRes,
          bibleSchoolAppsRes,
          membershipAppsRes,
          coursesRes, 
          eventsRes, 
          donationsRes, 
          paymentsRes,
          pendingMentorsRes,
          prayerRequestsRes,
          pendingGroupsRes
        ] = await Promise.allSettled([
          insforge.database.from('users').select('id', { count: 'exact', head: true }),
          insforge.database.from('applications').select('id', { count: 'exact', head: true }),
          insforge.database.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          insforge.database.from('applications').select('id', { count: 'exact', head: true }).eq('program_type', 'bible_school'),
          insforge.database.from('applications').select('id', { count: 'exact', head: true }).eq('program_type', 'membership'),
          insforge.database.from('courses').select('id', { count: 'exact', head: true }),
          insforge.database.from('events').select('id', { count: 'exact', head: true }).gte('event_date', new Date().toISOString()),
          insforge.database.from('donations').select('amount').eq('status', 'confirmed'),
          insforge.database.from('payments').select('amount').eq('status', 'confirmed'),
          insforge.database.from('mentors').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          insforge.database.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          insforge.database.from('groups').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        // Extract results from Promise.allSettled
        const getResult = (result: PromiseSettledResult<any>) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          const error = result.reason;
          console.error('❌ Query failed:', error);
          console.error('Error details:', {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint
          });
          return { count: 0, data: [] };
        };

        const usersResData = getResult(usersRes);
        const allApplicationsResData = getResult(allApplicationsRes);
        const pendingAppsResData = getResult(pendingAppsRes);
        const bibleSchoolAppsResData = getResult(bibleSchoolAppsRes);
        const membershipAppsResData = getResult(membershipAppsRes);
        const coursesResData = getResult(coursesRes);
        const eventsResData = getResult(eventsRes);
        const donationsResData = getResult(donationsRes);
        const paymentsResData = getResult(paymentsRes);
        const pendingMentorsResData = getResult(pendingMentorsRes);
        const prayerRequestsResData = getResult(prayerRequestsRes);
        const pendingGroupsResData = getResult(pendingGroupsRes);

        const pendingCount = pendingAppsResData?.count || 0;
        const bibleSchoolCount = bibleSchoolAppsResData?.count || 0;
        const membershipCount = membershipAppsResData?.count || 0;
        
        console.log(`📊 Admin Dashboard Stats:`, {
          pendingApplications: pendingCount,
          bibleSchoolApplications: bibleSchoolCount,
          membershipApplications: membershipCount,
          totalApplications: allApplicationsResData?.count || 0
        });
        
        setStats({
          totalUsers: usersResData?.count || 0,
          pendingApplications: pendingCount,
          activeCourses: coursesResData?.count || 0,
          upcomingEvents: eventsResData?.count || 0,
          totalDonations: donationsResData?.data?.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0) || 0,
          totalPayments: paymentsResData?.data?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0,
          bibleSchoolApplications: bibleSchoolCount,
          membershipApplications: membershipCount,
          pendingMentors: pendingMentorsResData?.count || 0,
          pendingPrayerRequests: prayerRequestsResData?.count || 0,
          pendingGroups: pendingGroupsResData?.count || 0
        });

        // Fetch all recent activities - handle join errors gracefully
        const fetchWithFallback = async (table: string, select: string, fallbackSelect: string = '*') => {
          try {
            const result = await insforge.database
              .from(table)
              .select(select)
              .order('created_at', { ascending: false })
              .limit(10);
            if (result.error && select !== fallbackSelect) {
              // Try fallback without joins
              const fallback = await insforge.database
                .from(table)
                .select(fallbackSelect)
                .order('created_at', { ascending: false })
                .limit(10);
              return fallback;
            }
            return result;
          } catch (err) {
            // If join fails, try without join
            try {
              return await insforge.database
                .from(table)
                .select(fallbackSelect)
                .order('created_at', { ascending: false })
                .limit(10);
            } catch (fallbackErr) {
              // If even fallback fails, return empty result
              return { data: [], error: null };
            }
          }
        };

        // Fetch recent activities with proper error handling
        const fetchRecentUsers = async () => {
          try {
            const result = await insforge.database
              .from('users')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(10);
            return result;
          } catch (err) {
            console.error('Error fetching recent users:', err);
            return { data: [], error: null };
          }
        };

        const [
          recentApps,
          recentMentors,
          recentUsers,
          recentGroups,
          recentPrayerRequests
        ] = await Promise.allSettled([
          // Fetch applications with form_data - don't join with users table as it might cause issues
          fetchWithFallback('applications', '*, form_data', '*'),
          fetchWithFallback('mentors', '*, users(nickname), mentorship_programs(name)', '*'),
          fetchRecentUsers(),
          fetchWithFallback('groups', '*, users(nickname)', '*'),
          fetchWithFallback('prayer_requests', '*, users(nickname)', '*')
        ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : { data: [], error: null }));

        // Combine and sort all recent activity
        const allRecentActivity: any[] = [];

        // Add regular applications - read from form_data if columns don't exist
        if (recentApps?.data && Array.isArray(recentApps.data)) {
          recentApps.data.forEach((app: any) => {
            const formData = app.form_data || {};
            const fullName = app.full_name || formData.fullName || formData.firstName + ' ' + formData.lastName || app.users?.nickname || 'Unknown';
            const email = app.email || formData.email || app.users?.email || '';
            const phone = app.phone || app.contact_number || formData.contactNumber || formData.phone || '';
            
            allRecentActivity.push({
              id: app.id,
              type: 'application',
              name: fullName,
              email: email,
              phone: phone,
              program: app.programs?.title || app.program_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Application',
              programType: app.program_type,
              date: app.created_at,
              status: app.status,
              paymentStatus: app.payment_status,
              idNumber: app.id_number || formData.idNumber,
              address: app.physical_address || app.address || formData.physicalAddress,
              userId: app.user_id
            });
          });
        }

        // Add mentor applications
        if (recentMentors?.data) {
          recentMentors.data.forEach((mentor: any) => {
            allRecentActivity.push({
              id: mentor.id,
              type: 'mentor',
              name: mentor.users?.nickname || mentor.users?.email || 'Unknown',
              email: mentor.users?.email,
              phone: null,
              program: mentor.mentorship_programs?.name || 'Mentorship Program',
              programType: 'mentor',
              date: mentor.created_at,
              status: mentor.status,
              paymentStatus: null,
              idNumber: null,
              address: null,
              userId: mentor.user_id,
              bio: mentor.bio,
              expertiseAreas: mentor.expertise_areas
            });
          });
        }

        // Add new users
        if (recentUsers?.data && Array.isArray(recentUsers.data)) {
          recentUsers.data.forEach((newUser: any) => {
            allRecentActivity.push({
              id: newUser.id,
              type: 'user',
              name: newUser.nickname || newUser.email || 'Unknown',
              email: newUser.email,
              phone: null,
              program: 'User Registration',
              programType: 'user',
              date: newUser.created_at,
              status: 'registered',
              paymentStatus: null,
              idNumber: null,
              address: null,
              userId: newUser.id
            });
          });
        }

        // Add new groups
        if (recentGroups?.data && Array.isArray(recentGroups.data)) {
          recentGroups.data.forEach((group: any) => {
            allRecentActivity.push({
              id: group.id,
              type: 'group',
              name: group.name,
              email: group.users?.email,
              phone: null,
              program: `Group: ${group.group_type || 'ministry'}`,
              programType: 'group',
              date: group.created_at,
              status: group.is_public ? 'public' : 'private',
              paymentStatus: null,
              idNumber: null,
              address: null,
              userId: group.created_by,
              description: group.description
            });
          });
        }

        // Add prayer requests
        if (recentPrayerRequests?.data && Array.isArray(recentPrayerRequests.data)) {
          recentPrayerRequests.data.forEach((prayer: any) => {
            allRecentActivity.push({
              id: prayer.id,
              type: 'prayer',
              name: prayer.is_anonymous ? 'Anonymous' : (prayer.users?.nickname || prayer.users?.email || 'Unknown'),
              email: prayer.is_anonymous ? null : prayer.users?.email,
              phone: null,
              program: 'Prayer Request',
              programType: 'prayer',
              date: prayer.created_at,
              status: prayer.status,
              paymentStatus: null,
              idNumber: null,
              address: null,
              userId: prayer.user_id,
              title: prayer.title,
              request: prayer.request
            });
          });
        }

        // Sort by date (most recent first) and limit to 20
        allRecentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentApplications(allRecentActivity.slice(0, 20));

        // Fetch recent notifications for admin (only if user exists)
        if (user?.id) {
          try {
            const { data: recentNotifications, error: notifError } = await insforge.database
              .from('notifications')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20);

            if (notifError) {
              console.error('Error fetching notifications:', notifError);
              setNotifications([]);
            } else {
              setNotifications(recentNotifications || []);
              // Log group notifications for debugging
              const groupNotifs = (recentNotifications || []).filter((n: any) => n.type === 'group') || [];
              if (groupNotifs.length > 0) {
                console.log(`📬 Admin has ${groupNotifs.length} group-related notifications`);
              }
            }
          } catch (notifErr: any) {
            console.error('Error fetching notifications:', notifErr);
            setNotifications([]);
          }
        } else {
          setNotifications([]);
        }
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
  }, [user]);

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
          {(stats.pendingApplications > 0 || stats.pendingMentors > 0 || stats.pendingPrayerRequests > 0 || stats.pendingGroups > 0) && (
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
                {stats.pendingGroups > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-card">
                    <div className="flex items-center space-x-3">
                      <Users className="text-amber-600" size={20} />
                      <div>
                        <p className="font-medium text-navy-ink">
                          {stats.pendingGroups} {stats.pendingGroups === 1 ? 'group' : 'groups'} pending approval
                        </p>
                        <p className="text-xs text-gray-600">Someone created a group and it's waiting for your review</p>
                      </div>
                    </div>
                    <Link to="/admin/groups?status=pending">
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
      {/* Recent Activity - Applications & Mentor Applications */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy-ink">
            Recent Activity
          </h2>
          <div className="flex space-x-4">
            <Link to="/admin/applications" className="text-gold hover:underline text-sm font-medium">
              View All Applications
            </Link>
            <Link to="/admin/mentorship" className="text-gold hover:underline text-sm font-medium">
              View All Mentors
            </Link>
          </div>
        </div>
        {recentApplications.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentApplications.map(item => (
              <div key={`${item.type}-${item.id}`} className="p-4 bg-muted-gray rounded-card hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                      item.type === 'mentor' ? 'bg-blue-500' : 'bg-gold'
                    }`}>
                      {item.name?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-navy-ink">{item.name || 'N/A'}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.type === 'mentor' ? 'bg-blue-100 text-blue-800' :
                          item.type === 'user' ? 'bg-green-100 text-green-800' :
                          item.type === 'group' ? 'bg-indigo-100 text-indigo-800' :
                          item.type === 'prayer' ? 'bg-pink-100 text-pink-800' :
                          item.programType === 'bible_school' ? 'bg-blue-100 text-blue-800' :
                          item.programType === 'membership' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.type === 'mentor' ? 'MENTOR APPLICATION' : 
                           item.type === 'user' ? 'NEW USER' :
                           item.type === 'group' ? 'NEW GROUP' :
                           item.type === 'prayer' ? 'PRAYER REQUEST' :
                           item.programType?.replace('_', ' ').toUpperCase() || item.program}
                        </span>
                      </div>
                      {item.type === 'mentor' ? (
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Email:</span> {item.email || 'N/A'}
                          </div>
                          {item.bio && (
                            <div className="text-sm text-gray-600 line-clamp-2">
                              <span className="font-medium">Bio:</span> {item.bio}
                            </div>
                          )}
                          {item.expertiseAreas && item.expertiseAreas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.expertiseAreas.slice(0, 3).map((area: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                  {area}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Applied: {new Date(item.date).toLocaleString()}
                          </div>
                        </div>
                      ) : item.type === 'user' ? (
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Email:</span> {item.email || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Registered: {new Date(item.date).toLocaleString()}
                          </div>
                        </div>
                      ) : item.type === 'group' ? (
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Type:</span> {item.program}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-600 line-clamp-2">
                              <span className="font-medium">Description:</span> {item.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Created: {new Date(item.date).toLocaleString()}
                          </div>
                        </div>
                      ) : item.type === 'prayer' ? (
                        <div className="space-y-1">
                          {item.title && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Title:</span> {item.title}
                            </div>
                          )}
                          {item.request && (
                            <div className="text-sm text-gray-600 line-clamp-2">
                              <span className="font-medium">Request:</span> {item.request}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Submitted: {new Date(item.date).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Email:</span> {item.email || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {item.phone || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">ID:</span> {item.idNumber || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {new Date(item.date).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      {item.address && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Address:</span> {item.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.status === 'approved' ? 'bg-green-100 text-green-800' :
                      item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      item.status === 'available' ? 'bg-green-100 text-green-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                    {item.paymentStatus && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.paymentStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                        item.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Payment: {item.paymentStatus}
                      </span>
                    )}
                    <Link to={
                      item.type === 'mentor' ? '/admin/mentorship' :
                      item.type === 'user' ? '/admin/users' :
                      item.type === 'group' ? '/admin/groups' :
                      item.type === 'prayer' ? '/admin/prayer-requests' :
                      '/admin/applications'
                    }>
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