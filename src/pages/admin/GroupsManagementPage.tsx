import React, { useEffect, useState } from 'react';
import { Users, Trash2, Search, Eye, Lock, Unlock, X, Check, AlertCircle, Pause, Play } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { getStorageUrl } from '../../lib/connection';

interface Group {
  id: string;
  name: string;
  description?: string;
  group_type?: string;
  image_url?: string;
  is_public: boolean;
  max_members?: number;
  status?: string;
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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchGroups();
  }, [filterType, filterStatus]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // Fetch all groups with proper joins
      let query = insforge.database
        .from('groups')
        .select(`
          *,
          users!groups_created_by_fkey(
            id,
            nickname,
            email,
            avatar_url
          ),
          group_members(
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('group_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching groups:', error);
        // Try fallback query if foreign key join fails
        const fallbackQuery = insforge.database
          .from('groups')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (filterType !== 'all') {
          fallbackQuery.eq('group_type', filterType);
        }
        if (filterStatus !== 'all') {
          fallbackQuery.eq('status', filterStatus);
        }
        
        const { data: fallbackData } = await fallbackQuery;
        
        // Manually fetch creator info for each group
        if (fallbackData) {
          const groupsWithCreators = await Promise.all(
            fallbackData.map(async (group: any) => {
              try {
                const { data: creatorData } = await insforge.database
                  .from('users')
                  .select('id, nickname, email, avatar_url')
                  .eq('id', group.created_by)
                  .single();
                
                const { data: membersData } = await insforge.database
                  .from('group_members')
                  .select('id, user_id, role, joined_at')
                  .eq('group_id', group.id);
                
                return {
                  ...group,
                  users: creatorData || null,
                  group_members: membersData || []
                };
              } catch (err) {
                console.error('Error fetching creator for group:', group.id, err);
                return {
                  ...group,
                  users: null,
                  group_members: []
                };
              }
            })
          );
          setGroups(groupsWithCreators);
        } else {
          setGroups([]);
        }
      } else {
        setGroups(data || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
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

  const updateGroupStatus = async (groupId: string, newStatus: string) => {
    try {
      const { data: updatedGroup, error } = await insforge.database
        .from('groups')
        .update({ status: newStatus })
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        console.error('Error updating group status:', error);
        alert(`Failed to update group status: ${error.message}`);
        return;
      }

      // Notify the group creator
      if (updatedGroup?.created_by) {
        try {
          let notificationTitle = '';
          let notificationMessage = '';

          if (newStatus === 'approved' || newStatus === 'active') {
            notificationTitle = 'Group Approved';
            notificationMessage = `Your group "${updatedGroup.name}" has been approved and is now active!`;
          } else if (newStatus === 'rejected') {
            notificationTitle = 'Group Rejected';
            notificationMessage = `Your group creation request for "${updatedGroup.name}" has been rejected. Please contact administrators for more information.`;
          } else if (newStatus === 'inactive') {
            notificationTitle = 'Group Deactivated';
            notificationMessage = `Your group "${updatedGroup.name}" has been deactivated by administrators.`;
          }

          if (notificationTitle) {
            await insforge.database
              .from('notifications')
              .insert([{
                user_id: updatedGroup.created_by,
                type: 'group',
                title: notificationTitle,
                message: notificationMessage,
                related_id: groupId,
                link_url: '/groups',
                read: false
              }]);
          }
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      fetchGroups();
      alert(`Group status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating group status:', error);
      alert(`Failed to update group status: ${error.message || 'Unknown error'}`);
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
    group.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {groups.filter(g => g.status === 'pending').length > 0 && (
          <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="text-amber-600" size={24} />
                <div>
                  <p className="font-medium text-amber-900">
                    ⚠️ {groups.filter(g => g.status === 'pending').length} new group(s) waiting for your approval
                  </p>
                  <p className="text-sm text-amber-700">Someone created a group and it's pending your review. Please approve or reject it.</p>
                </div>
              </div>
            </div>
          </div>
        )}
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
                <th className="text-left py-3 px-6">Approval Status</th>
                <th className="text-left py-3 px-6">Visibility</th>
                <th className="text-left py-3 px-6">Created</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr key={group.id} className="border-b">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {group.image_url && (
                        <img
                          src={group.image_url.startsWith('http') ? group.image_url : getStorageUrl('gallery', group.image_url)}
                          alt={group.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-gray-500 line-clamp-1">{group.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <div className="flex items-center gap-2">
                      {group.users?.avatar_url && (
                        <img
                          src={group.users.avatar_url.startsWith('http') ? group.users.avatar_url : getStorageUrl('avatars', group.users.avatar_url)}
                          alt={group.users.nickname || group.users.email}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span>{group.users?.nickname || group.users?.email || 'Unknown'}</span>
                    </div>
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
                      group.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      group.status === 'approved' || group.status === 'active' ? 'bg-green-100 text-green-800' :
                      group.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      group.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {group.status || 'pending'}
                    </span>
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
                    <div className="flex gap-2 flex-wrap">
                      {group.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => {
                              if (confirm('Approve this group and make it active?')) {
                                updateGroupStatus(group.id, 'approved');
                              }
                            }}
                            variant="primary"
                            size="sm"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm('Reject this group creation request?')) {
                                updateGroupStatus(group.id, 'rejected');
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      )}
                      {(group.status === 'approved' || group.status === 'active') && (
                        <Button
                          onClick={() => {
                            if (confirm('Deactivate this group?')) {
                              updateGroupStatus(group.id, 'inactive');
                            }
                          }}
                          variant="outline"
                          size="sm"
                          title="Deactivate"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {group.status === 'inactive' && (
                        <Button
                          onClick={() => {
                            if (confirm('Activate this group?')) {
                              updateGroupStatus(group.id, 'active');
                            }
                          }}
                          variant="outline"
                          size="sm"
                          title="Activate"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
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
                    <span className="font-medium">Approval Status:</span>{' '}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedGroup.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      selectedGroup.status === 'approved' || selectedGroup.status === 'active' ? 'bg-green-100 text-green-800' :
                      selectedGroup.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      selectedGroup.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedGroup.status || 'pending'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Visibility:</span>{' '}
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
                      <div className="flex items-center gap-3">
                        {member.users?.avatar_url ? (
                          <img
                            src={member.users.avatar_url.startsWith('http') ? member.users.avatar_url : getStorageUrl('avatars', member.users.avatar_url)}
                            alt={member.users.nickname || member.users.email}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold">
                            {(member.users?.nickname || member.users?.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">
                            {member.users?.nickname || member.users?.email || 'Unknown'}
                          </span>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {member.role}
                          </span>
                        </div>
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

