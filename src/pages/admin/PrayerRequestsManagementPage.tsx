import React, { useEffect, useState } from 'react';
import { Heart, Check, X, Archive, Search, Trash2 } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

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

export function PrayerRequestsManagementPage() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = insforge.database
        .from('prayer_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data } = await query;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching prayer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await insforge.database
        .from('prayer_requests')
        .update({ status })
        .eq('id', id);

      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prayer request? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete prayer responses first (cascade)
      await insforge.database
        .from('prayer_responses')
        .delete()
        .eq('prayer_request_id', id);

      // Delete prayer request
      await insforge.database
        .from('prayer_requests')
        .delete()
        .eq('id', id);

      fetchRequests();
    } catch (error) {
      console.error('Error deleting prayer request:', error);
      alert('Failed to delete prayer request');
    }
  };

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.request.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading prayer requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Prayer Requests Management</h1>
        <p className="text-gray-600">Manage and moderate prayer requests</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search requests..."
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
            <option value="pending">Pending Review</option>
            <option value="active">Active</option>
            <option value="answered">Answered</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Title</th>
                <th className="text-left py-3 px-6">Request</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Prayers</th>
                <th className="text-left py-3 px-6">Date</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-b">
                  <td className="py-4 px-6 font-medium">{request.title}</td>
                  <td className="py-4 px-6 text-gray-600 max-w-md truncate">{request.request}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      request.status === 'active' ? 'bg-green-100 text-green-800' :
                      request.status === 'answered' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      {request.prayer_count || 0}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(request.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <Button
                          onClick={() => updateStatus(request.id, 'active')}
                          variant="primary"
                          size="sm"
                          title="Approve & Activate"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {request.status !== 'answered' && request.status !== 'pending' && (
                        <Button
                          onClick={() => updateStatus(request.id, 'answered')}
                          variant="outline"
                          size="sm"
                          title="Mark as Answered"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {request.status !== 'archived' && (
                        <Button
                          onClick={() => updateStatus(request.id, 'archived')}
                          variant="outline"
                          size="sm"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDelete(request.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRequests.length === 0 && (
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No prayer requests found</p>
        </div>
      )}
    </div>
  );
}

