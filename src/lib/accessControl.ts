// Access Control Helper Functions
// Centralized functions for checking and managing user access to programs and resources

import { insforge } from './insforge';

export type ProgramType = 'bible_school' | 'membership' | 'course';

interface UserAccess {
  id: string;
  user_id: string;
  program_type: ProgramType;
  program_id: string | null;
  application_id: string | null;
  access_granted_at: string;
  is_active: boolean;
  expires_at: string | null;
}

/**
 * Check if user has access to a program
 */
export async function hasProgramAccess(
  userId: string,
  programType: ProgramType,
  programId?: string | null
): Promise<boolean> {
  try {
    let query = insforge.database
      .from('user_program_access')
      .select('id')
      .eq('user_id', userId)
      .eq('program_type', programType)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('program_id', programId);
    } else {
      query = query.is('program_id', null);
    }

    // Check if access has expired
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking program access:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error checking program access:', err);
    return false;
  }
}

/**
 * Check if user has access to Bible School
 */
export async function hasBibleSchoolAccess(userId: string): Promise<boolean> {
  return hasProgramAccess(userId, 'bible_school');
}

/**
 * Check if user has access to Membership
 */
export async function hasMembershipAccess(userId: string): Promise<boolean> {
  return hasProgramAccess(userId, 'membership');
}

/**
 * Check if user has access to a specific course
 */
export async function hasCourseAccess(userId: string, courseId: string): Promise<boolean> {
  return hasProgramAccess(userId, 'course', courseId);
}

/**
 * Get all active access records for a user
 */
export async function getUserAccess(userId: string): Promise<UserAccess[]> {
  try {
    const { data, error } = await insforge.database
      .from('user_program_access')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('access_granted_at', { ascending: false });

    if (error) {
      console.error('Error fetching user access:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching user access:', err);
    return [];
  }
}

/**
 * Manually grant access to a user (admin function)
 */
export async function grantAccess(
  userId: string,
  programType: ProgramType,
  programId: string | null,
  applicationId: string | null,
  grantedBy: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if access already exists
    const existing = await hasProgramAccess(userId, programType, programId || undefined);
    if (existing) {
      return { success: false, message: 'User already has access to this program' };
    }

    const { error } = await insforge.database
      .from('user_program_access')
      .insert({
        user_id: userId,
        program_type: programType,
        program_id: programId,
        application_id: applicationId,
        access_granted_by: grantedBy,
        is_active: true,
        notes: notes || null
      });

    if (error) {
      console.error('Error granting access:', error);
      return { success: false, message: error.message || 'Failed to grant access' };
    }

    // Log the access grant
    await insforge.database
      .from('access_audit_log')
      .insert({
        user_id: userId,
        program_type: programType,
        program_id: programId,
        action: 'granted',
        performed_by: grantedBy,
        reason: notes || 'Manual access grant by admin'
      });

    return { success: true, message: 'Access granted successfully' };
  } catch (err: any) {
    console.error('Error granting access:', err);
    return { success: false, message: err.message || 'Failed to grant access' };
  }
}

/**
 * Revoke access from a user (admin function)
 */
export async function revokeAccess(
  userId: string,
  programType: ProgramType,
  programId: string | null,
  revokedBy: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    let query = insforge.database
      .from('user_program_access')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('program_type', programType)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('program_id', programId);
    } else {
      query = query.is('program_id', null);
    }

    const { error } = await query;

    if (error) {
      console.error('Error revoking access:', error);
      return { success: false, message: error.message || 'Failed to revoke access' };
    }

    // Log the access revocation
    await insforge.database
      .from('access_audit_log')
      .insert({
        user_id: userId,
        program_type: programType,
        program_id: programId,
        action: 'revoked',
        performed_by: revokedBy,
        reason: reason || 'Access revoked by admin'
      });

    return { success: true, message: 'Access revoked successfully' };
  } catch (err: any) {
    console.error('Error revoking access:', err);
    return { success: false, message: err.message || 'Failed to revoke access' };
  }
}

/**
 * Check if user can access a specific resource
 * This is a higher-level function that checks both program access and any resource-specific rules
 */
export async function canAccessResource(
  userId: string,
  resourceType: 'bible_school' | 'membership' | 'course',
  resourceId?: string
): Promise<boolean> {
  // Check program access first
  const hasAccess = resourceId
    ? await hasCourseAccess(userId, resourceId)
    : resourceType === 'bible_school'
    ? await hasBibleSchoolAccess(userId)
    : await hasMembershipAccess(userId);

  if (!hasAccess) {
    return false;
  }

  // Add any additional resource-specific checks here
  // For example, check if resource is published, not expired, etc.

  return true;
}

/**
 * Get access status for display in admin dashboard
 */
export async function getAccessStatus(userId: string): Promise<{
  bibleSchool: boolean;
  membership: boolean;
  courses: string[]; // Array of course IDs user has access to
}> {
  const access = await getUserAccess(userId);

  return {
    bibleSchool: access.some(a => a.program_type === 'bible_school'),
    membership: access.some(a => a.program_type === 'membership'),
    courses: access
      .filter(a => a.program_type === 'course' && a.program_id)
      .map(a => a.program_id!)
  };
}

