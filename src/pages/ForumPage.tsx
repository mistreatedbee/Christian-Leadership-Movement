import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Lock, Pin, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
}

interface ForumTopic {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  view_count: number;
  reply_count: number;
  last_reply_at?: string;
  created_at: string;
  forum_categories?: ForumCategory;
}

export function ForumPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, topicsRes] = await Promise.all([
        insforge.database
          .from('forum_categories')
          .select('*')
          .eq('is_active', true)
          .order('order_index'),
        selectedCategory
          ? insforge.database
              .from('forum_topics')
              .select('*, forum_categories(*)')
              .eq('category_id', selectedCategory)
              .order('is_pinned', { ascending: false })
              .order('last_reply_at', { ascending: false })
          : insforge.database
              .from('forum_topics')
              .select('*, forum_categories(*)')
              .order('is_pinned', { ascending: false })
              .order('last_reply_at', { ascending: false })
      ]);

      setCategories(categoriesRes.data || []);
      setTopics(topicsRes.data || []);
    } catch (error) {
      console.error('Error fetching forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading forum...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Community Forum</h1>
          <p className="text-gray-600">Join the discussion and connect with others</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button href="/forum/new-topic" variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                New Topic
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-card shadow-soft sticky top-4">
            <h2 className="text-xl font-bold text-navy-ink mb-4">Categories</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-4 py-2 rounded-lg ${
                  selectedCategory === null
                    ? 'bg-gold text-white'
                    : 'bg-muted-gray hover:bg-gray-200'
                }`}
              >
                All Topics
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    selectedCategory === category.id
                      ? 'bg-gold text-white'
                      : 'bg-muted-gray hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Topics List */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-card shadow-soft overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-navy-ink">
                {selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.name || 'Topics'
                  : 'All Topics'}
              </h2>
            </div>
            <div className="divide-y">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  to={`/forum/topic/${topic.id}`}
                  className="block p-6 hover:bg-muted-gray transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {topic.is_pinned && (
                          <Pin className="w-4 h-4 text-gold" />
                        )}
                        <h3 className="text-lg font-semibold text-navy-ink">{topic.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">{topic.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{topic.forum_categories?.name || 'Uncategorized'}</span>
                        <span>{topic.view_count} views</span>
                        <span>{topic.reply_count} replies</span>
                        {topic.last_reply_at && (
                          <span>
                            Last reply {new Date(topic.last_reply_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {topics.length === 0 && (
            <div className="bg-white p-12 rounded-card shadow-soft text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No topics yet. Start a discussion!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

