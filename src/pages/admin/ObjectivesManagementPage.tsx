import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { uploadFileWithUserCheck } from '../../lib/uploadHelpers';
import { getStorageUrl } from '../../lib/connection';
import { Button } from '../../components/ui/Button';
import { Plus, Edit, Trash2, Save, X, Upload, Image as ImageIcon } from 'lucide-react';

interface StrategicObjective {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  icon: string | null;
  image_url: string | null;
  image_key: string | null;
}

interface PastWork {
  id: string;
  objective_id: string;
  title: string;
  description: string;
  date: string;
  image_url: string | null;
  image_key: string | null;
  attachment_url: string | null;
}

interface UpcomingWork {
  id: string;
  objective_id: string;
  title: string;
  description: string;
  event_date: string;
  image_url: string | null;
  link_url: string | null;
}

interface GalleryImage {
  id: string;
  objective_id: string;
  image_url: string;
  image_key: string | null;
  order_index: number;
}

type TabType = 'objectives' | 'past-work' | 'upcoming-work' | 'gallery';

export function ObjectivesManagementPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('objectives');
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [pastWork, setPastWork] = useState<PastWork[]>([]);
  const [upcomingWork, setUpcomingWork] = useState<UpcomingWork[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingObjective, setEditingObjective] = useState<StrategicObjective | null>(null);
  const [editingPastWork, setEditingPastWork] = useState<PastWork | null>(null);
  const [editingUpcomingWork, setEditingUpcomingWork] = useState<UpcomingWork | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [objectiveImageFiles, setObjectiveImageFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const { register: registerObjective, handleSubmit: handleSubmitObjective, reset: resetObjective, formState: { errors: errorsObjective } } = useForm<StrategicObjective & { short_description: string; full_description: string }>();
  const { register: registerPastWork, handleSubmit: handleSubmitPastWork, reset: resetPastWork } = useForm<PastWork>();
  const { register: registerUpcomingWork, handleSubmit: handleSubmitUpcomingWork, reset: resetUpcomingWork } = useForm<UpcomingWork>();

  useEffect(() => {
    fetchObjectives();
  }, []);

  useEffect(() => {
    if (selectedObjective && activeTab !== 'objectives') {
      fetchRelatedData();
    }
  }, [selectedObjective, activeTab]);

  const fetchObjectives = async () => {
    try {
      const { data, error } = await insforge.database
        .from('strategic_objectives')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setObjectives(data || []);
      if (data && data.length > 0 && !selectedObjective) {
        setSelectedObjective(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching objectives:', err);
      setMessage({ type: 'error', text: 'Failed to load objectives' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedData = async () => {
    if (!selectedObjective) return;

    try {
      // Fetch past work
      const { data: pastData } = await insforge.database
        .from('past_work')
        .select('*')
        .eq('objective_id', selectedObjective)
        .order('date', { ascending: false });

      setPastWork(pastData || []);

      // Fetch upcoming work
      const { data: upcomingData } = await insforge.database
        .from('upcoming_work')
        .select('*')
        .eq('objective_id', selectedObjective)
        .order('event_date', { ascending: true });

      setUpcomingWork(upcomingData || []);

      // Fetch gallery
      const { data: galleryData } = await insforge.database
        .from('objective_gallery')
        .select('*')
        .eq('objective_id', selectedObjective)
        .order('order_index', { ascending: true });

      setGallery(galleryData || []);
    } catch (err) {
      console.error('Error fetching related data:', err);
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const onObjectiveSubmit = async (data: any) => {
    try {
      let imageUrl = editingObjective?.image_url || null;
      let imageKey = editingObjective?.image_key || null;

      if (imageFile && user) {
        const filePath = `objectives/${Date.now()}_${imageFile.name}`;
        const uploadData = await uploadFileWithUserCheck(
          'gallery',
          filePath,
          imageFile,
          user.id,
          user.email || null,
          user.name || null
        );
        // Use the key to construct proper URL, or use the URL if it's already a full URL
        if (uploadData.key) {
          imageKey = uploadData.key;
          // Construct proper storage URL
          imageUrl = getStorageUrl('gallery', uploadData.key);
        } else {
          imageUrl = uploadData.url;
        }
      }

      const slug = data.slug || generateSlug(data.title);
      const objectiveData = {
        ...data,
        slug,
        image_url: imageUrl,
        image_key: imageKey,
        icon: data.icon || null
      };

      if (editingObjective) {
        const { error } = await insforge.database
          .from('strategic_objectives')
          .update(objectiveData)
          .eq('id', editingObjective.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Objective updated successfully!' });
      } else {
        const { error } = await insforge.database
          .from('strategic_objectives')
          .insert([objectiveData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Objective created successfully!' });
      }

      setEditingObjective(null);
      setImageFile(null);
      resetObjective();
      fetchObjectives();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save objective' });
    }
  };

  const onPastWorkSubmit = async (data: any) => {
    if (!selectedObjective) {
      setMessage({ type: 'error', text: 'Please select an objective first' });
      return;
    }

    try {
      let imageUrl = editingPastWork?.image_url || null;
      let attachmentUrl = editingPastWork?.attachment_url || null;

      let imageKey = editingPastWork?.image_key || null;
      if (imageFile && user) {
        const filePath = `objectives/past-work/${Date.now()}_${imageFile.name}`;
        const uploadData = await uploadFileWithUserCheck(
          'gallery',
          filePath,
          imageFile,
          user.id,
          user.email || null,
          user.name || null
        );
        imageUrl = uploadData.url;
        imageKey = uploadData.key || null;
      }

      const pastWorkData = {
        objective_id: selectedObjective,
        title: data.title,
        description: data.description,
        date: data.date,
        image_url: imageUrl,
        image_key: imageKey,
        attachment_url: attachmentUrl
      };

      if (editingPastWork) {
        const { error } = await insforge.database
          .from('past_work')
          .update(pastWorkData)
          .eq('id', editingPastWork.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Past work updated successfully!' });
      } else {
        const { error } = await insforge.database
          .from('past_work')
          .insert([pastWorkData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Past work added successfully!' });
      }

      setEditingPastWork(null);
      setImageFile(null);
      resetPastWork();
      fetchRelatedData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save past work' });
    }
  };

  const onUpcomingWorkSubmit = async (data: any) => {
    if (!selectedObjective) {
      setMessage({ type: 'error', text: 'Please select an objective first' });
      return;
    }

    try {
      let imageUrl = editingUpcomingWork?.image_url || null;

      if (imageFile && user) {
        const filePath = `objectives/upcoming-work/${Date.now()}_${imageFile.name}`;
        const uploadData = await uploadFileWithUserCheck(
          'gallery',
          filePath,
          imageFile,
          user.id,
          user.email || null,
          user.name || null
        );
        imageUrl = uploadData.url;
      }

      const upcomingWorkData = {
        objective_id: selectedObjective,
        title: data.title,
        description: data.description,
        event_date: data.event_date,
        image_url: imageUrl,
        link_url: data.link_url || null
      };

      if (editingUpcomingWork) {
        const { error } = await insforge.database
          .from('upcoming_work')
          .update(upcomingWorkData)
          .eq('id', editingUpcomingWork.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Upcoming work updated successfully!' });
      } else {
        const { error } = await insforge.database
          .from('upcoming_work')
          .insert([upcomingWorkData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Upcoming work added successfully!' });
      }

      setEditingUpcomingWork(null);
      setImageFile(null);
      resetUpcomingWork();
      fetchRelatedData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save upcoming work' });
    }
  };

  const handleDeleteObjective = async (id: string) => {
    if (!confirm('Are you sure you want to delete this objective?')) return;

    try {
      const { error } = await insforge.database
        .from('strategic_objectives')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Objective deleted successfully!' });
      fetchObjectives();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete objective' });
    }
  };

  const handleDeletePastWork = async (id: string) => {
    if (!confirm('Are you sure you want to delete this past work item?')) return;

    try {
      const { error } = await insforge.database
        .from('past_work')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Past work deleted successfully!' });
      fetchRelatedData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete past work' });
    }
  };

  const handleDeleteUpcomingWork = async (id: string) => {
    if (!confirm('Are you sure you want to delete this upcoming work item?')) return;

    try {
      const { error } = await insforge.database
        .from('upcoming_work')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Upcoming work deleted successfully!' });
      fetchRelatedData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete upcoming work' });
    }
  };

  const handleUploadGallery = async () => {
    if (!imageFile || !selectedObjective || !user) {
      setMessage({ type: 'error', text: 'Please select an objective and image' });
      return;
    }

    try {
      const filePath = `objectives/gallery/${Date.now()}_${imageFile.name}`;
      const uploadData = await uploadFileWithUserCheck(
        'gallery',
        filePath,
        imageFile,
        user.id,
        user.email || null,
        user.name || null
      );

      const { error } = await insforge.database
        .from('objective_gallery')
        .insert([{
          objective_id: selectedObjective,
          image_url: uploadData.url,
          image_key: uploadData.key,
          order_index: gallery.length
        }]);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
      setImageFile(null);
      fetchRelatedData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload image' });
    }
  };

  const handleUploadMultipleObjectiveImages = async () => {
    if (!objectiveImageFiles.length || !editingObjective || !user) {
      setMessage({ type: 'error', text: 'Please select at least one image' });
      return;
    }

    try {
      setSaving(true);
      const uploadPromises = objectiveImageFiles.map(async (file, index) => {
        const filePath = `objectives/${editingObjective.id}/${Date.now()}_${index}_${file.name}`;
        const uploadData = await uploadFileWithUserCheck(
          'gallery',
          filePath,
          file,
          user.id,
          user.email || null,
          user.name || null
        );

        return {
          objective_id: editingObjective.id,
          image_url: uploadData.url,
          image_key: uploadData.key,
          order_index: index
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      const { error } = await insforge.database
        .from('objective_gallery')
        .insert(uploadResults);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `Successfully uploaded ${objectiveImageFiles.length} image${objectiveImageFiles.length > 1 ? 's' : ''}!` 
      });
      setObjectiveImageFiles([]);
      fetchObjectives();
      fetchRelatedData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload images' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGalleryImage = async (id: string, imageKey: string | null) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      if (imageKey) {
        await insforge.storage.from('gallery').remove(imageKey);
      }

      const { error } = await insforge.database
        .from('objective_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Image deleted successfully!' });
      fetchRelatedData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete image' });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Strategic Objectives Management</h1>
          <p className="text-gray-600">Manage objectives, past work, upcoming work, and galleries</p>
        </div>
        {activeTab === 'objectives' && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingObjective(null);
              resetObjective();
              setImageFile(null);
            }}
          >
            <Plus className="mr-2" size={20} />
            Add Objective
          </Button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-card ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-card shadow-soft p-1 flex space-x-1">
        {(['objectives', 'past-work', 'upcoming-work', 'gallery'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-card font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gold text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Objectives Tab */}
      {activeTab === 'objectives' && (
        <div className="space-y-6">
          {/* Objective Form - Always show when editing or when no objective is selected for editing */}
          <div ref={formRef} className="bg-white rounded-card shadow-soft p-6">
            <h2 className="text-xl font-bold text-navy-ink mb-4">
              {editingObjective ? 'Edit Objective' : 'Add New Objective'}
            </h2>
            <form onSubmit={handleSubmitObjective(onObjectiveSubmit)} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Title</label>
                  <input
                    type="text"
                    {...registerObjective('title', { required: true })}
                    defaultValue={editingObjective?.title || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Slug</label>
                  <input
                    type="text"
                    {...registerObjective('slug')}
                    defaultValue={editingObjective?.slug || ''}
                    placeholder="Auto-generated from title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Short Description</label>
                  <textarea
                    {...registerObjective('short_description', { required: true })}
                    defaultValue={editingObjective?.short_description || ''}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Full Description</label>
                  <textarea
                    {...registerObjective('full_description', { required: true })}
                    defaultValue={editingObjective?.full_description || ''}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Main Image (for card display)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {editingObjective?.image_url && !imageFile && (
                    <img 
                      src={editingObjective.image_url} 
                      alt="Current" 
                      className="mt-2 w-32 h-32 object-cover rounded-card" 
                    />
                  )}
                </div>
                
                {editingObjective && (
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">
                      Additional Images (Multiple selection allowed)
                    </label>
                    <div className="space-y-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setObjectiveImageFiles(Array.from(e.target.files || []))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {objectiveImageFiles.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {objectiveImageFiles.map((file, index) => (
                            <div key={index} className="relative">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-card"
                              />
                              <button
                                onClick={() => setObjectiveImageFiles(prev => prev.filter((_, i) => i !== index))}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUploadMultipleObjectiveImages}
                        disabled={!objectiveImageFiles.length || saving}
                      >
                        <Upload className="mr-2" size={16} />
                        {saving ? 'Uploading...' : `Upload ${objectiveImageFiles.length} Image${objectiveImageFiles.length > 1 ? 's' : ''}`}
                      </Button>
                    </div>
                    
                    {/* Show existing objective gallery images */}
                    {(() => {
                      const objectiveGallery = gallery.filter(img => img.objective_id === editingObjective.id);
                      return objectiveGallery.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-navy-ink mb-2">Existing Images</label>
                          <div className="grid grid-cols-4 gap-2">
                            {objectiveGallery.map((img) => (
                              <div key={img.id} className="relative group">
                                <img
                                  src={img.image_key ? getStorageUrl('gallery', img.image_key) : img.image_url}
                                  alt="Gallery"
                                  className="w-full h-24 object-cover rounded-card"
                                />
                                <button
                                  onClick={() => handleDeleteGalleryImage(img.id, img.image_key || null)}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-card flex items-center justify-center"
                                >
                                  <Trash2 className="text-white" size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="flex space-x-4">
                  <Button type="submit" variant="primary">
                    <Save className="mr-2" size={20} />
                    Save
                  </Button>
                  {editingObjective && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingObjective(null);
                        resetObjective();
                        setImageFile(null);
                      }}
                    >
                      <X className="mr-2" size={20} />
                      Cancel
                    </Button>
                  )}
              </div>
            </form>
          </div>

          {/* Objectives List */}
          <div className="bg-white rounded-card shadow-soft p-6">
            <h2 className="text-xl font-bold text-navy-ink mb-4">All Objectives</h2>
            <div className="space-y-4">
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-4 rounded-card border-2 ${
                    selectedObjective === obj.id ? 'border-gold bg-gold/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {obj.image_url && (
                          <img
                            src={obj.image_key ? getStorageUrl('gallery', obj.image_key) : obj.image_url}
                            alt={obj.title}
                            className="w-24 h-24 object-cover rounded-card flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (obj.image_key && target.src !== obj.image_url) {
                                target.src = obj.image_url || '';
                              }
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-navy-ink mb-2">{obj.title}</h3>
                          <p className="text-gray-600 text-sm mb-2">{obj.short_description}</p>
                          <p className="text-gray-500 text-xs">Slug: {obj.slug}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedObjective(obj.id);
                          setEditingObjective(obj);
                          resetObjective(obj);
                          // Scroll to form after a brief delay to ensure it's rendered
                          setTimeout(() => {
                            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                        type="button"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteObjective(obj.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-card"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past Work Tab */}
      {activeTab === 'past-work' && (
        <div className="space-y-6">
          {!selectedObjective ? (
            <div className="bg-white rounded-card shadow-soft p-6 text-center">
              <p className="text-gray-600">Please select an objective first</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-card shadow-soft p-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">
                  {editingPastWork ? 'Edit Past Work' : 'Add Past Work'}
                </h2>
                <form onSubmit={handleSubmitPastWork(onPastWorkSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Title</label>
                    <input
                      type="text"
                      {...registerPastWork('title', { required: true })}
                      defaultValue={editingPastWork?.title || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                    <textarea
                      {...registerPastWork('description', { required: true })}
                      defaultValue={editingPastWork?.description || ''}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Date</label>
                    <input
                      type="date"
                      {...registerPastWork('date', { required: true })}
                      defaultValue={editingPastWork?.date || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Button type="submit" variant="primary">
                      <Save className="mr-2" size={20} />
                      Save
                    </Button>
                    {editingPastWork && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingPastWork(null);
                          resetPastWork();
                          setImageFile(null);
                        }}
                      >
                        <X className="mr-2" size={20} />
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-card shadow-soft p-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Past Work Items</h2>
                <div className="space-y-4">
                  {pastWork.map((work) => (
                    <div key={work.id} className="p-4 border border-gray-200 rounded-card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 flex items-start space-x-4">
                          {work.image_url && (
                            <img
                              src={work.image_key ? getStorageUrl('gallery', work.image_key) : work.image_url}
                              alt={work.title}
                              className="w-24 h-24 object-cover rounded-card flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (work.image_key && target.src !== work.image_url) {
                                  target.src = work.image_url || '';
                                }
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-navy-ink mb-2">{work.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{work.description}</p>
                            <p className="text-gray-500 text-xs">{work.date}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingPastWork(work);
                              resetPastWork(work);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeletePastWork(work.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-card"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Upcoming Work Tab */}
      {activeTab === 'upcoming-work' && (
        <div className="space-y-6">
          {!selectedObjective ? (
            <div className="bg-white rounded-card shadow-soft p-6 text-center">
              <p className="text-gray-600">Please select an objective first</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-card shadow-soft p-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">
                  {editingUpcomingWork ? 'Edit Upcoming Work' : 'Add Upcoming Work'}
                </h2>
                <form onSubmit={handleSubmitUpcomingWork(onUpcomingWorkSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Title</label>
                    <input
                      type="text"
                      {...registerUpcomingWork('title', { required: true })}
                      defaultValue={editingUpcomingWork?.title || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                    <textarea
                      {...registerUpcomingWork('description', { required: true })}
                      defaultValue={editingUpcomingWork?.description || ''}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Event Date</label>
                    <input
                      type="date"
                      {...registerUpcomingWork('event_date', { required: true })}
                      defaultValue={editingUpcomingWork?.event_date || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Link URL (Optional)</label>
                    <input
                      type="url"
                      {...registerUpcomingWork('link_url')}
                      defaultValue={editingUpcomingWork?.link_url || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Button type="submit" variant="primary">
                      <Save className="mr-2" size={20} />
                      Save
                    </Button>
                    {editingUpcomingWork && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingUpcomingWork(null);
                          resetUpcomingWork();
                          setImageFile(null);
                        }}
                      >
                        <X className="mr-2" size={20} />
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-card shadow-soft p-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Upcoming Work Items</h2>
                <div className="space-y-4">
                  {upcomingWork.map((work) => (
                    <div key={work.id} className="p-4 border border-gray-200 rounded-card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-navy-ink mb-2">{work.title}</h3>
                          <p className="text-gray-600 text-sm mb-2">{work.description}</p>
                          <p className="text-gray-500 text-xs">{work.event_date}</p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingUpcomingWork(work);
                              resetUpcomingWork(work);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteUpcomingWork(work.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-card"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {!selectedObjective ? (
            <div className="bg-white rounded-card shadow-soft p-6 text-center">
              <p className="text-gray-600">Please select an objective first</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-card shadow-soft p-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Upload Gallery Image</h2>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  <Button onClick={handleUploadGallery} variant="primary" disabled={!imageFile}>
                    <Upload className="mr-2" size={20} />
                    Upload Image
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-card shadow-soft p-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Gallery Images</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.image_url}
                        alt="Gallery"
                        className="w-full h-32 object-cover rounded-card"
                      />
                      <button
                        onClick={() => handleDeleteGalleryImage(img.id, img.image_key || null)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

