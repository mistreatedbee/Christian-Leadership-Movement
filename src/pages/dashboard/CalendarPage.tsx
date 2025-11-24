import React, { useState, useEffect } from 'react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { TopNav } from '../../components/layout/TopNav';
import { Footer } from '../../components/layout/Footer';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Link as LinkIcon, BookOpen, Users, Video, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'event' | 'study' | 'class' | 'meeting' | 'course' | 'quiz';
  location?: string | null;
  is_online?: boolean;
  online_link?: string | null;
  link?: string;
  description?: string | null;
}

export function CalendarPage() {
  const { user, isLoaded } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isLoaded) {
      fetchAllEvents();
      if (user) {
        fetchAttendingEvents();
      }
    }
  }, [isLoaded, currentDate, user]);

  const fetchAttendingEvents = async () => {
    if (!user) return;
    try {
      // Fetch event registrations
      const { data: eventRegs } = await insforge.database
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'registered');
      
      // Fetch Bible school participants
      const { data: studyParticipants } = await insforge.database
        .from('bible_school_participants')
        .select('study_id')
        .eq('user_id', user.id);
      
      const { data: classParticipants } = await insforge.database
        .from('bible_school_participants')
        .select('class_id')
        .eq('user_id', user.id);
      
      const { data: meetingParticipants } = await insforge.database
        .from('bible_school_participants')
        .select('meeting_id')
        .eq('user_id', user.id);
      
      const attending = new Set<string>();
      eventRegs?.forEach((reg: any) => attending.add(reg.event_id));
      studyParticipants?.forEach((p: any) => attending.add(p.study_id));
      classParticipants?.forEach((p: any) => attending.add(p.class_id));
      meetingParticipants?.forEach((p: any) => attending.add(p.meeting_id));
      
      setAttendingEvents(attending);
    } catch (err) {
      console.error('Error fetching attending events:', err);
    }
  };

  const fetchAllEvents = async () => {
    setLoading(true);
    try {
      const allEvents: CalendarEvent[] = [];
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      // Fetch regular events
      try {
        const { data: eventsData } = await insforge.database
          .from('events')
          .select('id, title, event_date, location, is_online, online_link, description')
          .gte('event_date', startDate)
          .lte('event_date', endDate);

        eventsData?.forEach((event: any) => {
          allEvents.push({
            id: event.id,
            title: event.title,
            date: new Date(event.event_date),
            type: 'event',
            location: event.location,
            is_online: event.is_online,
            online_link: event.online_link,
            description: event.description,
            link: `/events/${event.id}`
          });
        });
      } catch (err) {
        console.error('Error fetching events:', err);
      }

      // Fetch Bible studies
      try {
        const { data: studiesData } = await insforge.database
          .from('bible_school_studies')
          .select('id, title, scheduled_date, location, is_online, meeting_link, description')
          .eq('status', 'scheduled')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        studiesData?.forEach((study: any) => {
          if (study.scheduled_date) {
            allEvents.push({
              id: study.id,
              title: study.title,
              date: new Date(study.scheduled_date),
              type: 'study',
              location: study.location,
              is_online: study.is_online,
              online_link: study.meeting_link,
              description: study.description,
              link: '/bible-school?tab=studies'
            });
          }
        });
      } catch (err) {
        console.error('Error fetching Bible studies:', err);
      }

      // Fetch Bible classes
      try {
        const { data: classesData } = await insforge.database
          .from('bible_school_classes')
          .select('id, title, scheduled_date, location, is_online, meeting_link, description')
          .eq('status', 'scheduled')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        classesData?.forEach((cls: any) => {
          if (cls.scheduled_date) {
            allEvents.push({
              id: cls.id,
              title: cls.title,
              date: new Date(cls.scheduled_date),
              type: 'class',
              location: cls.location,
              is_online: cls.is_online,
              online_link: cls.meeting_link,
              description: cls.description,
              link: '/bible-school?tab=classes'
            });
          }
        });
      } catch (err) {
        console.error('Error fetching Bible classes:', err);
      }

      // Fetch Bible meetings
      try {
        const { data: meetingsData } = await insforge.database
          .from('bible_school_meetings')
          .select('id, title, scheduled_date, location, is_online, meeting_link, description')
          .eq('status', 'scheduled')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        meetingsData?.forEach((meeting: any) => {
          if (meeting.scheduled_date) {
            allEvents.push({
              id: meeting.id,
              title: meeting.title,
              date: new Date(meeting.scheduled_date),
              type: 'meeting',
              location: meeting.location,
              is_online: meeting.is_online,
              online_link: meeting.meeting_link,
              description: meeting.description,
              link: '/bible-school?tab=meetings'
            });
          }
        });
      } catch (err) {
        console.error('Error fetching Bible meetings:', err);
      }

      // Fetch courses (if they have scheduled lessons)
      try {
        const { data: lessonsData } = await insforge.database
          .from('course_lessons')
          .select('id, title, scheduled_date, meeting_link, courses(id, title)')
          .not('scheduled_date', 'is', null)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        lessonsData?.forEach((lesson: any) => {
          if (lesson.scheduled_date) {
            allEvents.push({
              id: lesson.id,
              title: `${lesson.courses?.title || 'Course'}: ${lesson.title}`,
              date: new Date(lesson.scheduled_date),
              type: 'course',
              is_online: !!lesson.meeting_link,
              online_link: lesson.meeting_link,
              link: `/dashboard/courses/${lesson.courses?.id}/lessons/${lesson.id}`
            });
          }
        });
      } catch (err) {
        console.error('Error fetching course lessons:', err);
      }

      // Fetch active quizzes (if they have due dates or are scheduled)
      try {
        const { data: quizzesData } = await insforge.database
          .from('quizzes')
          .select('id, title, created_at, course_id, program_id, bible_school_context, quiz_type')
          .eq('is_active', true)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        quizzesData?.forEach((quiz: any) => {
          // Determine the correct link based on quiz type
          let quizLink = '/dashboard/courses';
          if (quiz.quiz_type === 'course' && quiz.course_id) {
            quizLink = `/dashboard/courses/${quiz.course_id}/quizzes/${quiz.id}/take`;
          } else if (quiz.quiz_type === 'bible_school') {
            quizLink = '/bible-school';
          } else if (quiz.quiz_type === 'program' && quiz.program_id) {
            quizLink = `/dashboard/programs/${quiz.program_id}/quizzes/${quiz.id}/take`;
          }
          
          // Show quizzes created in this month as upcoming assessments
          allEvents.push({
            id: quiz.id,
            title: `Quiz: ${quiz.title}`,
            date: new Date(quiz.created_at),
            type: 'quiz' as any,
            link: quizLink
          });
        });
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      }

      // Sort events by date
      allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      setEvents(allEvents);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar size={14} className="text-purple-500" />;
      case 'study':
        return <BookOpen size={14} className="text-blue-500" />;
      case 'class':
        return <Users size={14} className="text-green-500" />;
      case 'meeting':
        return <Video size={14} className="text-orange-500" />;
      case 'course':
        return <FileText size={14} className="text-teal-500" />;
      case 'quiz':
        return <FileText size={14} className="text-red-500" />;
      default:
        return <Calendar size={14} />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'study':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'class':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'meeting':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'course':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'quiz':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-navy-ink mb-2">Calendar</h1>
            <p className="text-gray-600">View all upcoming events, classes, and meetings</p>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading calendar...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2 bg-white rounded-card shadow-soft p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-navy-ink">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={previousMonth}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={goToToday}
                      className="px-4 py-2 bg-gold text-white rounded hover:bg-gold/80"
                    >
                      Today
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, index) => {
                    const isToday = date && date.toDateString() === today.toDateString();
                    const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();
                    const dayEvents = date ? getEventsForDate(date) : [];
                    const isCurrentMonth = date && date.getMonth() === currentDate.getMonth();

                    return (
                      <div
                        key={index}
                        onClick={() => date && setSelectedDate(date)}
                        className={`min-h-[80px] p-1 border border-gray-200 rounded ${
                          !isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'
                        } ${
                          isSelected ? 'ring-2 ring-gold' : ''
                        } ${
                          isToday ? 'bg-gold/10' : ''
                        } cursor-pointer hover:bg-gray-50 transition-colors`}
                      >
                        {date && (
                          <>
                            <div className={`text-sm font-medium mb-1 ${
                              isToday ? 'text-gold font-bold' : 'text-gray-700'
                            }`}>
                              {date.getDate()}
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 2).map(event => (
                                <Link
                                  key={event.id}
                                  to={event.link || '#'}
                                  className={`text-xs px-1 py-0.5 rounded truncate block hover:opacity-80 transition-opacity ${getEventColor(event.type)}`}
                                  title={event.title}
                                  onClick={(e) => {
                                    if (!event.link) e.preventDefault();
                                  }}
                                >
                                  {event.title}
                                </Link>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-500 px-1">
                                  +{dayEvents.length - 2} more
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Event Details Sidebar */}
              <div className="bg-white rounded-card shadow-soft p-6">
                <h3 className="text-xl font-bold text-navy-ink mb-4">
                  {selectedDate
                    ? `Events on ${selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}`
                    : 'Select a date to view events'}
                </h3>

                {selectedDateEvents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {selectedDate ? 'No events scheduled for this date' : 'Click on a date to see events'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedDateEvents.map(event => {
                      const isAttending = attendingEvents.has(event.id);
                      return (
                      <div
                        key={event.id}
                        className={`border-l-4 p-4 rounded ${getEventColor(event.type)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.type)}
                            <h4 className="font-semibold">{event.title}</h4>
                            {isAttending && (
                              <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                                Attending
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm space-y-1 mt-2">
                          <div className="flex items-center text-gray-700">
                            <Clock className="mr-1" size={12} />
                            {event.date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </div>
                          {event.is_online ? (
                            event.online_link && (
                              <a
                                href={event.online_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-600 hover:underline"
                              >
                                <LinkIcon className="mr-1" size={12} />
                                Join Online
                              </a>
                            )
                          ) : (
                            event.location && (
                              <div className="flex items-center text-gray-700">
                                <MapPin className="mr-1" size={12} />
                                {event.location}
                              </div>
                            )
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
                        )}
                        {event.link && (
                          <Link
                            to={event.link}
                            className="mt-3 inline-block"
                          >
                            <button className="w-full px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/80 transition-colors font-medium text-sm">
                              Go to {event.type === 'quiz' ? 'Quiz' : event.type === 'event' ? 'Event' : event.type === 'course' ? 'Course' : 'Details'} →
                            </button>
                          </Link>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}

                {/* Upcoming Events List */}
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Upcoming Events</h3>
                  <div className="space-y-3">
                    {events.slice(0, 5).map(event => (
                      <Link
                        key={event.id}
                        to={event.link || '#'}
                        className="flex items-start gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={(e) => {
                          if (!event.link) e.preventDefault();
                        }}
                      >
                        <div className={`w-1 h-full rounded ${getEventColor(event.type).split(' ')[0]}`} />
                        <div className="flex-1">
                          <p className="font-medium text-navy-ink">{event.title}</p>
                          <p className="text-xs text-gray-500">
                            {event.date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

