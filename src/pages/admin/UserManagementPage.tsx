import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Mail, Shield, Save, X, Eye, Download, FileText, X as CloseIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { useUser } from '@insforge/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  avatar_url?: string | null;
  bio?: string | null;
}

interface UserApplication {
  id: string;
  program_type: string;
  status: string;
  payment_status: string;
  created_at: string;
  programs?: { title: string };
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userApplications, setUserApplications] = useState<UserApplication[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [enrichedUserData, setEnrichedUserData] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch ALL users from users table (including those who just registered)
      const { data: allUsers, error: usersError } = await insforge.database
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch all user profiles
      const { data: profiles, error: profilesError } = await insforge.database
        .from('user_profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Combine users with their profiles
      const usersData = (allUsers || []).map((user: any) => {
        const profile = profiles?.find((p: any) => p.user_id === user.id);
        return {
          id: profile?.id || user.id,
          user_id: user.id,
          nickname: user.nickname || null,
          email: user.email || null,
          phone: profile?.phone || null,
          city: profile?.city || null,
          province: profile?.province || null,
          postal_code: profile?.postal_code || null,
          address: profile?.address || null,
          date_of_birth: profile?.date_of_birth || null,
          role: profile?.role || 'user',
          created_at: user.created_at,
          updated_at: profile?.updated_at || user.updated_at,
          avatar_url: user.avatar_url || null,
          bio: user.bio || null
        };
      });

      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setLoadingApplications(true);
    setEnrichedUserData(null); // Reset enriched data
    
    try {
      // Fetch user's applications - skip join to avoid errors
      const result = await insforge.database
        .from('applications')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (result.error) {
        throw result.error;
      }

      const applications = result.data || [];
      console.log('Fetched applications:', applications);
      setUserApplications(applications);

      // Enrich user data with information from applications
      if (applications.length > 0) {
        // Get the most recent application for primary data
        const mostRecentApp = applications[0];
        console.log('Most recent application data:', mostRecentApp);
        
        // Merge application data with user profile data, prioritizing application data
        const enriched = {
          ...user,
          // Personal Information from applications - prioritize application data
          email: mostRecentApp.email || user.email || null,
          phone: mostRecentApp.phone || mostRecentApp.contact_number || user.phone || null,
          address: mostRecentApp.physical_address || mostRecentApp.address || user.address || null,
          city: mostRecentApp.city || user.city || null,
          province: mostRecentApp.province || user.province || null,
          postal_code: mostRecentApp.postal_code || user.postal_code || null,
          date_of_birth: mostRecentApp.date_of_birth || user.date_of_birth || null,
          // Additional fields from applications
          id_number: mostRecentApp.id_number || null,
          nationality: mostRecentApp.nationality || null,
          gender: mostRecentApp.gender || null,
          marital_status: mostRecentApp.marital_status || null,
          country: mostRecentApp.country || null,
          home_language: mostRecentApp.home_language || null,
          population_group: mostRecentApp.population_group || null,
          residential_status: mostRecentApp.residential_status || null,
          // Name fields - prioritize application data
          full_name: mostRecentApp.full_name || user.nickname || null,
          first_name: mostRecentApp.first_name || null,
          middle_name: mostRecentApp.middle_name || null,
          last_name: mostRecentApp.last_name || null,
          preferred_name: mostRecentApp.preferred_name || null,
          title: mostRecentApp.title || null,
        };
        
        console.log('Enriched user data:', enriched);
        setEnrichedUserData(enriched);
      } else {
        console.log('No applications found, using user data only');
        setEnrichedUserData(user);
      }

      setMessage(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setMessage({ type: 'error', text: `Failed to fetch user applications: ${err.message || 'Unknown error'}` });
      setUserApplications([]); // Set empty array on error
      setEnrichedUserData(user); // Fallback to user data only
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleExportPDF = async (user: User) => {
    try {
      // Fetch full user data and applications - handle potential join errors
      let applications: any[] = [];
      const result = await insforge.database
        .from('applications')
        .select('*, programs(title)')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (result.error) {
        // Fallback to fetching without programs join
        const fallbackResult = await insforge.database
          .from('applications')
          .select('*')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false });
        
        applications = fallbackResult.data || [];
      } else {
        applications = result.data || [];
      }

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('User Information Report', 14, 20);
      
      // User Information
      doc.setFontSize(12);
      let yPos = 35;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Personal Information', 14, yPos);
      yPos += 8;
      doc.setFont(undefined, 'normal');
      
      doc.text(`Full Name / Nickname: ${user.nickname || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Email Address: ${user.email || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Phone Number: ${user.phone || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Date of Birth: ${user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Physical Address: ${user.address || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`City: ${user.city || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Province: ${user.province || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Postal Code: ${user.postal_code || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`User Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`, 14, yPos);
      yPos += 7;
      doc.text(`Account Created: ${new Date(user.created_at).toLocaleString()}`, 14, yPos);
      yPos += 7;
      if (user.updated_at) {
        doc.text(`Last Updated: ${new Date(user.updated_at).toLocaleString()}`, 14, yPos);
        yPos += 7;
      }
      if (user.bio) {
        yPos += 3;
        doc.setFont(undefined, 'bold');
        doc.text('Bio:', 14, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        const bioLines = doc.splitTextToSize(user.bio, 180);
        bioLines.forEach((line: string) => {
          doc.text(line, 14, yPos);
          yPos += 7;
        });
      }
      yPos += 5;

      // Applications Section
      if (applications && applications.length > 0) {
        doc.setFontSize(14);
        doc.text('Applications', 14, yPos);
        yPos += 10;

        applications.forEach((app: any, index: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(10);
          doc.text(`Application ${index + 1}:`, 14, yPos);
          yPos += 6;
          doc.text(`  Program: ${app.programs?.title || app.program_type}`, 20, yPos);
          yPos += 6;
          doc.text(`  Status: ${app.status}`, 20, yPos);
          yPos += 6;
          doc.text(`  Payment Status: ${app.payment_status || 'N/A'}`, 20, yPos);
          yPos += 6;
          doc.text(`  Date: ${new Date(app.created_at).toLocaleDateString()}`, 20, yPos);
          yPos += 8;
        });
      } else {
        doc.setFontSize(10);
        doc.text('No applications found', 14, yPos);
      }

      doc.save(`user-${user.user_id.substring(0, 8)}-${Date.now()}.pdf`);
      setMessage({ type: 'success', text: 'PDF exported successfully!' });
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      setMessage({ type: 'error', text: 'Failed to export PDF' });
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
      // Check if profile exists
      const { data: existingProfile } = await insforge.database
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
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
      } else {
        // Create new profile
        const { error } = await insforge.database
          .from('user_profiles')
          .insert({
            user_id: userId,
            role: editForm.role || 'user',
            phone: editForm.phone || null,
            city: editForm.city || null,
            province: editForm.province || null,
            postal_code: editForm.postal_code || null,
            address: editForm.address || null,
            date_of_birth: editForm.date_of_birth || null
          });

        if (error) throw error;
      }

      // Update users table if nickname changed
      if (editForm.nickname) {
        await insforge.database
          .from('users')
          .update({ nickname: editForm.nickname })
          .eq('id', userId);
      }

      setMessage({ type: 'success', text: 'User updated successfully!' });
      setEditingUser(null);
      setEditForm({});
      fetchUsers();
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
      // Delete user profile first
      await insforge.database
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      // User record will be cascade deleted from auth.users
      setMessage({ type: 'success', text: 'User deleted successfully!' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete user' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { data: existingProfile } = await insforge.database
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        await insforge.database
          .from('user_profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      } else {
        await insforge.database
          .from('user_profiles')
          .insert({ user_id: userId, role: newRole });
      }

      setMessage({ type: 'success', text: 'User role updated successfully!' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating role:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <p className="text-gray-600">Manage all registered users and their applications</p>
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
                        <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold mr-3 flex-shrink-0 overflow-hidden">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.nickname || 'User'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.textContent = user.nickname?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U';
                              }}
                            />
                          ) : (
                            user.nickname?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-navy-ink">{user.nickname || 'No name'}</p>
                          <p className="text-sm text-gray-600 break-all">{user.email || 'No email'}</p>
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
                            onClick={() => handleViewDetails(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleExportPDF(user)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-card"
                            title="Export PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-card"
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

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">User Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-card"
              >
                <CloseIcon size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Profile Header */}
              <div className="flex items-start space-x-4 pb-4 border-b">
                <div className="w-20 h-20 rounded-full bg-gold flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img 
                      src={selectedUser.avatar_url} 
                      alt={enrichedUserData?.full_name || selectedUser.nickname || 'User'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const displayName = enrichedUserData?.full_name || selectedUser.nickname || selectedUser.email || 'U';
                        target.style.display = 'none';
                        target.parentElement!.textContent = displayName.charAt(0).toUpperCase();
                      }}
                    />
                  ) : (
                    (enrichedUserData?.full_name || selectedUser.nickname || selectedUser.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-navy-ink mb-1">
                    {enrichedUserData?.full_name || selectedUser.nickname || enrichedUserData?.email || selectedUser.email || 'Unknown User'}
                  </h3>
                  <p className="text-gray-600 mb-2">{enrichedUserData?.email || selectedUser.email || 'No email'}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  </span>
                </div>
              </div>

              {/* User Information */}
              <div>
                <h3 className="text-lg font-semibold text-navy-ink mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {enrichedUserData?.title && (
                    <div>
                      <p className="text-sm text-gray-600">Title</p>
                      <p className="font-medium">{enrichedUserData.title}</p>
                    </div>
                  )}
                  {enrichedUserData?.first_name && (
                    <div>
                      <p className="text-sm text-gray-600">First Name</p>
                      <p className="font-medium">{enrichedUserData.first_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.middle_name && (
                    <div>
                      <p className="text-sm text-gray-600">Middle Name</p>
                      <p className="font-medium">{enrichedUserData.middle_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.last_name && (
                    <div>
                      <p className="text-sm text-gray-600">Last Name</p>
                      <p className="font-medium">{enrichedUserData.last_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.preferred_name && (
                    <div>
                      <p className="text-sm text-gray-600">Preferred Name</p>
                      <p className="font-medium">{enrichedUserData.preferred_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Full Name / Nickname</p>
                    <p className="font-medium">{(enrichedUserData || selectedUser)?.full_name || selectedUser.nickname || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email Address</p>
                    <p className="font-medium break-all">{(enrichedUserData || selectedUser)?.email || selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium">{(enrichedUserData || selectedUser)?.phone || selectedUser.phone || 'N/A'}</p>
                  </div>
                  {enrichedUserData?.id_number && (
                    <div>
                      <p className="text-sm text-gray-600">ID Number</p>
                      <p className="font-medium">{enrichedUserData.id_number}</p>
                    </div>
                  )}
                  {enrichedUserData?.nationality && (
                    <div>
                      <p className="text-sm text-gray-600">Nationality</p>
                      <p className="font-medium">{enrichedUserData.nationality}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">
                      {(enrichedUserData || selectedUser)?.date_of_birth 
                        ? new Date((enrichedUserData || selectedUser).date_of_birth).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                  {enrichedUserData?.gender && (
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="font-medium">{enrichedUserData.gender}</p>
                    </div>
                  )}
                  {enrichedUserData?.marital_status && (
                    <div>
                      <p className="text-sm text-gray-600">Marital Status</p>
                      <p className="font-medium">{enrichedUserData.marital_status}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Physical Address</p>
                    <p className="font-medium">{(enrichedUserData || selectedUser)?.address || selectedUser.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium">{(enrichedUserData || selectedUser)?.city || selectedUser.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Province</p>
                    <p className="font-medium">{(enrichedUserData || selectedUser)?.province || selectedUser.province || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Postal Code</p>
                    <p className="font-medium">{(enrichedUserData || selectedUser)?.postal_code || selectedUser.postal_code || 'N/A'}</p>
                  </div>
                  {enrichedUserData?.country && (
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-medium">{enrichedUserData.country}</p>
                    </div>
                  )}
                  {enrichedUserData?.home_language && (
                    <div>
                      <p className="text-sm text-gray-600">Home Language</p>
                      <p className="font-medium">{enrichedUserData.home_language}</p>
                    </div>
                  )}
                  {enrichedUserData?.population_group && (
                    <div>
                      <p className="text-sm text-gray-600">Population Group</p>
                      <p className="font-medium">{enrichedUserData.population_group}</p>
                    </div>
                  )}
                  {enrichedUserData?.residential_status && (
                    <div>
                      <p className="text-sm text-gray-600">Residential Status</p>
                      <p className="font-medium">{enrichedUserData.residential_status}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">User Role</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Account Created</p>
                    <p className="font-medium">{new Date(selectedUser.created_at).toLocaleString()}</p>
                  </div>
                  {selectedUser.updated_at && (
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="font-medium">{new Date(selectedUser.updated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              {selectedUser.bio && (
                <div>
                  <h3 className="text-lg font-semibold text-navy-ink mb-4">Bio</h3>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-card">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {/* Applications */}
              <div>
                <h3 className="text-lg font-semibold text-navy-ink mb-4">Applications</h3>
                {loadingApplications ? (
                  <p className="text-gray-600">Loading applications...</p>
                ) : userApplications.length === 0 ? (
                  <p className="text-gray-600">No applications found</p>
                ) : (
                  <div className="space-y-3">
                    {userApplications.map((app: any) => (
                      <div key={app.id} className="p-4 bg-muted-gray rounded-card">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-navy-ink">
                              {app.programs?.title || app.program_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Application'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Status: <span className={`font-medium ${
                                app.status === 'approved' ? 'text-green-600' :
                                app.status === 'rejected' ? 'text-red-600' :
                                'text-amber-600'
                              }`}>{app.status}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Payment: <span className={`font-medium ${
                                app.payment_status === 'confirmed' ? 'text-green-600' :
                                app.payment_status === 'pending' ? 'text-amber-600' :
                                'text-gray-600'
                              }`}>{app.payment_status || 'N/A'}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied: {new Date(app.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/admin/applications`, '_blank')}
                          >
                            <FileText size={14} className="mr-1" />
                            View Full Application
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => handleExportPDF(selectedUser)}>
                  <Download size={16} className="mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

