import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Calendar, MapPin, Users, Clock, DollarSign, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { getStorageUrl } from '../lib/connection';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

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

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id, user]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await insforge.database
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);

      // Check if user is registered
      if (user) {
        const { data: registration } = await insforge.database
          .from('event_registrations')
          .select('id')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsRegistered(!!registration);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      alert('Event not found');
      navigate('/dashboard/events');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageUrl: string | null | undefined): string | null => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const key = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    return getStorageUrl('gallery', key);
  };

  const getAllImages = (): string[] => {
    if (!event) return [];
    const images: string[] = [];
    
    // Add main image if exists
    if (event.image_url) {
      const mainUrl = getImageUrl(event.image_url);
      if (mainUrl) images.push(mainUrl);
    }
    
    // Add additional images
    if (event.images && Array.isArray(event.images)) {
      event.images.forEach((img: any) => {
        const url = typeof img === 'string' ? getImageUrl(img) : getImageUrl(img.url);
        if (url && !images.includes(url)) {
          images.push(url);
        }
      });
    }
    
    return images;
  };

  const openImageGallery = (index: number) => {
    const allImages = getAllImages();
    if (allImages[index]) {
      setSelectedImageIndex(index);
      setViewingImage(allImages[index]);
    }
  };

  const closeImageGallery = () => {
    setSelectedImageIndex(null);
    setViewingImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const allImages = getAllImages();
    if (selectedImageIndex === null || allImages.length === 0) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = selectedImageIndex === 0 ? allImages.length - 1 : selectedImageIndex - 1;
    } else {
      newIndex = selectedImageIndex === allImages.length - 1 ? 0 : selectedImageIndex + 1;
    }

    setSelectedImageIndex(newIndex);
    setViewingImage(allImages[newIndex]);
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <p className="text-gray-600">Loading event...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <p className="text-gray-600">Event not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const allImages = getAllImages();
  const isOnline = event.location?.toLowerCase().includes('online') || 
                   event.location?.toLowerCase().includes('zoom');

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <Link to="/dashboard/events" className="flex items-center text-gold hover:text-gold/80 mb-6">
            <ArrowLeft className="mr-2" size={20} />
            Back to Events
          </Link>

          <div className="bg-white rounded-card shadow-soft overflow-hidden">
            {/* Main Image */}
            {allImages.length > 0 && (
              <div className="relative h-96 overflow-hidden bg-gray-200">
                <img
                  src={allImages[0]}
                  alt={event.title}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => openImageGallery(0)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {allImages.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <ImageIcon size={16} />
                    {allImages.length} images - Click to view gallery
                  </div>
                )}
              </div>
            )}

            <div className="p-8">
              <h1 className="text-4xl font-bold text-navy-ink mb-4">{event.title}</h1>

              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="mr-3" size={20} />
                    <div>
                      <p className="font-medium text-navy-ink">Date & Time</p>
                      <p>{eventDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                      <p>{eventDate.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}</p>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <MapPin className="mr-3" size={20} />
                    <div>
                      <p className="font-medium text-navy-ink">Location</p>
                      <p>{event.location || 'TBA'}</p>
                      {isOnline && (
                        <span className="mt-1 inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Online Event
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {event.capacity && (
                    <div className="flex items-center text-gray-600">
                      <Users className="mr-3" size={20} />
                      <div>
                        <p className="font-medium text-navy-ink">Capacity</p>
                        <p>{event.capacity} attendees</p>
                      </div>
                    </div>
                  )}

                  {event.has_registration_fee && event.registration_fee && (
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="mr-3" size={20} />
                      <div>
                        <p className="font-medium text-navy-ink">Registration Fee</p>
                        <p className="text-lg font-semibold text-navy-ink">R {event.registration_fee.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-navy-ink mb-4">About This Event</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>
                </div>
              )}

              {/* Image Gallery */}
              {allImages.length > 1 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-navy-ink mb-4">Event Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {allImages.map((imgUrl, index) => (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                        onClick={() => openImageGallery(index)}
                      >
                        <img
                          src={imgUrl}
                          alt={`${event.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registration Button */}
              <div className="border-t pt-6">
                {isRegistered ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-card text-center">
                      <p className="font-semibold">✓ You are registered for this event</p>
                    </div>
                    <Link to={`/events/${event.id}/registration`}>
                      <Button variant="outline" className="w-full">
                        View Registration Details
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Link to={`/events/${event.id}/registration`}>
                    <Button variant="primary" className="w-full" size="lg">
                      {event.has_registration_fee ? `Register & Pay R ${event.registration_fee?.toFixed(2)}` : 'Register for Event'}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Gallery Modal */}
      {viewingImage && selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeImageGallery}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={closeImageGallery}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <X size={24} />
            </button>
            
            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full text-sm">
                  {selectedImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}

            <img
              src={viewingImage}
              alt={`${event.title} - Image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

