import React, { useEffect, useState } from 'react';
import { useUser } from '@insforge/react';
import { useNavigate } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { BookOpen, Lock, CheckCircle, Play, Shield } from 'lucide-react';
import { getUserRole } from '../../lib/auth';

interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor: string | null;
  image_url: string | null;
}

interface UserProgress {
  course_id: string;
  completed: boolean;
  progress_percentage: number;
}

export function CoursesPage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, UserProgress>>({});
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<Record<string, boolean>>({});
  const [lessons, setLessons] = useState<Record<string, any[]>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    checkAdminStatus();
    fetchCourses();
  }, [user, isLoaded]);

  const checkAdminStatus = async () => {
    if (user) {
      try {
        const role = await getUserRole(user.id);
        const admin = role === 'admin' || role === 'super_admin';
        setIsAdmin(admin);
        
        // Auto-enroll admin in all courses
        if (admin) {
          await autoEnrollAdminInCourses();
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    }
  };

  const autoEnrollAdminInCourses = async () => {
    if (!user) return;
    
    try {
      // Get all courses
      const { data: allCourses } = await insforge.database
        .from('courses')
        .select('id');

      if (!allCourses) return;

      // Check existing enrollments
      const { data: existingEnrollments } = await insforge.database
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      const enrolledCourseIds = new Set(existingEnrollments?.map((e: any) => e.course_id) || []);

      // Enroll in courses not already enrolled
      const enrollmentsToCreate = allCourses
        .filter((course: any) => !enrolledCourseIds.has(course.id))
        .map((course: any) => ({
          user_id: user.id,
          course_id: course.id
        }));

      if (enrollmentsToCreate.length > 0) {
        await insforge.database
          .from('course_enrollments')
          .insert(enrollmentsToCreate);
      }
    } catch (err) {
      console.error('Error auto-enrolling admin:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await insforge.database
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Check user access
      if (user) {
        // Admins have access to all courses
        if (isAdmin) {
          const accessMap: Record<string, boolean> = {};
          coursesData?.forEach((course: Course) => {
            accessMap[course.id] = true;
          });
          setHasAccess(accessMap);
        } else {
          // Regular users need paid application
          const { data: paidApps } = await insforge.database
            .from('applications')
            .select('program_id')
            .eq('user_id', user.id)
            .eq('payment_status', 'confirmed')
            .eq('status', 'approved');

          const accessMap: Record<string, boolean> = {};
          coursesData?.forEach((course: Course) => {
            const hasPaidAccess = paidApps?.some((app: any) => app.program_id === course.id) || false;
            accessMap[course.id] = hasPaidAccess;
          });
          setHasAccess(accessMap);
        }

        // Fetch lessons for each course
        const lessonsMap: Record<string, any[]> = {};
        for (const course of coursesData) {
          const { data: lessonsData } = await insforge.database
            .from('course_lessons')
            .select('*')
            .eq('course_id', course.id)
            .order('order_index', { ascending: true })
            .limit(1);
          lessonsMap[course.id] = lessonsData || [];
        }
        setLessons(lessonsMap);

        // Fetch user progress
        const { data: progressData } = await insforge.database
          .from('user_course_progress')
          .select('course_id, completed, progress_percentage')
          .eq('user_id', user.id);

        const progressMap: Record<string, UserProgress> = {};
        progressData?.forEach((p: any) => {
          if (!progressMap[p.course_id]) {
            progressMap[p.course_id] = {
              course_id: p.course_id,
              completed: p.completed,
              progress_percentage: p.progress_percentage
            };
          }
        });
        setProgress(progressMap);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Please log in to view courses.</p>
        <Button href="/login" variant="primary">Log In</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-navy-ink">My Courses</h1>
          {isAdmin && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Admin Access</span>
            </div>
          )}
        </div>
        <p className="text-gray-600">
          {isAdmin 
            ? 'As an administrator, you have full access to all courses and materials'
            : 'Access your enrolled courses and track your progress'
          }
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-4">No courses available at the moment.</p>
          <Button href="/apply" variant="primary">Apply for a Program</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const userProgress = progress[course.id];
            const canAccess = hasAccess[course.id];

            return (
              <div key={course.id} className="bg-white rounded-card shadow-soft overflow-hidden">
                {course.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-navy-ink">{course.title}</h3>
                    {!canAccess && (
                      <Lock className="text-gray-400" size={20} />
                    )}
                  </div>
                  {course.instructor && (
                    <p className="text-sm text-gray-600 mb-2">Instructor: {course.instructor}</p>
                  )}
                  <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                  {userProgress && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="text-sm font-semibold text-navy-ink">
                          {userProgress.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-gold rounded-full transition-all"
                          style={{ width: `${userProgress.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {canAccess ? (
                    <div className="space-y-2">
                      <Button 
                        variant="primary" 
                        className="w-full" 
                        onClick={() => {
                          // Navigate to first lesson
                          const courseLessons = lessons[course.id];
                          if (courseLessons && courseLessons.length > 0) {
                            navigate(`/dashboard/courses/${course.id}/lessons/${courseLessons[0].id}`);
                          } else {
                            navigate(`/dashboard/courses/${course.id}`);
                          }
                        }}
                      >
                        {userProgress?.completed ? (
                          <>
                            <CheckCircle className="mr-2" size={16} />
                            View Course
                          </>
                        ) : (
                          <>
                            <Play className="mr-2" size={16} />
                            {isAdmin ? 'Access Course' : 'Continue Learning'}
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => navigate(`/dashboard/courses/${course.id}/quizzes`)}
                      >
                        <BookOpen className="mr-2" size={16} />
                        View Quizzes
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-card text-center text-sm">
                      Payment required to access
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

