import React, { useEffect, useState } from 'react';
import { FileText, Video, Headphones, Trash2, Search, Star, StarOff, Plus, Edit, X } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface ResourceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order_index: number;
}

interface Resource {
  id: string;
  category_id?: string;
  title: string;
  description?: string;
  resource_type: string;
  file_url?: string;
  file_key?: string;
  external_link?: string;
  thumbnail_url?: string;
  thumbnail_key?: string;
  download_count: number;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  resource_categories?: ResourceCategory;
}

export function ResourcesManagementPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'resources' | 'categories'>('resources');
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    resource_type: 'document',
    file_url: '',
    external_link: '',
    thumbnail_url: '',
    is_featured: false,
    is_public: true
  });
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    order_index: 0
  });
  const [editingCategory, setEditingCategory] = useState<ResourceCategory | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterCategory, filterType, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, categoriesRes] = await Promise.all([
        (() => {
          let query = insforge.database
            .from('resources')
            .select('*, resource_categories(*)')
            .order('created_at', { ascending: false });

          if (filterCategory !== 'all') {
            query = query.eq('category_id', filterCategory);
          }
          if (filterType !== 'all') {
            query = query.eq('resource_type', filterType);
          }
          return query;
        })(),
        insforge.database
          .from('resource_categories')
          .select('*')
          .order('order_index')
      ]);

      setResources(resourcesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    try {
      const resource = resources.find(r => r.id === resourceId);
      
      // Delete file from storage if exists
      if (resource?.file_url) {
        try {
          const fileKey = resource.file_url.split('/').pop();
          if (fileKey) {
            await insforge.storage.from('resources').remove(fileKey);
          }
        } catch (storageError) {
          console.warn('Error deleting resource file:', storageError);
        }
      }

      // Delete thumbnail if exists
      if (resource?.thumbnail_url) {
        try {
          const thumbKey = resource.thumbnail_url.split('/').pop();
          if (thumbKey) {
            await insforge.storage.from('resources').remove(thumbKey);
          }
        } catch (storageError) {
          console.warn('Error deleting thumbnail:', storageError);
        }
      }

      // Delete resource record
      await insforge.database
        .from('resources')
        .delete()
        .eq('id', resourceId);

      fetchData();
      alert('Resource deleted successfully');
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource');
    }
  };

  const toggleFeatured = async (resourceId: string, currentStatus: boolean) => {
    try {
      await insforge.database
        .from('resources')
        .update({ is_featured: !currentStatus })
        .eq('id', resourceId);

      fetchData();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status');
    }
  };

  const togglePublic = async (resourceId: string, currentStatus: boolean) => {
    try {
      await insforge.database
        .from('resources')
        .update({ is_public: !currentStatus })
        .eq('id', resourceId);

      fetchData();
    } catch (error) {
      console.error('Error toggling public status:', error);
      alert('Failed to update public status');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Resources in this category will not be deleted but will become uncategorized.')) {
      return;
    }

    try {
      // Update resources to remove category reference
      await insforge.database
        .from('resources')
        .update({ category_id: null })
        .eq('category_id', categoryId);

      // Delete category
      await insforge.database
        .from('resource_categories')
        .delete()
        .eq('id', categoryId);

      fetchData();
      alert('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      category_id: resource.category_id || '',
      title: resource.title,
      description: resource.description || '',
      resource_type: resource.resource_type,
      file_url: resource.file_url || '',
      external_link: (resource as any).external_link || '',
      thumbnail_url: resource.thumbnail_url || '',
      is_featured: resource.is_featured,
      is_public: resource.is_public
    });
    setResourceFile(null);
    setThumbnailFile(null);
    setShowForm(true);
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let fileUrl = editingResource?.file_url || formData.file_url || null;
      let fileKey = editingResource?.file_key || null;
      let thumbnailUrl = editingResource?.thumbnail_url || formData.thumbnail_url || null;
      let thumbnailKey = editingResource?.thumbnail_key || null;

      // Upload resource file if provided
      if (resourceFile) {
        const filePath = `resources/${Date.now()}_${resourceFile.name}`;
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('resources')
          .upload(filePath, resourceFile);

        if (uploadError) throw uploadError;
        fileUrl = uploadData.url;
        fileKey = uploadData.key;
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbPath = `resources/thumbnails/${Date.now()}_${thumbnailFile.name}`;
        const { data: thumbUploadData, error: thumbError } = await insforge.storage
          .from('resources')
          .upload(thumbPath, thumbnailFile);

        if (thumbError) throw thumbError;
        thumbnailUrl = thumbUploadData.url;
        thumbnailKey = thumbUploadData.key;
      }

      const resourceData: any = {
        category_id: formData.category_id || null,
        title: formData.title,
        description: formData.description || null,
        resource_type: formData.resource_type,
        is_featured: formData.is_featured,
        is_public: formData.is_public
      };

      // Always include file_url and file_key if they exist (preserve existing when editing)
      if (fileUrl) {
        resourceData.file_url = fileUrl;
      }
      if (fileKey) {
        resourceData.file_key = fileKey;
      }
      if (formData.external_link) {
        resourceData.external_link = formData.external_link;
      } else if (editingResource && editingResource.external_link) {
        // Preserve existing external_link if not provided
        resourceData.external_link = editingResource.external_link;
      }
      if (thumbnailUrl) {
        resourceData.thumbnail_url = thumbnailUrl;
      }
      if (thumbnailKey) {
        resourceData.thumbnail_key = thumbnailKey;
      }

      if (editingResource) {
        await insforge.database
          .from('resources')
          .update(resourceData)
          .eq('id', editingResource.id);
        alert('Resource updated successfully');
      } else {
        await insforge.database
          .from('resources')
          .insert([resourceData]);
        alert('Resource created successfully');
      }

      setShowForm(false);
      setEditingResource(null);
      setFormData({
        category_id: '',
        title: '',
        description: '',
        resource_type: 'document',
        file_url: '',
        external_link: '',
        thumbnail_url: '',
        is_featured: false,
        is_public: true
      });
      setResourceFile(null);
      setThumbnailFile(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving resource:', error);
      alert(error.message || 'Failed to save resource');
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = categoryFormData.slug || categoryFormData.name.toLowerCase().replace(/\s+/g, '-');
      
      const categoryData = {
        name: categoryFormData.name,
        slug: slug,
        description: categoryFormData.description || null,
        order_index: categoryFormData.order_index
      };

      if (editingCategory) {
        await insforge.database
          .from('resource_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        alert('Category updated successfully');
      } else {
        await insforge.database
          .from('resource_categories')
          .insert([categoryData]);
        alert('Category created successfully');
      }

      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        slug: '',
        description: '',
        order_index: categories.length
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(error.message || 'Failed to save category');
    }
  };

  const handleEditCategory = (category: ResourceCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      order_index: category.order_index
    });
    setShowCategoryForm(true);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Headphones className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resourceTypes = Array.from(new Set(resources.map(r => r.resource_type).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Resources Management</h1>
          <p className="text-gray-600">Manage resources, categories, and content</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'resources' && (
            <Button onClick={() => {
              setEditingResource(null);
              setFormData({
                category_id: '',
                title: '',
                description: '',
                resource_type: 'document',
                file_url: '',
                external_link: '',
                thumbnail_url: '',
                is_featured: false,
                is_public: true
              });
              setResourceFile(null);
              setThumbnailFile(null);
              setShowForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </Button>
          )}
          {activeTab === 'categories' && (
            <Button onClick={() => {
              setEditingCategory(null);
              setCategoryFormData({
                name: '',
                slug: '',
                description: '',
                order_index: categories.length
              });
              setShowCategoryForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('resources');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'resources'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Resources ({resources.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('categories');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'categories'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Categories ({categories.length})
            </button>
          </div>
          <div className="relative flex-1 max-w-md ml-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
        </div>
        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            >
              <option value="all">All Types</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">Resource</th>
                  <th className="text-left py-3 px-6">Category</th>
                  <th className="text-left py-3 px-6">Type</th>
                  <th className="text-left py-3 px-6">Downloads</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr key={resource.id} className="border-b">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {getResourceIcon(resource.resource_type)}
                        <div>
                          <div className="font-medium">{resource.title}</div>
                          {resource.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{resource.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {resource.resource_categories?.name || 'Uncategorized'}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {resource.resource_type}
                    </td>
                    <td className="py-4 px-6">
                      {resource.download_count || 0}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        {resource.is_featured && (
                          <span className="px-2 py-1 bg-gold text-white text-xs rounded">Featured</span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded ${
                          resource.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {resource.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleFeatured(resource.id, resource.is_featured)}
                          variant="outline"
                          size="sm"
                          title={resource.is_featured ? "Remove Featured" : "Make Featured"}
                        >
                          {resource.is_featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                        </Button>
                        <Button
                          onClick={() => handleEditResource(resource)}
                          variant="outline"
                          size="sm"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => togglePublic(resource.id, resource.is_public)}
                          variant="outline"
                          size="sm"
                          title={resource.is_public ? "Make Private" : "Make Public"}
                        >
                          {resource.is_public ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          onClick={() => deleteResource(resource.id)}
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
          {filteredResources.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No resources found</p>
            </div>
          )}
        </div>
      )}

      {/* Resource Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card shadow-soft max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-navy-ink">
                  {editingResource ? 'Edit Resource' : 'Create Resource'}
                </h2>
                <Button variant="outline" size="sm" onClick={() => {
                  setShowForm(false);
                  setEditingResource(null);
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <form onSubmit={handleResourceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Category</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Resource Type *</label>
                    <select
                      value={formData.resource_type}
                      onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      required
                    >
                      <option value="document">📄 Document</option>
                      <option value="pdf">📕 PDF</option>
                      <option value="video">🎥 Video</option>
                      <option value="audio">🎧 Audio</option>
                      <option value="image">🖼️ Image</option>
                      <option value="link">🔗 Link</option>
                      <option value="textbook">📚 Textbook</option>
                      <option value="notes">📝 Notes</option>
                      <option value="other">📦 Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Upload File</label>
                  <input
                    type="file"
                    onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    accept=".pdf,.doc,.docx,.txt,.mp4,.mp3,.avi,.mov,.wav,.jpg,.jpeg,.png,.gif"
                  />
                  {formData.file_url && !resourceFile && (
                    <p className="text-sm text-gray-600 mt-1">Current: {formData.file_url}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">External Link (if hosted elsewhere)</label>
                  <input
                    type="url"
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="https://example.com/resource or YouTube/Vimeo link"
                  />
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
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-navy-ink">Featured</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-navy-ink">Public</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary">
                    {editingResource ? 'Update' : 'Create'} Resource
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setEditingResource(null);
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card shadow-soft max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-navy-ink">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h2>
                <Button variant="outline" size="sm" onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Name *</label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Slug</label>
                  <input
                    type="text"
                    value={categoryFormData.slug}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="auto-generated from name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Order Index</label>
                  <input
                    type="number"
                    value={categoryFormData.order_index}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, order_index: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary">
                    {editingCategory ? 'Update' : 'Create'} Category
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y">
            {categories.map((category) => {
              const categoryResources = resources.filter(r => r.category_id === category.id);
              return (
                <div key={category.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-navy-ink mb-2">{category.name}</h3>
                      {category.description && (
                        <p className="text-gray-600 mb-2">{category.description}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        Slug: {category.slug} • Order: {category.order_index} • Resources: {categoryResources.length}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditCategory(category)}
                        variant="outline"
                        size="sm"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteCategory(category.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {categories.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No categories found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

