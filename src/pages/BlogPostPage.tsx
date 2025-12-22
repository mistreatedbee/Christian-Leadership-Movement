import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, Tag, ArrowLeft, Share2 } from 'lucide-react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

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
  published_at?: string;
  created_at: string;
  blog_categories?: {
    id: string;
    name: string;
    slug: string;
  };
  users?: {
    id: string;
    nickname?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      // Fetch post
      const { data: postData } = await insforge.database
        .from('blog_posts')
        .select('*, blog_categories(*), users(*)')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (postData) {
        setPost(postData);

        // Increment view count
        await insforge.database
          .from('blog_posts')
          .update({ view_count: (postData.view_count || 0) + 1 })
          .eq('id', postData.id);

        // Fetch related posts
        const { data: related } = await insforge.database
          .from('blog_posts')
          .select('*, blog_categories(*), users(*)')
          .eq('status', 'published')
          .neq('id', postData.id)
          .or(`category_id.eq.${postData.category_id},post_type.eq.${postData.post_type}`)
          .limit(3);

        setRelatedPosts(related || []);

        // Fetch tags
        const { data: tagData } = await insforge.database
          .from('blog_post_tags')
          .select('blog_tags(*)')
          .eq('post_id', postData.id);

        setTags(tagData?.map((t: any) => t.blog_tags).filter(Boolean) || []);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.excerpt,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <p className="text-gray-600">Post not found</p>
          <Link to="/blog" className="text-gold hover:underline mt-4 inline-block">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        to="/blog"
        className="inline-flex items-center text-gold hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Blog
      </Link>

      {/* Featured Image */}
      {post.featured_image_url && (
        <img
          src={post.featured_image_url}
          alt={post.title}
          className="w-full h-64 md:h-96 object-cover rounded-card mb-6"
        />
      )}

      {/* Post Content */}
      <article className="bg-white p-8 rounded-card shadow-soft mb-8">
        {/* Meta Information */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              : new Date(post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
          </span>
          {post.users && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.users.nickname || post.users.email}
            </span>
          )}
          {post.blog_categories && (
            <span className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              {post.blog_categories.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-navy-ink mb-4">{post.title}</h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-xl text-gray-600 mb-6 italic">{post.excerpt}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/blog?tag=${tag.slug}`}
                className="px-3 py-1 bg-muted-gray rounded-full text-sm text-navy-ink hover:bg-gold hover:text-white transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose max-w-none mb-6">
          <div
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Share Button */}
        <div className="pt-6 border-t">
          <Button onClick={handleShare} variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share Post
          </Button>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-ink mb-4">Related Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((relatedPost) => (
              <Link
                key={relatedPost.id}
                to={`/blog/${relatedPost.slug}`}
                className="bg-white rounded-card shadow-soft overflow-hidden hover:shadow-lg transition-shadow"
              >
                {relatedPost.featured_image_url && (
                  <img
                    src={relatedPost.featured_image_url}
                    alt={relatedPost.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-navy-ink mb-2 line-clamp-2">
                    {relatedPost.title}
                  </h3>
                  {relatedPost.excerpt && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

