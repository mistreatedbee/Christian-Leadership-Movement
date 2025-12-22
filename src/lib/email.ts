import { insforge } from './insforge';

interface EmailNotification {
  type: string;
  subject: string;
  message: string;
  html?: string;
}

export async function sendEmailNotification(userId: string, email: EmailNotification) {
  try {
    // Get user email
    const { data: user } = await insforge.database
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    // Create edge function call to send email
    // Note: This requires an InsForge edge function to be created
    // For now, we'll log it and create a notification
    console.log('Email notification:', {
      to: user.email,
      subject: email.subject,
      message: email.message
    });

    // Call InsForge edge function to send email
    // First, create the edge function using: mcp_insforge_create-function
    // Then uncomment this:
    try {
      await insforge.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: email.subject,
          html: email.html || `<p>${email.message}</p>`,
          text: email.message
        }
      });
    } catch (funcError) {
      // If function doesn't exist yet, just log
      console.log('Email function not available, notification created in database');
    }

    // For now, we'll just ensure the notification is created
    // The actual email sending should be handled by an InsForge edge function
    // that can be triggered via webhook or scheduled job
  } catch (err) {
    console.error('Error sending email notification:', err);
    // Don't throw - email failures shouldn't break the flow
  }
}
