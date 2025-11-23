import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Pin, Lock, Send, Check } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

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
  created_at: string;
  forum_categories?: {
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

interface ForumReply {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
    avatar_url?: string;
  };
}

export function ForumTopicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTopic();
      fetchReplies();
    }
  }, [id]);

  const fetchTopic = async () => {
    if (!id) return;

    try {
      // Fetch topic first
      const { data } = await insforge.database
        .from('forum_topics')
        .select('*, forum_categories(*), users(*)')
        .eq('id', id)
        .single();

      if (data) {
        setTopic(data);
        
        // Increment view count (only if user is viewing, not the creator)
        if (user && user.id !== data.user_id) {
          await insforge.database
            .from('forum_topics')
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq('id', id);
        }
      }
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    if (!id) return;

    try {
      const { data } = await insforge.database
        .from('forum_replies')
        .select('*, users(*)')
        .eq('topic_id', id)
        .order('created_at', { ascending: true });

      setReplies(data || []);

      // Update reply count
      if (topic) {
        await insforge.database
          .from('forum_topics')
          .update({ reply_count: (data?.length || 0), last_reply_at: new Date().toISOString() })
          .eq('id', id);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !replyContent.trim()) return;

    try {
      setSubmitting(true);
      const { data: newReply, error: replyError } = await insforge.database
        .from('forum_replies')
        .insert({
          topic_id: id,
          user_id: user.id,
          content: replyContent.trim()
        })
        .select()
        .single();

      if (replyError) throw replyError;

      // Notify topic creator and followers about new reply
      if (topic) {
        try {
          // Get topic creator and all followers
          const { data: followers } = await insforge.database
            .from('forum_topic_follows')
            .select('user_id')
            .eq('topic_id', id);

          const notifyUserIds = new Set<string>();
          
          // Add topic creator
          if (topic.user_id !== user.id) {
            notifyUserIds.add(topic.user_id);
          }

          // Add followers
          followers?.forEach((f: any) => {
            if (f.user_id !== user.id) {
              notifyUserIds.add(f.user_id);
            }
          });

          // Create notifications
          if (notifyUserIds.size > 0) {
            const notifications = Array.from(notifyUserIds).map(uid => ({
              user_id: uid,
              type: 'forum_reply',
              title: `New Reply to "${topic.title}"`,
              message: `${user.nickname || user.email} replied to your topic.`,
              related_id: id,
              link_url: `/forum/topic/${id}`,
              read: false
            }));

            await insforge.database.from('notifications').insert(notifications);
          }

          // Auto-follow topic for the user who replied
          await insforge.database
            .from('forum_topic_follows')
            .insert({
              topic_id: id,
              user_id: user.id
            })
            .onConflict('topic_id,user_id')
            .ignore();
        } catch (notifError) {
          console.warn('Could not send notifications:', notifError);
        }
      }

      setReplyContent('');
      fetchReplies();
      fetchTopic(); // Update reply count
    } catch (error: any) {
      console.error('Error submitting reply:', error);
      alert(error.message || 'Error submitting reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const markAsSolution = async (replyId: string) => {
    if (!user || !topic || topic.user_id !== user.id) return;

    try {
      // Unmark all other solutions
      await insforge.database
        .from('forum_replies')
        .update({ is_solution: false })
        .eq('topic_id', topic.id);

      // Mark this as solution
      await insforge.database
        .from('forum_replies')
        .update({ is_solution: true })
        .eq('id', replyId);

      fetchReplies();
    } catch (error) {
      console.error('Error marking solution:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading topic...</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <p className="text-gray-600">Topic not found</p>
          <Link to="/forum" className="text-gold hover:underline mt-4 inline-block">
            Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        to="/forum"
        className="inline-flex items-center text-gold hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Forum
      </Link>

      {/* Topic */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {topic.is_pinned && (
                <Pin className="w-4 h-4 text-gold" />
              )}
              {topic.is_locked && (
                <Lock className="w-4 h-4 text-gray-500" />
              )}
              <h1 className="text-2xl font-bold text-navy-ink">{topic.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>{topic.forum_categories?.name || 'Uncategorized'}</span>
              <span>{topic.view_count} views</span>
              <span>{topic.reply_count} replies</span>
            </div>
          </div>
        </div>
        <div className="prose max-w-none mb-4">
          <p className="text-gray-700 whitespace-pre-wrap">{topic.content}</p>
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            {topic.users?.avatar_url ? (
              <img
                src={topic.users.avatar_url}
                alt={topic.users.nickname || topic.users.email}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold">
                {(topic.users?.nickname || topic.users?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-navy-ink">
                {topic.users?.nickname || topic.users?.email || 'Anonymous'}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(topic.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">
          Replies ({replies.length})
        </h2>
        <div className="space-y-4">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`bg-white p-6 rounded-card shadow-soft ${
                reply.is_solution ? 'border-2 border-green-500' : ''
              }`}
            >
              {reply.is_solution && (
                <div className="flex items-center gap-2 text-green-600 mb-3">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Marked as Solution</span>
                </div>
              )}
              <div className="prose max-w-none mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  {reply.users?.avatar_url ? (
                    <img
                      src={reply.users.avatar_url}
                      alt={reply.users.nickname || reply.users.email}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {(reply.users?.nickname || reply.users?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-navy-ink">
                      {reply.users?.nickname || reply.users?.email || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(reply.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {user && topic.user_id === user.id && !reply.is_solution && (
                  <Button
                    onClick={() => markAsSolution(reply.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Solution
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {replies.length === 0 && (
          <div className="bg-white p-12 rounded-card shadow-soft text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No replies yet. Be the first to reply!</p>
          </div>
        )}
      </div>

      {/* Reply Form */}
      {!topic.is_locked && user ? (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Post a Reply</h2>
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              rows={6}
              placeholder="Write your reply..."
              required
            />
            <Button type="submit" variant="primary" disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Posting...' : 'Post Reply'}
            </Button>
          </form>
        </div>
      ) : topic.is_locked ? (
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">This topic is locked and no longer accepts replies.</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <p className="text-gray-600">Please <Link to="/login" className="text-gold hover:underline">log in</Link> to reply.</p>
        </div>
      )}
    </div>
  );
}

