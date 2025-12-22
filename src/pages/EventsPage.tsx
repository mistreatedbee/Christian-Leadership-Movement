import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { Calendar, MapPin, Users, Clock, Search, Filter, ArrowRight, LayoutDashboard } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  created_at: string;
}

export function EventsPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, number>>({});
  const [userRegistrations, setUserRegistrations] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (user && isLoaded) {
      fetchUserRegistrations();
    }
  }, [user, isLoaded]);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, filterType]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await insforge.database
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);

      // Fetch registration counts
      if (data && data.length > 0) {
        const eventIds = data.map((e: any) => e.id);
        const { data: regData } = await insforge.database
          .from('event_registrations')
          .select('event_id')
          .in('event_id', eventIds);

        const counts: Record<string, number> = {};
        regData?.forEach((reg: any) => {
          counts[reg.event_id] = (counts[reg.event_id] || 0) + 1;
        });
        setRegistrations(counts);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrations = async () => {
    if (!user) return;

    try {
      const { data } = await insforge.database
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id);

      const regMap: Record<string, boolean> = {};
      data?.forEach((reg: any) => {
        regMap[reg.event_id] = true;
      });
      setUserRegistrations(regMap);
    } catch (err) {
      console.error('Error fetching user registrations:', err);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];
    const now = new Date().toISOString();

    // Filter by date
    if (filterType === 'upcoming') {
      filtered = filtered.filter(event => event.event_date >= now);
    } else if (filterType === 'past') {
      filtered = filtered.filter(event => event.event_date < now);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(term) ||
        event.description?.toLowerCase().includes(term) ||
        event.location?.toLowerCase().includes(term)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleRegister = (eventId: string) => {
    if (!user) {
      navigate('/login', { state: { returnTo: `/events/${eventId}/registration` } });
      return;
    }

    // Navigate to event registration page
    navigate(`/events/${eventId}/registration`);
  };

  const upcomingCount = events.filter(e => new Date(e.event_date) >= new Date()).length;
  const pastCount = events.filter(e => new Date(e.event_date) < new Date()).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-muted-gray flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted-gray">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-ink to-brand-dark-blue text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">Events</h1>
              <p className="text-lg text-blue-100 max-w-3xl">
                Join us for transformative gatherings, conferences, workshops, and community events
                designed to equip and inspire Christian leaders.
              </p>
            </div>
            {user && (
              <div className="ml-4">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white p-6 rounded-card shadow-soft mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              />
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              >
                <option value="all">All Events</option>
                <option value="upcoming">Upcoming Events</option>
                <option value="past">Past Events</option>
              </select>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Upcoming: <strong>{upcomingCount}</strong></span>
              <span>Past: <strong>{pastCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-card shadow-soft p-12 text-center">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-2">No events found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map(event => {
              const eventDate = new Date(event.event_date);
              const isUpcoming = eventDate >= new Date();
              const isOnline = event.location?.toLowerCase().includes('online') || 
                              event.location?.toLowerCase().includes('zoom') ||
                              event.location?.toLowerCase().includes('virtual');
              const isRegistered = userRegistrations[event.id];
              const registeredCount = registrations[event.id] || 0;

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-card shadow-soft overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Event Image */}
                  {event.image_url ? (
                    <div className="h-48 overflow-hidden relative">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      {!isUpcoming && (
                        <div className="absolute top-2 right-2 bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Past Event
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-r from-navy-ink to-brand-dark-blue relative flex items-center justify-center">
                      <Calendar className="w-16 h-16 text-white/30" />
                      {!isUpcoming && (
                        <div className="absolute top-2 right-2 bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Past Event
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6">
                    {/* Event Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>{eventDate.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                      <Clock className="w-4 h-4 ml-2" />
                      <span>{eventDate.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}</span>
                    </div>

                    {/* Event Title */}
                    <h3 className="text-xl font-bold text-navy-ink mb-3">{event.title}</h3>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span className={isOnline ? 'text-blue-600 font-semibold' : ''}>
                        {event.location || 'Location TBA'}
                        {isOnline && ' (Online)'}
                      </span>
                    </div>

                    {/* Capacity & Registrations */}
                    {event.capacity && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Users className="w-4 h-4" />
                        <span>
                          {registeredCount} registered
                          {event.capacity && ` / ${event.capacity} capacity`}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {event.description || 'No description available.'}
                    </p>

                    {/* Action Button */}
                    {isUpcoming ? (
                      isRegistered ? (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-center text-sm font-medium">
                          ✓ Registered
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={() => navigate(`/events/${event.id}`)}
                        >
                          View Details & Register
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )
                    ) : (
                      <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-center text-sm">
                        Event Ended
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-card shadow-soft text-center">
            <Calendar className="mx-auto text-blue-500 mb-2" size={32} />
            <p className="text-2xl font-bold text-navy-ink">{events.length}</p>
            <p className="text-sm text-gray-600">Total Events</p>
          </div>
          <div className="bg-white p-6 rounded-card shadow-soft text-center">
            <Clock className="mx-auto text-green-500 mb-2" size={32} />
            <p className="text-2xl font-bold text-navy-ink">{upcomingCount}</p>
            <p className="text-sm text-gray-600">Upcoming Events</p>
          </div>
          <div className="bg-white p-6 rounded-card shadow-soft text-center">
            <Users className="mx-auto text-gold mb-2" size={32} />
            <p className="text-2xl font-bold text-navy-ink">
              {Object.values(registrations).reduce((sum, count) => sum + count, 0)}
            </p>
            <p className="text-sm text-gray-600">Total Registrations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

