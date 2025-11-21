import React, { useState } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { Home, User, BookOpen, Calendar, Award, FileText, Settings, LogOut, Menu, X, Bell, Mail, Users, CheckSquare, Shield } from 'lucide-react';
import { useUser } from '@insforge/react';
import { useAuth } from '@insforge/react';

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
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
    icon: Calendar,
    label: 'Events',
    path: '/dashboard/events'
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
        <div className="p-6">
          <h2 className="text-xl font-bold mb-8">CLM Portal</h2>
          <div className="mb-4">
            <Link to="/" className="flex items-center space-x-3 p-3 rounded-card hover:bg-white/10 transition-colors bg-white/5">
              <Home size={20} />
              <span>Back to Home</span>
            </Link>
          </div>
          <nav className="space-y-2">
            {navItems.map(item => <Link key={item.path} to={item.path} className="flex items-center space-x-3 p-3 rounded-card hover:bg-white/10 transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>)}
          </nav>
        </div>
        <div className="absolute bottom-0 w-full p-6">
          <button onClick={handleLogout} className="flex items-center space-x-3 p-3 rounded-card hover:bg-white/10 transition-colors w-full">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
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