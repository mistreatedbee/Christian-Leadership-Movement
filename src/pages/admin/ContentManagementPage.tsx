import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';

interface ContentSection {
  section_type: string;
  title: string | null;
  content: string;
}

export function ContentManagementPage() {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sectionsData, galleryData] = await Promise.all([
        insforge.database.from('content_sections').select('*'),
        insforge.database.from('gallery').select('*').order('created_at', { ascending: false })
      ]);

      setSections(sectionsData.data || []);
      setGallery(galleryData.data || []);
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async (sectionType: string, content: string, title?: string) => {
    try {
      const { error } = await insforge.database
        .from('content_sections')
        .upsert([{
          section_type: sectionType,
          content,
          title: title || null
        }], {
          onConflict: 'section_type'
        });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Content updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update content' });
    }
  };

  const handleGalleryUpload = async () => {
    if (!galleryFile) return;

    setSaving(true);
    try {
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from('gallery')
        .upload(`gallery_${Date.now()}_${galleryFile.name}`, galleryFile);

      if (uploadError) throw uploadError;

      await insforge.database
        .from('gallery')
        .insert([{
          image_url: uploadData.url,
          image_key: uploadData.key,
          caption: ''
        }]);

      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
      setGalleryFile(null);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload image' });
    } finally {
      setSaving(false);
    }
  };

  const deleteGalleryImage = async (imageId: string, imageKey: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await insforge.storage.from('gallery').remove(imageKey);
      await insforge.database.from('gallery').delete().eq('id', imageId);
      setMessage({ type: 'success', text: 'Image deleted successfully!' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete image' });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading content...</div>;
  }

  const mission = sections.find(s => s.section_type === 'mission');
  const vision = sections.find(s => s.section_type === 'vision');
  const strategicObjectives = sections.find(s => s.section_type === 'strategic_objectives');
  const coreValues = sections.find(s => s.section_type === 'core_values');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Content Management</h1>
        <p className="text-gray-600">Manage website content and gallery</p>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Mission & Vision */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Mission & Vision</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Mission</label>
            <textarea
              defaultValue={mission?.content || ''}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              onBlur={(e) => updateSection('mission', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Vision</label>
            <textarea
              defaultValue={vision?.content || ''}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              onBlur={(e) => updateSection('vision', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Strategic Objectives */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Strategic Objectives</h2>
        <textarea
          defaultValue={strategicObjectives?.content || ''}
          rows={10}
          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
          placeholder="Enter strategic objectives, one per line..."
          onBlur={(e) => updateSection('strategic_objectives', e.target.value)}
        />
        <p className="text-sm text-gray-500 mt-2">Enter each objective on a new line</p>
      </div>

      {/* Core Values */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Core Values</h2>
        <input
          type="text"
          defaultValue={coreValues?.content || ''}
          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
          placeholder="e.g., Integrity, Leadership, Faith, Service"
          onBlur={(e) => updateSection('core_values', e.target.value)}
        />
      </div>

      {/* Gallery Management */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Gallery Management</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-navy-ink mb-2">Upload New Image</label>
          <div className="flex space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <Button
              variant="primary"
              onClick={handleGalleryUpload}
              disabled={!galleryFile || saving}
            >
              <Upload className="mr-2" size={16} />
              {saving ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gallery.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.image_url}
                alt={img.caption || 'Gallery image'}
                className="w-full h-48 object-cover rounded-card"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-card flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteGalleryImage(img.id, img.image_key)}
                  className="bg-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

