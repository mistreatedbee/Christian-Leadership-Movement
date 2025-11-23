import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Calendar, MapPin, DollarSign, Check, Download, Image as ImageIcon } from 'lucide-react';
import { generateEventTicketPDF } from '../lib/ticketGenerator';
import { getStorageUrl } from '../lib/connection';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  capacity: number | null;
  has_registration_fee?: boolean;
  registration_fee?: number;
  images?: Array<{ url: string; key: string }>;
}

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization?: string;
  dietaryRequirements?: string;
  specialRequests?: string;
}

export function EventRegistrationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegistrationFormData>({
    defaultValues: {
      email: user?.email || '',
      firstName: user?.name?.split(' ')[0] || '',
      lastName: user?.name?.split(' ').slice(1).join(' ') || ''
    }
  });

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await insforge.database
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
      alert('Event not found');
      navigate('/dashboard/events');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (!user || !event) return;

    setSubmitting(true);
    try {
      // Check capacity
      if (event.capacity) {
        const { count } = await insforge.database
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        if (count && count >= event.capacity) {
          alert('Event is full');
          setSubmitting(false);
          return;
        }
      }

      // Check if already registered
      const { data: existingReg } = await insforge.database
        .from('event_registrations')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingReg) {
        alert('You are already registered for this event');
        setSubmitting(false);
        return;
      }

      // Create registration
      const registrationData: any = {
        event_id: event.id,
        user_id: user.id,
        status: 'registered',
        registration_data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          organization: data.organization || '',
          dietaryRequirements: data.dietaryRequirements || '',
          specialRequests: data.specialRequests || ''
        },
        payment_status: event.has_registration_fee ? 'pending' : 'paid' // Free events are automatically "paid"
      };

      const { data: registration, error: regError } = await insforge.database
        .from('event_registrations')
        .insert([registrationData])
        .select()
        .single();

      if (regError) throw regError;
      setRegistrationId(registration.id);

      // If event has registration fee, create payment
      if (event.has_registration_fee && event.registration_fee && event.registration_fee > 0) {
        const { data: payment, error: paymentError } = await insforge.database
          .from('payments')
          .insert([{
            user_id: user.id,
            amount: event.registration_fee.toString(),
            currency: 'ZAR',
            payment_type: 'event_registration',
            status: 'pending',
            description: `Registration fee for ${event.title}`
          }])
          .select()
          .single();

        if (paymentError) throw paymentError;
        setPaymentId(payment.id);

        // Link payment to registration
        await insforge.database
          .from('event_registrations')
          .update({ payment_id: payment.id })
          .eq('id', registration.id);

        // Redirect to payment page
        navigate(`/payment/${payment.id}`);
        return;
      }

      // Free event - registration complete
      setRegistrationComplete(true);

      // Create notification
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'event',
          title: 'Event Registration Confirmed',
          message: `You have successfully registered for ${event.title}`,
          related_id: event.id,
          link_url: `/events/${event.id}/registration`,
          read: false
        }]);
    } catch (err: any) {
      console.error('Registration error:', err);
      alert(err.message || 'Failed to register for event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!event || !registrationId || !user) return;

    try {
      const { data: registration } = await insforge.database
        .from('event_registrations')
        .select('*, payments(*)')
        .eq('id', registrationId)
        .single();

      if (!registration) {
        alert('Registration not found');
        return;
      }

      const regData = registration.registration_data || {};
      await generateEventTicketPDF({
        event: {
          title: event.title,
          date: event.event_date,
          location: event.location || 'TBA',
          description: event.description || ''
        },
        attendee: {
          firstName: regData.firstName || user.name?.split(' ')[0] || '',
          lastName: regData.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          email: regData.email || user.email || '',
          phone: regData.phone || ''
        },
        registrationId: registration.id,
        paymentStatus: registration.payment_status || 'paid',
        amount: event.has_registration_fee ? event.registration_fee : 0
      });
    } catch (err) {
      console.error('Error generating ticket:', err);
      alert('Failed to generate ticket');
    }
  };

  if (!isLoaded || loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!event) {
    return <div className="text-center py-12">Event not found</div>;
  }

  if (registrationComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-card shadow-soft p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-navy-ink mb-4">Registration Successful!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully registered for <strong>{event.title}</strong>
          </p>
          <div className="bg-gray-50 p-6 rounded-card mb-6 text-left">
            <h3 className="font-semibold mb-4">Event Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <Calendar className="mr-2" size={16} />
                <span>{new Date(event.event_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="mr-2" size={16} />
                <span>{event.location || 'TBA'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={handleDownloadTicket}>
              <Download className="mr-2" size={16} />
              Download Ticket
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/events')}>
              Back to Events
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);

  return (
      <div className="max-w-3xl mx-auto p-6">
      <Link to={`/events/${event.id}`} className="flex items-center text-gold hover:text-gold/80 mb-6">
        <ArrowLeft className="mr-2" size={20} />
        Back to Event Details
      </Link>

      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        {/* Event Image Gallery */}
        {(() => {
          const allImages: string[] = [];
          if (event.image_url) {
            const mainUrl = event.image_url.startsWith('http') ? event.image_url : getStorageUrl('gallery', event.image_url);
            if (mainUrl) allImages.push(mainUrl);
          }
          if (event.images && Array.isArray(event.images)) {
            event.images.forEach((img: any) => {
              const url = typeof img === 'string' 
                ? (img.startsWith('http') ? img : getStorageUrl('gallery', img))
                : (img.url?.startsWith('http') ? img.url : getStorageUrl('gallery', img.url));
              if (url && !allImages.includes(url)) allImages.push(url);
            });
          }
          
          if (allImages.length > 0) {
            return (
              <div className="relative h-64 overflow-hidden bg-gray-200">
                <img
                  src={allImages[0]}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {allImages.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <ImageIcon size={16} />
                    {allImages.length} images
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}

        <div className="p-8">
          <h1 className="text-3xl font-bold text-navy-ink mb-2">{event.title}</h1>
        <div className="space-y-2 mb-6 text-gray-600">
          <div className="flex items-center">
            <Calendar className="mr-2" size={16} />
            <span>{eventDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2" size={16} />
            <span>{event.location || 'TBA'}</span>
          </div>
          {event.has_registration_fee && event.registration_fee && (
            <div className="flex items-center">
              <DollarSign className="mr-2" size={16} />
              <span className="font-semibold">Registration Fee: R {event.registration_fee.toFixed(2)}</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">About this Event</h3>
            <p className="text-gray-600">{event.description}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <h2 className="text-xl font-bold text-navy-ink">Registration Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">First Name *</label>
              <input
                type="text"
                {...register('firstName', { required: 'First name is required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">Last Name *</label>
              <input
                type="text"
                {...register('lastName', { required: 'Last name is required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Email *</label>
            <input
              type="email"
              {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' } })}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Phone Number *</label>
            <input
              type="tel"
              {...register('phone', { required: 'Phone number is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Organization (Optional)</label>
            <input
              type="text"
              {...register('organization')}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Dietary Requirements (Optional)</label>
            <textarea
              {...register('dietaryRequirements')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Please let us know if you have any dietary requirements"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Special Requests (Optional)</label>
            <textarea
              {...register('specialRequests')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Any special requests or accommodations needed"
            />
          </div>

          {event.has_registration_fee && event.registration_fee && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-card">
              <p className="text-sm text-amber-800">
                <strong>Registration Fee:</strong> R {event.registration_fee.toFixed(2)}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                You will be redirected to the payment page after submitting this form.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Processing...' : event.has_registration_fee ? 'Register & Pay' : 'Register'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/events')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

