// Utility functions to create scheduled notifications for upcoming events and courses
// This can be called periodically (e.g., daily) to notify users about upcoming events/classes

import { insforge } from './insforge';

/**
 * Create notifications for users about upcoming events (24 hours before)
 */
export async function notifyUpcomingEvents() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find events happening tomorrow
    const { data: upcomingEvents } = await insforge.database
      .from('events')
      .select('*')
      .gte('event_date', tomorrow.toISOString())
      .lt('event_date', dayAfter.toISOString());

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return;
    }

    for (const event of upcomingEvents) {
      // Get all users registered for this event
      const { data: registrations } = await insforge.database
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'registered');

      if (registrations && registrations.length > 0) {
        const notifications = registrations.map((reg: any) => ({
          user_id: reg.user_id,
          type: 'event',
          title: 'Upcoming Event Tomorrow',
          message: `Reminder: "${event.title}" is happening tomorrow at ${new Date(event.event_date).toLocaleTimeString()}.${event.location ? ` Location: ${event.location}` : ''}`,
          related_id: event.id,
          link_url: '/dashboard/events',
          read: false
        }));

        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < notifications.length; i += batchSize) {
          const batch = notifications.slice(i, i + batchSize);
          await insforge.database
            .from('notifications')
            .insert(batch);
        }
      }
    }
  } catch (error) {
    console.error('Error notifying upcoming events:', error);
  }
}

/**
 * Create notifications for users about scheduled course lessons
 */
export async function notifyUpcomingLessons() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find lessons scheduled for tomorrow
    const { data: upcomingLessons } = await insforge.database
      .from('course_lessons')
      .select('*, courses(title)')
      .gte('scheduled_date', tomorrow.toISOString())
      .lt('scheduled_date', dayAfter.toISOString())
      .not('scheduled_date', 'is', null);

    if (!upcomingLessons || upcomingLessons.length === 0) {
      return;
    }

    for (const lesson of upcomingLessons) {
      // Get all users enrolled in this course
      const { data: enrollments } = await insforge.database
        .from('user_course_progress')
        .select('user_id')
        .eq('course_id', lesson.course_id);

      if (enrollments && enrollments.length > 0) {
        const uniqueUserIds = Array.from(new Set(enrollments.map((e: any) => e.user_id)));
        const notifications = uniqueUserIds.map((userId: string) => ({
          user_id: userId,
          type: 'course',
          title: 'Upcoming Class Tomorrow',
          message: `Reminder: "${lesson.title}" from "${lesson.courses?.title || 'your course'}" is scheduled for tomorrow at ${new Date(lesson.scheduled_date).toLocaleTimeString()}.${lesson.meeting_link ? ` Meeting link: ${lesson.meeting_link}` : ''}`,
          related_id: lesson.id,
          link_url: `/dashboard/courses/${lesson.course_id}/lessons/${lesson.id}`,
          read: false
        }));

        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < notifications.length; i += batchSize) {
          const batch = notifications.slice(i, i + batchSize);
          await insforge.database
            .from('notifications')
            .insert(batch);
        }
      }
    }
  } catch (error) {
    console.error('Error notifying upcoming lessons:', error);
  }
}

