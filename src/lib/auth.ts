import { insforge } from './insforge';

export async function checkAdminAccess(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !profile) return false;
    
    // Check if user has admin role
    return profile.role === 'admin' || profile.role === 'super_admin';
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

