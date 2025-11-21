import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Tag, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_url?: string;
  post_type: string;
  published_at?: string;
  created_at: string;
  blog_categories?: BlogCategory;
  author_id: string;
}

export function BlogPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [postType, setPostType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, postType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postsRes, categoriesRes] = await Promise.all([
        (() => {
          let query = insforge.database
            .from('blog_posts')
            .select('*, blog_categories(*)')
            .eq('status', 'published')
            .order('published_at', { ascending: false });

          if (selectedCategory) {
            query = query.eq('category_id', selectedCategory);
          }
          if (postType !== 'all') {
            query = query.eq('post_type', postType);
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
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading blog posts...</p>
      </div>
    );
  }

  const featuredPost = posts.find(p => p.post_type === 'news');
  const regularPosts = posts.filter(p => p.id !== featuredPost?.id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-navy-ink mb-2">News & Blog</h1>
            <p className="text-gray-600">Stay updated with the latest news and announcements</p>
          </div>
          {user && (
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Types</option>
            <option value="post">Blog Posts</option>
            <option value="news">News</option>
            <option value="announcement">Announcements</option>
          </select>
        </div>
      </div>

      {/* Featured Post */}
      {featuredPost && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden mb-8">
          {featuredPost.featured_image_url && (
            <img
              src={featuredPost.featured_image_url}
              alt={featuredPost.title}
              className="w-full h-64 object-cover"
            />
          )}
          <div className="p-8">
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {featuredPost.published_at
                  ? new Date(featuredPost.published_at).toLocaleDateString()
                  : new Date(featuredPost.created_at).toLocaleDateString()}
              </span>
              {featuredPost.blog_categories && (
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {featuredPost.blog_categories.name}
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-navy-ink mb-4">{featuredPost.title}</h2>
            {featuredPost.excerpt && (
              <p className="text-gray-700 mb-6">{featuredPost.excerpt}</p>
            )}
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="inline-flex items-center text-gold font-semibold hover:underline"
            >
              Read More <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regularPosts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="bg-white rounded-card shadow-soft overflow-hidden hover:shadow-lg transition-shadow"
          >
            {post.featured_image_url && (
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString()
                    : new Date(post.created_at).toLocaleDateString()}
                </span>
                {post.blog_categories && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    {post.blog_categories.name}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-navy-ink mb-2">{post.title}</h3>
              {post.excerpt && (
                <p className="text-gray-600 line-clamp-3">{post.excerpt}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No blog posts found</p>
        </div>
      )}
    </div>
  );
}

