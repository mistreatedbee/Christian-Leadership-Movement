import { insforge } from './insforge';

export interface AuditLogData {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  user_id?: string;
}

/**
 * Logs an audit event to the audit_logs table
 * Captures IP address and user agent automatically
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    // Get IP address and user agent from browser
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent;

    const auditData = {
      user_id: data.user_id || null,
      action: data.action,
      resource_type: data.resource_type,
      resource_id: data.resource_id || null,
      details: data.details || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    };

    // Insert audit log (don't await to avoid blocking)
    insforge.database
      .from('audit_logs')
      .insert([auditData])
      .then(() => {
        console.log('✅ Audit log created:', data.action, data.resource_type);
      })
      .catch((error) => {
        // Log error but don't throw - audit logging should never break the app
        console.error('❌ Failed to create audit log:', error);
      });
  } catch (error) {
    // Silently fail - audit logging should never break the app
    console.error('❌ Audit logging error:', error);
  }
}

/**
 * Gets client IP address (best effort)
 * In production, this should come from server headers
 */
async function getClientIP(): Promise<string | null> {
  try {
    // Try to get IP from a public service (for development)
    // In production, this should come from your backend/API
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch {
    // If IP service fails, return null
    return null;
  }
}

/**
 * Helper functions for common audit actions
 */
export const auditActions = {
  // User actions
  userCreated: (userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'user_create',
      resource_type: 'user',
      resource_id: userId,
      user_id: userId,
      details,
    }),

  userUpdated: (userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'user_update',
      resource_type: 'user',
      resource_id: userId,
      details,
    }),

  userDeleted: (userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'user_delete',
      resource_type: 'user',
      resource_id: userId,
      details,
    }),

  // Application actions
  applicationCreated: (applicationId: string, userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'application_create',
      resource_type: 'application',
      resource_id: applicationId,
      user_id: userId,
      details,
    }),

  applicationUpdated: (applicationId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'application_update',
      resource_type: 'application',
      resource_id: applicationId,
      details,
    }),

  applicationApproved: (applicationId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'application_approve',
      resource_type: 'application',
      resource_id: applicationId,
      details,
    }),

  applicationRejected: (applicationId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'application_reject',
      resource_type: 'application',
      resource_id: applicationId,
      details,
    }),

  // Fee actions
  feeUpdated: (feeId: string, feeType: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'fee_update',
      resource_type: 'fee_settings',
      resource_id: feeId,
      details: { fee_type: feeType, ...details },
    }),

  // Objective actions
  objectiveCreated: (objectiveId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'objective_create',
      resource_type: 'strategic_objective',
      resource_id: objectiveId,
      details,
    }),

  objectiveUpdated: (objectiveId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'objective_update',
      resource_type: 'strategic_objective',
      resource_id: objectiveId,
      details,
    }),

  objectiveDeleted: (objectiveId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'objective_delete',
      resource_type: 'strategic_objective',
      resource_id: objectiveId,
      details,
    }),

  // Event actions
  eventCreated: (eventId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'event_create',
      resource_type: 'event',
      resource_id: eventId,
      details,
    }),

  eventUpdated: (eventId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'event_update',
      resource_type: 'event',
      resource_id: eventId,
      details,
    }),

  eventDeleted: (eventId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'event_delete',
      resource_type: 'event',
      resource_id: eventId,
      details,
    }),

  // Course actions
  courseCreated: (courseId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'course_create',
      resource_type: 'course',
      resource_id: courseId,
      details,
    }),

  courseUpdated: (courseId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'course_update',
      resource_type: 'course',
      resource_id: courseId,
      details,
    }),

  courseDeleted: (courseId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'course_delete',
      resource_type: 'course',
      resource_id: courseId,
      details,
    }),

  // Security actions
  login: (userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'login',
      resource_type: 'auth',
      user_id: userId,
      details,
    }),

  logout: (userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'logout',
      resource_type: 'auth',
      user_id: userId,
      details,
    }),

  passwordChanged: (userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'password_change',
      resource_type: 'auth',
      user_id: userId,
      details,
    }),

  roleChanged: (userId: string, oldRole: string, newRole: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'role_change',
      resource_type: 'user',
      resource_id: userId,
      details: { old_role: oldRole, new_role: newRole, ...details },
    }),

  // Payment actions
  paymentCreated: (paymentId: string, userId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'payment_create',
      resource_type: 'payment',
      resource_id: paymentId,
      user_id: userId,
      details,
    }),

  paymentUpdated: (paymentId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: 'payment_update',
      resource_type: 'payment',
      resource_id: paymentId,
      details,
    }),

  // Admin actions
  adminAction: (action: string, resourceType: string, resourceId?: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: `admin_${action}`,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    }),
};

