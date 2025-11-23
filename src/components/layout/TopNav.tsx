import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuIcon, X as CloseIcon, User, LogOut, BookOpen, LayoutDashboard, Bell } from 'lucide-react';
import { useUser, useAuth } from '@insforge/react';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ThemeToggle';
import { checkAdminAccess } from '../../lib/auth';
import { insforge } from '../../lib/insforge';

export function TopNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isLoaded) {
      checkAdminAccess(user.id).then(setIsAdmin);
      fetchUnreadNotifications();
    } else {
      setIsAdmin(false);
      setUnreadNotifications(0);
    }
  }, [user, isLoaded]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await insforge.database
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error && data) {
        setUnreadNotifications(data.length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-soft">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <img 
            src="/assets/images/hero.jpeg" 
            alt="CLM Logo" 
            className="h-10 w-auto"
          />
          <span className="text-brand-dark-blue font-bold text-xl">
            Christian Leadership Movement
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/blog" className="text-navy-ink hover:text-gold transition-colors relative">
            News
            {unreadNotifications > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
          <Link to="/courses" className="text-navy-ink hover:text-gold transition-colors flex items-center gap-1">
            <BookOpen size={16} />
            Courses
          </Link>
          <Link to="/resources" className="text-navy-ink hover:text-gold transition-colors">
            Resources
          </Link>
          <Link to="/prayer-requests" className="text-navy-ink hover:text-gold transition-colors">
            Prayer Wall
          </Link>
          <Link to="/forum" className="text-navy-ink hover:text-gold transition-colors">
            Forum
          </Link>
          <Link to="/groups" className="text-navy-ink hover:text-gold transition-colors">
            Groups
          </Link>
          <Link to="/mentorship" className="text-navy-ink hover:text-gold transition-colors">
            Mentorship
          </Link>
          <Link to="/donations" className="text-navy-ink hover:text-gold transition-colors">
            Donate
          </Link>
        </div>

        {/* Login/User Menu */}
        <div className="hidden md:flex items-center space-x-2">
          <ThemeToggle />
          {isLoaded && user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="bg-brand-dark-blue hover:bg-opacity-90 text-white px-4 py-2 rounded-card font-medium transition-all flex items-center">
                  <LayoutDashboard size={18} className="mr-2" />
                  Admin Dashboard
                </Link>
              )}
              <Link to="/dashboard" className="text-navy-ink hover:text-gold transition-colors font-medium flex items-center">
                <User size={18} className="mr-2" />
                {user.name || user.email || 'Dashboard'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-navy-ink hover:text-gold transition-colors font-medium flex items-center"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-navy-ink hover:text-gold transition-colors font-medium">
                Login
              </Link>
              <Link to="/apply" className="bg-gold hover:bg-opacity-90 text-white px-4 py-2 rounded-card font-medium transition-all">
                Apply Now
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-navy-ink" onClick={toggleMenu}>
          {isMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <Link to="/blog" className="text-navy-ink py-2" onClick={toggleMenu}>
              News
            </Link>
            <Link to="/courses" className="text-navy-ink py-2 flex items-center gap-2" onClick={toggleMenu}>
              <BookOpen size={16} />
              Courses
            </Link>
            <Link to="/resources" className="text-navy-ink py-2" onClick={toggleMenu}>
              Resources
            </Link>
            <Link to="/prayer-requests" className="text-navy-ink py-2" onClick={toggleMenu}>
              Prayer Wall
            </Link>
            <Link to="/forum" className="text-navy-ink py-2" onClick={toggleMenu}>
              Forum
            </Link>
            <Link to="/groups" className="text-navy-ink py-2" onClick={toggleMenu}>
              Groups
            </Link>
            <Link to="/mentorship" className="text-navy-ink py-2" onClick={toggleMenu}>
              Mentorship
            </Link>
            <Link to="/donations" className="text-navy-ink py-2" onClick={toggleMenu}>
              Donate
            </Link>
            <div className="flex flex-col space-y-3 pt-4 border-t border-gray-100">
              {isLoaded && user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" className="bg-brand-dark-blue text-white px-4 py-2 rounded-card font-medium text-center flex items-center justify-center" onClick={toggleMenu}>
                      <LayoutDashboard size={18} className="mr-2" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link to="/dashboard" className="text-navy-ink font-medium py-2 flex items-center" onClick={toggleMenu}>
                    <User size={18} className="mr-2" />
                    {user.name || user.email || 'Dashboard'}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      toggleMenu();
                    }}
                    className="text-navy-ink font-medium py-2 flex items-center text-left"
                  >
                    <LogOut size={18} className="mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-navy-ink font-medium py-2" onClick={toggleMenu}>
                    Login
                  </Link>
                  <Link to="/apply" className="bg-gold text-white px-4 py-2 rounded-card font-medium text-center" onClick={toggleMenu}>
                    Apply Now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
