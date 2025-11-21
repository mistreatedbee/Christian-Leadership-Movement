import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Lock, Pin, PinOff, Search, Eye, X } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
  order_index: number;
  is_active: boolean;
}

interface ForumTopic {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  last_reply_at?: string;
  created_at: string;
  forum_categories?: ForumCategory;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

interface ForumReply {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
  forum_topics?: {
    id: string;
    title: string;
  };
}

export function ForumManagementPage() {
  const [activeTab, setActiveTab] = useState<'topics' | 'replies' | 'categories'>('topics');
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [showTopicDetails, setShowTopicDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, filterCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [topicsRes, repliesRes, categoriesRes] = await Promise.all([
        (() => {
          let query = insforge.database
            .from('forum_topics')
            .select('*, forum_categories(*), users(*)')
            .order('created_at', { ascending: false });
          
          if (filterCategory !== 'all') {
            query = query.eq('category_id', filterCategory);
          }
          return query;
        })(),
        insforge.database
          .from('forum_replies')
          .select('*, users(*), forum_topics(id, title)')
          .order('created_at', { ascending: false })
          .limit(100),
        insforge.database
          .from('forum_categories')
          .select('*')
          .order('order_index')
      ]);

      setTopics(topicsRes.data || []);
      setReplies(repliesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic? All replies will also be deleted.')) {
      return;
    }

    try {
      // Delete replies first (cascade)
      await insforge.database
        .from('forum_replies')
        .delete()
        .eq('topic_id', topicId);

      // Delete topic
      await insforge.database
        .from('forum_topics')
        .delete()
        .eq('id', topicId);

      fetchData();
      alert('Topic deleted successfully');
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete topic');
    }
  };

  const deleteReply = async (replyId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    try {
      await insforge.database
        .from('forum_replies')
        .delete()
        .eq('id', replyId);

      // Update topic reply count
      const reply = replies.find(r => r.id === replyId);
      if (reply?.topic_id) {
        const { data: topicReplies } = await insforge.database
          .from('forum_replies')
          .select('id')
          .eq('topic_id', reply.topic_id);
        
        await insforge.database
          .from('forum_topics')
          .update({ reply_count: topicReplies?.length || 0 })
          .eq('id', reply.topic_id);
      }

      fetchData();
      alert('Reply deleted successfully');
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Failed to delete reply');
    }
  };

  const togglePin = async (topicId: string, currentPinStatus: boolean) => {
    try {
      await insforge.database
        .from('forum_topics')
        .update({ is_pinned: !currentPinStatus })
        .eq('id', topicId);

      fetchData();
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin status');
    }
  };

  const toggleLock = async (topicId: string, currentLockStatus: boolean) => {
    try {
      await insforge.database
        .from('forum_topics')
        .update({ is_locked: !currentLockStatus })
        .eq('id', topicId);

      fetchData();
    } catch (error) {
      console.error('Error toggling lock:', error);
      alert('Failed to update lock status');
    }
  };

  const toggleCategoryActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      await insforge.database
        .from('forum_categories')
        .update({ is_active: !currentStatus })
        .eq('id', categoryId);

      fetchData();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Failed to update category status');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All topics in this category will also be deleted.')) {
      return;
    }

    try {
      // Get all topics in this category
      const { data: categoryTopics } = await insforge.database
        .from('forum_topics')
        .select('id')
        .eq('category_id', categoryId);

      // Delete all replies for these topics
      if (categoryTopics && categoryTopics.length > 0) {
        for (const topic of categoryTopics) {
          await insforge.database
            .from('forum_replies')
            .delete()
            .eq('topic_id', topic.id);
        }

        // Delete all topics
        await insforge.database
          .from('forum_topics')
          .delete()
          .eq('category_id', categoryId);
      }

      // Delete category
      await insforge.database
        .from('forum_categories')
        .delete()
        .eq('id', categoryId);

      fetchData();
      alert('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const filteredTopics = topics.filter(topic =>
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReplies = replies.filter(reply =>
    reply.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reply.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reply.forum_topics?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading forum data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Forum Management</h1>
        <p className="text-gray-600">Manage forum topics, replies, and categories</p>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('topics');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'topics'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Topics ({topics.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('replies');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'replies'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Replies ({replies.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('categories');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'categories'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Categories ({categories.length})
            </button>
          </div>
          <div className="relative flex-1 max-w-md ml-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
        </div>
        {activeTab === 'topics' && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Topics Tab */}
      {activeTab === 'topics' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">Title</th>
                  <th className="text-left py-3 px-6">Author</th>
                  <th className="text-left py-3 px-6">Category</th>
                  <th className="text-left py-3 px-6">Replies</th>
                  <th className="text-left py-3 px-6">Views</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map((topic) => (
                  <tr key={topic.id} className="border-b">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {topic.is_pinned && <Pin className="w-4 h-4 text-gold" />}
                        {topic.is_locked && <Lock className="w-4 h-4 text-gray-400" />}
                        <span className="font-medium">{topic.title}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {topic.users?.nickname || topic.users?.email || 'Unknown'}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {topic.forum_categories?.name || 'Uncategorized'}
                    </td>
                    <td className="py-4 px-6">{topic.reply_count || 0}</td>
                    <td className="py-4 px-6">{topic.view_count || 0}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        {topic.is_pinned && (
                          <span className="px-2 py-1 bg-gold text-white text-xs rounded">Pinned</span>
                        )}
                        {topic.is_locked && (
                          <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">Locked</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedTopic(topic);
                            setShowTopicDetails(true);
                          }}
                          variant="outline"
                          size="sm"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => togglePin(topic.id, topic.is_pinned)}
                          variant="outline"
                          size="sm"
                          title={topic.is_pinned ? "Unpin" : "Pin"}
                        >
                          {topic.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </Button>
                        <Button
                          onClick={() => toggleLock(topic.id, topic.is_locked)}
                          variant="outline"
                          size="sm"
                          title={topic.is_locked ? "Unlock" : "Lock"}
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteTopic(topic.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTopics.length === 0 && (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No topics found</p>
            </div>
          )}
        </div>
      )}

      {/* Replies Tab */}
      {activeTab === 'replies' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y">
            {filteredReplies.map((reply) => (
              <div key={reply.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-navy-ink">
                        {reply.users?.nickname || reply.users?.email || 'Unknown'}
                      </span>
                      {reply.is_solution && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Solution</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-3">{reply.content}</p>
                    <div className="text-xs text-gray-500">
                      Topic: {reply.forum_topics?.title || 'Unknown'} • 
                      {new Date(reply.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    onClick={() => deleteReply(reply.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {filteredReplies.length === 0 && (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No replies found</p>
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y">
            {categories.map((category) => (
              <div key={category.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-navy-ink">{category.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-gray-600 mb-2">{category.description}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      Slug: {category.slug} • Order: {category.order_index}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => toggleCategoryActive(category.id, category.is_active)}
                      variant="outline"
                      size="sm"
                    >
                      {category.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      onClick={() => deleteCategory(category.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {categories.length === 0 && (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No categories found</p>
            </div>
          )}
        </div>
      )}

      {/* Topic Details Modal */}
      {showTopicDetails && selectedTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-card shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-ink">Topic Details</h2>
              <Button
                onClick={() => {
                  setShowTopicDetails(false);
                  setSelectedTopic(null);
                }}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-navy-ink mb-2">{selectedTopic.title}</h3>
                <div className="text-sm text-gray-600 mb-4">
                  By: {selectedTopic.users?.nickname || selectedTopic.users?.email || 'Unknown'} • 
                  Category: {selectedTopic.forum_categories?.name || 'Uncategorized'} • 
                  {new Date(selectedTopic.created_at).toLocaleDateString()}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {selectedTopic.content}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowTopicDetails(false);
                    setSelectedTopic(null);
                  }}
                  variant="primary"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    deleteTopic(selectedTopic.id);
                    setShowTopicDetails(false);
                    setSelectedTopic(null);
                  }}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Topic
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

