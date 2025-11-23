import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BookOpen, Users, Video, FileText, Calendar, X, Save, Upload, Link as LinkIcon, MapPin, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { insforge } from '../../lib/insforge';
import { getStorageUrl } from '../../lib/connection';

interface BibleStudy {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  instructor_id: string | null;
  scheduled_date: string | null;
  duration_minutes: number;
  meeting_link: string | null;
  meeting_password: string | null;
  is_online: boolean;
  location: string | null;
  max_participants: number | null;
  status: string;
  recording_url: string | null;
  notes_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface BibleClass {
  id: string;
  title: string;
  description: string | null;
  course_content: string | null;
  instructor_id: string | null;
  scheduled_date: string | null;
  duration_minutes: number;
  meeting_link: string | null;
  meeting_password: string | null;
  is_online: boolean;
  location: string | null;
  max_students: number | null;
  status: string;
  recording_url: string | null;
  materials_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface BibleMeeting {
  id: string;
  title: string;
  description: string | null;
  agenda: string | null;
  scheduled_date: string | null;
  duration_minutes: number;
  meeting_link: string | null;
  meeting_password: string | null;
  is_online: boolean;
  location: string | null;
  max_participants: number | null;
  status: string;
  recording_url: string | null;
  minutes_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface BibleResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string | null;
  file_key: string | null;
  external_link: string | null;
  category: string | null;
  tags: string[] | null;
  is_public: boolean;
  download_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type TabType = 'studies' | 'classes' | 'meetings' | 'resources';

export function BibleSchoolManagementPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('studies');
  const [studies, setStudies] = useState<BibleStudy[]>([]);
  const [classes, setClasses] = useState<BibleClass[]>([]);
  const [meetings, setMeetings] = useState<BibleMeeting[]>([]);
  const [resources, setResources] = useState<BibleResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formType, setFormType] = useState<TabType>('studies');
  const [resourceFile, setResourceFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<any>({
    defaultValues: {
      is_online: true,
      duration_minutes: 60,
      status: 'scheduled',
      is_public: true,
      resource_type: 'document'
    }
  });

  const isOnline = watch('is_online');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Admins can see ALL items regardless of status or public flag
      if (activeTab === 'studies') {
        const { data } = await insforge.database
          .from('bible_school_studies')
          .select('*')
          .order('scheduled_date', { ascending: false });
        setStudies(data || []);
      } else if (activeTab === 'classes') {
        const { data } = await insforge.database
          .from('bible_school_classes')
          .select('*')
          .order('scheduled_date', { ascending: false });
        setClasses(data || []);
      } else if (activeTab === 'meetings') {
        const { data } = await insforge.database
          .from('bible_school_meetings')
          .select('*')
          .order('scheduled_date', { ascending: false });
        setMeetings(data || []);
      } else if (activeTab === 'resources') {
        // Admins see ALL resources (public and private)
        const { data } = await insforge.database
          .from('bible_school_resources')
          .select('*')
          .order('created_at', { ascending: false });
        setResources(data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (type: TabType) => {
    reset();
    setFormType(type);
    setEditingItem(null);
    setResourceFile(null);
    setValue('is_online', true);
    setValue('status', 'scheduled');
    setValue('is_public', true);
    setShowForm(true);
  };

  const handleEdit = (item: any, type: TabType) => {
    setFormType(type);
    setEditingItem(item);
    Object.keys(item).forEach(key => {
      if (item[key] !== null && item[key] !== undefined) {
        setValue(key, item[key]);
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, type: TabType) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      let tableName = '';
      if (type === 'studies') tableName = 'bible_school_studies';
      else if (type === 'classes') tableName = 'bible_school_classes';
      else if (type === 'meetings') tableName = 'bible_school_meetings';
      else if (type === 'resources') tableName = 'bible_school_resources';

      await insforge.database.from(tableName).delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Failed to delete item');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      let tableName = '';
      let itemData: any = { ...data };

      // Handle file upload for resources
      if (formType === 'resources' && resourceFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('resources')
          .upload(`bible-school/${Date.now()}_${resourceFile.name}`, resourceFile);

        if (uploadError) throw uploadError;
        itemData.file_url = uploadData.url;
        itemData.file_key = uploadData.key;
      }

      // Set created_by
      itemData.created_by = user?.id;
      itemData.updated_at = new Date().toISOString();

      // Remove undefined/null values
      Object.keys(itemData).forEach(key => {
        if (itemData[key] === '' || itemData[key] === null) {
          delete itemData[key];
        }
      });

      if (formType === 'studies') {
        tableName = 'bible_school_studies';
        if (data.scheduled_date && data.scheduled_time) {
          itemData.scheduled_date = new Date(`${data.scheduled_date}T${data.scheduled_time}`).toISOString();
        }
      } else if (formType === 'classes') {
        tableName = 'bible_school_classes';
        if (data.scheduled_date && data.scheduled_time) {
          itemData.scheduled_date = new Date(`${data.scheduled_date}T${data.scheduled_time}`).toISOString();
        }
      } else if (formType === 'meetings') {
        tableName = 'bible_school_meetings';
        if (data.scheduled_date && data.scheduled_time) {
          itemData.scheduled_date = new Date(`${data.scheduled_date}T${data.scheduled_time}`).toISOString();
        }
      } else if (formType === 'resources') {
        tableName = 'bible_school_resources';
      }

      if (editingItem) {
        await insforge.database.from(tableName).update(itemData).eq('id', editingItem.id);
      } else {
        await insforge.database.from(tableName).insert([itemData]);
      }

      reset();
      setShowForm(false);
      setEditingItem(null);
      fetchData();
      alert(`${formType === 'studies' ? 'Study' : formType === 'classes' ? 'Class' : formType === 'meetings' ? 'Meeting' : 'Resource'} ${editingItem ? 'updated' : 'created'} successfully!`);
    } catch (err: any) {
      console.error('Error saving:', err);
      alert(err.message || 'Failed to save item');
    }
  };

  const tabs = [
    { id: 'studies' as TabType, label: 'Bible Studies', icon: BookOpen },
    { id: 'classes' as TabType, label: 'Classes', icon: Users },
    { id: 'meetings' as TabType, label: 'Meetings', icon: Video },
    { id: 'resources' as TabType, label: 'Resources', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Bible School Management</h1>
          <p className="text-gray-600">Manage Bible studies, classes, meetings, and resources</p>
        </div>
        <Button variant="primary" onClick={() => handleCreate(activeTab)}>
          <Plus size={20} className="mr-2" />
          Create {tabs.find(t => t.id === activeTab)?.label}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gold text-gold font-semibold'
                  : 'border-transparent text-gray-600 hover:text-navy-ink'
              }`}
            >
              <tab.icon size={18} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-card shadow-soft p-6">
          {activeTab === 'studies' && (
            <div className="space-y-4">
              {studies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No Bible studies found. Create one to get started.</p>
              ) : (
                studies.map(study => (
                  <div key={study.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-navy-ink">{study.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{study.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {study.scheduled_date && (
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {new Date(study.scheduled_date).toLocaleString()}
                          </span>
                        )}
                        {study.is_online ? (
                          <span className="flex items-center text-blue-600">
                            <LinkIcon size={14} className="mr-1" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <MapPin size={14} className="mr-1" />
                            {study.location}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{study.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(study, 'studies')}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(study.id, 'studies')}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-4">
              {classes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No classes found. Create one to get started.</p>
              ) : (
                classes.map(cls => (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-navy-ink">{cls.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{cls.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {cls.scheduled_date && (
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {new Date(cls.scheduled_date).toLocaleString()}
                          </span>
                        )}
                        {cls.is_online ? (
                          <span className="flex items-center text-blue-600">
                            <LinkIcon size={14} className="mr-1" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <MapPin size={14} className="mr-1" />
                            {cls.location}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{cls.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(cls, 'classes')}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(cls.id, 'classes')}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'meetings' && (
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No meetings found. Create one to get started.</p>
              ) : (
                meetings.map(meeting => (
                  <div key={meeting.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-navy-ink">{meeting.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {meeting.scheduled_date && (
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {new Date(meeting.scheduled_date).toLocaleString()}
                          </span>
                        )}
                        {meeting.is_online ? (
                          <span className="flex items-center text-blue-600">
                            <LinkIcon size={14} className="mr-1" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <MapPin size={14} className="mr-1" />
                            {meeting.location}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{meeting.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(meeting, 'meetings')}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(meeting.id, 'meetings')}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              {resources.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No resources found. Create one to get started.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map(resource => (
                    <div key={resource.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-navy-ink">{resource.title}</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(resource, 'resources')}>
                            <Edit size={16} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(resource.id, 'resources')}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          resource.resource_type === 'book' ? 'bg-blue-100 text-blue-800' :
                          resource.resource_type === 'notes' ? 'bg-green-100 text-green-800' :
                          resource.resource_type === 'test' ? 'bg-yellow-100 text-yellow-800' :
                          resource.resource_type === 'video' ? 'bg-red-100 text-red-800' :
                          resource.resource_type === 'audio' ? 'bg-purple-100 text-purple-800' :
                          resource.resource_type === 'document' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {resource.resource_type}
                        </span>
                        {resource.category && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{resource.category}</span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs ${
                          resource.is_public ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {resource.is_public ? 'Public' : 'Private'}
                        </span>
                        <span className="text-xs text-gray-500">Downloads: {resource.download_count || 0}</span>
                      </div>
                      {(resource.file_url || resource.external_link) && (
                        <div className="mt-2">
                          <a
                            href={resource.external_link || resource.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Resource →
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-soft p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">
                {editingItem ? 'Edit' : 'Create'} {tabs.find(t => t.id === formType)?.label}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

              {(formType === 'studies' || formType === 'classes' || formType === 'meetings') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Scheduled Date</label>
                      <input
                        type="date"
                        {...register('scheduled_date')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Scheduled Time</label>
                      <input
                        type="time"
                        {...register('scheduled_time')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      {...register('duration_minutes', { valueAsNumber: true })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      defaultValue={60}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Event Type</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('is_online')}
                          value="true"
                          checked={isOnline}
                          onChange={() => setValue('is_online', true)}
                          className="mr-2"
                        />
                        <span>Online</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('is_online')}
                          value="false"
                          checked={!isOnline}
                          onChange={() => setValue('is_online', false)}
                          className="mr-2"
                        />
                        <span>In-Person</span>
                      </label>
                    </div>
                  </div>

                  {isOnline ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Meeting Link *</label>
                        <input
                          type="url"
                          {...register('meeting_link', { required: isOnline ? 'Meeting link is required' : false })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                          placeholder="https://zoom.us/j/123456789"
                        />
                        {errors.meeting_link && <p className="text-red-500 text-sm mt-1">{errors.meeting_link.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Meeting Password (Optional)</label>
                        <input
                          type="text"
                          {...register('meeting_password')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Location *</label>
                      <input
                        type="text"
                        {...register('location', { required: !isOnline ? 'Location is required' : false })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Max Participants</label>
                    <input
                      type="number"
                      {...register('max_participants', { valueAsNumber: true })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Status</label>
                    <select
                      {...register('status')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="postponed">Postponed</option>
                    </select>
                  </div>

                  {formType === 'studies' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Content</label>
                        <textarea
                          {...register('content')}
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                          placeholder="Study content, notes, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Notes URL</label>
                        <input
                          type="url"
                          {...register('notes_url')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                    </>
                  )}

                  {formType === 'classes' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Course Content</label>
                        <textarea
                          {...register('course_content')}
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Materials URL</label>
                        <input
                          type="url"
                          {...register('materials_url')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                    </>
                  )}

                  {formType === 'meetings' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Agenda</label>
                        <textarea
                          {...register('agenda')}
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Minutes URL</label>
                        <input
                          type="url"
                          {...register('minutes_url')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Recording URL (Optional)</label>
                    <input
                      type="url"
                      {...register('recording_url')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                </>
              )}

              {formType === 'resources' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Resource Type *</label>
                      <select
                        {...register('resource_type', { required: 'Resource type is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="book">Book</option>
                        <option value="notes">Notes</option>
                        <option value="test">Test</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="document">Document</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.resource_type && <p className="text-red-500 text-sm mt-1">{errors.resource_type.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Category</label>
                      <input
                        type="text"
                        {...register('category')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="e.g., Old Testament, New Testament"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Upload File</label>
                    <input
                      type="file"
                      onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {editingItem?.file_url && (
                      <p className="text-sm text-gray-600 mt-1">Current file: {editingItem.file_url}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">External Link (if file is hosted elsewhere)</label>
                    <input
                      type="url"
                      {...register('external_link')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="https://example.com/resource"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('is_public')}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-navy-ink">Make this resource public</span>
                    </label>
                  </div>
                </>
              )}

              <div className="flex space-x-4">
                <Button type="submit" variant="primary">
                  <Save className="mr-2" size={16} />
                  {editingItem ? 'Update' : 'Create'}
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

