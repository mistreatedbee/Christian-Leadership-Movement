import React, { useState, useEffect } from 'react';
import { useUser } from '@insforge/react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Upload, X, Save, FileText, Video, Headphones, Link as LinkIcon, BookOpen, FileCheck, User, Settings } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { getStorageUrl } from '../../lib/connection';
import { uploadFileWithUserCheck } from '../../lib/uploadHelpers';
import { useForm } from 'react-hook-form';

interface MentorResource {
  id: string;
  program_id: string | null;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string | null;
  file_key: string | null;
  external_link: string | null;
  thumbnail_url: string | null;
  thumbnail_key: string | null;
  is_featured: boolean;
  is_public: boolean;
  download_count: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface MentorProfile {
  id: string;
  user_id: string;
  program_id: string | null;
  bio: string | null;
  expertise_areas: string[] | null;
  max_mentees: number;
  current_mentees: number;
  status: string;
  mentorship_about: string | null;
  what_offers: string | null;
  goals: string | null;
  program_description: string | null;
  qualifications: string | null;
  experience_years: number | null;
  specializations: string[] | null;
  availability: string | null;
  contact_preferences: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  profile_image_url: string | null;
  profile_image_key: string | null;
}

interface ResourceFormData {
  title: string;
  description: string;
  resource_type: string;
  external_link: string;
  is_featured: boolean;
  is_public: boolean;
  display_order: number;
}

export function MentorManagementPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [resources, setResources] = useState<MentorResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState<MentorResource | null>(null);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'resources'>('profile');

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ResourceFormData>({
    defaultValues: {
      resource_type: 'document',
      is_featured: false,
      is_public: true,
      display_order: 0
    }
  });

  useEffect(() => {
    if (user) {
      fetchMentorData();
    }
  }, [user]);

