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
  thumbnail_url?: string;
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
    thumbnail_url: '',
    is_featured: false,
    is_public: true
  });

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
                    <Button
                      onClick={() => deleteCategory(category.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

