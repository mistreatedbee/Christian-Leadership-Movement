import { insforge } from './insforge';

export async function checkAdminAccess(userId: string): Promise<boolean> {
  try {
    // Use maybeSingle to handle case where profile doesn't exist
    const { data: profile, error } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin access:', error);
      // If it's an RLS error, try to work around it
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.warn('RLS policy may be blocking admin check, trying alternative method');
        // Return false but log the issue
        return false;
      }
      return false;
    }
    
    if (!profile) {
      console.log('No profile found for user:', userId);
      return false;
    }
    
    // Check if user has admin role
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    console.log('Admin check result:', { userId, role: profile.role, isAdmin });
    return isAdmin;
  } catch (err) {
    console.error('Error checking admin access:', err);
    return false;
  }
}

export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const { data: profile, error } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !profile) return null;
    return profile.role || 'user';
  } catch (err) {
    console.error('Error getting user role:', err);
    return null;
  }
}

