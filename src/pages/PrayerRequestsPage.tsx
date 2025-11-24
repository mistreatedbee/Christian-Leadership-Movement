import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, Lock, Globe, Users, LayoutDashboard, ThumbsUp, MessageCircle, Share2, Filter, CheckCircle, X, Send, Smile, HandHeart, Sparkles, TrendingUp, Calendar, Tag } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { getStorageUrl } from '../lib/connection';

interface PrayerRequest {
  id: string;
  user_id?: string;
  title: string;
  request: string;
  is_public: boolean;
  is_anonymous: boolean;
  status: string;
  prayer_count: number;
  like_count?: number;
  comment_count?: number;
  category?: string;
  tags?: string[];
  is_answered?: boolean;
  answer_description?: string;
  created_at: string;
  users?: {
    id: string;
    nickname?: string;
    avatar_url?: string;
  };
  my_reaction?: string;
  my_has_prayed?: boolean;
}

interface PrayerComment {
  id: string;
  prayer_request_id: string;
  user_id: string;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  users?: {
    id: string;
    nickname?: string;
    avatar_url?: string;
  };
}

const REACTION_TYPES = [
  { type: 'like', label: 'Like', icon: ThumbsUp, color: 'text-blue-500' },
  { type: 'love', label: 'Love', icon: Heart, color: 'text-red-500' },
  { type: 'support', label: 'Support', icon: HandHeart, color: 'text-green-500' },
  { type: 'amen', label: 'Amen', icon: Sparkles, color: 'text-purple-500' }
];

const CATEGORIES = [
  'Healing',
  'Guidance',
  'Provision',
  'Protection',
  'Family',
  'Work',
  'Relationships',
  'Health',
  'Financial',
  'Spiritual Growth',
  'Other'
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_prayers', label: 'Most Prayers' },
  { value: 'most_likes', label: 'Most Likes' },
  { value: 'most_comments', label: 'Most Comments' }
];

