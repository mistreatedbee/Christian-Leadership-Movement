import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { BookOpen, GraduationCap, Clock, Users, Search, Filter, Award, LayoutDashboard } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor: string | null;
  image_url: string | null;
  is_up_endorsed: boolean;
  partner_institution: string | null;
  category: string | null;
  duration: string | null;
  level: string | null;
}

export function CourseCataloguePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUpOnly, setShowUpOnly] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, selectedCategory, showUpOnly]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await insforge.database
        .from('courses')
        .select('*')
        .order('is_up_endorsed', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses];

    // Filter by UP endorsement
    if (showUpOnly) {
      filtered = filtered.filter(course => course.is_up_endorsed);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.description?.toLowerCase().includes(term) ||
        course.instructor?.toLowerCase().includes(term)
      );
    }

    setFilteredCourses(filtered);
  };

  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean))) as string[];
  const upCourses = courses.filter(c => c.is_up_endorsed);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading course catalogue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-navy-ink to-brand-dark-blue text-white p-8 rounded-card">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-10 h-10" />
              <h1 className="text-4xl font-bold">Course Catalogue</h1>
            </div>
            {user && (
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
          </div>
          <p className="text-lg text-blue-100 mb-6">
            Explore our comprehensive range of courses designed to empower and transform communities
          </p>

          {/* University of Pretoria Partnership Banner */}
          {upCourses.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">University of Pretoria Partnership</h3>
                  <p className="text-sm text-blue-100">
                    We are proud to partner with the <strong>Centre for Faith and Community</strong> at the 
                    <strong> Faculty of Theology and Religion, University of Pretoria</strong>. 
                    The following {upCourses.length} courses are endorsed by <strong>Enterprises@UP</strong> 
                    and facilitated by the Centre for Faith and Community.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold appearance-none"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* UP Courses Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="up-only"
              checked={showUpOnly}
              onChange={(e) => setShowUpOnly(e.target.checked)}
              className="w-4 h-4 text-gold focus:ring-gold"
            />
            <label htmlFor="up-only" className="text-sm text-gray-700 cursor-pointer">
              Show UP-endorsed courses only
            </label>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-card shadow-soft">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-2">No courses found</p>
          <p className="text-sm text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-card shadow-soft overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Course Image */}
              {course.image_url ? (
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={course.image_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {course.is_up_endorsed && (
                    <div className="absolute top-2 right-2 bg-gold text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      UP Endorsed
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-r from-navy-ink to-brand-dark-blue relative">
                  {course.is_up_endorsed && (
                    <div className="absolute top-2 right-2 bg-gold text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      UP Endorsed
                    </div>
                  )}
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="w-16 h-16 text-white/30" />
                  </div>
                </div>
              )}

              <div className="p-6">
                {/* Course Title */}
                <h3 className="text-xl font-bold text-navy-ink mb-2">{course.title}</h3>

                {/* Course Meta */}
                <div className="space-y-2 mb-4">
                  {course.category && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-muted-gray rounded text-xs">{course.category}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {course.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration}</span>
                      </div>
                    )}
                    {course.level && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{course.level}</span>
                      </div>
                    )}
                  </div>

                  {course.instructor && (
                    <p className="text-sm text-gray-600">
                      <strong>Instructor:</strong> {course.instructor}
                    </p>
                  )}

                  {course.is_up_endorsed && course.partner_institution && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                      <p className="text-blue-800 font-semibold mb-1">University of Pretoria Partnership</p>
                      <p className="text-blue-700">{course.partner_institution}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {course.description || 'No description available.'}
                </p>

                {/* Action Button */}
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Course Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <BookOpen className="mx-auto text-blue-500 mb-2" size={32} />
          <p className="text-2xl font-bold text-navy-ink">{courses.length}</p>
          <p className="text-sm text-gray-600">Total Courses</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <Award className="mx-auto text-gold mb-2" size={32} />
          <p className="text-2xl font-bold text-navy-ink">{upCourses.length}</p>
          <p className="text-sm text-gray-600">UP-Endorsed Courses</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <Users className="mx-auto text-green-500 mb-2" size={32} />
          <p className="text-2xl font-bold text-navy-ink">{categories.length}</p>
          <p className="text-sm text-gray-600">Course Categories</p>
        </div>
      </div>
    </div>
  );
}

