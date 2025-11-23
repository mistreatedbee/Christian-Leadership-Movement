import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Calendar, Users, X, Save, Upload, DollarSign, Eye, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { insforge } from '../../lib/insforge';
import { Link } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  image_key: string | null;
  has_registration_fee?: boolean;
  registration_fee?: number;
  images?: Array<{ url: string; key: string }>;
}

interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  capacity: string;
  has_registration_fee: boolean;
  registration_fee: string;
}

export function EventManagementPage() {
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    totalAttendees: 0,
    thisMonth: 0
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ url: string; key: string }>>([]);
  const [registrations, setRegistrations] = useState<Record<string, number>>({});
  const [showRegistrations, setShowRegistrations] = useState<string | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<EventFormData>();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);

      // Fetch registration counts
      if (data && data.length > 0) {
        const eventIds = data.map(e => e.id);
        const { data: regs } = await insforge.database
          .from('event_registrations')
          .select('event_id')
          .in('event_id', eventIds);

        const counts: Record<string, number> = {};
        regs?.forEach((reg: any) => {
          counts[reg.event_id] = (counts[reg.event_id] || 0) + 1;
        });
        setRegistrations(counts);

        // Calculate stats
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const upcoming = data.filter((e: Event) => new Date(e.event_date) >= now);
        const thisMonthEvents = data.filter((e: Event) => new Date(e.event_date) >= thisMonth);

        setStats({
          total: data.length,
          upcoming: upcoming.length,
          totalAttendees: Object.values(counts).reduce((sum, count) => sum + count, 0),
          thisMonth: thisMonthEvents.length
        });
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    reset();
    setEditingEvent(null);
    setImageFile(null);
    setImageFiles([]);
    setExistingImages([]);
    setValue('has_registration_fee', false);
    setValue('registration_fee', '0');
    setShowForm(true);
  };

  const handleEdit = (event: Event) => {
    const eventDate = new Date(event.event_date);
    setValue('title', event.title);
    setValue('description', event.description || '');
    setValue('event_date', eventDate.toISOString().split('T')[0]);
    setValue('event_time', eventDate.toTimeString().slice(0, 5));
    setValue('location', event.location || '');
    setValue('capacity', event.capacity?.toString() || '');
    setValue('has_registration_fee', event.has_registration_fee || false);
    setValue('registration_fee', event.registration_fee?.toString() || '0');
    setEditingEvent(event);
    setImageFile(null);
    setImageFiles([]);
    setExistingImages(event.images || []);
    setShowForm(true);
  };

  const handleViewRegistrations = async (eventId: string) => {
    try {
      const { data, error } = await insforge.database
        .from('event_registrations')
        .select(`
          *,
          users(id, nickname, email),
          payments(id, amount, status, payment_method)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEventRegistrations(data || []);
      setShowRegistrations(eventId);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      alert('Failed to load registrations');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      // Delete registrations first
      await insforge.database
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId);

      // Delete event image if exists
      const event = events.find(e => e.id === eventId);
      if (event?.image_key) {
        await insforge.storage.from('gallery').remove(event.image_key);
      }

      // Delete event
      await insforge.database
        .from('events')
        .delete()
        .eq('id', eventId);

      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event');
    }
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      let imageUrl = editingEvent?.image_url || null;
      let imageKey = editingEvent?.image_key || null;
      let allImages: Array<{ url: string; key: string }> = [...existingImages];

      // Upload single main image if provided (for backward compatibility)
      if (imageFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('gallery')
          .upload(`events/${Date.now()}_${imageFile.name}`, imageFile);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        imageUrl = uploadData.url;
        imageKey = uploadData.key;

        // Add to images array if not already there
        if (!allImages.some(img => img.url === imageUrl)) {
          allImages.push({ url: imageUrl, key: imageKey });
        }

        // Delete old image if editing
        if (editingEvent?.image_key && editingEvent.image_key !== imageKey) {
          try {
            await insforge.storage.from('gallery').remove(editingEvent.image_key);
          } catch (removeErr) {
            console.warn('Could not remove old image:', removeErr);
          }
        }
      }

      // Upload multiple images
      for (const file of imageFiles) {
        try {
          const { data: uploadData, error: uploadError } = await insforge.storage
            .from('gallery')
            .upload(`events/${Date.now()}_${file.name}`, file);

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            continue; // Skip failed uploads but continue with others
          }

          if (uploadData && !allImages.some(img => img.url === uploadData.url)) {
            allImages.push({ url: uploadData.url, key: uploadData.key });
          }
        } catch (err) {
          console.error('Error uploading image:', err);
        }
      }

      // Combine date and time
      const eventDateTime = new Date(`${data.event_date}T${data.event_time}`);

      const eventData: any = {
        title: data.title,
        description: data.description || null,
        event_date: eventDateTime.toISOString(),
        location: data.location || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        image_url: imageUrl, // Keep for backward compatibility
        image_key: imageKey, // Keep for backward compatibility
        has_registration_fee: data.has_registration_fee || false,
        registration_fee: data.has_registration_fee && data.registration_fee ? parseFloat(data.registration_fee) : 0.00,
        images: allImages.length > 0 ? allImages : null,
        created_by: user?.id
      };

      let savedEvent;
      if (editingEvent) {
        const { data: updated, error: updateError } = await insforge.database
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
          .select()
          .single();

        if (updateError) {
          console.error('Event update error:', updateError);
          throw new Error(`Failed to update event: ${updateError.message}`);
        }
        savedEvent = updated;
      } else {
        const { data: inserted, error: insertError } = await insforge.database
          .from('events')
          .insert([eventData])
          .select()
          .single();

        if (insertError) {
          console.error('Event insert error:', insertError);
          throw new Error(`Failed to create event: ${insertError.message}`);
        }
        savedEvent = inserted;
      }

      // Verify the event was saved
      if (savedEvent) {
        // Notify registered users about the event (new or updated)
        try {
          const { data: registeredUsers } = await insforge.database
            .from('event_registrations')
            .select('user_id')
            .eq('event_id', savedEvent.id);

          if (registeredUsers && registeredUsers.length > 0) {
            const notifications = registeredUsers.map((reg: any) => ({
              user_id: reg.user_id,
              type: 'event',
              title: editingEvent ? 'Event Updated' : 'New Event Available',
              message: editingEvent 
                ? `The event "${savedEvent.title}" has been updated. Check the new details.`
                : `A new event "${savedEvent.title}" is now available. Event date: ${new Date(savedEvent.event_date).toLocaleDateString()}`,
              related_id: savedEvent.id,
              link_url: '/dashboard/events',
              read: false
            }));

            await insforge.database
              .from('notifications')
              .insert(notifications);
          }

          // If it's a new event, notify all users
          if (!editingEvent) {
            const { data: allUsers } = await insforge.database
              .from('users')
              .select('id');

            if (allUsers && allUsers.length > 0) {
              const notifications = allUsers.map((u: any) => ({
                user_id: u.id,
                type: 'event',
                title: 'New Event Available',
                message: `A new event "${savedEvent.title}" is now available. Event date: ${new Date(savedEvent.event_date).toLocaleDateString()}`,
                related_id: savedEvent.id,
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
        } catch (notifError) {
          console.error('Error creating event notifications:', notifError);
          // Don't fail the event creation if notifications fail
        }

        setShowForm(false);
        reset();
        setImageFile(null);
        setImageFiles([]);
        setExistingImages([]);
        fetchEvents();
        alert('Event saved successfully!');
      } else {
        throw new Error('Event save completed but verification failed');
      }
    } catch (err: any) {
      console.error('Event save error:', err);
      alert(err.message || 'Failed to save event. Please try again.');
    }
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">
            Event Management
          </h1>
          <p className="text-gray-600">Schedule and manage events</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Create Event
        </Button>
      </div>
      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-soft p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Title *</label>
                <input
                  type="text"
                  {...register('title', { required: 'Title is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Date *</label>
                  <input
                    type="date"
                    {...register('event_date', { required: 'Date is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.event_date && <p className="text-red-500 text-sm mt-1">{errors.event_date.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Time *</label>
                  <input
                    type="time"
                    {...register('event_time', { required: 'Time is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.event_time && <p className="text-red-500 text-sm mt-1">{errors.event_time.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Location *</label>
                <input
                  type="text"
                  {...register('location', { required: 'Location is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="e.g., Pretoria Conference Center or Online via Zoom"
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Capacity</label>
                <input
                  type="number"
                  {...register('capacity')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Main Event Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {editingEvent?.image_url && !imageFile && (
                  <p className="text-sm text-gray-500 mt-1">Current: {editingEvent.image_url.split('/').pop()}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Additional Event Images (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {imageFiles.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">{imageFiles.length} image(s) selected</p>
                )}
                {existingImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Existing images:</p>
                    <div className="flex flex-wrap gap-2">
                      {existingImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={img.url} alt={`Event image ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="has_registration_fee"
                    {...register('has_registration_fee')}
                    className="mr-2"
                  />
                  <label htmlFor="has_registration_fee" className="text-sm font-medium text-navy-ink">
                    This event requires a registration fee
                  </label>
                </div>
                {hasRegistrationFee && (
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Registration Fee (ZAR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('registration_fee', { 
                        required: hasRegistrationFee ? 'Registration fee is required' : false,
                        min: { value: 0, message: 'Fee must be 0 or greater' }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="0.00"
                    />
                    {errors.registration_fee && <p className="text-red-500 text-sm mt-1">{errors.registration_fee.message}</p>}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <Button type="submit" variant="primary">
                  <Save className="mr-2" size={16} />
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">Total Events</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">Upcoming</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.upcoming}</p>
        </div>
        <div className="bg-white p-4 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">Total Attendees</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.totalAttendees}</p>
        </div>
        <div className="bg-white p-4 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">This Month</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.thisMonth}</p>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No events created yet.</p>
          <Button variant="primary" onClick={handleCreate}>
            Create Your First Event
          </Button>
        </div>
      ) : (
      <div className="space-y-4">
          {events.map(event => {
            const eventDate = new Date(event.event_date);
            const registered = registrations[event.id] || 0;
            const isOnline = event.location?.toLowerCase().includes('online') || 
                           event.location?.toLowerCase().includes('zoom');
            const capacityPercent = event.capacity ? (registered / event.capacity) * 100 : 0;

            return (
              <div key={event.id} className="bg-white rounded-card shadow-soft p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-navy-ink">{event.title}</h3>
                      {isOnline && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Online</span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        eventDate >= new Date() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {eventDate >= new Date() ? 'Upcoming' : 'Past'}
                  </span>
                </div>
                    {event.description && (
                      <p className="text-gray-600 mb-4">{event.description}</p>
                    )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center text-gray-600">
                    <Calendar size={16} className="mr-2" />
                        <span className="text-sm">{eventDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin size={16} className="mr-2" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                      {event.capacity && (
                  <div className="flex items-center text-gray-600">
                    <Users size={16} className="mr-2" />
                          <span className="text-sm">{registered} / {event.capacity} registered</span>
                  </div>
                      )}
                </div>
                    {event.capacity && (
                <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-full rounded-full ${
                            capacityPercent >= 80 ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                        />
                </div>
                    )}
              </div>
              <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleViewRegistrations(event.id)} title="View Registrations">
                  <Users size={16} />
                </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(event)} title="Edit">
                  <Edit size={16} />
                </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(event.id)} title="Delete">
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
              </div>
            );
          })}
      </div>
      )}

      {/* Registrations Modal */}
      {showRegistrations && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-soft p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">Event Registrations</h2>
              <button onClick={() => setShowRegistrations(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {eventRegistrations.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No registrations yet</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-card">
                    <p className="text-sm text-gray-600">Total Registrations</p>
                    <p className="text-2xl font-bold text-navy-ink">{eventRegistrations.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-card">
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {eventRegistrations.filter((r: any) => r.payment_status === 'paid').length}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-card">
                    <p className="text-sm text-gray-600">Pending Payment</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {eventRegistrations.filter((r: any) => r.payment_status === 'pending').length}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted-gray">
                      <tr>
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Registration Date</th>
                        <th className="text-left py-3 px-4">Payment Status</th>
                        <th className="text-left py-3 px-4">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventRegistrations.map((reg: any) => {
                        const regData = reg.registration_data || {};
                        return (
                          <tr key={reg.id} className="border-b">
                            <td className="py-3 px-4">
                              {regData.firstName && regData.lastName 
                                ? `${regData.firstName} ${regData.lastName}`
                                : reg.users?.nickname || reg.users?.email || 'N/A'}
                            </td>
                            <td className="py-3 px-4">{regData.email || reg.users?.email || 'N/A'}</td>
                            <td className="py-3 px-4">{new Date(reg.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                reg.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                reg.payment_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {reg.payment_status || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {reg.payments ? `R ${parseFloat(reg.payments.amount).toFixed(2)}` : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>;
}