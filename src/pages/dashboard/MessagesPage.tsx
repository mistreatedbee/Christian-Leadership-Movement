import React, { useEffect, useState } from 'react';
import { Mail, Send, Search, User, Check, CheckCheck } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { getStorageUrl } from '../../lib/connection';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    nickname?: string;
    email?: string;
    avatar_url?: string;
  };
  recipient?: {
    id: string;
    nickname?: string;
    email?: string;
    avatar_url?: string;
  };
}

export function MessagesPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    recipient_email: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, activeTab]);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const query = activeTab === 'inbox'
        ? insforge.database
            .from('messages')
            .select('*, sender:users!messages_sender_id_fkey(*)')
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false })
        : insforge.database
            .from('messages')
            .select('*, recipient:users!messages_recipient_id_fkey(*)')
            .eq('sender_id', user.id)
            .order('created_at', { ascending: false });

      const { data } = await query;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);

    // Mark as read if it's an inbox message
    if (activeTab === 'inbox' && !message.is_read && user) {
      try {
        await insforge.database
          .from('messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', message.id);
        fetchMessages();
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Find recipient by email
      const { data: recipient } = await insforge.database
        .from('users')
        .select('id')
        .eq('email', composeData.recipient_email)
        .single();

      if (!recipient) {
        alert('User not found with that email address');
        return;
      }

      await insforge.database
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipient.id,
          subject: composeData.subject,
          content: composeData.content
        });

      setComposeData({ recipient_email: '', subject: '', content: '' });
      setComposeOpen(false);
      fetchMessages();
      alert('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    }
  };

  const filteredMessages = messages.filter(msg => {
    const searchLower = searchTerm.toLowerCase();
    return (
      msg.subject?.toLowerCase().includes(searchLower) ||
      msg.content.toLowerCase().includes(searchLower) ||
      (activeTab === 'inbox'
        ? msg.sender?.email?.toLowerCase().includes(searchLower) ||
          msg.sender?.nickname?.toLowerCase().includes(searchLower)
        : msg.recipient?.email?.toLowerCase().includes(searchLower) ||
          msg.recipient?.nickname?.toLowerCase().includes(searchLower))
    );
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to view messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Messages</h1>
          <p className="text-gray-600">Send and receive messages</p>
        </div>
        <Button onClick={() => setComposeOpen(true)} variant="primary">
          <Send className="w-4 h-4 mr-2" />
          Compose
        </Button>
      </div>

      {/* Compose Modal */}
      {composeOpen && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Compose Message</h2>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To (Email)
              </label>
              <input
                type="email"
                value={composeData.recipient_email}
                onChange={(e) => setComposeData({ ...composeData, recipient_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={composeData.content}
                onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={6}
                required
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Send</Button>
              <Button type="button" onClick={() => setComposeOpen(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs and Search */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('inbox');
                setSelectedMessage(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'inbox'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Inbox {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => {
                setActiveTab('sent');
                setSelectedMessage(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'sent'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Sent
            </button>
          </div>
          <div className="relative flex-1 max-w-md ml-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredMessages.map((message) => {
              const otherUser = activeTab === 'inbox' ? message.sender : message.recipient;
              return (
                <button
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={`w-full text-left p-4 hover:bg-muted-gray transition-colors ${
                    selectedMessage?.id === message.id ? 'bg-muted-gray' : ''
                  } ${!message.is_read && activeTab === 'inbox' ? 'font-semibold' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {otherUser?.avatar_url ? (
                        <img
                          src={otherUser.avatar_url.startsWith('http') ? otherUser.avatar_url : getStorageUrl('avatars', otherUser.avatar_url)}
                          alt={otherUser.nickname || otherUser.email}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<div class="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-white text-xs font-bold">${(otherUser?.nickname || otherUser?.email || 'U')[0].toUpperCase()}</div>`;
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-white text-xs font-bold">
                          {(otherUser?.nickname || otherUser?.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-navy-ink">
                          {otherUser?.nickname || otherUser?.email || 'Unknown'}
                        </p>
                        {message.subject && (
                          <p className="text-xs text-gray-600">{message.subject}</p>
                        )}
                      </div>
                    </div>
                    {activeTab === 'sent' && (
                      message.is_read ? (
                        <CheckCheck className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Check className="w-4 h-4 text-gray-400" />
                      )
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(message.created_at).toLocaleDateString()}
                  </p>
                </button>
              );
            })}
          </div>
          {filteredMessages.length === 0 && (
            <div className="p-12 text-center">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No messages</p>
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 bg-white rounded-card shadow-soft p-6">
          {selectedMessage ? (
            <div>
              <div className="flex items-start justify-between mb-4 pb-4 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-navy-ink mb-2">
                    {selectedMessage.subject || 'No Subject'}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      {activeTab === 'inbox' ? 'From' : 'To'}:{' '}
                      {activeTab === 'inbox'
                        ? selectedMessage.sender?.nickname || selectedMessage.sender?.email
                        : selectedMessage.recipient?.nickname || selectedMessage.recipient?.email}
                    </span>
                    <span>
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a message to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

