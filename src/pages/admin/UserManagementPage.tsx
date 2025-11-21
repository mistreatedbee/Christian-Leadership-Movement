import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Mail, Shield, Save, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { useUser } from '@insforge/react';

interface User {
  id: string;
  user_id: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  address: string | null;
  date_of_birth: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export function UserManagementPage() {
  const { user: currentUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all user profiles with user details
      const { data: profiles, error } = await insforge.database
        .from('user_profiles')
        .select(`
          *,
          users!inner(id, nickname, avatar_url, bio, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include email from auth (we'll need to get it differently)
      const usersData = (profiles || []).map((profile: any) => ({
        id: profile.id,
        user_id: profile.user_id,
        nickname: profile.users?.nickname || null,
        email: null, // Email is in auth.users, not accessible directly
        phone: profile.phone,
        city: profile.city,
        province: profile.province,
        postal_code: profile.postal_code,
        address: profile.address,
        date_of_birth: profile.date_of_birth,
        role: profile.role || 'user',
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }));

      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user.user_id);
    setEditForm({
      role: user.role,
      phone: user.phone || '',
      city: user.city || '',
      province: user.province || '',
      postal_code: user.postal_code || '',
      address: user.address || '',
      date_of_birth: user.date_of_birth || ''
    });
  };

  const handleSave = async (userId: string) => {
    try {
      const { error } = await insforge.database
        .from('user_profiles')
        .update({
          role: editForm.role,
          phone: editForm.phone || null,
          city: editForm.city || null,
          province: editForm.province || null,
          postal_code: editForm.postal_code || null,
          address: editForm.address || null,
          date_of_birth: editForm.date_of_birth || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Also update users table if nickname changed
      if (editForm.nickname) {
        await insforge.database
          .from('users')
          .update({ nickname: editForm.nickname })
          .eq('id', userId);
      }

      setMessage({ type: 'success', text: 'User updated successfully!' });
      setEditingUser(null);
      setEditForm({});
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Error updating user:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update user' });
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete user profile (user record will be cascade deleted)
      const { error } = await insforge.database
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'User deleted successfully!' });
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete user' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await insforge.database
        .from('user_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'User role updated successfully!' });
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Error updating role:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.province?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">
            User Management
          </h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <Button variant="outline" onClick={fetchUsers}>
            <Filter size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">User</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Location</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Role</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Join Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.user_id} className="hover:bg-muted-gray/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold mr-3">
                          {user.nickname?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-navy-ink">{user.nickname || 'No name'}</p>
                          <p className="text-sm text-gray-600">ID: {user.user_id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-600">{user.phone || 'No phone'}</p>
                        {user.date_of_birth && (
                          <p className="text-gray-500 text-xs">
                            DOB: {new Date(user.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-600">{user.city || 'N/A'}, {user.province || 'N/A'}</p>
                        {user.postal_code && (
                          <p className="text-gray-500 text-xs">{user.postal_code}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.user_id ? (
                        <select
                          value={editForm.role || 'user'}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 ${getRoleBadgeColor(user.role)} text-sm rounded-full`}>
                          <Shield size={14} className="mr-1" />
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.user_id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(user.user_id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-card"
                            title="Save"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-card"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          {user.user_id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user.user_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-card"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
