import React, { useEffect, useState } from 'react';
import { insforge } from '../../lib/insforge';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
}

export function GallerySection() {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const fetchPromise = insforge.database
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);
        
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (error) throw error;
        setGalleryImages(data || []);
      } catch (err: any) {
        console.error('Error fetching gallery:', err);
        // Fallback to local images if database fails
        setGalleryImages([
          { id: '1', image_url: '/assets/images/gallery1.jpeg', caption: 'CLM Program Event 1' },
          { id: '2', image_url: '/assets/images/gallery2.jpeg', caption: 'Bible School Workshop' },
          { id: '3', image_url: '/assets/images/gallery3.jpeg', caption: 'Leadership Training' },
          { id: '4', image_url: '/assets/images/gallery4.jpeg', caption: 'Community Outreach' },
          { id: '5', image_url: '/assets/images/gallery5.jpeg', caption: 'Youth Leadership Conference' },
          { id: '6', image_url: '/assets/images/gallery6.jpeg', caption: 'Ministry Event' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, []);

  return (
    <section className="py-16 bg-brand-dark-blue text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Our Gallery
          </h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            A glimpse into our programs, events, and leadership initiatives.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-300">Loading gallery...</p>
          </div>
        ) : galleryImages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-300">No gallery images available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {galleryImages.map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-card border border-white/10 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <img
                  src={img.image_url}
                  alt={img.caption || 'Gallery image'}
                  className="w-full h-64 object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
