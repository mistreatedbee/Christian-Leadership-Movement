import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, MessageSquare, Settings, UserPlus, Mail } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

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

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);
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
          .order('events(event_date)'),
        insforge.database
          .from('group_messages')
          .select('*, users(*)')
          .eq('group_id', id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      setGroup(groupRes.data);
      setMembers(membersRes.data || []);
      setEvents(eventsRes.data || []);
      setMessages(messagesRes.data || []);

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
      await insforge.database
        .from('group_messages')
        .insert({
          group_id: id,
          user_id: user.id,
          content: messageContent.trim()
        });
      setMessageContent('');
      fetchData(); // Refresh messages
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.message || 'Error sending message. Please try again.');
    }
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
                src={group.image_url}
                alt={group.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
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
                      src={member.users.avatar_url}
                      alt={member.users.nickname || member.users.email}
                      className="w-12 h-12 rounded-full"
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
                        src={message.users.avatar_url}
                        alt={message.users.nickname || message.users.email}
                        className="w-10 h-10 rounded-full"
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
                      <p className="text-gray-700">{message.content}</p>
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

