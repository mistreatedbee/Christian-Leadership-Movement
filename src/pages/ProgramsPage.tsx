import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { BookOpen, Calendar, Users, ArrowRight, Search, GraduationCap, Award, Lock, CheckCircle, LayoutDashboard } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  description: string | null;
  type: string;
  image_url: string | null;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  is_up_endorsed: boolean;
  partner_institution: string | null;
  category: string | null;
  duration: string | null;
  level: string | null;
}

export function ProgramsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hasMembership, setHasMembership] = useState(false);
  
  // Check if we should show only UP courses
  const showUpCoursesOnly = searchParams.get('up_courses') === 'true';

  useEffect(() => {
    fetchPrograms();
    fetchAllCourses();
    if (user) {
      checkMembership();
    }
  }, [user]);

  useEffect(() => {
    // If showing UP courses only, filter automatically
    if (showUpCoursesOnly) {
      setSelectedCategory('up_courses');
    }
    filterPrograms();
    filterCourses();
  }, [programs, allCourses, searchTerm, selectedCategory, showUpCoursesOnly]);

  const fetchPrograms = async () => {
    try {
      // Fetch all programs (excluding short_course type)
      const { data, error } = await insforge.database
        .from('programs')
        .select('*')
        .neq('type', 'short_course')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCourses = async () => {
    try {
      // Fetch ALL courses (both UP-endorsed and regular)
      const { data, error } = await insforge.database
        .from('courses')
        .select('*')
        .order('is_up_endorsed', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const checkMembership = async () => {
    if (!user) return;

    try {
      const { data } = await insforge.database
        .from('applications')
        .select('status')
        .eq('user_id', user.id)
        .eq('program_type', 'membership')
        .eq('status', 'approved')
        .eq('payment_status', 'confirmed')
        .maybeSingle();

      setHasMembership(!!data);
    } catch (err) {
      console.error('Error checking membership:', err);
    }
  };

  const filterPrograms = () => {
    let filtered = [...programs];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(program =>
        program.name.toLowerCase().includes(term) ||
        program.description?.toLowerCase().includes(term) ||
        program.type.toLowerCase().includes(term)
      );
    }

    setFilteredPrograms(filtered);
  };

  const filterCourses = () => {
    let filtered = [...allCourses];

    // Filter by category
    if (selectedCategory === 'up_courses') {
      filtered = filtered.filter(course => course.is_up_endorsed);
    } else if (selectedCategory !== 'all' && selectedCategory !== 'programs') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.description?.toLowerCase().includes(term) ||
        course.category?.toLowerCase().includes(term)
      );
    }

    setFilteredCourses(filtered);
  };

  const programTypes = Array.from(new Set(programs.map(p => p.type)));
  const courseCategories = Array.from(new Set(allCourses.map(c => c.category).filter(Boolean))) as string[];
  const upCourses = allCourses.filter(c => c.is_up_endorsed);
  const regularCourses = allCourses.filter(c => !c.is_up_endorsed);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted-gray flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading programs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted-gray">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-ink to-brand-dark-blue text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">
                {showUpCoursesOnly ? 'University of Pretoria Courses' : 'Our Programs'}
              </h1>
              <p className="text-lg text-blue-100 max-w-3xl">
                {showUpCoursesOnly 
                  ? 'Endorsed courses by Enterprises@UP and facilitated by the Centre for Faith and Community at the Faculty of Theology and Religion, University of Pretoria.'
                  : 'Explore our comprehensive range of programs and courses designed to equip and empower Christian leaders. Browse by category to find what you need.'
                }
              </p>
            </div>
            {user && (
              <div className="ml-4">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters - Hide if showing UP courses only */}
        {!showUpCoursesOnly && (
          <div className="bg-white p-6 rounded-card shadow-soft mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search programs and courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                >
                  <option value="all">All Categories</option>
                  <option value="programs">Programs Only</option>
                  <option value="up_courses">University of Pretoria Courses</option>
                  <option value="courses">All Courses</option>
                  {courseCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Programs Section */}
        {(selectedCategory === 'all' || selectedCategory === 'programs' || showUpCoursesOnly) && filteredPrograms.length > 0 && !showUpCoursesOnly && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-brand-dark-blue" />
              Programs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {filteredPrograms.map(program => (
                <div
                  key={program.id}
                  className="bg-white rounded-card shadow-soft overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Program Image */}
                  {program.image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={program.image_url}
                        alt={program.name}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-r from-navy-ink to-brand-dark-blue flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/30" />
                    </div>
                  )}

                  <div className="p-6">
                    {/* Program Type Badge */}
                    <div className="mb-3">
                      <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-xs font-semibold">
                        {program.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    </div>

                    {/* Program Title */}
                    <h3 className="text-xl font-bold text-navy-ink mb-3">{program.name}</h3>

                    {/* Description */}
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {program.description || 'No description available.'}
                    </p>

                    {/* Action Button */}
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        if (program.type === 'bible_school') {
                          navigate('/programs/bible-school');
                        } else if (program.type === 'membership') {
                          navigate('/programs/membership');
                        } else {
                          navigate(`/apply?type=${program.type}`);
                        }
                      }}
                    >
                      {program.type === 'bible_school' || program.type === 'membership' ? 'View Program' : 'Apply Now'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* University of Pretoria Courses Section */}
        {(selectedCategory === 'all' || selectedCategory === 'up_courses' || showUpCoursesOnly) && upCourses.length > 0 && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-card p-6 mb-8">
              <div className="flex items-start gap-4">
                <GraduationCap className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-navy-ink mb-2 flex items-center gap-2">
                    <Award className="w-6 h-6 text-gold" />
                    University of Pretoria Courses
                  </h2>
                  <p className="text-gray-700 mb-3">
                    These courses are endorsed by <strong>Enterprises@UP</strong> and facilitated by the 
                    <strong> Centre for Faith and Community</strong> at the 
                    <strong> Faculty of Theology and Religion, University of Pretoria</strong>.
                  </p>
                  <p className="text-gray-600 text-sm mb-4">
                    These comprehensive courses are designed to equip Christian leaders with practical skills and knowledge 
                    for effective ministry and community transformation. Each course combines academic excellence with 
                    real-world application.
                  </p>
                  {!hasMembership && (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5 mt-4">
                      <div className="flex items-start gap-3">
                        <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 mb-2 text-lg">CLM Membership Required</p>
                          <p className="text-amber-800 mb-3">
                            <strong>You must be a registered CLM member to access these courses.</strong> These University of Pretoria 
                            endorsed courses are exclusive to CLM members. Please complete your membership application first to unlock 
                            access to all course materials, resources, and learning content.
                          </p>
                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => navigate('/apply?type=membership')}
                            className="mt-2"
                          >
                            Apply for Membership
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasMembership && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5 mt-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-green-900 font-bold mb-1">✓ You are a registered CLM member!</p>
                          <p className="text-green-800 text-sm">
                            You have full access to all University of Pretoria courses below. Click on any course to view details and enroll.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {(showUpCoursesOnly ? upCourses : filteredCourses.filter(c => c.is_up_endorsed)).map(course => (
                <div
                  key={course.id}
                  className="bg-white rounded-card shadow-soft overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Course Image */}
                  <div className="h-48 bg-gradient-to-r from-navy-ink to-brand-dark-blue relative flex items-center justify-center">
                    <Award className="absolute top-2 right-2 w-6 h-6 text-gold" />
                    <BookOpen className="w-16 h-16 text-white/30" />
                  </div>

                  <div className="p-6">
                    {/* UP Endorsed Badge */}
                    <div className="mb-3">
                      <span className="px-3 py-1 bg-gold text-white rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                        <Award className="w-3 h-3" />
                        UP Endorsed
                      </span>
                    </div>

                    {/* Course Title */}
                    <h3 className="text-xl font-bold text-navy-ink mb-2">{course.title}</h3>

                    {/* Description */}
                    <p className="text-gray-600 mb-3 line-clamp-2 text-sm leading-relaxed">
                      {course.description || 'Comprehensive course designed to equip Christian leaders with practical skills and knowledge for effective ministry and community transformation.'}
                    </p>

                    {/* Course Meta */}
                    <div className="space-y-2 mb-4 text-xs text-gray-500 border-t pt-3">
                      {course.category && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-muted-gray rounded text-xs font-medium">{course.category}</span>
                        </div>
                      )}
                      {course.duration && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Duration: {course.duration}</span>
                        </div>
                      )}
                      {course.level && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Level: {course.level}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {hasMembership ? (
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        View Course
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-center text-sm">
                          <Lock className="w-4 h-4 inline mr-1" />
                          Membership Required
                        </div>
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => navigate('/apply?type=membership')}
                        >
                          Apply for Membership
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Courses Section (Non-UP) */}
        {(selectedCategory === 'all' || selectedCategory === 'courses' || (selectedCategory !== 'up_courses' && selectedCategory !== 'programs' && courseCategories.includes(selectedCategory))) && regularCourses.length > 0 && !showUpCoursesOnly && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-brand-dark-blue" />
              Other Courses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {filteredCourses.filter(c => !c.is_up_endorsed).map(course => (
                <div
                  key={course.id}
                  className="bg-white rounded-card shadow-soft overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Course Image */}
                  <div className="h-48 bg-gradient-to-r from-purple-600 to-indigo-600 relative flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white/30" />
                  </div>

                  <div className="p-6">
                    {/* Course Category Badge */}
                    {course.category && (
                      <div className="mb-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          {course.category}
                        </span>
                      </div>
                    )}

                    {/* Course Title */}
                    <h3 className="text-xl font-bold text-navy-ink mb-2">{course.title}</h3>

                    {/* Description */}
                    <p className="text-gray-600 mb-3 line-clamp-2 text-sm leading-relaxed">
                      {course.description || 'Comprehensive course designed to equip Christian leaders with practical skills and knowledge.'}
                    </p>

                    {/* Course Meta */}
                    <div className="space-y-2 mb-4 text-xs text-gray-500 border-t pt-3">
                      {course.duration && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Duration: {course.duration}</span>
                        </div>
                      )}
                      {course.level && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Level: {course.level}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      View Course
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!showUpCoursesOnly && filteredPrograms.length === 0 && filteredCourses.length === 0 && (
          <div className="bg-white rounded-card shadow-soft p-12 text-center">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-2">No programs or courses found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters or search term</p>
          </div>
        )}

        {/* Statistics */}
        {showUpCoursesOnly ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-card shadow-soft text-center">
              <BookOpen className="mx-auto text-blue-500 mb-2" size={32} />
              <p className="text-2xl font-bold text-navy-ink">{upCourses.length}</p>
              <p className="text-sm text-gray-600">UP Endorsed Courses</p>
            </div>
            <div className="bg-white p-6 rounded-card shadow-soft text-center">
              <Award className="mx-auto text-gold mb-2" size={32} />
              <p className="text-2xl font-bold text-navy-ink">University of Pretoria</p>
              <p className="text-sm text-gray-600">Partner Institution</p>
            </div>
            <div className="bg-white p-6 rounded-card shadow-soft text-center">
              <Lock className="mx-auto text-amber-500 mb-2" size={32} />
              <p className="text-2xl font-bold text-navy-ink">Members Only</p>
              <p className="text-sm text-gray-600">Access Requirement</p>
            </div>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-card shadow-soft text-center">
              <BookOpen className="mx-auto text-blue-500 mb-2" size={32} />
              <p className="text-2xl font-bold text-navy-ink">{programs.length}</p>
              <p className="text-sm text-gray-600">Programs</p>
            </div>
            <div className="bg-white p-6 rounded-card shadow-soft text-center">
              <GraduationCap className="mx-auto text-gold mb-2" size={32} />
              <p className="text-2xl font-bold text-navy-ink">{allCourses.length}</p>
              <p className="text-sm text-gray-600">Total Courses</p>
            </div>
            <div className="bg-white p-6 rounded-card shadow-soft text-center">
              <Award className="mx-auto text-green-500 mb-2" size={32} />
              <p className="text-2xl font-bold text-navy-ink">{upCourses.length}</p>
              <p className="text-sm text-gray-600">UP Endorsed</p>
            </div>
            <div className="bg-white p-6 rounded-card shadow-soft text-center">
              <Users className="mx-auto text-purple-500 mb-2" size={32} />
              <p className="text-2xl font-bold text-navy-ink">{courseCategories.length}</p>
              <p className="text-sm text-gray-600">Categories</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

