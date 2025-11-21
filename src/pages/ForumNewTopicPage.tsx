import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, LayoutDashboard } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
}

export function ForumNewTopicPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    content: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/login?redirect=/forum/new-topic');
      return;
    }
    if (user) {
      fetchCategories();
    }
  }, [user, isLoaded]);

  const fetchCategories = async () => {
    try {
      const { data } = await insforge.database
        .from('forum_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      setCategories(data || []);
      if (data && data.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=/forum/new-topic');
      return;
    }

    if (!formData.category_id) {
      setError('Please select a category');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!formData.content.trim()) {
      setError('Please enter content');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data, error: insertError } = await insforge.database
        .from('forum_topics')
        .insert({
          category_id: formData.category_id,
          user_id: user.id,
          title: formData.title.trim(),
          content: formData.content.trim(),
          is_pinned: false,
          is_locked: false,
          view_count: 0,
          reply_count: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Navigate to the new topic
      navigate(`/forum/topic/${data.id}`);
    } catch (error: any) {
      console.error('Error creating topic:', error);
      setError(error.message || 'Failed to create topic. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={() => navigate('/forum')}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forum
            </Button>
            {user && (
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
          </div>

          <div className="bg-white rounded-card shadow-soft p-8">
            <h1 className="text-3xl font-bold text-navy-ink mb-6">Create New Topic</h1>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  placeholder="Enter topic title..."
                  required
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold"
                  rows={12}
                  placeholder="Write your topic content here..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{formData.content.length} characters</p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Creating...' : 'Create Topic'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/forum')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

