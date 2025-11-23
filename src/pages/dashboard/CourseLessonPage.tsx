import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Video, FileText, CheckCircle, Play, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Play, Download, CheckCircle, Clock, FileText, Video } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  resources_url: string | null;
  order_index: number;
  scheduled_date: string | null;
  meeting_link: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor: string | null;
}

export function CourseLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoaded || !user || !courseId) return;
    fetchData();
  }, [courseId, lessonId, user, isLoaded]);

  const fetchData = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await insforge.database
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Check access
      const { data: paidApps } = await insforge.database
        .from('applications')
        .select('program_id')
        .eq('user_id', user.id)
        .eq('payment_status', 'confirmed')
        .eq('status', 'approved')
        .eq('program_id', courseId);

      setHasAccess(paidApps && paidApps.length > 0);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await insforge.database
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      // Fetch quizzes for this course
      const { data: quizzesData } = await insforge.database
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setQuizzes(quizzesData || []);

      // Fetch current lesson
      if (lessonId) {
        const { data: lessonData, error: lessonError } = await insforge.database
          .from('course_lessons')
          .select('*')
          .eq('id', lessonId)
          .single();

        if (lessonError) throw lessonError;
        setLesson(lessonData);

        // Fetch progress
        const { data: progressData } = await insforge.database
          .from('user_course_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        setProgress(progressData);
      }
    } catch (err) {
      console.error('Error fetching course data:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = async () => {
    if (!user || !lesson) return;

    try {
      const progressData = {
        user_id: user.id,
        course_id: courseId!,
        lesson_id: lesson.id,
        completed: true,
        progress_percentage: 100,
        last_accessed_at: new Date().toISOString()
      };

      if (progress) {
        await insforge.database
          .from('user_course_progress')
          .update(progressData)
          .eq('id', progress.id);
      } else {
        await insforge.database
          .from('user_course_progress')
          .insert([progressData]);
      }

      setProgress({ ...progressData, id: progress?.id });
      
      // Create notification
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'system',
          title: 'Lesson Completed',
          message: `You have completed "${lesson.title}"`,
          related_id: lesson.id
        }]);
    } catch (err) {
      console.error('Error marking lesson as complete:', err);
    }
  };

  const updateProgress = async (percentage: number) => {
    if (!user || !lesson) return;

    try {
      const progressData = {
        user_id: user.id,
        course_id: courseId!,
        lesson_id: lesson.id,
        completed: percentage === 100,
        progress_percentage: percentage,
        last_accessed_at: new Date().toISOString()
      };

      if (progress) {
        await insforge.database
          .from('user_course_progress')
          .update(progressData)
          .eq('id', progress.id);
      } else {
        await insforge.database
          .from('user_course_progress')
          .insert([progressData]);
      }

      setProgress({ ...progressData, id: progress?.id });
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  if (!isLoaded || loading) {
    return <div className="text-center py-12">Loading lesson...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">You need to have an approved, paid application to access this course.</p>
        <Button href="/apply" variant="primary">Apply Now</Button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Lesson not found.</p>
        <Button onClick={() => navigate('/dashboard/courses')} variant="primary">Back to Courses</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => navigate('/dashboard/courses')}>
          <ArrowLeft className="mr-2" size={16} />
          Back to Courses
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-navy-ink">{course?.title}</h1>
          <p className="text-gray-600">{lesson.title}</p>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="bg-white rounded-card shadow-soft p-6">
        {lesson.video_url && (
          <div className="mb-6">
            <div className="relative aspect-video bg-black rounded-card overflow-hidden mb-4">
              <video
                src={lesson.video_url}
                controls
                className="w-full h-full"
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  const percentage = (video.currentTime / video.duration) * 100;
                  if (percentage > 0) {
                    updateProgress(Math.min(percentage, 100));
                  }
                }}
              />
            </div>
          </div>
        )}

        {lesson.meeting_link && (
          <div className="bg-blue-50 border border-blue-200 rounded-card p-4 mb-6">
            <h3 className="font-bold text-navy-ink mb-2">Live Meeting</h3>
            <p className="text-gray-600 mb-3">Join the scheduled class meeting:</p>
            <Button
              variant="primary"
              onClick={() => window.open(lesson.meeting_link!, '_blank')}
            >
              <Video className="mr-2" size={16} />
              Join Meeting
            </Button>
            {lesson.scheduled_date && (
              <p className="text-sm text-gray-600 mt-2">
                Scheduled: {new Date(lesson.scheduled_date).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy-ink mb-4">Lesson Description</h2>
          <p className="text-gray-700 whitespace-pre-line">
            {lesson.description || 'No description available.'}
          </p>
        </div>

        {lesson.resources_url && (
          <div className="mb-6">
            <h3 className="font-bold text-navy-ink mb-3">Resources</h3>
            <Button
              variant="outline"
              onClick={() => window.open(lesson.resources_url!, '_blank')}
            >
              <Download className="mr-2" size={16} />
              Download Resources
            </Button>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-semibold text-navy-ink">
                {progress.progress_percentage}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-gold rounded-full transition-all"
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Complete Button */}
        {!progress?.completed && (
          <Button variant="primary" onClick={markAsComplete} className="w-full">
            <CheckCircle className="mr-2" size={16} />
            Mark as Complete
          </Button>
        )}

        {progress?.completed && (
          <div className="bg-green-50 border border-green-200 rounded-card p-4 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
            <p className="font-semibold text-green-700">Lesson Completed!</p>
          </div>
        )}
      </div>

      {/* Quizzes Section */}
      {quizzes.length > 0 && (
        <div className="bg-white rounded-card shadow-soft p-6">
          <h3 className="font-bold text-navy-ink mb-4 flex items-center">
            <BookOpen className="mr-2" size={20} />
            Course Quizzes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="border border-gray-200 rounded-card p-4 hover:border-gold transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-navy-ink">{quiz.title}</h4>
                  <BookOpen className="text-blue-500" size={18} />
                </div>
                {quiz.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{quiz.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {quiz.time_limit && (
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{quiz.time_limit} min</span>
                    </div>
                  )}
                  <span>Pass: {quiz.passing_score}%</span>
                </div>
                <Link to={`/dashboard/courses/${courseId}/quizzes/${quiz.id}/take`}>
                  <Button variant="primary" className="w-full text-sm">
                    Take Quiz <ArrowRight className="ml-2" size={14} />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lessons Navigation */}
      <div className="bg-white rounded-card shadow-soft p-6">
        <h3 className="font-bold text-navy-ink mb-4">Course Lessons</h3>
        <div className="space-y-2">
          {lessons.map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(`/dashboard/courses/${courseId}/lessons/${l.id}`)}
              className={`w-full text-left p-4 rounded-card border-2 transition-all ${
                l.id === lesson.id
                  ? 'border-gold bg-gold/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-gold font-bold">{l.order_index}.</span>
                  <span className="font-medium text-navy-ink">{l.title}</span>
                </div>
                {progress && progress.lesson_id === l.id && progress.completed && (
                  <CheckCircle className="text-green-500" size={20} />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

