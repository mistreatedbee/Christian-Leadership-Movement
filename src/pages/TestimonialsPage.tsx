import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

interface Testimonial {
  id: string;
  name: string;
  content: string;
  rating?: number;
  testimonial_type?: string;
  related_id?: string;
  is_featured: boolean;
  created_at: string;
}

export function TestimonialsPage() {
  const { user } = useUser();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    rating: 5,
    testimonial_type: 'general' as string,
    related_id: ''
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const { data } = await insforge.database
        .from('testimonials')
        .select('*')
        .eq('is_approved', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await insforge.database
        .from('testimonials')
        .insert({
          user_id: user.id,
          ...formData,
          is_approved: false
        });

      setFormData({ name: '', content: '', rating: 5, testimonial_type: 'general', related_id: '' });
      setShowForm(false);
      alert('Thank you! Your testimonial has been submitted for review.');
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      alert('Error submitting testimonial');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading testimonials...</p>
      </div>
    );
  }

  const featured = testimonials.filter(t => t.is_featured);
  const regular = testimonials.filter(t => !t.is_featured);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Testimonials</h1>
          <p className="text-gray-600">Read what others are saying about our programs</p>
        </div>
        {user && (
          <Button onClick={() => setShowForm(!showForm)} variant="primary">
            <MessageSquare className="w-4 h-4 mr-2" />
            Share Your Story
          </Button>
        )}
      </div>

      {/* Submit Form */}
      {showForm && user && (
        <div className="bg-white p-6 rounded-card shadow-soft mb-8">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Share Your Testimonial</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating })}
                    className={`p-2 ${formData.rating >= rating ? 'text-gold' : 'text-gray-300'}`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Testimonial</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={5}
                required
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Submit</Button>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Featured Testimonials */}
      {featured.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-ink mb-4">Featured Testimonials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((testimonial) => (
              <div key={testimonial.id} className="bg-white p-6 rounded-card shadow-soft border-2 border-gold">
                <div className="flex items-center gap-2 mb-3">
                  {testimonial.rating && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Star
                          key={rating}
                          className={`w-4 h-4 ${testimonial.rating && testimonial.rating >= rating ? 'text-gold fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                <p className="font-semibold text-navy-ink">— {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Testimonials */}
      <div>
        <h2 className="text-2xl font-bold text-navy-ink mb-4">All Testimonials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regular.map((testimonial) => (
            <div key={testimonial.id} className="bg-white p-6 rounded-card shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                {testimonial.rating && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`w-4 h-4 ${testimonial.rating && testimonial.rating >= rating ? 'text-gold fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
              <p className="font-semibold text-navy-ink text-sm">— {testimonial.name}</p>
            </div>
          ))}
        </div>
      </div>

      {testimonials.length === 0 && (
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No testimonials yet. Be the first to share!</p>
        </div>
      )}
    </div>
  );
}