export function PrayerRequestsPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showAnswered, setShowAnswered] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, PrayerComment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    title: '',
    request: '',
    category: '',
    tags: [] as string[],
    is_public: true,
    is_anonymous: false
  });

  useEffect(() => {
    if (isLoaded) {
      fetchRequests();
    }
  }, [isLoaded, selectedCategory, sortBy, showAnswered]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      let query = insforge.database
        .from('prayer_requests')
        .select('*, users(id, nickname, avatar_url)')
        .eq('status', 'active')
        .eq('is_public', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (!showAnswered) {
        query = query.eq('is_answered', false);
      }

      const { data: publicRequests } = await query;

      // If user is logged in, also fetch their own requests and reactions
      let myRequests: PrayerRequest[] = [];
      let userReactions: Record<string, string> = {};
      let userPrayed: Record<string, boolean> = {};

      if (user) {
        const [userRequestsRes, reactionsRes, prayedRes] = await Promise.all([
          insforge.database
            .from('prayer_requests')
            .select('*, users(id, nickname, avatar_url)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          insforge.database
            .from('prayer_likes')
            .select('prayer_request_id, reaction_type')
            .eq('user_id', user.id),
          insforge.database
            .from('prayer_responses')
            .select('prayer_request_id')
            .eq('user_id', user.id)
        ]);

        myRequests = userRequestsRes.data || [];
        
        (reactionsRes.data || []).forEach((r: any) => {
          userReactions[r.prayer_request_id] = r.reaction_type;
        });

        (prayedRes.data || []).forEach((p: any) => {
          userPrayed[p.prayer_request_id] = true;
        });
      }

      // Combine requests
      const allRequests = [...(publicRequests || [])];
      myRequests.forEach(myReq => {
        if (!allRequests.find(r => r.id === myReq.id)) {
          allRequests.push(myReq);
        }
      });

      // Add user reactions and prayed status
      allRequests.forEach(req => {
        req.my_reaction = userReactions[req.id];
        req.my_has_prayed = userPrayed[req.id] || false;
      });

      // Sort requests
      allRequests.sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'most_prayers':
            return (b.prayer_count || 0) - (a.prayer_count || 0);
          case 'most_likes':
            return (b.like_count || 0) - (a.like_count || 0);
          case 'most_comments':
            return (b.comment_count || 0) - (a.comment_count || 0);
          default: // newest
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });

      setRequests(allRequests);
    } catch (error) {
      console.error('Error fetching prayer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (requestId: string) => {
    if (comments[requestId]) return; // Already loaded

    try {
      setLoadingComments({ ...loadingComments, [requestId]: true });
      const { data } = await insforge.database
        .from('prayer_comments')
        .select('*, users(id, nickname, avatar_url)')
        .eq('prayer_request_id', requestId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      setComments({ ...comments, [requestId]: data || [] });
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments({ ...loadingComments, [requestId]: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data: prayerRequest } = await insforge.database
        .from('prayer_requests')
        .insert({
          user_id: user.id,
          title: formData.title,
          request: formData.request,
          category: formData.category || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          is_public: formData.is_public,
          is_anonymous: formData.is_anonymous,
          status: 'pending'
        })
        .select()
        .single();

      // Create notification for admins
      try {
        const { data: admins } = await insforge.database
          .from('user_profiles')
          .select('user_id')
          .in('role', ['admin', 'super_admin']);

        if (admins && admins.length > 0 && prayerRequest) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.user_id,
            type: 'prayer_request',
            title: 'New Prayer Request',
            message: `A new prayer request "${formData.title}" has been submitted${formData.is_anonymous ? ' (anonymous)' : ''}. Please review and approve.`,
            related_id: prayerRequest.id,
            link_url: '/admin/prayer-requests',
            read: false
          }));

          await insforge.database.from('notifications').insert(notifications);
        }
      } catch (notifErr) {
        console.error('Error sending admin notifications:', notifErr);
      }

      setFormData({ title: '', request: '', category: '', tags: [], is_public: true, is_anonymous: false });
      setShowForm(false);
      fetchRequests();
      alert('Prayer request submitted successfully! It will be reviewed by administrators.');
    } catch (error: any) {
      console.error('Error submitting prayer request:', error);
      alert(error.message || 'Error submitting prayer request. Please try again.');
    }
  };

  const handleReact = async (requestId: string, reactionType: string) => {
    if (!user) {
      alert('Please log in to react');
      return;
    }

    try {
      const request = requests.find(r => r.id === requestId);
      const currentReaction = request?.my_reaction;

      // If clicking the same reaction, remove it
      if (currentReaction === reactionType) {
        await insforge.database
          .from('prayer_likes')
          .delete()
          .eq('prayer_request_id', requestId)
          .eq('user_id', user.id);

        fetchRequests();
        return;
      }

      // Remove existing reaction if any
      if (currentReaction) {
        await insforge.database
          .from('prayer_likes')
          .delete()
          .eq('prayer_request_id', requestId)
          .eq('user_id', user.id);
      }

      // Add new reaction
      await insforge.database
        .from('prayer_likes')
        .insert({
          prayer_request_id: requestId,
          user_id: user.id,
          reaction_type: reactionType
        });

      fetchRequests();
    } catch (error: any) {
      console.error('Error reacting:', error);
      alert(error.message || 'Error recording reaction. Please try again.');
    }
  };

  const handlePray = async (requestId: string) => {
    if (!user) {
      alert('Please log in to pray for requests');
      return;
    }

    try {
      if (requests.find(r => r.id === requestId)?.my_has_prayed) {
        alert('You have already prayed for this request');
        return;
      }

      await insforge.database
        .from('prayer_responses')
        .insert({
          prayer_request_id: requestId,
          user_id: user.id
        });

      const request = requests.find(r => r.id === requestId);
      if (request) {
        await insforge.database
          .from('prayer_requests')
          .update({ prayer_count: (request.prayer_count || 0) + 1 })
          .eq('id', requestId);
      }

      fetchRequests();
    } catch (error: any) {
      console.error('Error praying for request:', error);
      alert(error.message || 'Error recording your prayer. Please try again.');
    }
  };

  const handleAddComment = async (requestId: string) => {
    if (!user) {
      alert('Please log in to comment');
      return;
    }

    const text = commentText[requestId]?.trim();
    if (!text) return;

    try {
      await insforge.database
        .from('prayer_comments')
        .insert({
          prayer_request_id: requestId,
          user_id: user.id,
          comment: text,
          is_anonymous: false
        });

      setCommentText({ ...commentText, [requestId]: '' });
      fetchComments(requestId);
      fetchRequests(); // Update comment count
    } catch (error: any) {
      console.error('Error adding comment:', error);
      alert(error.message || 'Error adding comment. Please try again.');
    }
  };

  const handleShare = async (requestId: string) => {
    const url = `${window.location.origin}/prayer-requests#${requestId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
    }
  };

  const toggleComments = (requestId: string) => {
    if (expandedRequest === requestId) {
      setExpandedRequest(null);
    } else {
      setExpandedRequest(requestId);
      fetchComments(requestId);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading prayer requests...</p>
      </div>
    );
  }

  const filteredRequests = requests.filter(req => {
    if (showAnswered && !req.is_answered) return false;
    if (!showAnswered && req.is_answered) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Prayer Wall</h1>
          <p className="text-gray-600">Share your prayer requests and pray for others</p>
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
              <Button onClick={() => setShowForm(!showForm)} variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="bg-white p-4 rounded-card shadow-soft mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAnswered}
                onChange={(e) => setShowAnswered(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Show Answered Prayers</span>
            </label>
          </div>
        </div>
      </div>

      {/* Submit Form */}
      {showForm && user && (
        <div className="bg-white p-6 rounded-card shadow-soft mb-8">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Submit Prayer Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prayer Request *</label>
              <textarea
                value={formData.request}
                onChange={(e) => setFormData({ ...formData, request: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={5}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              >
                <option value="">Select a category (optional)</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Make public</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Submit anonymously</span>
              </label>
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Submit</Button>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Prayer Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white p-12 rounded-card shadow-soft text-center">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No prayer requests found. Be the first to share!</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const isMyRequest = user && request.user_id === user.id;
            const isPending = request.status === 'pending';
            const isActive = request.status === 'active';
            const isExpanded = expandedRequest === request.id;
            
            return (
              <div key={request.id} className="bg-white p-6 rounded-card shadow-soft hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-navy-ink">{request.title}</h3>
                      {isPending && isMyRequest && (
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
                          Pending Approval
                        </span>
                      )}
                      {request.is_answered && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Answered
                        </span>
                      )}
                      {request.category && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {request.category}
                        </span>
                      )}
                      {request.is_public ? (
                        <Globe className="w-4 h-4 text-blue-500" title="Public" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-500" title="Private" />
                      )}
                    </div>
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{request.request}</p>
                    
                    {request.is_answered && request.answer_description && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-1">Praise Report:</p>
                        <p className="text-sm text-green-700">{request.answer_description}</p>
                      </div>
                    )}

                    {isPending && isMyRequest && (
                      <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          ⏳ Your prayer request is pending review by administrators.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                      {isActive && (
                        <>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {request.prayer_count || 0} prayers
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {request.like_count || 0} reactions
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {request.comment_count || 0} comments
                          </span>
                        </>
                      )}
                    </div>

                    {/* Reactions */}
                    {user && isActive && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {REACTION_TYPES.map(({ type, label, icon: Icon, color }) => {
                          const isActive = request.my_reaction === type;
                          return (
                            <button
                              key={type}
                              onClick={() => handleReact(request.id, type)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm border transition-colors ${
                                isActive
                                  ? `${color} border-current bg-opacity-10`
                                  : 'text-gray-600 border-gray-300 hover:border-gray-400'
                              }`}
                              title={label}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {user && isActive && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isMyRequest && !request.my_has_prayed && (
                          <Button
                            onClick={() => handlePray(request.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Heart className="w-4 h-4 mr-2" />
                            Pray for This
                          </Button>
                        )}
                        {request.my_has_prayed && (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            You prayed for this
                          </span>
                        )}
                        <Button
                          onClick={() => toggleComments(request.id)}
                          variant="outline"
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {isExpanded ? 'Hide' : 'Show'} Comments ({request.comment_count || 0})
                        </Button>
                        <Button
                          onClick={() => handleShare(request.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-3">
                      {loadingComments[request.id] ? (
                        <p className="text-sm text-gray-500">Loading comments...</p>
                      ) : (
                        <>
                          {(comments[request.id] || []).map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              {comment.users?.avatar_url ? (
                                <img
                                  src={getStorageUrl('avatars', comment.users.avatar_url)}
                                  alt="Avatar"
                                  className="w-8 h-8 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/assets/images/default-avatar.png';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-sm font-semibold text-navy-ink mb-1">
                                    {comment.is_anonymous ? 'Anonymous' : (comment.users?.nickname || 'User')}
                                  </p>
                                  <p className="text-sm text-gray-700">{comment.comment}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {(!comments[request.id] || comments[request.id].length === 0) && (
                            <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
                          )}
                        </>
                      )}

                      {user && (
                        <div className="flex gap-2 mt-4">
                          <input
                            type="text"
                            value={commentText[request.id] || ''}
                            onChange={(e) => setCommentText({ ...commentText, [request.id]: e.target.value })}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(request.id);
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleAddComment(request.id)}
                            variant="primary"
                            size="sm"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
