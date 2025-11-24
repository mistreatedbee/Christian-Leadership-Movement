import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, BookOpen, Calendar, Award, BarChart3, MessageSquare, Settings, LogOut, Menu, X, ChevronDown, DollarSign, Target, Video, UserCheck, Mail, Shield, MessageSquare as SMSIcon, Bell, Receipt, FolderOpen, Home, UserCircle } from 'lucide-react';
import { useUser } from '@insforge/react';
import { getUserRole } from '../../lib/auth';
import { insforge } from '../../lib/insforge';
import { getStorageUrl } from '../../lib/connection';

export function AdminDashboardLayout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<string>('Admin');
  const [adminName, setAdminName] = useState<string>('Admin User');
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [notificationCounts, setNotificationCounts] = useState({
    applications: 0,
    mentors: 0,
    prayerRequests: 0,
    groups: 0
  });

  useEffect(() => {
    if (user) {
      getUserRole(user.id).then(role => {
        if (role) {
          setAdminRole(role === 'admin' ? 'Admin' : role === 'super_admin' ? 'Super Admin' : 'Admin');
        }
      });

      // Fetch admin's name and avatar
      const fetchAdminInfo = async () => {
        try {
          const { data: userData } = await insforge.database
            .from('users')
            .select('nickname, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          if (userData) {
            setAdminName(userData.nickname || user.name || user.email || 'Admin User');
            if (userData.avatar_url) {
              // Convert avatar URL to full public URL if needed
              const avatarUrl = userData.avatar_url.startsWith('http') 
                ? userData.avatar_url 
                : getStorageUrl('avatars', userData.avatar_url);
              setAdminAvatar(avatarUrl);
            }
          } else {
            setAdminName(user.name || user.email || 'Admin User');
          }
        } catch (error) {
          console.error('Error fetching admin info:', error);
          setAdminName(user.name || user.email || 'Admin User');
        }
      };

      fetchAdminInfo();
    }
  }, [user]);

  // Fetch notification counts
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      if (!user) return;
      
      try {
        const [pendingApps, pendingMentors, pendingPrayers, pendingGroups] = await Promise.all([
          insforge.database
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          insforge.database
            .from('mentors')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          insforge.database
            .from('prayer_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          insforge.database
            .from('groups')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
        ]);

        setNotificationCounts({
          applications: pendingApps.count || 0,
          mentors: pendingMentors.count || 0,
          prayerRequests: pendingPrayers.count || 0,
          groups: pendingGroups.count || 0
        });
      } catch (error) {
        console.error('Error fetching notification counts:', error);
      }
    };

    fetchNotificationCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchNotificationCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    // Use InsForge signOut if available
    navigate('/login');
  };
  const navItems = [{
    icon: Home,
    label: 'Home',
    path: '/'
  }, {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/admin'
  }, {
    icon: UserCircle,
    label: 'Profile',
    path: '/admin/profile'
  }, {
    icon: Users,
    label: 'User Management',
    path: '/admin/users'
  }, {
    icon: FileText,
    label: 'Applications',
    path: '/admin/applications'
  }, {
    icon: BookOpen,
    label: 'Courses',
    path: '/admin/courses'
  }, {
    icon: Calendar,
    label: 'Events',
    path: '/admin/events'
  }, {
    icon: BookOpen,
    label: 'Bible School',
    path: '/admin/bible-school'
  }, {
    icon: Award,
    label: 'Certificates',
    path: '/admin/certificates'
  }, {
    icon: DollarSign,
    label: 'Financial Reports',
    path: '/admin/financial-reports'
  }, {
    icon: MessageSquare,
    label: 'Prayer Requests',
    path: '/admin/prayer-requests'
  }, {
    icon: BookOpen,
    label: 'Quizzes',
    path: '/admin/quizzes'
  }, {
    icon: Users,
    label: 'Volunteers',
    path: '/admin/volunteers'
  }, {
    icon: BarChart3,
    label: 'Analytics',
    path: '/admin/analytics'
  }, {
    icon: BarChart3,
    label: 'Advanced Analytics',
    path: '/admin/advanced-analytics'
  }, {
    icon: FileText,
    label: 'Custom Reports',
    path: '/admin/reports'
  }, {
    icon: Mail,
    label: 'Email Templates',
    path: '/admin/email-templates'
  }, {
    icon: Shield,
    label: 'Audit Logs',
    path: '/admin/audit-logs'
  }, {
    icon: SMSIcon,
    label: 'SMS Notifications',
    path: '/admin/sms'
  }, {
    icon: Bell,
    label: 'Push Notifications',
    path: '/admin/push'
  }, {
    icon: Receipt,
    label: 'Giving Statements',
    path: '/admin/giving-statements'
  }, {
    icon: MessageSquare,
    label: 'Communication',
    path: '/admin/communication'
  }, {
    icon: Settings,
    label: 'Content Management',
    path: '/admin/content'
  }, {
    icon: FileText,
    label: 'Blog Management',
    path: '/admin/blog'
  }, {
    icon: UserCheck,
    label: 'Mentorship',
    path: '/admin/mentorship'
  }, {
    icon: MessageSquare,
    label: 'Forum',
    path: '/admin/forum'
  }, {
    icon: Users,
    label: 'Groups',
    path: '/admin/groups'
  }, {
    icon: FolderOpen,
    label: 'Resources',
    path: '/admin/resources'
  }, {
    icon: Video,
    label: 'Live Streams',
    path: '/admin/streams'
  }, {
    icon: DollarSign,
    label: 'Fee Management',
    path: '/admin/fees'
  }, {
    icon: Target,
    label: 'Strategic Objectives',
    path: '/admin/objectives'
  }, {
    icon: Users,
    label: 'Partners',
    path: '/admin/partners'
  }, {
    icon: Settings,
    label: 'Settings',
    path: '/admin/settings'
  }];
  return <div className="min-h-screen bg-muted-gray flex">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-brand-dark-blue text-white transform transition-transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0 p-6 pb-4">
            <h2 className="text-xl font-bold mb-2">CLM Admin</h2>
            <div className="text-sm text-gray-300">{adminRole}</div>
          </div>
          <nav className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
            {navItems.map(item => {
              let badgeCount = 0;
              if (item.path === '/admin/applications') {
                badgeCount = notificationCounts.applications;
              } else if (item.path === '/admin/mentorship') {
                badgeCount = notificationCounts.mentors;
              } else if (item.path === '/admin/prayer-requests') {
                badgeCount = notificationCounts.prayerRequests;
              } else if (item.path === '/admin/groups') {
                badgeCount = notificationCounts.groups;
              }

              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className="flex items-center justify-between p-3 rounded-card hover:bg-white/10 transition-colors relative" 
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex-shrink-0 p-6 pt-4 border-t border-white/10">
            <button onClick={handleLogout} className="flex items-center space-x-3 p-3 rounded-card hover:bg-white/10 transition-colors w-full text-white">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow-soft p-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-navy-ink">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center space-x-4 ml-auto">
            <Link to="/" className="text-navy-ink hover:text-gold transition-colors flex items-center space-x-2">
              <Home size={18} />
              <span className="text-sm font-medium">Home</span>
            </Link>
            <div className="text-right">
              <p className="text-navy-ink font-medium">{adminName}</p>
              <p className="text-sm text-gray-600">{adminRole}</p>
            </div>
            {adminAvatar ? (
              <img 
                src={adminAvatar} 
                alt={adminName}
                className="w-10 h-10 rounded-full object-cover border-2 border-gold"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold">
                {adminName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>
        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      {/* Overlay for mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>;
}