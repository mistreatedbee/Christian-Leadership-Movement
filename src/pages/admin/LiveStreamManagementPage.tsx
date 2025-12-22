import React, { useEffect, useState } from 'react';
import { Video, Plus, Edit, Trash2, Play, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface LiveStream {
  id: string;
  event_id?: string;
  title: string;
  description?: string;
  stream_url?: string;
  provider?: string;
  status: string;
  scheduled_start: string;
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  viewer_count: number;
  events?: {
    id: string;
    title: string;
    event_date: string;
  };
}

interface Event {
  id: string;
  title: string;
  event_date: string;
}

export function LiveStreamManagementPage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStream, setEditingStream] = useState<LiveStream | null>(null);
  const [formData, setFormData] = useState({
    event_id: '',
    title: '',
    description: '',
    stream_url: '',
    stream_key: '',
    provider: 'youtube',
    scheduled_start: '',
    recording_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [streamsRes, eventsRes] = await Promise.all([
        insforge.database
          .from('live_streams')
          .select('*, events(*)')
          .order('scheduled_start', { ascending: false }),
        insforge.database
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString())
          .order('event_date')
      ]);

      setStreams(streamsRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        event_id: formData.event_id || null,
        scheduled_start: formData.scheduled_start,
        status: 'scheduled'
      };

      if (editingStream) {
        await insforge.database
          .from('live_streams')
          .update(data)
          .eq('id', editingStream.id);
      } else {
        await insforge.database
          .from('live_streams')
          .insert(data);
      }

      setShowForm(false);
      setEditingStream(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving stream:', error);
      alert('Error saving stream');
    }
  };

  const resetForm = () => {
    setFormData({
      event_id: '',
      title: '',
      description: '',
      stream_url: '',
      stream_key: '',
      provider: 'youtube',
      scheduled_start: '',
      recording_url: ''
    });
  };

  const handleEdit = (stream: LiveStream) => {
    setEditingStream(stream);
    setFormData({
      event_id: stream.event_id || '',
      title: stream.title,
      description: stream.description || '',
      stream_url: stream.stream_url || '',
      stream_key: '',
      provider: stream.provider || 'youtube',
      scheduled_start: stream.scheduled_start ? stream.scheduled_start.split('T')[0] + 'T' + stream.scheduled_start.split('T')[1]?.substring(0, 5) : '',
      recording_url: stream.recording_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stream?')) return;

    try {
      await insforge.database
        .from('live_streams')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting stream:', error);
      alert('Error deleting stream');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'live') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'ended') {
        updateData.ended_at = new Date().toISOString();
        updateData.status = 'recorded';
      }
      await insforge.database
        .from('live_streams')
        .update(updateData)
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading streams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Live Stream Management</h1>
          <p className="text-gray-600">Manage live streams and recordings</p>
        </div>
        <Button
          onClick={() => {
            setEditingStream(null);
            resetForm();
            setShowForm(true);
          }}
          variant="primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Stream
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">
            {editingStream ? 'Edit Stream' : 'Create Stream'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event (Optional)</label>
              <select
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              >
                <option value="">No Event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                >
                  <option value="youtube">YouTube</option>
                  <option value="zoom">Zoom</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Start *</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stream URL</label>
              <input
                type="url"
                value={formData.stream_url}
                onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stream Key (Optional)</label>
              <input
                type="text"
                value={formData.stream_key}
                onChange={(e) => setFormData({ ...formData, stream_key: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                placeholder="For OBS or streaming software"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recording URL (After Stream)</label>
              <input
                type="url"
                value={formData.recording_url}
                onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Save Stream</Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingStream(null);
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

      {/* Streams List */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Title</th>
                <th className="text-left py-3 px-6">Event</th>
                <th className="text-left py-3 px-6">Scheduled</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Viewers</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((stream) => (
                <tr key={stream.id} className="border-b">
                  <td className="py-4 px-6 font-medium">{stream.title}</td>
                  <td className="py-4 px-6">{stream.events?.title || 'No event'}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(stream.scheduled_start).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      stream.status === 'live' ? 'bg-red-100 text-red-800' :
                      stream.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      stream.status === 'recorded' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {stream.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">{stream.viewer_count || 0}</td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      {stream.status === 'scheduled' && (
                        <button
                          onClick={() => updateStatus(stream.id, 'live')}
                          className="text-green-600 hover:text-green-800"
                          title="Go Live"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {stream.status === 'live' && (
                        <button
                          onClick={() => updateStatus(stream.id, 'ended')}
                          className="text-red-600 hover:text-red-800"
                          title="End Stream"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(stream)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(stream.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {stream.stream_url && (
                        <a
                          href={stream.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:text-gold/80"
                        >
                          <Video className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {streams.length === 0 && (
          <div className="p-12 text-center">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No streams created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

