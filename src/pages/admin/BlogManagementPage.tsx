import React, { useEffect, useState } from 'react';
import { FileText, Plus, Edit, Trash2, Search, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface BlogPost {
  id: string;
  author_id: string;
  category_id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  post_type: string;
  status: string;
  published_at?: string;
  created_at: string;
  blog_categories?: {
    id: string;
    name: string;
  };
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export function BlogManagementPage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    post_type: 'post',
    status: 'draft',
    published_at: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postsRes, categoriesRes] = await Promise.all([
        (() => {
          let query = insforge.database
            .from('blog_posts')
            .select('*, blog_categories(*)')
            .order('created_at', { ascending: false });

          if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
          }
          return query;
        })(),
        insforge.database
          .from('blog_categories')
          .select('*')
      ]);

      setPosts(postsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const slug = formData.slug || generateSlug(formData.title);
      const data = {
        ...formData,
        author_id: user.id,
        slug,
        category_id: formData.category_id || null,
        published_at: formData.status === 'published' && !formData.published_at
          ? new Date().toISOString()
          : formData.published_at || null
      };

      if (editingPost) {
        await insforge.database
          .from('blog_posts')
          .update(data)
          .eq('id', editingPost.id);
      } else {
        await insforge.database
          .from('blog_posts')
          .insert(data);
      }

      setShowForm(false);
      setEditingPost(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Error saving post');
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      post_type: 'post',
      status: 'draft',
      published_at: ''
    });
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      category_id: post.category_id || '',
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content,
      post_type: post.post_type,
      status: post.status,
      published_at: post.published_at ? post.published_at.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await insforge.database
        .from('blog_posts')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error deleting post');
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      await insforge.database
        .from('blog_posts')
        .update({
          status: newStatus,
          published_at: newStatus === 'published' && !post.published_at
            ? new Date().toISOString()
            : post.published_at
        })
        .eq('id', post.id);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading blog posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Blog Management</h1>
          <p className="text-gray-600">Create and manage blog posts, news, and announcements</p>
        </div>
        <Button
          onClick={() => {
            setEditingPost(null);
            resetForm();
            setShowForm(true);
          }}
          variant="primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">
            {editingPost ? 'Edit Post' : 'Create Post'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      title: e.target.value,
                      slug: formData.slug || generateSlug(e.target.value)
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.post_type}
                  onChange={(e) => setFormData({ ...formData, post_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                >
                  <option value="post">Blog Post</option>
                  <option value="news">News</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={10}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {formData.status === 'published' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                  <input
                    type="datetime-local"
                    value={formData.published_at}
                    onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Save Post</Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPost(null);
                  resetForm();
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Posts List */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Title</th>
                <th className="text-left py-3 px-6">Type</th>
                <th className="text-left py-3 px-6">Category</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Published</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <tr key={post.id} className="border-b">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-navy-ink">{post.title}</p>
                      {post.excerpt && (
                        <p className="text-sm text-gray-600 line-clamp-1">{post.excerpt}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 capitalize">{post.post_type}</td>
                  <td className="py-4 px-6">{post.blog_categories?.name || 'Uncategorized'}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      post.status === 'published' ? 'bg-green-100 text-green-800' :
                      post.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString()
                      : 'Not published'}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleStatus(post)}
                        className="text-blue-600 hover:text-blue-800"
                        title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {post.status === 'published' ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(post)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {post.status === 'published' && (
                        <Link
                          to={`/blog/${post.slug}`}
                          target="_blank"
                          className="text-gold hover:text-gold/80"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPosts.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No posts found</p>
          </div>
        )}
      </div>
    </div>
  );
}

