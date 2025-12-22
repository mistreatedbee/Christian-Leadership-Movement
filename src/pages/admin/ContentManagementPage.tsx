import React, { useEffect, useState } from 'react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { uploadFileWithUserCheck } from '../../lib/uploadHelpers';
import { getStorageUrl } from '../../lib/connection';
import { Button } from '../../components/ui/Button';
import { Upload, X, Trash2, Edit, Save } from 'lucide-react';

interface GalleryCategory {
  id: string;
  name: string;
  description: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  image_key: string | null;
  caption: string | null;
  category_id: string | null;
  created_at: string;
}

export function ContentManagementPage() {
  const { user } = useUser();
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<GalleryCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editingImageCaption, setEditingImageCaption] = useState('');
  const [editingImageCategory, setEditingImageCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [galleryData, categoriesData] = await Promise.all([
        insforge.database.from('gallery').select('*').order('created_at', { ascending: false }),
        insforge.database.from('gallery_categories').select('*').order('name', { ascending: true })
      ]);

      setGallery(galleryData.data || []);
      setCategories(categoriesData.data || []);
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryUpload = async () => {
    if (!galleryFiles.length || !user || !selectedCategory) {
      setMessage({ type: 'error', text: 'Please select a category and at least one image' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const uploadPromises = galleryFiles.map(async (file) => {
        const filePath = `gallery/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
        const uploadData = await uploadFileWithUserCheck(
          'gallery',
          filePath,
          file,
          user.id,
          user.email || null,
          user.name || null
        );

        return {
          image_url: uploadData.url,
          image_key: uploadData.key,
          caption: '',
          category_id: selectedCategory
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      const { error } = await insforge.database
        .from('gallery')
        .insert(uploadResults);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `Successfully uploaded ${galleryFiles.length} image${galleryFiles.length > 1 ? 's' : ''} to category!` 
      });
      setGalleryFiles([]);
      setSelectedCategory('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload images' });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      return;
    }

    try {
      const { error } = await insforge.database
        .from('gallery_categories')
        .insert([{
          name: newCategoryName,
          description: newCategoryDescription || null
        }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Category created successfully!' });
      setNewCategoryName('');
      setNewCategoryDescription('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create category' });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      return;
    }

    try {
      const { error } = await insforge.database
        .from('gallery_categories')
        .update({
          name: newCategoryName,
          description: newCategoryDescription || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Category updated successfully!' });
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryDescription('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update category' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure? This will remove the category from all images. Images will not be deleted.')) return;

    try {
      await insforge.database
        .from('gallery')
        .update({ category_id: null })
        .eq('category_id', id);

      const { error } = await insforge.database
        .from('gallery_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Category deleted successfully!' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete category' });
    }
  };

  const handleEditCategory = (category: GalleryCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
  };

  const deleteGalleryImage = async (imageId: string, imageKey: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      if (imageKey) {
        await insforge.storage.from('gallery').remove(imageKey);
      }
      await insforge.database.from('gallery').delete().eq('id', imageId);
      setMessage({ type: 'success', text: 'Image deleted successfully!' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete image' });
    }
  };

  const handleEditImage = (image: GalleryImage) => {
    setEditingImage(image);
    setEditingImageCaption(image.caption || '');
    setEditingImageCategory(image.category_id || '');
  };

  const handleUpdateImage = async () => {
    if (!editingImage) return;

    try {
      const { error } = await insforge.database
        .from('gallery')
        .update({
          caption: editingImageCaption || null,
          category_id: editingImageCategory || null
        })
        .eq('id', editingImage.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Image updated successfully!' });
      setEditingImage(null);
      setEditingImageCaption('');
      setEditingImageCategory('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update image' });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading gallery...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Gallery Management</h1>
        <p className="text-gray-600">Create categories and upload images to display on the homepage</p>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Create Category Section */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">
          {editingCategory ? 'Edit Category' : 'Create New Category'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Category Name *</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., Events 2024, Bible School, Community Outreach"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
            <textarea
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Describe what this category is about, what events it covers, etc."
            />
          </div>
          <div className="flex space-x-2">
            <Button
              variant="primary"
              onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
              disabled={!newCategoryName.trim()}
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
            {editingCategory && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Images to Category */}
      {categories.length > 0 && (
        <div className="bg-white rounded-card shadow-soft p-6">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Upload Images to Category</h2>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleGalleryUpload}
                disabled={!galleryFiles.length || !selectedCategory || uploading}
              >
                <Upload className="mr-2" size={16} />
                {uploading ? 'Uploading...' : `Upload ${galleryFiles.length > 0 ? `(${galleryFiles.length})` : ''}`}
              </Button>
            </div>
            
            {/* Preview selected files */}
            {galleryFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-card">
                {galleryFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-card"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                    <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View All Categories and Images */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h2 className="text-xl font-bold text-navy-ink mb-4">All Categories</h2>
        {categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No categories created yet.</p>
            <p className="text-sm">Create a category above to get started!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryImages = gallery.filter(img => img.category_id === category.id);
              
              return (
                <div key={category.id} className="border border-gray-200 rounded-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-navy-ink mb-2">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                      )}
                      <p className="text-xs text-gray-500">{categoryImages.length} image{categoryImages.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit size={16} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  {categoryImages.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {categoryImages.map((img) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={img.image_key ? getStorageUrl('gallery', img.image_key) : img.image_url}
                              alt={img.caption || 'Gallery image'}
                              className="w-full h-48 object-cover rounded-card"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (img.image_key && target.src !== img.image_url) {
                                  target.src = img.image_url;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-card flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditImage(img)}
                                className="bg-white hover:bg-blue-50"
                              >
                                <Edit size={14} className="mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteGalleryImage(img.id, img.image_key || '')}
                                className="bg-white hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                            {img.caption && (
                              <p className="text-xs text-gray-600 mt-1 truncate">{img.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-card">
                      <p>No images in this category yet.</p>
                      <p className="text-sm mt-1">Upload images above and select this category.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Image Modal - Global */}
      {editingImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
          setEditingImage(null);
          setEditingImageCaption('');
          setEditingImageCategory('');
        }}>
          <div className="bg-white rounded-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-navy-ink mb-4">Edit Image</h3>
            <div className="space-y-4">
              <div>
                <img
                  src={editingImage.image_key ? getStorageUrl('gallery', editingImage.image_key) : editingImage.image_url}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-card mb-4"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (editingImage.image_key && target.src !== editingImage.image_url) {
                      target.src = editingImage.image_url;
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Caption</label>
                <input
                  type="text"
                  value={editingImageCaption}
                  onChange={(e) => setEditingImageCaption(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Add a caption for this image"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Category</label>
                <select
                  value={editingImageCategory}
                  onChange={(e) => setEditingImageCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="">No Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  onClick={handleUpdateImage}
                >
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingImage(null);
                    setEditingImageCaption('');
                    setEditingImageCategory('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
