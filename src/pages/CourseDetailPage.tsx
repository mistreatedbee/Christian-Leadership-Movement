import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Award, 
  GraduationCap, 
  Play, 
  FileText, 
  Download,
  ArrowLeft,
  Lock,
  CheckCircle,
  LayoutDashboard
} from 'lucide-react';

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

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  video_url: string | null;
  resources_url: string | null;
  scheduled_date: string | null;
  meeting_link: string | null;
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      setLoading(true);

      // Fetch course
      const { data: courseData, error: courseError } = await insforge.database
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch lessons
      const { data: lessonsData } = await insforge.database
        .from('course_lessons')
        .select('*')
        .eq('course_id', id)
        .order('order_index', { ascending: true });

      setLessons(lessonsData || []);

      // Check access if user is logged in
      if (user) {
        const { data: paidApps } = await insforge.database
          .from('applications')
          .select('program_id')
          .eq('user_id', user.id)
          .eq('payment_status', 'confirmed')
          .eq('status', 'approved');

        const hasPaidAccess = paidApps?.some((app: any) => app.program_id === courseData.id) || false;
        setHasAccess(hasPaidAccess);

        // Fetch progress
        const { data: progressData } = await insforge.database
          .from('user_course_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .single();

        setProgress(progressData);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Navigate to application page or enrollment
    navigate('/apply');
  };

  const handleStartLesson = (lessonId: string) => {
    if (!hasAccess) {
      alert('Please enroll in this course to access lessons.');
      return;
    }
    navigate(`/dashboard/courses/${id}/lessons/${lessonId}`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Course not found</p>
        <Button onClick={() => navigate('/courses')} variant="primary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Catalogue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button and Dashboard */}
      <div className="flex items-center justify-between mb-4">
        <Button onClick={() => navigate('/courses')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Catalogue
        </Button>
        {user && (
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        )}
      </div>

      {/* Course Header */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        {course.image_url ? (
          <div className="h-64 overflow-hidden relative">
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            {course.is_up_endorsed && (
              <div className="absolute top-4 right-4 bg-gold text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <Award className="w-4 h-4" />
                University of Pretoria Endorsed
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 bg-gradient-to-r from-navy-ink to-brand-dark-blue relative flex items-center justify-center">
            {course.is_up_endorsed && (
              <div className="absolute top-4 right-4 bg-gold text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <Award className="w-4 h-4" />
                University of Pretoria Endorsed
              </div>
            )}
            <BookOpen className="w-24 h-24 text-white/30" />
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-navy-ink mb-3">{course.title}</h1>
              
              {/* UP Partnership Info */}
              {course.is_up_endorsed && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-blue-900 mb-1">University of Pretoria Partnership</h3>
                      <p className="text-sm text-blue-800 mb-2">
                        This course is endorsed by <strong>Enterprises@UP</strong> and facilitated by the 
                        <strong> Centre for Faith and Community</strong> at the 
                        <strong> Faculty of Theology and Religion, University of Pretoria</strong>.
                      </p>
                      {course.partner_institution && (
                        <p className="text-xs text-blue-700">{course.partner_institution}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Course Meta */}
              <div className="flex flex-wrap gap-4 mb-4">
                {course.category && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-muted-gray rounded-full text-sm">{course.category}</span>
                  </div>
                )}
                {course.duration && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{course.duration}</span>
                  </div>
                )}
                {course.level && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{course.level}</span>
                  </div>
                )}
              </div>

              {course.instructor && (
                <p className="text-gray-600 mb-4">
                  <strong>Instructor:</strong> {course.instructor}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-navy-ink mb-3">About This Course</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {course.description || 'No description available.'}
            </p>
          </div>

          {/* Progress Bar (if enrolled) */}
          {progress && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Your Progress</span>
                <span className="text-sm font-semibold text-navy-ink">
                  {progress.progress_percentage || 0}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 bg-gold rounded-full transition-all"
                  style={{ width: `${progress.progress_percentage || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {hasAccess ? (
              <Button
                variant="primary"
                onClick={() => {
                  if (lessons.length > 0) {
                    handleStartLesson(lessons[0].id);
                  } else {
                    alert('Lessons are being prepared. Please check back soon.');
                  }
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                {progress?.completed ? 'Review Course' : 'Start Learning'}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleEnroll}>
                <BookOpen className="w-4 h-4 mr-2" />
                {user ? 'Enroll in Course' : 'Login to Enroll'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lessons Section */}
      {lessons.length > 0 && (
        <div className="bg-white rounded-card shadow-soft p-8">
          <h2 className="text-2xl font-bold text-navy-ink mb-6">Course Lessons</h2>
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className={`border rounded-lg p-4 ${
                  hasAccess
                    ? 'border-gray-200 hover:border-gold hover:shadow-md transition-all cursor-pointer'
                    : 'border-gray-200 opacity-60'
                }`}
                onClick={() => hasAccess && handleStartLesson(lesson.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 bg-navy-ink text-white rounded-full flex items-center justify-center font-bold">
                      {lesson.order_index || index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-navy-ink mb-1">{lesson.title}</h3>
                      {lesson.description && (
                        <p className="text-sm text-gray-600 mb-2">{lesson.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {lesson.video_url && (
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            Video Available
                          </span>
                        )}
                        {lesson.resources_url && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Resources Available
                          </span>
                        )}
                        {lesson.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(lesson.scheduled_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasAccess && (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                    {hasAccess && (
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Materials Section */}
      {hasAccess && lessons.length > 0 && (
        <div className="bg-white rounded-card shadow-soft p-8">
          <h2 className="text-2xl font-bold text-navy-ink mb-6">Course Materials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lessons
              .filter(lesson => lesson.resources_url)
              .map(lesson => (
                <div
                  key={lesson.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gold transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-navy-ink">{lesson.title}</p>
                        <p className="text-sm text-gray-600">Resources</p>
                      </div>
                    </div>
                    <a
                      href={lesson.resources_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:text-gold-dark"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

