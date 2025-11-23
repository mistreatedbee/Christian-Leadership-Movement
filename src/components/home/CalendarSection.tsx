import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Link as LinkIcon } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Link } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'event' | 'study' | 'class' | 'meeting' | 'course';
  location?: string | null;
  is_online?: boolean;
  online_link?: string | null;
  link?: string;
}

export function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchAllEvents();
  }, [currentDate]);

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
          .select('id, title, event_date, location, is_online, online_link')
          .gte('event_date', startDate)
          .lte('event_date', endDate)
          .limit(10);

        eventsData?.forEach((event: any) => {
          allEvents.push({
            id: event.id,
            title: event.title,
            date: new Date(event.event_date),
            type: 'event',
            location: event.location,
            is_online: event.is_online,
            online_link: event.online_link,
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
          .select('id, title, scheduled_date, location, is_online, meeting_link')
          .eq('status', 'scheduled')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate)
          .limit(5);

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
              link: '/bible-school'
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
          .select('id, title, scheduled_date, location, is_online, meeting_link')
          .eq('status', 'scheduled')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate)
          .limit(5);

        classesData?.forEach((classItem: any) => {
          if (classItem.scheduled_date) {
            allEvents.push({
              id: classItem.id,
              title: classItem.title,
              date: new Date(classItem.scheduled_date),
              type: 'class',
              location: classItem.location,
              is_online: classItem.is_online,
              online_link: classItem.meeting_link,
              link: '/bible-school'
            });
          }
        });
      } catch (err) {
        console.error('Error fetching Bible classes:', err);
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
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

    const days = [];
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

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-blue-500';
      case 'study': return 'bg-purple-500';
      case 'class': return 'bg-green-500';
      case 'meeting': return 'bg-amber-500';
      case 'course': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'event': return 'Event';
      case 'study': return 'Bible Study';
      case 'class': return 'Class';
      case 'meeting': return 'Meeting';
      case 'course': return 'Course';
      default: return 'Event';
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-ink mb-4 flex items-center justify-center">
            <Calendar className="mr-3" size={32} />
            Upcoming Calendar
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Stay informed about all upcoming events, Bible studies, classes, and meetings
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gold to-amber-500 p-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="text-white" size={24} />
                  </button>
                  <h3 className="text-2xl font-bold text-white">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronRight className="text-white" size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => {
                    const isToday = day && day.toDateString() === today.toDateString();
                    const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();
                    const dayEvents = day ? getEventsForDate(day) : [];
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <button
                        key={index}
                        onClick={() => day && setSelectedDate(day)}
                        className={`
                          aspect-square p-2 rounded-lg transition-all text-sm
                          ${!day ? 'bg-transparent' : ''}
                          ${day && !isToday && !isSelected ? 'hover:bg-gray-100' : ''}
                          ${isToday ? 'bg-gold text-white font-bold ring-2 ring-gold' : ''}
                          ${isSelected && !isToday ? 'bg-blue-100 text-blue-700 font-semibold ring-2 ring-blue-500' : ''}
                          ${!isToday && !isSelected && day ? 'text-gray-700' : ''}
                        `}
                      >
                        <div className="flex flex-col items-center h-full">
                          <span>{day ? day.getDate() : ''}</span>
                          {hasEvents && (
                            <div className="flex gap-1 mt-1">
                              {dayEvents.slice(0, 3).map((event, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full ${getEventTypeColor(event.type)}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-navy-ink mb-4">
                {selectedDate
                  ? `Events on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'Upcoming Events'}
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading events...</p>
                </div>
              ) : selectedDateEvents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedDateEvents.map(event => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getEventTypeColor(event.type)} text-white`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                        <Clock className="text-gray-400" size={14} />
                      </div>
                      <h4 className="font-semibold text-navy-ink mb-1">{event.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {event.is_online ? (
                          <LinkIcon className="text-blue-500" size={12} />
                        ) : (
                          <MapPin className="text-gray-400" size={12} />
                        )}
                        <span>{event.is_online ? 'Online' : event.location || 'TBA'}</span>
                      </div>
                      {event.link && (
                        <Link
                          to={event.link}
                          className="text-xs text-gold hover:underline mt-2 inline-block"
                        >
                          View Details →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {events.slice(0, 5).map(event => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getEventTypeColor(event.type)} text-white`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <h4 className="font-semibold text-navy-ink mb-1">{event.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {event.is_online ? (
                          <LinkIcon className="text-blue-500" size={12} />
                        ) : (
                          <MapPin className="text-gray-400" size={12} />
                        )}
                        <span>{event.is_online ? 'Online' : event.location || 'TBA'}</span>
                      </div>
                      {event.link && (
                        <Link
                          to={event.link}
                          className="text-xs text-gold hover:underline mt-2 inline-block"
                        >
                          View Details →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No events scheduled for this month</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <Link
                  to="/dashboard/calendar"
                  className="block text-center text-gold hover:text-amber-600 font-semibold transition-colors"
                >
                  View Full Calendar →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

