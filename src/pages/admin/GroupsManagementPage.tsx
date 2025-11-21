import React, { useEffect, useState } from 'react';
import { Users, Trash2, Search, Eye, Lock, Unlock, X } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Group {
  id: string;
  name: string;
  description?: string;
  group_type?: string;
  image_url?: string;
  is_public: boolean;
  max_members?: number;
  created_by: string;
  created_at: string;
  group_members?: {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
  }[];
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

export function GroupsManagementPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchGroups();
  }, [filterType]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      let query = insforge.database
        .from('groups')
        .select('*, users(*), group_members(*)')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('group_type', filterType);
      }

      const { data } = await query;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data } = await insforge.database
        .from('group_members')
        .select('*, users(*)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false });

      setGroupMembers(data || []);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? All members and related data will also be deleted.')) {
      return;
    }

    try {
      // Delete group messages first
      await insforge.database
        .from('group_messages')
        .delete()
        .eq('group_id', groupId);

      // Delete group events
      await insforge.database
        .from('group_events')
        .delete()
        .eq('group_id', groupId);

      // Delete group members
      await insforge.database
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      // Delete group image if exists
      const group = groups.find(g => g.id === groupId);
      if (group?.image_url) {
        try {
          await insforge.storage.from('gallery').remove(group.image_url);
        } catch (storageError) {
          console.warn('Error deleting group image:', storageError);
        }
      }

      // Delete group
      await insforge.database
        .from('groups')
        .delete()
        .eq('id', groupId);

      fetchGroups();
      alert('Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  const togglePublic = async (groupId: string, currentStatus: boolean) => {
    try {
      await insforge.database
        .from('groups')
        .update({ is_public: !currentStatus })
        .eq('id', groupId);

      fetchGroups();
    } catch (error) {
      console.error('Error toggling public status:', error);
      alert('Failed to update group status');
    }
  };

  const removeMember = async (memberId: string, groupId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }

    try {
      await insforge.database
        .from('group_members')
        .delete()
        .eq('id', memberId);

      fetchGroupMembers(groupId);
      fetchGroups();
      alert('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupTypes = Array.from(new Set(groups.map(g => g.group_type).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Groups Management</h1>
        <p className="text-gray-600">Manage groups, members, and group content</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Types</option>
            {groupTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Groups Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Group Name</th>
                <th className="text-left py-3 px-6">Creator</th>
                <th className="text-left py-3 px-6">Type</th>
                <th className="text-left py-3 px-6">Members</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Created</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr key={group.id} className="border-b">
                  <td className="py-4 px-6">
                    <div className="font-medium">{group.name}</div>
                    {group.description && (
                      <div className="text-sm text-gray-500 line-clamp-1">{group.description}</div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    {group.users?.nickname || group.users?.email || 'Unknown'}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    {group.group_type || 'N/A'}
                  </td>
                  <td className="py-4 px-6">
                    {group.group_members?.length || 0}
                    {group.max_members && ` / ${group.max_members}`}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      group.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.is_public ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(group.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          setSelectedGroup(group);
                          await fetchGroupMembers(group.id);
                          setShowGroupDetails(true);
                        }}
                        variant="outline"
                        size="sm"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => togglePublic(group.id, group.is_public)}
                        variant="outline"
                        size="sm"
                        title={group.is_public ? "Make Private" : "Make Public"}
                      >
                        {group.is_public ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={() => deleteGroup(group.id)}
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
        {filteredGroups.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No groups found</p>
          </div>
        )}
      </div>

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-card shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-ink">Group Details</h2>
              <Button
                onClick={() => {
                  setShowGroupDetails(false);
                  setSelectedGroup(null);
                  setGroupMembers([]);
                }}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-navy-ink mb-2">{selectedGroup.name}</h3>
                {selectedGroup.description && (
                  <p className="text-gray-600 mb-4">{selectedGroup.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {selectedGroup.group_type || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedGroup.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedGroup.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Creator:</span> {selectedGroup.users?.nickname || selectedGroup.users?.email || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(selectedGroup.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-navy-ink mb-3">Members ({groupMembers.length})</h4>
                <div className="divide-y">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          {member.users?.nickname || member.users?.email || 'Unknown'}
                        </span>
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {member.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          Joined: {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                        {member.role !== 'admin' && (
                          <Button
                            onClick={() => removeMember(member.id, selectedGroup.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {groupMembers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No members found</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowGroupDetails(false);
                    setSelectedGroup(null);
                    setGroupMembers([]);
                  }}
                  variant="primary"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    deleteGroup(selectedGroup.id);
                    setShowGroupDetails(false);
                    setSelectedGroup(null);
                    setGroupMembers([]);
                  }}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

