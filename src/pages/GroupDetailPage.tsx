import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, MessageSquare, Settings, UserPlus, Mail, Heart, Smile, ThumbsUp, Reply, X } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { getStorageUrl } from '../lib/connection';

// Helper function to ensure avatar/image URL is a full public URL
function getPublicImageUrl(imageUrl: string | null | undefined, bucket: 'avatars' | 'gallery' = 'avatars'): string | null {
  if (!imageUrl) return null;
  
  // If already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Use connection utility for consistent URL handling
  const key = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
  return getStorageUrl(bucket, key);
}

// --- INTERFACES (UNCHANGED, ASSUMING THEY MATCH DB RELATIONS) ---
interface Group {
  id: string;
  name: string;
  description?: string;
  group_type?: string;
  image_url?: string;
  is_public: boolean;
  max_members?: number;
  created_by: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface GroupEvent {
  id: string;
  group_id: string;
  event_id: string;
  events?: {
    id: string;
    title: string;
    description?: string;
    event_date: string;
    location?: string;
  };
}

interface GroupMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

interface GroupMessageReply {
  id: string;
  message_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
    avatar_url?: string;
  };
  reactions?: GroupMessageReaction[];
  replies?: GroupMessageReply[];
}


export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'events' | 'messages'>('overview');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showReactions, setShowReactions] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // --- FIX: Combine all message-related queries using nested selects ---
      const messageSelect = `
        *, 
        users!user_id(*),
        reactions:group_message_reactions(
          *,
          users!user_id(id, nickname, email)
        ),
        replies:group_message_replies(
          *,
          users!user_id(id, nickname, email, avatar_url)
        )
      `;

      const [groupRes, membersRes, eventsRes, messagesRes] = await Promise.all([
        insforge.database
          .from('groups')
          .select('*, users(*)')
          .eq('id', id)
          .single(),
        insforge.database
          .from('group_members')
          .select('*, users(*)')
          .eq('group_id', id)
          .order('joined_at'),
        insforge.database
          .from('group_events')
          .select('*, events(*)')
          .eq('group_id', id)
          // Note: Filtering/ordering on a foreign key like this is an advanced feature. 
          // If the simple .select('*, events(*)') fails, you may need to fetch events separately 
          // and sort in client-side JS or use RPC. Assuming it works here.
          .order('events(event_date)'), 
        insforge.database
          .from('group_messages')
          .select(messageSelect) // <-- Using the combined select statement
          .eq('group_id', id)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      // Remove the redundant message processing logic:
      // if (messagesRes.data && messagesRes.data.length > 0) { ... }
      
      setMessages(messagesRes.data as GroupMessage[] || []); // Data is already merged/shaped
      setGroup(groupRes.data);
      setMembers(membersRes.data || []);
      setEvents(eventsRes.data || []);

      if (user) {
        const userMember = membersRes.data?.find(m => m.user_id === user.id);
        setIsMember(!!userMember);
        setUserRole(userMember?.role || '');
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !id) return;

    try {
      await insforge.database
        .from('group_members')
        .insert({
          group_id: id,
          user_id: user.id,
          role: 'member'
        });
      fetchData();
      alert('Successfully joined the group!');
    } catch (error: any) {
      console.error('Error joining group:', error);
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        alert('You are already a member of this group.');
      } else {
        alert(error.message || 'Error joining group. Please try again.');
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !messageContent.trim()) return;

    try {
      const { error } = await insforge.database
        .from('group_messages')
        .insert({
          group_id: id,
          user_id: user.id,
          content: messageContent.trim()
        });

      if (error) throw error;

      // Notify all group members (except the sender) about the new message
      try {
        const { data: groupMembers } = await insforge.database
          .from('group_members')
          .select('user_id')
          .eq('group_id', id)
          .neq('user_id', user.id);

        if (groupMembers && groupMembers.length > 0 && group) {
          const notifications = groupMembers.map((member: any) => ({
            user_id: member.user_id,
            type: 'group',
            title: `New Message in ${group.name}`,
            message: `${user.nickname || user.email || 'Someone'} posted a new message in the group "${group.name}": "${messageContent.trim().substring(0, 100)}${messageContent.trim().length > 100 ? '...' : ''}"`,
            related_id: id,
            link_url: `/groups/${id}`,
            read: false
          }));

          await insforge.database
            .from('notifications')
            .insert(notifications);
        }
      } catch (notifError) {
        console.error('Error creating group message notifications:', notifError);
        // Don't fail the message sending if notifications fail
      }

      setMessageContent('');
      fetchData(); // Refresh messages
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.message || 'Error sending message. Please try again.');
    }
  };

  const handleAddReaction = async (messageId: string, reactionType: string) => {
    if (!user || !id) return;

    try {
      // Check if user already reacted with this type
      const { data: existing } = await insforge.database
        .from('group_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        await insforge.database
          .from('group_message_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Remove any existing reaction from this user on this message
        await insforge.database
          .from('group_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id);

        // Add new reaction
        await insforge.database
          .from('group_message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            reaction_type: reactionType
          });
      }
      fetchData();
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      alert(error.message || 'Error adding reaction. Please try again.');
    }
  };

  const handleSendReply = async (messageId: string) => {
    if (!user || !id || !replyContent.trim()) return;

    try {
      await insforge.database
        .from('group_message_replies')
        .insert({
          message_id: messageId,
          user_id: user.id,
          content: replyContent.trim()
        });
      setReplyContent('');
      setReplyingTo(null);
      fetchData();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      alert(error.message || 'Error sending reply. Please try again.');
    }
  };

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'like': return '👍';
      case 'love': return '❤️';
      case 'laugh': return '😂';
      case 'wow': return '😮';
      case 'sad': return '😢';
      case 'angry': return '😠';
      case 'pray': return '🙏';
      default: return '👍';
    }
  };

  const getReactionCount = (message: GroupMessage, type: string) => {
    return message.reactions?.filter(r => r.reaction_type === type).length || 0;
  };

  const hasUserReacted = (message: GroupMessage, type: string) => {
    return message.reactions?.some(r => r.user_id === user?.id && r.reaction_type === type) || false;
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await insforge.database
        .from('group_members')
        .delete()
        .eq('id', memberId);
      fetchData();
      alert('Member removed successfully');
    } catch (error: any) {
      console.error('Error removing member:', error);
      alert(error.message || 'Error removing member. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <p className="text-gray-600">Group not found</p>
          <Link to="/groups" className="text-gold hover:underline mt-4 inline-block">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === 'admin' || userRole === 'leader';
  const canManage = isAdmin || group.created_by === user?.id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/groups"
        className="inline-flex items-center text-gold hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Groups
      </Link>

      {/* Group Header */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {group.image_url && (
              <img
                src={getPublicImageUrl(group.image_url, 'gallery') || group.image_url}
                alt={group.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <h1 className="text-3xl font-bold text-navy-ink mb-2">{group.name}</h1>
            {group.description && (
              <p className="text-gray-700 mb-4">{group.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {members.length} member{members.length !== 1 ? 's' : ''}
                {group.max_members && ` / ${group.max_members}`}
              </span>
              {group.group_type && (
                <span className="capitalize">{group.group_type.replace('_', ' ')}</span>
              )}
            </div>
          </div>
          <div>
            {!isMember && user ? (
              <Button onClick={handleJoinGroup} variant="primary">
                <UserPlus className="w-4 h-4 mr-2" />
                Join Group
              </Button>
            ) : isMember && (
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                Member
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-6">
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-gold text-gold'
                : 'text-gray-600 hover:text-navy-ink'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'members'
                ? 'border-b-2 border-gold text-gold'
                : 'text-gray-600 hover:text-navy-ink'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'events'
                ? 'border-b-2 border-gold text-gold'
                : 'text-gray-600 hover:text-navy-ink'
            }`}
          >
            Events ({events.length})
          </button>
          {isMember && (
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'messages'
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-gray-600 hover:text-navy-ink'
              }`}
            >
              Messages
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-navy-ink mb-4">About This Group</h2>
            {group.description ? (
              <p className="text-gray-700 whitespace-pre-wrap">{group.description}</p>
            ) : (
              <p className="text-gray-600">No description provided.</p>
            )}
          </div>
        )}

        {/* Members */}
        {activeTab === 'members' && (
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {member.users?.avatar_url ? (
                    <img
                      src={getPublicImageUrl(member.users.avatar_url, 'avatars') || member.users.avatar_url}
                      alt={member.users.nickname || member.users.email}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-white font-bold">
                      {(member.users?.nickname || member.users?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-navy-ink">
                      {member.users?.nickname || member.users?.email || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {member.role} • Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canManage && member.user_id !== user?.id && (
                  <Button
                    onClick={() => handleRemoveMember(member.id)}
                    variant="outline"
                    size="sm"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Events */}
        {activeTab === 'events' && (
          <div className="divide-y">
            {events.map((groupEvent) => (
              <div key={groupEvent.id} className="p-6">
                {groupEvent.events && (
                  <>
                    <h3 className="text-lg font-semibold text-navy-ink mb-2">
                      {groupEvent.events.title}
                    </h3>
                    {groupEvent.events.description && (
                      <p className="text-gray-600 mb-3">{groupEvent.events.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(groupEvent.events.event_date).toLocaleDateString()} at{' '}
                        {new Date(groupEvent.events.event_date).toLocaleTimeString()}
                      </span>
                      {groupEvent.events.location && (
                        <span>{groupEvent.events.location}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {events.length === 0 && (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No events scheduled</p>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {activeTab === 'messages' && isMember && (
          <div>
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-navy-ink mb-4">Group Messages</h2>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                />
                <Button type="submit" variant="primary">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </form>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="p-6">
                  <div className="flex items-start gap-4">
                    {message.users?.avatar_url ? (
                      <img
                        src={getPublicImageUrl(message.users.avatar_url, 'avatars') || message.users.avatar_url}
                        alt={message.users.nickname || message.users.email}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {(message.users?.nickname || message.users?.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-navy-ink">
                          {message.users?.nickname || message.users?.email || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-700 mb-3">{message.content}</p>
                      
                      {/* Reactions */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          {['like', 'love', 'laugh', 'pray'].map((type) => {
                            const count = getReactionCount(message, type);
                            if (count === 0) return null;
                            return (
                              <button
                                key={type}
                                onClick={() => handleAddReaction(message.id, type)}
                                className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${
                                  hasUserReacted(message, type)
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={type.charAt(0).toUpperCase() + type.slice(1)}
                              >
                                <span>{getReactionIcon(type)}</span>
                                <span>{count}</span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setShowReactions(showReactions === message.id ? null : message.id)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          {showReactions === message.id ? 'Hide' : 'React'}
                        </button>
                        <button
                          onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                          className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                        >
                          <Reply className="w-4 h-4" />
                          Reply
                        </button>
                      </div>

                      {/* Reaction Picker */}
                      {showReactions === message.id && (
                        <div className="flex gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                          {['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'pray'].map((type) => (
                            <button
                              key={type}
                              onClick={() => {
                                handleAddReaction(message.id, type);
                                setShowReactions(null);
                              }}
                              className={`p-2 rounded-full hover:bg-gray-200 ${
                                hasUserReacted(message, type) ? 'bg-blue-100' : ''
                              }`}
                              title={type.charAt(0).toUpperCase() + type.slice(1)}
                            >
                              <span className="text-xl">{getReactionIcon(type)}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      {replyingTo === message.id && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendReply(message.id);
                            }}
                            className="flex gap-2"
                          >
                            <input
                              type="text"
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write a reply..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                            />
                            <Button type="submit" variant="primary" size="sm">
                              Send
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent('');
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </form>
                        </div>
                      )}

                      {/* Replies */}
                      {message.replies && message.replies.length > 0 && (
                        <div className="ml-4 mt-3 space-y-3 border-l-2 border-gray-200 pl-4">
                          {message.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3">
                              {reply.users?.avatar_url ? (
                                <img
                                  src={getPublicImageUrl(reply.users.avatar_url, 'avatars') || reply.users.avatar_url}
                                  alt={reply.users.nickname || reply.users.email}
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                                  {(reply.users?.nickname || reply.users?.email || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm text-navy-ink">
                                    {reply.users?.nickname || reply.users?.email || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(reply.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-700">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {messages.length === 0 && (
              <div className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No messages yet. Start the conversation!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
