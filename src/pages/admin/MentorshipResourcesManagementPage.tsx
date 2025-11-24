import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Upload, X, Save, FileText, Video, Headphones, Link as LinkIcon, BookOpen, FileCheck, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { getStorageUrl } from '../../lib/connection';

interface MentorshipResource {
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

interface MentorshipProgram {
  id: string;
  name: string;
  description: string | null;
}

interface ResourceFormData {
  program_id: string;
  title: string;
  description: string;
  resource_type: string;
  external_link: string;
  is_featured: boolean;
  is_public: boolean;
  display_order: number;
}

export function MentorshipResourcesManagementPage() {
  const { user } = useUser();
  const [resources, setResources] = useState<MentorshipResource[]>([]);
  const [programs, setPrograms] = useState<MentorshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<MentorshipResource | null>(null);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterProgram, setFilterProgram] = useState<string>('all');

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ResourceFormData>({
    defaultValues: {
      program_id: '',
      resource_type: 'document',
      is_featured: false,
      is_public: true,
      display_order: 0
    }
  });

  useEffect(() => {
    fetchData();
  }, [filterProgram]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, programsRes] = await Promise.all([
        (() => {
          let query = insforge.database
            .from('mentorship_resources')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

          if (filterProgram !== 'all') {
            query = query.eq('program_id', filterProgram);
          }
          return query;
        })(),
        insforge.database
          .from('mentorship_programs')
          .select('id, name, description')
          .order('name', { ascending: true })
      ]);

      setResources(resourcesRes.data || []);
      setPrograms(programsRes.data || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    reset();
    setEditingResource(null);
    setResourceFile(null);
    setThumbnailFile(null);
    setValue('program_id', programs.length > 0 ? programs[0].id : '');
    setValue('resource_type', 'document');
    setValue('is_featured', false);
    setValue('is_public', true);
    setValue('display_order', 0);
    setShowForm(true);
  };

