import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Video, Headphones, Download, Search, Filter, LayoutDashboard } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { getStorageUrl } from '../lib/connection';

interface ResourceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
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
  resource_categories?: ResourceCategory;
}

export function ResourceLibraryPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin
      let isAdmin = false;
      if (user) {
        try {
          const { data: profile } = await insforge.database
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
        } catch (err) {
          console.error('Error checking admin status:', err);
        }
      }

      const [categoriesRes, generalResourcesRes, bibleSchoolResourcesRes, courseResourcesRes] = await Promise.all([
        insforge.database
          .from('resource_categories')
          .select('*')
          .order('order_index'),
        (() => {
          let query = insforge.database
            .from('resources')
            .select('*, resource_categories(*)')
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false });

          if (!isAdmin) {
            query = query.eq('is_public', true);
          }
          if (selectedCategory) {
            query = query.eq('category_id', selectedCategory);
          }
          if (selectedType) {
            query = query.eq('resource_type', selectedType);
          }
          return query;
        })(),
        (() => {
          let query = insforge.database
            .from('bible_school_resources')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isAdmin) {
            query = query.eq('is_public', true);
          }
          return query;
        })(),
        // Course resources from course_lessons
        insforge.database
          .from('course_lessons')
          .select('id, title, description, resources_url, video_url, course_id, courses(title)')
          .not('resources_url', 'is', null)
          .order('created_at', { ascending: false })
      ]);

      // Combine all resources
      const allResources: any[] = [];
      
      // Add general resources
      (generalResourcesRes.data || []).forEach((r: any) => {
        allResources.push({
          ...r,
          source: 'general',
          source_label: 'General Resources'
        });
      });

      // Add Bible School resources
      (bibleSchoolResourcesRes.data || []).forEach((r: any) => {
        allResources.push({
          ...r,
          source: 'bible_school',
          source_label: 'Bible School',
          resource_type: r.resource_type || 'document',
          file_key: r.file_key || r.file_url,
          external_link: r.external_link
        });
      });

      // Add course resources
      (courseResourcesRes.data || []).forEach((r: any) => {
        if (r.resources_url || r.video_url) {
          allResources.push({
            id: r.id,
            title: r.title,
            description: r.description,
            resource_type: r.video_url ? 'video' : 'document',
            file_url: r.resources_url || r.video_url,
            external_link: r.video_url ? r.video_url : null,
            source: 'course',
            source_label: `Course: ${(r.courses as any)?.title || 'Course'}`
          });
        }
      });

      setCategories(categoriesRes.data || []);
      setResources(allResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resource: Resource & { source?: string; external_link?: string; file_key?: string }) => {
    try {
      let downloadUrl: string | null = null;

      // Check for external link first (YouTube, Vimeo, Google Drive, etc.)
      if (resource.external_link) {
        downloadUrl = resource.external_link;
      } else if (resource.file_url) {
        // If file_url is already a full URL, use it directly
        if (resource.file_url.startsWith('http://') || resource.file_url.startsWith('https://')) {
          downloadUrl = resource.file_url;
        } else {
          // Otherwise, construct the storage URL
          // Determine the bucket based on source
          let bucket = 'resources';
          if (resource.source === 'bible_school') {
            bucket = 'bible-school-resources';
          } else if (resource.source === 'course') {
            bucket = 'courses';
          }
          
          // Use file_key if available, otherwise use file_url
          const fileKey = resource.file_key || resource.file_url;
          downloadUrl = getStorageUrl(bucket, fileKey);
        }
      }

      if (!downloadUrl) {
        alert('Download URL not available for this resource.');
        return;
      }

      // Track download for general and bible school resources
      if (resource.source === 'general') {
        try {
          await insforge.database
            .from('resources')
            .update({ download_count: (resource.download_count || 0) + 1 })
            .eq('id', resource.id);
        } catch (error) {
          console.error('Error tracking download:', error);
        }
      } else if (resource.source === 'bible_school') {
        try {
          await insforge.database
            .from('bible_school_resources')
            .update({ download_count: ((resource as any).download_count || 0) + 1 })
            .eq('id', resource.id);
        } catch (error) {
          console.error('Error tracking download:', error);
        }
      }

      // Open download link in new tab
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading resource:', error);
      alert('Failed to download resource. Please try again.');
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'audio':
        return <Headphones className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading resources...</p>
      </div>
    );
  }

  const featured = filteredResources.filter(r => r.is_featured);
  const regular = filteredResources.filter(r => !r.is_featured);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-navy-ink mb-2">Resource Library</h1>
            <p className="text-gray-600">Access documents, videos, and audio resources</p>
          </div>
          {user && (
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="">All Types</option>
            <option value="document">Documents</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="link">Links</option>
          </select>
        </div>
      </div>

      {/* Featured Resources */}
      {featured.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-navy-ink mb-4">Featured Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((resource) => (
              <div key={resource.id} className="bg-white p-6 rounded-card shadow-soft border-2 border-gold">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-gold">{getResourceIcon(resource.resource_type)}</div>
                  <span className="text-xs bg-gold text-white px-2 py-1 rounded">Featured</span>
                </div>
                <h3 className="text-lg font-semibold text-navy-ink mb-2">{resource.title}</h3>
                {resource.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{resource.description}</p>
                )}
                {resource.thumbnail_url && (
                  <img
                    src={resource.thumbnail_url}
                    alt={resource.title}
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {resource.download_count || 0} downloads
                  </span>
                  <Button
                    onClick={() => handleDownload(resource)}
                    variant="primary"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Resources */}
      <div>
        <h2 className="text-2xl font-bold text-navy-ink mb-4">All Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regular.map((resource) => (
            <div key={resource.id} className="bg-white p-6 rounded-card shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div className="text-blue-500">{getResourceIcon(resource.resource_type)}</div>
                {resource.resource_categories && (
                  <span className="text-xs bg-muted-gray px-2 py-1 rounded">
                    {resource.resource_categories.name}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-navy-ink mb-2">{resource.title}</h3>
              {resource.source_label && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-2 inline-block">
                  {resource.source_label}
                </span>
              )}
              {resource.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{resource.description}</p>
              )}
              {resource.thumbnail_url && (
                <img
                  src={resource.thumbnail_url}
                  alt={resource.title}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {resource.download_count || 0} downloads
                </span>
                <Button
                  onClick={() => handleDownload(resource)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {resource.external_link ? 'Open Link' : 'Download'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredResources.length === 0 && (
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No resources found</p>
        </div>
      )}
    </div>
  );
}

