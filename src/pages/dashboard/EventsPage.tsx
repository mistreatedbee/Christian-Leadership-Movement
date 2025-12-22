import React, { useEffect, useState } from 'react';
import { useUser } from '@insforge/react';
import { Link } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { Calendar, MapPin, Users, Clock, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { getStorageUrl } from '../../lib/connection';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  has_registration_fee?: boolean;
  registration_fee?: number;
  images?: Array<{ url: string; key: string }>;
  is_online?: boolean;
  online_link?: string | null;
  address?: string | null;
}

export function EventsPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    fetchEvents();
  }, [user, isLoaded]);

  const fetchEvents = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await insforge.database
        .from('events')
        .select('*')
        .gte('event_date', now)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);

      // Check user registrations
      if (user) {
        const { data: userRegs } = await insforge.database
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', user.id);

        const regMap: Record<string, boolean> = {};
        userRegs?.forEach((reg: any) => {
          regMap[reg.event_id] = true;
        });
        setRegistrations(regMap);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    if (!user) {
      alert('Please log in to register for events');
      return;
    }

    try {
      // Check capacity
      const event = events.find(e => e.id === eventId);
      if (event && event.capacity) {
        const { data: currentRegs } = await insforge.database
          .from('event_registrations')
          .select('*', { count: 'exact' })
          .eq('event_id', eventId);

        if (currentRegs && currentRegs.length >= event.capacity) {
          alert('Event is full');
          return;
        }
      }

      const { error } = await insforge.database
        .from('event_registrations')
        .insert([{
          event_id: eventId,
          user_id: user.id,
          status: 'registered'
        }]);

      if (error) throw error;

      // Create notification
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'event',
          title: 'Event Registration Confirmed',
          message: `You have successfully registered for ${event?.title}`,
          related_id: eventId
        }]);

      setRegistrations(prev => ({ ...prev, [eventId]: true }));
      alert('Successfully registered for event!');
    } catch (err: any) {
      alert(err.message || 'Failed to register for event');
    }
  };

  if (!isLoaded) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Upcoming Events</h1>
        <p className="text-gray-600">Register for upcoming events and conferences</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No upcoming events at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => {
            const eventDate = new Date(event.event_date);
            const isRegistered = registrations[event.id];
            const isOnline = event.location?.toLowerCase().includes('online') || 
                           event.location?.toLowerCase().includes('zoom');

            return (
              <div key={event.id} className="bg-white rounded-card shadow-soft overflow-hidden">
                {event.image_url && (
                  <Link to={`/events/${event.id}`}>
                    <div className="h-48 overflow-hidden cursor-pointer relative group">
                      <img 
                        src={event.image_url.startsWith('http') ? event.image_url : getStorageUrl('gallery', event.image_url)} 
                        alt={event.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      {event.images && event.images.length > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <ImageIcon size={12} />
                          {event.images.length + 1}
                        </div>
                      )}
                    </div>
                  </Link>
                )}
                <div className="p-6">
                  <Link to={`/events/${event.id}`}>
                    <h3 className="text-xl font-bold text-navy-ink mb-2 hover:text-gold transition-colors cursor-pointer">{event.title}</h3>
                  </Link>
                  <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="mr-2" size={16} />
                      <span>{eventDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="mr-2" size={16} />
                      <span>{eventDate.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="mr-2" size={16} />
                      <span>{event.location || 'TBA'}</span>
                      {event.is_online && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Online
                        </span>
                      )}
                    </div>
                    {event.is_online && event.online_link && (
                      <div className="flex items-center text-blue-600">
                        <LinkIcon className="mr-2" size={16} />
                        <a
                          href={event.online_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Join Online Event
                        </a>
                      </div>
                    )}
                    {!event.is_online && event.address && (
                      <div className="text-sm text-gray-600">
                        <strong>Address:</strong> {event.address}
                      </div>
                    )}
                    {event.capacity && (
                      <div className="flex items-center text-gray-600">
                        <Users className="mr-2" size={16} />
                        <span>Capacity: {event.capacity} attendees</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/events/${event.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    {isRegistered ? (
                      <Link to={`/events/${event.id}/registration`} className="flex-1">
                        <Button variant="primary" className="w-full">
                          View Registration
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/events/${event.id}/registration`} className="flex-1">
                        <Button variant="primary" className="w-full">
                          Register Now
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

