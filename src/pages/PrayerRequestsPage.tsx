import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, Lock, Globe, Users, LayoutDashboard } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

interface PrayerRequest {
  id: string;
  user_id?: string;
  title: string;
  request: string;
  is_public: boolean;
  is_anonymous: boolean;
  status: string;
  prayer_count: number;
  created_at: string;
}

export function PrayerRequestsPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    request: '',
    is_public: true,
    is_anonymous: false
  });

  useEffect(() => {
    if (isLoaded) {
      fetchRequests();
    }
  }, [isLoaded]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await insforge.database
        .from('prayer_requests')
        .select('*')
        .eq('status', 'active')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching prayer requests:', error);
    } finally {
      setLoading(false);
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
          ...formData,
          status: 'pending' // Set to pending for admin review
        })
        .select()
        .single();

      // Create notification for admins
      const { data: admins } = await insforge.database
        .from('user_profiles')
        .select('user_id')
        .in('role', ['admin', 'super_admin']);

      if (admins && admins.length > 0 && prayerRequest) {
        const notifications = admins.map((admin: any) => ({
          user_id: admin.user_id,
          type: 'system',
          title: 'New Prayer Request',
          message: `A new prayer request "${formData.title}" has been submitted${formData.is_anonymous ? ' (anonymous)' : ''}`,
          related_id: prayerRequest.id,
          read: false
        }));

        await insforge.database
          .from('notifications')
          .insert(notifications);
      }

      setFormData({ title: '', request: '', is_public: true, is_anonymous: false });
      setShowForm(false);
      fetchRequests();
      alert('Prayer request submitted successfully! It will be reviewed by administrators.');
    } catch (error: any) {
      console.error('Error submitting prayer request:', error);
      alert(error.message || 'Error submitting prayer request. Please try again.');
    }
  };

  const handlePray = async (requestId: string) => {
    if (!user) {
      alert('Please log in to pray for requests');
      return;
    }

    try {
      // Check if already prayed
      const { data: existing } = await insforge.database
        .from('prayer_responses')
        .select('*')
        .eq('prayer_request_id', requestId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        alert('You have already prayed for this request');
        return;
      }

      // Add prayer response
      await insforge.database
        .from('prayer_responses')
        .insert({
          prayer_request_id: requestId,
          user_id: user.id
        });

      // Update prayer count
      const request = requests.find(r => r.id === requestId);
      if (request) {
        await insforge.database
          .from('prayer_requests')
          .update({ prayer_count: (request.prayer_count || 0) + 1 })
          .eq('id', requestId);
      }

      fetchRequests();
      alert('Thank you for praying!');
    } catch (error: any) {
      console.error('Error praying for request:', error);
      alert(error.message || 'Error recording your prayer. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading prayer requests...</p>
      </div>
    );
  }

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

      {/* Submit Form */}
      {showForm && user && (
        <div className="bg-white p-6 rounded-card shadow-soft mb-8">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Submit Prayer Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prayer Request</label>
              <textarea
                value={formData.request}
                onChange={(e) => setFormData({ ...formData, request: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={5}
                required
              />
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
        {requests.length === 0 ? (
          <div className="bg-white p-12 rounded-card shadow-soft text-center">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No prayer requests yet. Be the first to share!</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white p-6 rounded-card shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-navy-ink">{request.title}</h3>
                    {request.is_public ? (
                      <Globe className="w-4 h-4 text-blue-500" title="Public" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" title="Private" />
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{request.request}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {request.prayer_count || 0} prayers
                    </span>
                  </div>
                </div>
              </div>
              {user && (
                <Button
                  onClick={() => handlePray(request.id)}
                  variant="outline"
                  size="sm"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Pray for This
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

