import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Calendar, MessageSquare, Settings, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { getStorageUrl } from '../lib/connection';

// Helper function to ensure image URL is a full public URL
function getPublicImageUrl(imageUrl: string | null | undefined, bucket: 'avatars' | 'gallery' = 'gallery'): string | null {
  if (!imageUrl) return null;
  
  // If already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Use connection utility for consistent URL handling
  const key = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
  return getStorageUrl(bucket, key);
}

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
  created_at?: string;
  group_members?: {
    id: string;
    user_id: string;
    role: string;
  }[];
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

interface FormDataState {
  name: string;
  description: string;
  group_type: string;
  is_public: boolean;
  max_members: string;
}

export function GroupsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    description: '',
    group_type: 'ministry',
    is_public: true,
    max_members: ''
  });

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      const [allApprovedGroupsRes, myCreatedGroupsRes] = await Promise.all([
        // 1. Fetch ALL approved/active groups (public and private)
        // Note: For private groups, users should only see them if they are members. 
        // We rely on the `myGroupsRes` fetch below to ensure membership is accounted for.
        insforge.database
          .from('groups')
          .select('*, users(*), group_members(*)')
          .in('status', ['approved', 'active'])
          .order('created_at', { ascending: false }),
        
        // 2. Fetch groups user created (to see pending/rejected status in "My Groups")
        user ? insforge.database
          .from('groups')
          .select('*, users(*), group_members(*)')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .then(res => res.data || [])
        : Promise.resolve([])
      ]);

      // 3. Fetch groups user is explicitly a member of (including private approved/active groups)
      const myMemberGroupsRes = user ? (await insforge.database
        .from('group_members')
        .select('group_id, groups(*, users(*), group_members(*))')
        .eq('user_id', user.id)
        .then(res => res.data?.map((item: any) => item.groups).filter(Boolean) || [])
      ) : [];

      // Helper to safely add groups and ensure uniqueness
      const groupIds = new Set<string>();
      const allGroupsMap = new Map<string, Group>();

      const addGroupsToMap = (groupArray: (Group | null)[] | undefined) => {
        if (groupArray) {
          groupArray.forEach((group: Group | null) => {
            if (group && group.id && !groupIds.has(group.id)) {
              allGroupsMap.set(group.id, group);
              groupIds.add(group.id);
            }
          });
        }
      };

      // Populate map with all relevant groups
      addGroupsToMap(allApprovedGroupsRes.data as Group[]);
      addGroupsToMap(myMemberGroupsRes as Group[]);
      addGroupsToMap(myCreatedGroupsRes as Group[]);
      
      const combinedAllGroups = Array.from(allGroupsMap.values());
      
      // ----------------------------------------------------------------------------------
      // FIX LOGIC: Separate groups for the general directory and the user's private list.
      // ----------------------------------------------------------------------------------

      // A. Groups for the main "All Groups" Directory: 
      //    Only public groups that are approved/active, OR approved/active groups that the user is already a member of.
      const groupsForDisplay = combinedAllGroups.filter(g => 
        (g.is_public && (g.status === 'approved' || g.status === 'active')) || 
        myMemberGroupsRes.some(mg => mg.id === g.id)
      );

      // B. Groups for the "My Groups" Section:
      //    Any group the user created OR is a member of, regardless of public status or approval status.
      const myGroupsForDisplay = combinedAllGroups.filter(g => 
        g.created_by === user?.id || myMemberGroupsRes.some(mg => mg.id === g.id)
      );
      
      // Remove duplicates from myGroupsForDisplay (already done by the map, but filter again for safety)
      const uniqueMyGroups = myGroupsForDisplay.filter((group, index, self) =>
        index === self.findIndex(g => g.id === group.id)
      );
      
      setGroups(groupsForDisplay);
      setMyGroups(uniqueMyGroups);
      
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
      setGroups([]);
      setMyGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to create a group');
      return;
    }

    try {
      // Create group with pending status
      const { data, error } = await insforge.database
        .from('groups')
        .insert({
          ...formData,
          max_members: formData.max_members ? parseInt(formData.max_members) : null,
          created_by: user.id,
          status: 'pending' // Set to pending for admin review
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data || !data.id) {
        throw new Error('Group creation failed: No data returned');
      }

      // Add creator as admin
      const { error: memberError } = await insforge.database
        .from('group_members')
        .insert({
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) {
        console.error('Error adding creator as admin:', memberError);
      }

      // Create notifications for user and admins (logic remains the same)
      try {
        await insforge.database
          .from('notifications')
          .insert([{
            user_id: user.id,
            type: 'group',
            title: 'Group Creation Request Submitted',
            message: `Your request to create the group "${formData.name}" has been submitted and is currently pending review by administrators. You will be notified once it's approved or rejected.`,
            related_id: data.id,
            link_url: '/groups',
            read: false
          }]);
      } catch (userNotifError) {
        console.error('Error creating user notification:', userNotifError);
      }

      try {
        const { data: admins } = await insforge.database
          .from('user_profiles')
          .select('user_id')
          .in('role', ['admin', 'super_admin']);

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.user_id,
            type: 'group',
            title: 'New Group Pending Approval',
            message: `A new group "${formData.name}" has been created and is pending your review. Please approve or reject it.`,
            related_id: data.id,
            link_url: '/admin/groups?status=pending',
            read: false
          }));

          await insforge.database
            .from('notifications')
            .insert(notifications);
        }
      } catch (notifError) {
        console.error('Error creating admin notifications:', notifError);
      }

      setFormData({
        name: '',
        description: '',
        group_type: 'ministry',
        is_public: true,
        max_members: ''
      });
      setShowForm(false);
      
      // Immediately refresh groups so the newly created group appears in "My Groups"
      await fetchGroups();
      
      alert('✅ Your group has been created successfully! It is currently under review by administrators. You will be notified once it\'s approved or rejected. You can see it in "My Groups" section below.');
    } catch (error: any) {
      console.error('Error creating group:', error);
      alert(error.message || 'Error creating group. Please try again.');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      alert('Please log in to join groups');
      return;
    }

    try {
      await insforge.database
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });
      
      // Use fetchGroups to refresh both myGroups and groups lists
      fetchGroups(); 
      alert('Successfully joined group!');
    } catch (error: any) {
      console.error('Error joining group:', error);
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        alert('You are already a member of this group.');
      } else {
        alert(error.message || 'Error joining group. Please try again.');
      }
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Groups & Ministries</h1>
          <p className="text-gray-600">Join groups and connect with others</p>
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
              <Button onClick={() => setShowForm(true)} variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Create Group Form */}
      {showForm && user && (
        <div className="bg-white p-6 rounded-card shadow-soft mb-8">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Create New Group</h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.group_type}
                  onChange={(e) => setFormData({ ...formData, group_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                >
                  <option value="ministry">Ministry</option>
                  <option value="small_group">Small Group</option>
                  <option value="committee">Committee</option>
                  <option value="team">Team</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Members (Optional)</label>
                <input
                  type="number"
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  min="1"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Make group public</label>
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Create Group</Button>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* My Groups - Shows all groups the user created OR is a member of */}
      {myGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-ink mb-4">My Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myGroups.map((group) => {
              const isMyGroup = user && group.created_by === user.id;
              const isMember = myGroups.some(g => g.id === group.id); // True by definition of myGroups list
              const isPending = group.status === 'pending';
              const isRejected = group.status === 'rejected';
              const isApproved = group.status === 'approved' || group.status === 'active';
              
              // Determine if the user is a member AND the group is approved, allowing a View link.
              const canViewGroup = isMember && isApproved;
              
              return (
                <div
                  key={group.id}
                  className="bg-white p-6 rounded-card shadow-soft hover:shadow-lg transition-shadow"
                >
                  {group.image_url && (
                    <img
                      src={getPublicImageUrl(group.image_url, 'gallery') || group.image_url}
                      alt={group.name}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-navy-ink">{group.name}</h3>
                    {/* Status Badges for My Created Groups */}
                    {isMyGroup && isPending && (
                      <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full font-medium">
                        ⏳ Pending
                      </span>
                    )}
                    {isMyGroup && isRejected && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                        ❌ Rejected
                      </span>
                    )}
                    {isMyGroup && isApproved && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                        ✅ Approved
                      </span>
                    )}
                    {/* Fallback for other users' approved groups in My Groups list */}
                    {!isMyGroup && isApproved && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                            Member
                        </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                  )}
                  
                  {/* Status Box for Pending/Rejected Groups */}
                  {isMyGroup && isPending && (
                    <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        ⏳ Pending Review
                      </p>
                      <p className="text-sm text-amber-800">
                        Your group is currently under review by the admin.
                      </p>
                    </div>
                  )}
                  {isMyGroup && isRejected && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        ❌ Rejected
                      </p>
                      <p className="text-sm text-red-800">
                        Your group creation request has been rejected.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {group.group_members?.length || 0} members
                      </span>
                    </div>
                    {canViewGroup && (
                      <Link to={`/groups/${group.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    )}
                    {isMyGroup && (isPending || isRejected) && (
                      <Button variant="outline" size="sm" disabled>Details</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-8">
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
      </div>

      {/* All Groups - Shows only approved/active public groups */}
      <div>
        <h2 className="text-2xl font-bold text-navy-ink mb-4">All Groups</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            // Check membership status against the full list of myGroups
            const isMember = myGroups.some(g => g.id === group.id);
            
            // Only groups with status approved/active should be in filteredGroups
            // Only public groups should be here unless the user is a member
            
            return (
              <div key={group.id} className="bg-white p-6 rounded-card shadow-soft">
                {group.image_url && (
                  <img
                    src={getPublicImageUrl(group.image_url, 'gallery') || group.image_url}
                    alt={group.name}
                    className="w-full h-32 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <h3 className="text-xl font-bold text-navy-ink mb-2">{group.name}</h3>
                {group.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {group.group_members?.length || 0}
                      {group.max_members && ` / ${group.max_members}`} members
                    </span>
                  </div>
                  
                  {user && !isMember && (
                    <Button
                      onClick={() => handleJoinGroup(group.id)}
                      variant="primary"
                      size="sm"
                    >
                      Join
                    </Button>
                  )}
                  
                  {isMember && (
                    <Link to={`/groups/${group.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  )}
                  
                  {!user && (
                    <Button variant="primary" size="sm" disabled>
                        Log in to Join
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filteredGroups.length === 0 && (
          <div className="bg-white p-12 rounded-card shadow-soft text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No groups found</p>
          </div>
        )}
      </div>
    </div>
  );
}
