import React, { useEffect, useState } from 'react';
import { insforge } from '../../lib/insforge';
import { getStorageUrl } from '../../lib/connection';

interface GalleryImage {
  id: string;
  image_url: string;
  image_key?: string | null;
  caption: string | null;
  category_id?: string | null;
}

interface GalleryCategory {
  id: string;
  name: string;
  description: string | null;
}

export function GallerySection() {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const [galleryPromise, categoriesPromise] = await Promise.all([
          insforge.database
            .from('gallery')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20),
          insforge.database
            .from('gallery_categories')
            .select('*')
            .order('name', { ascending: true })
        ]);
        
        const { data: galleryData, error: galleryError } = await Promise.race([
          galleryPromise,
          timeoutPromise
        ]) as any;
        
        const { data: categoriesData, error: categoriesError } = await Promise.race([
          categoriesPromise,
          timeoutPromise
        ]) as any;
        
        if (galleryError) throw galleryError;
        if (categoriesError) throw categoriesError;
        
        setGalleryImages(galleryData || []);
        setCategories(categoriesData || []);
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
        ) : categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map(category => {
              const categoryImages = galleryImages.filter(img => img.category_id === category.id);
              if (categoryImages.length === 0) return null;
              
              return (
                <div key={category.id}>
                  <div className="mb-4">
                    <h3 className="text-2xl font-semibold mb-2">{category.name}</h3>
                    {category.description && (
                      <p className="text-gray-300 text-sm">{category.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {categoryImages.map((img) => (
                      <div
                        key={img.id}
                        className="overflow-hidden rounded-card border border-white/10 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      >
                        <img
                          src={img.image_key 
                            ? getStorageUrl('gallery', img.image_key) 
                            : img.image_url}
                          alt={img.caption || 'Gallery image'}
                          className="w-full h-64 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (img.image_key && target.src !== img.image_url) {
                              target.src = img.image_url;
                            }
                          }}
                        />
                        {img.caption && (
                          <div className="p-3 bg-white/5">
                            <p className="text-sm text-gray-200">{img.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Uncategorized images */}
            {(() => {
              const uncategorized = galleryImages.filter(img => !img.category_id);
              return uncategorized.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-4">Gallery</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {uncategorized.map((img) => (
                      <div
                        key={img.id}
                        className="overflow-hidden rounded-card border border-white/10 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      >
                        <img
                          src={img.image_key 
                            ? getStorageUrl('gallery', img.image_key) 
                            : img.image_url}
                          alt={img.caption || 'Gallery image'}
                          className="w-full h-64 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (img.image_key && target.src !== img.image_url) {
                              target.src = img.image_url;
                            }
                          }}
                        />
                        {img.caption && (
                          <div className="p-3 bg-white/5">
                            <p className="text-sm text-gray-200">{img.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {galleryImages.slice(0, 6).map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-card border border-white/10 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <img
                  src={img.image_key 
                    ? getStorageUrl('gallery', img.image_key) 
                    : img.image_url}
                  alt={img.caption || 'Gallery image'}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (img.image_key && target.src !== img.image_url) {
                      target.src = img.image_url;
                    }
                  }}
                />
                {img.caption && (
                  <div className="p-3 bg-white/5">
                    <p className="text-sm text-gray-200">{img.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
