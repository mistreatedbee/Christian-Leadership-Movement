import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { checkAdminAccess } from '../../lib/auth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    checkAdminAccess(user.id).then(admin => {
      setIsAdmin(admin);
      setLoading(false);
    });
  }, [user, isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted-gray">
        <div className="bg-white rounded-card shadow-soft p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-navy-ink mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to access the admin dashboard.
          </p>
          <a href="/dashboard" className="text-gold hover:underline font-medium">
            Go to User Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

