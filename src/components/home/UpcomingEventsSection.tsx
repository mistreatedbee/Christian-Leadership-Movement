import React, { useEffect, useState } from 'react';
import { EventCard } from '../ui/EventCard';
import { Button } from '../ui/Button';
import { insforge } from '../../lib/insforge';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
}

export function UpcomingEventsSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const now = new Date().toISOString();
        const fetchPromise = insforge.database
          .from('events')
          .select('*')
          .gte('event_date', now)
          .order('event_date', { ascending: true })
          .limit(3);
        
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (error) throw error;
        setEvents(data || []);
        
        // Fetch registration counts (non-blocking)
        if (data && data.length > 0) {
          try {
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
          } catch (regErr) {
            console.warn('Error fetching registrations (non-fatal):', regErr);
          }
        }
      } catch (err: any) {
        console.error('Error fetching events:', err);
        // Set empty array so page still renders
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);
  return <section className="py-16 bg-muted-gray">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-ink mb-4">
            Upcoming Events
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Join us for these transformative gatherings designed to equip and
            inspire Christian leaders.
          </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(event => {
              const eventDate = new Date(event.event_date);
              const isOnline = event.location?.toLowerCase().includes('online') || event.location?.toLowerCase().includes('zoom');
              return (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  date={eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  time={eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  location={event.location || 'TBA'}
                  isOnline={isOnline}
                  capacity={event.capacity || 0}
                  registered={registrations[event.id] || 0}
                  image={event.image_url || ''}
                  description={event.description || ''}
                />
              );
            })}
          </div>
        )}
        <div className="mt-12 text-center">
          <Button href="/events" variant="secondary" size="lg">
            View All Events
          </Button>
        </div>
      </div>
    </section>;
}