  const fetchMentorData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: mentorData, error: mentorError } = await insforge.database
        .from('mentors')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'available')
        .maybeSingle();

      if (mentorError) throw mentorError;

      if (!mentorData) {
        setMessage({ type: 'error', text: 'You are not an approved mentor. Please apply first.' });
        navigate('/mentorship');
        return;
      }

      setMentorProfile(mentorData);

      // Fetch mentor's resources
      const { data: resourcesData, error: resourcesError } = await insforge.database
        .from('mentorship_resources')
        .select('*')
        .eq('program_id', mentorData.program_id || '')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;
      setResources(resourcesData || []);
    } catch (err: any) {
      console.error('Error fetching mentor data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load mentor data' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (formData: any) => {
    if (!mentorProfile || !user) return;

    try {
      let profileImageUrl = mentorProfile.profile_image_url;
      let profileImageKey = mentorProfile.profile_image_key;

      if (profileImage) {
        const filePath = `mentors/${user.id}/profile_${Date.now()}_${profileImage.name}`;
        const uploadData = await uploadFileWithUserCheck(
          'avatars',
          filePath,
          profileImage,
          user.id,
          user.email || null,
          user.name || null
        );
        profileImageUrl = uploadData.url;
        profileImageKey = uploadData.key;
      }

      const updateData: any = {
        bio: formData.bio || mentorProfile.bio,
        mentorship_about: formData.mentorship_about || mentorProfile.mentorship_about,
        what_offers: formData.what_offers || mentorProfile.what_offers,
        goals: formData.goals || mentorProfile.goals,
        program_description: formData.program_description || mentorProfile.program_description,
        qualifications: formData.qualifications || mentorProfile.qualifications,
        experience_years: formData.experience_years || mentorProfile.experience_years,
        availability: formData.availability || mentorProfile.availability,
        contact_preferences: formData.contact_preferences || mentorProfile.contact_preferences,
        website_url: formData.website_url || mentorProfile.website_url,
        linkedin_url: formData.linkedin_url || mentorProfile.linkedin_url,
        updated_at: new Date().toISOString()
      };

      if (profileImageUrl) {
        updateData.profile_image_url = profileImageUrl;
        updateData.profile_image_key = profileImageKey;
      }

      const { error } = await insforge.database
        .from('mentors')
        .update(updateData)
        .eq('id', mentorProfile.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setShowProfileForm(false);
      fetchMentorData();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    }
  };

  const handleResourceSubmit = async (data: ResourceFormData) => {
    if (!mentorProfile || !user) return;

    try {
      let fileUrl = editingResource?.file_url || null;
      let fileKey = editingResource?.file_key || null;
      let thumbnailUrl = editingResource?.thumbnail_url || null;
      let thumbnailKey = editingResource?.thumbnail_key || null;

      if (resourceFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('resources')
          .upload(`mentors/${user.id}/${Date.now()}_${resourceFile.name}`, resourceFile);

        if (uploadError) throw uploadError;
        fileUrl = uploadData.url;
        fileKey = uploadData.key;
      }

      if (thumbnailFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('resources')
          .upload(`mentors/${user.id}/thumbnails/${Date.now()}_${thumbnailFile.name}`, thumbnailFile);

        if (uploadError) throw uploadError;
        thumbnailUrl = uploadData.url;
        thumbnailKey = uploadData.key;
      }

      const resourceData: any = {
        program_id: mentorProfile.program_id,
        title: data.title,
        description: data.description || null,
        resource_type: data.resource_type,
        external_link: data.external_link || null,
        is_featured: data.is_featured,
        is_public: data.is_public,
        display_order: data.display_order || 0,
        updated_at: new Date().toISOString()
      };

      if (fileUrl) resourceData.file_url = fileUrl;
      if (fileKey) resourceData.file_key = fileKey;
      if (thumbnailUrl) resourceData.thumbnail_url = thumbnailUrl;
      if (thumbnailKey) resourceData.thumbnail_key = thumbnailKey;

      if (editingResource) {
        const { error } = await insforge.database
          .from('mentorship_resources')
          .update(resourceData)
          .eq('id', editingResource.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Resource updated successfully!' });
      } else {
        resourceData.created_by = user.id;
        const { error } = await insforge.database
          .from('mentorship_resources')
          .insert([resourceData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Resource created successfully!' });
      }

      reset();
      setShowResourceForm(false);
      setEditingResource(null);
      setResourceFile(null);
      setThumbnailFile(null);
      fetchMentorData();
    } catch (err: any) {
      console.error('Error saving resource:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save resource' });
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const resource = resources.find(r => r.id === id);
      if (resource?.file_key) {
        await insforge.storage.from('resources').remove(resource.file_key);
      }
      if (resource?.thumbnail_key) {
        await insforge.storage.from('resources').remove(resource.thumbnail_key);
      }

      const { error } = await insforge.database
        .from('mentorship_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchMentorData();
      setMessage({ type: 'success', text: 'Resource deleted successfully!' });
    } catch (err: any) {
      console.error('Error deleting resource:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete resource' });
    }
  };

  const handleEditResource = (resource: MentorResource) => {
    setEditingResource(resource);
    setValue('title', resource.title);
    setValue('description', resource.description || '');
    setValue('resource_type', resource.resource_type);
    setValue('external_link', resource.external_link || '');
    setValue('is_featured', resource.is_featured);
    setValue('is_public', resource.is_public);
    setValue('display_order', resource.display_order);
    setResourceFile(null);
    setThumbnailFile(null);
    setShowResourceForm(true);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!mentorProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You are not an approved mentor.</p>
        <Button onClick={() => navigate('/mentorship')} className="mt-4">
          Apply to Become a Mentor
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Mentor Management</h1>
          <p className="text-gray-600">Manage your mentorship profile and resources</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'profile'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'resources'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Resources ({resources.length})
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {!showProfileForm ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    {mentorProfile.profile_image_url ? (
                      <img
                        src={getStorageUrl('avatars', mentorProfile.profile_image_key || mentorProfile.profile_image_url)}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={40} className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-navy-ink">Your Mentor Profile</h2>
                      <p className="text-gray-600">Status: <span className="text-green-600 font-medium">Approved</span></p>
                    </div>
                  </div>
                  <Button onClick={() => setShowProfileForm(true)} variant="primary">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Bio</h3>
                    <p className="text-gray-600">{mentorProfile.bio || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">What is your mentorship about?</h3>
                    <p className="text-gray-600">{mentorProfile.mentorship_about || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">What you offer</h3>
                    <p className="text-gray-600">{mentorProfile.what_offers || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Goals</h3>
                    <p className="text-gray-600">{mentorProfile.goals || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Program Description</h3>
                    <p className="text-gray-600">{mentorProfile.program_description || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Qualifications</h3>
                    <p className="text-gray-600">{mentorProfile.qualifications || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Experience</h3>
                    <p className="text-gray-600">{mentorProfile.experience_years || 0} years</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Availability</h3>
                    <p className="text-gray-600">{mentorProfile.availability || 'Not provided'}</p>
                  </div>
                </div>

                {mentorProfile.expertise_areas && mentorProfile.expertise_areas.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Expertise Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {mentorProfile.expertise_areas.map((area, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {mentorProfile.specializations && mentorProfile.specializations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-navy-ink mb-2">Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {mentorProfile.specializations.map((spec, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleUpdateProfile({
                  bio: formData.get('bio'),
                  mentorship_about: formData.get('mentorship_about'),
                  what_offers: formData.get('what_offers'),
                  goals: formData.get('goals'),
                  program_description: formData.get('program_description'),
                  qualifications: formData.get('qualifications'),
                  experience_years: parseInt(formData.get('experience_years') as string) || 0,
                  availability: formData.get('availability'),
                  contact_preferences: formData.get('contact_preferences'),
                  website_url: formData.get('website_url'),
                  linkedin_url: formData.get('linkedin_url')
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Bio</label>
                  <textarea
                    name="bio"
                    defaultValue={mentorProfile.bio || ''}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">What is your mentorship about?</label>
                  <textarea
                    name="mentorship_about"
                    defaultValue={mentorProfile.mentorship_about || ''}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">What you offer</label>
                  <textarea
                    name="what_offers"
                    defaultValue={mentorProfile.what_offers || ''}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Goals</label>
                  <textarea
                    name="goals"
                    defaultValue={mentorProfile.goals || ''}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Program Description</label>
                  <textarea
                    name="program_description"
                    defaultValue={mentorProfile.program_description || ''}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Qualifications</label>
                  <textarea
                    name="qualifications"
                    defaultValue={mentorProfile.qualifications || ''}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Years of Experience</label>
                    <input
                      type="number"
                      name="experience_years"
                      defaultValue={mentorProfile.experience_years || 0}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Website URL</label>
                    <input
                      type="url"
                      name="website_url"
                      defaultValue={mentorProfile.website_url || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">LinkedIn URL</label>
                    <input
                      type="url"
                      name="linkedin_url"
                      defaultValue={mentorProfile.linkedin_url || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Availability</label>
                  <textarea
                    name="availability"
                    defaultValue={mentorProfile.availability || ''}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Contact Preferences</label>
                  <textarea
                    name="contact_preferences"
                    defaultValue={mentorProfile.contact_preferences || ''}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowProfileForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-navy-ink">Your Resources</h2>
              <Button onClick={() => {
                reset();
                setEditingResource(null);
                setResourceFile(null);
                setThumbnailFile(null);
                setShowResourceForm(true);
              }} variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </div>

            {resources.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No resources yet. Add your first resource!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map(resource => (
                  <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-navy-ink">{resource.title}</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditResource(resource)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteResource(resource.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    {resource.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">{resource.resource_type}</span>
                      {resource.is_featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Featured</span>
                      )}
                      <span className={`px-2 py-1 rounded ${
                        resource.is_public ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {resource.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resource Form Modal */}
            {showResourceForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-card shadow-soft p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-navy-ink">
                      {editingResource ? 'Edit' : 'Add'} Resource
                    </h2>
                    <button onClick={() => setShowResourceForm(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit(handleResourceSubmit)} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Title *</label>
                      <input
                        type="text"
                        {...register('title', { required: 'Title is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Resource Type *</label>
                      <select
                        {...register('resource_type', { required: 'Resource type is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="document">Document</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="link">External Link</option>
                        <option value="textbook">Textbook</option>
                        <option value="notes">Study Notes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">External Link (Optional)</label>
                      <input
                        type="url"
                        {...register('external_link')}
                        placeholder="https://example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Resource File {watch('resource_type') !== 'link' ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="file"
                        accept={watch('resource_type') === 'video' ? 'video/*' : watch('resource_type') === 'audio' ? 'audio/*' : 'application/pdf,.doc,.docx,.txt,.pptx,.ppt,.xlsx,.xls,.zip'}
                        onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {editingResource?.file_url && !resourceFile && (
                        <p className="text-sm text-gray-600 mt-2">
                          Current file: <a href={editingResource.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Thumbnail Image (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Display Order</label>
                      <input
                        type="number"
                        {...register('display_order', { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={watch('is_public') || false}
                          onChange={(e) => setValue('is_public', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-navy-ink">Make public</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={watch('is_featured') || false}
                          onChange={(e) => setValue('is_featured', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-navy-ink">Feature this resource</span>
                      </label>
                    </div>

                    <div className="flex space-x-4">
                      <Button type="submit" variant="primary">
                        <Save className="mr-2" size={16} />
                        {editingResource ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowResourceForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