  const handleEdit = (resource: MentorshipResource) => {
    setEditingResource(resource);
    setValue('program_id', resource.program_id || '');
    setValue('title', resource.title);
    setValue('description', resource.description || '');
    setValue('resource_type', resource.resource_type);
    setValue('external_link', resource.external_link || '');
    setValue('is_featured', resource.is_featured);
    setValue('is_public', resource.is_public);
    setValue('display_order', resource.display_order);
    setResourceFile(null);
    setThumbnailFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
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
      fetchData();
      setMessage({ type: 'success', text: 'Resource deleted successfully!' });
    } catch (err: any) {
      console.error('Error deleting resource:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete resource' });
    }
  };

  const onSubmit = async (data: ResourceFormData) => {
    try {
      let fileUrl = editingResource?.file_url || null;
      let fileKey = editingResource?.file_key || null;
      let thumbnailUrl = editingResource?.thumbnail_url || null;
      let thumbnailKey = editingResource?.thumbnail_key || null;

      // Upload resource file if provided
      if (resourceFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('resources')
          .upload(`mentorship/${Date.now()}_${resourceFile.name}`, resourceFile);

        if (uploadError) throw uploadError;
        fileUrl = uploadData.url;
        fileKey = uploadData.key;

        // Delete old file if exists
        if (editingResource?.file_key) {
          try {
            await insforge.storage.from('resources').remove(editingResource.file_key);
          } catch (removeErr) {
            console.warn('Could not remove old file:', removeErr);
          }
        }
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('resources')
          .upload(`mentorship/thumbnails/${Date.now()}_${thumbnailFile.name}`, thumbnailFile);

        if (uploadError) throw uploadError;
        thumbnailUrl = uploadData.url;
        thumbnailKey = uploadData.key;

        // Delete old thumbnail if exists
        if (editingResource?.thumbnail_key) {
          try {
            await insforge.storage.from('resources').remove(editingResource.thumbnail_key);
          } catch (removeErr) {
            console.warn('Could not remove old thumbnail:', removeErr);
          }
        }
      }

      // Convert is_public and is_featured to boolean
      const isPublic = typeof data.is_public === 'string' 
        ? data.is_public === 'true' || data.is_public === true 
        : data.is_public;
      const isFeatured = typeof data.is_featured === 'string' 
        ? data.is_featured === 'true' || data.is_featured === true 
        : data.is_featured;

      const resourceData: any = {
        program_id: data.program_id || null,
        title: data.title,
        description: data.description || null,
        resource_type: data.resource_type,
        external_link: data.external_link || null,
        is_featured: isFeatured,
        is_public: isPublic !== undefined ? isPublic : true,
        display_order: parseInt(data.display_order.toString()) || 0,
        updated_at: new Date().toISOString()
      };

      if (fileUrl) resourceData.file_url = fileUrl;
      if (fileKey) resourceData.file_key = fileKey;
      if (thumbnailUrl) resourceData.thumbnail_url = thumbnailUrl;
      if (thumbnailKey) resourceData.thumbnail_key = thumbnailKey;

      if (editingResource) {
        const { data: updated, error: updateError } = await insforge.database
          .from('mentorship_resources')
          .update(resourceData)
          .eq('id', editingResource.id)
          .select()
          .single();

        if (updateError) throw updateError;
        setMessage({ type: 'success', text: 'Resource updated successfully!' });
      } else {
        resourceData.created_by = user?.id;
        const { data: inserted, error: insertError } = await insforge.database
          .from('mentorship_resources')
          .insert([resourceData])
          .select()
          .single();

        if (insertError) throw insertError;
        setMessage({ type: 'success', text: 'Resource created successfully!' });
      }

      reset();
      setShowForm(false);
      setEditingResource(null);
      setResourceFile(null);
      setThumbnailFile(null);
      fetchData();
    } catch (err: any) {
      console.error('Error saving resource:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save resource' });
    }
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText size={20} className="text-blue-500" />;
      case 'video': return <Video size={20} className="text-red-500" />;
      case 'audio': return <Headphones size={20} className="text-purple-500" />;
      case 'link': return <LinkIcon size={20} className="text-green-500" />;
      case 'textbook': return <BookOpen size={20} className="text-orange-500" />;
      case 'notes': return <FileCheck size={20} className="text-teal-500" />;
      default: return <FileText size={20} />;
    }
  };

  const resourceTypes = [
    { value: 'document', label: 'Document (PDF, DOC, etc.)' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'link', label: 'External Link' },
    { value: 'textbook', label: 'Textbook' },
    { value: 'notes', label: 'Study Notes' }
  ];

  const filteredResources = filterProgram === 'all' 
    ? resources 
    : resources.filter(r => r.program_id === filterProgram);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/admin/mentorship" className="text-gold hover:text-amber-600 mb-2 inline-flex items-center">
            <ArrowLeft size={16} className="mr-1" />
            Back to Mentorship Management
          </Link>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Mentorship Resources Management</h1>
          <p className="text-gray-600">Manage resources, materials, and links for Mentorship programs</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Add Resource
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-card shadow-soft p-4">
        <label className="block text-sm font-medium text-navy-ink mb-2">Filter by Program</label>
        <select
          value={filterProgram}
          onChange={(e) => setFilterProgram(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
        >
          <option value="all">All Programs</option>
          {programs.map(program => (
            <option key={program.id} value={program.id}>{program.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-card shadow-soft p-6">
          {filteredResources.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No resources found. Create one to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(resource => {
                const program = programs.find(p => p.id === resource.program_id);
                return (
                  <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getResourceTypeIcon(resource.resource_type)}
                        <div>
                          <h3 className="font-semibold text-navy-ink">{resource.title}</h3>
                          {program && (
                            <p className="text-xs text-gray-500">{program.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(resource)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(resource.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    {resource.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-3">
                      <span className="px-2 py-1 bg-gray-100 rounded">{resource.resource_type}</span>
                      {resource.is_featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Featured</span>
                      )}
                      <span className={`px-2 py-1 rounded ${
                        resource.is_public ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {resource.is_public ? 'Public' : 'Private'}
                      </span>
                      <span className="text-xs text-gray-500">Downloads: {resource.download_count || 0}</span>
                    </div>
                    {(resource.file_url || resource.external_link) && (
                      <div className="text-xs text-blue-600">
                        {resource.external_link ? (
                          <a href={resource.external_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View Link →
                          </a>
                        ) : (
                          <span>File Available</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-soft p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">
                {editingResource ? 'Edit' : 'Create'} Mentorship Resource
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Program (Optional)</label>
                <select
                  {...register('program_id')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="">All Programs (General)</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </div>

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
                  {resourceTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">External Link (Optional)</label>
                <input
                  type="url"
                  {...register('external_link')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="https://example.com"
                />
                <p className="text-xs text-gray-500 mt-1">If provided, this link will be used instead of uploaded file</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Resource File {watch('resource_type') !== 'link' ? '*' : '(Optional)'}
                </label>
                <input
                  type="file"
                  accept={watch('resource_type') === 'video' ? 'video/*' : watch('resource_type') === 'audio' ? 'audio/*' : 'application/pdf,.doc,.docx,.txt'}
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
                {editingResource?.thumbnail_url && !thumbnailFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Current thumbnail: <img src={editingResource.thumbnail_url} alt="Thumbnail" className="max-h-20 mt-2" />
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Display Order</label>
                  <input
                    type="number"
                    {...register('display_order', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={watch('is_public') || false}
                  onChange={(e) => setValue('is_public', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-navy-ink">Make this resource public</label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={watch('is_featured') || false}
                  onChange={(e) => setValue('is_featured', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-navy-ink">Feature this resource</label>
              </div>

              <div className="flex space-x-4">
                <Button type="submit" variant="primary">
                  <Save className="mr-2" size={16} />
                  {editingResource ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

