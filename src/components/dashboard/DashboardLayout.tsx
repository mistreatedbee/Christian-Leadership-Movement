import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { Home, User, BookOpen, Calendar, Award, FileText, Settings, LogOut, Menu, X, Bell, Mail, Users, CheckSquare, Shield, UserCheck } from 'lucide-react';
import { useUser } from '@insforge/react';
import { useAuth } from '@insforge/react';
import { insforge } from '../../lib/insforge';

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await insforge.database
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: any) => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };
  
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  
  const [isApprovedMentor, setIsApprovedMentor] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      checkMentorStatus();
    }
  }, [user]);

  const checkMentorStatus = async () => {
    if (!user) return;
    try {
      const { data } = await insforge.database
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'available')
        .maybeSingle();
      setIsApprovedMentor(!!data);
    } catch (err) {
      console.error('Error checking mentor status:', err);
    }
  };

  const navItems = [{
    icon: Home,
    label: 'Dashboard',
    path: '/dashboard'
  }, {
    icon: User,
    label: 'Profile',
    path: '/dashboard/profile'
  }, {
    icon: FileText,
    label: 'Applications',
    path: '/dashboard/applications'
  }, {
    icon: BookOpen,
    label: 'My Courses',
    path: '/dashboard/courses'
  }, {
    icon: BookOpen,
    label: 'Bible School',
    path: '/bible-school'
  }, {
    icon: Users,
    label: 'Membership',
    path: '/membership'
  }, {
    icon: UserCheck,
    label: 'Mentorship',
    path: '/mentorship'
  }, ...(isApprovedMentor ? [{
    icon: Settings,
    label: 'Mentor Management',
    path: '/dashboard/mentor-management'
  }] : []), {
    icon: Calendar,
    label: 'Calendar',
    path: '/dashboard/calendar'
  }, {
    icon: FileText,
    label: 'Resources',
    path: '/resources'
  }, {
    icon: Bell,
    label: 'Notifications',
    path: '/dashboard/notifications'
  }, {
    icon: Award,
    label: 'Certificates',
    path: '/dashboard/certificates'
  }, {
    icon: Mail,
    label: 'Messages',
    path: '/dashboard/messages'
  }, {
    icon: Users,
    label: 'Volunteer',
    path: '/dashboard/volunteer'
  }, {
    icon: CheckSquare,
    label: 'Attendance',
    path: '/dashboard/attendance'
  }, {
    icon: Shield,
    label: 'Security',
    path: '/dashboard/security'
  }];
  return <div className="min-h-screen bg-muted-gray flex">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-brand-dark-blue text-white transform transition-transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold mb-8">CLM Portal</h2>
          <div className="mb-4">
            <Link to="/" className="flex items-center space-x-3 p-3 rounded-card hover:bg-white/10 transition-colors bg-white/5">
              <Home size={20} />
              <span>Back to Home</span>
            </Link>
          </div>
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {navItems.map(item => <Link key={item.path} to={item.path} className="flex items-center space-x-3 p-3 rounded-card hover:bg-white/10 transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>)}
          </nav>
          
          {/* Notifications Panel */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <Link 
              to="/dashboard/notifications" 
              className="flex items-center justify-between p-3 rounded-card hover:bg-white/10 transition-colors mb-2"
              onClick={() => setIsSidebarOpen(false)}
            >
              <div className="flex items-center space-x-3">
                <Bell size={20} />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            {notifications.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
                {notifications.slice(0, 5).map((notif: any) => (
                  <Link
                    key={notif.id}
                    to={notif.link_url || '/dashboard/notifications'}
                    className={`block p-2 rounded text-sm hover:bg-white/10 transition-colors ${!notif.read ? 'bg-white/5' : ''}`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <p className="font-medium truncate">{notif.title}</p>
                    <p className="text-xs text-white/70 truncate">{notif.message}</p>
                    <p className="text-xs text-white/50 mt-1">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Logout Button - Fixed at bottom */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <button onClick={handleLogout} className="flex items-center space-x-3 p-3 rounded-card hover:bg-white/10 transition-colors w-full">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow-soft p-4 flex items-center justify-between lg:justify-end">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-navy-ink">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center space-x-4">
            <Link to="/dashboard/notifications" className="relative">
              <Bell className="text-navy-ink" size={24} />
            </Link>
            <span className="text-navy-ink font-medium">{user?.name || user?.email || 'User'}</span>
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
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