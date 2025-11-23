import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Clock, BookOpen, X, Save, FileText, Video, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { insforge } from '../../lib/insforge';

interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor: string | null;
  image_url: string | null;
  image_key: string | null;
  program_id: string | null;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  video_url: string | null;
  resources_url: string | null;
  scheduled_date: string | null;
  meeting_link: string | null;
}

interface CourseFormData {
  title: string;
  description: string;
  instructor: string;
  program_id: string;
}

interface LessonFormData {
  title: string;
  description: string;
  order_index: string;
  scheduled_date: string;
  meeting_link: string;
}

export function CourseManagementPage() {
  const { user } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [resourcesFile, setResourcesFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalStudents: 0
  });

  const {
    register: registerCourse,
    handleSubmit: handleCourseSubmit,
    formState: { errors: courseErrors },
    reset: resetCourse,
    setValue: setCourseValue
  } = useForm<CourseFormData>();

  const {
    register: registerLesson,
    handleSubmit: handleLessonSubmit,
    formState: { errors: lessonErrors },
    reset: resetLesson,
    setValue: setLessonValue
  } = useForm<LessonFormData>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesData, programsData] = await Promise.all([
        insforge.database.from('courses').select('*').order('created_at', { ascending: false }),
        insforge.database.from('programs').select('*')
      ]);

      setCourses(coursesData.data || []);
      setPrograms(programsData.data || []);

      // Fetch lessons for each course
      const lessonsMap: Record<string, Lesson[]> = {};
      for (const course of coursesData.data || []) {
        const { data: lessonsData } = await insforge.database
          .from('course_lessons')
          .select('*')
          .eq('course_id', course.id)
          .order('order_index', { ascending: true });
        lessonsMap[course.id] = lessonsData || [];
      }
      setLessons(lessonsMap);

      // Calculate stats
      const { data: enrollments } = await insforge.database
        .from('user_course_progress')
        .select('course_id');

      const uniqueStudents = new Set(enrollments?.map((e: any) => e.user_id) || []);

      setStats({
        total: coursesData.data?.length || 0,
        active: coursesData.data?.length || 0,
        totalStudents: uniqueStudents.size
      });
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = () => {
    resetCourse();
    setEditingCourse(null);
    setImageFile(null);
    setShowCourseForm(true);
  };

  const handleEditCourse = (course: Course) => {
    setCourseValue('title', course.title);
    setCourseValue('description', course.description || '');
    setCourseValue('instructor', course.instructor || '');
    setCourseValue('program_id', course.program_id || '');
    setEditingCourse(course);
    setImageFile(null);
    setShowCourseForm(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? All lessons will be deleted.')) return;

    try {
      // Delete lessons first
      await insforge.database
        .from('course_lessons')
        .delete()
        .eq('course_id', courseId);

      // Delete course image
      const course = courses.find(c => c.id === courseId);
      if (course?.image_key) {
        await insforge.storage.from('courses').remove(course.image_key);
      }

      // Delete course
      await insforge.database
        .from('courses')
        .delete()
        .eq('id', courseId);

      fetchData();
    } catch (err) {
      console.error('Error deleting course:', err);
      alert('Failed to delete course');
    }
  };

  const onCourseSubmit = async (data: CourseFormData) => {
    try {
      let imageUrl = editingCourse?.image_url || null;
      let imageKey = editingCourse?.image_key || null;

      if (imageFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('courses')
          .upload(`courses/${Date.now()}_${imageFile.name}`, imageFile);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        imageUrl = uploadData.url;
        imageKey = uploadData.key;

        if (editingCourse?.image_key) {
          try {
            await insforge.storage.from('courses').remove(editingCourse.image_key);
          } catch (removeErr) {
            console.warn('Could not remove old image:', removeErr);
          }
        }
      }

      const courseData: any = {
        title: data.title,
        description: data.description || null,
        instructor: data.instructor || null,
        program_id: data.program_id || null,
        image_url: imageUrl,
        image_key: imageKey,
        created_by: user?.id
      };

      let savedCourse;
      if (editingCourse) {
        const { data: updated, error: updateError } = await insforge.database
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id)
          .select()
          .single();

        if (updateError) {
          console.error('Course update error:', updateError);
          throw new Error(`Failed to update course: ${updateError.message}`);
        }
        savedCourse = updated;
      } else {
        const { data: inserted, error: insertError } = await insforge.database
          .from('courses')
          .insert([courseData])
          .select()
          .single();

        if (insertError) {
          console.error('Course insert error:', insertError);
          throw new Error(`Failed to create course: ${insertError.message}`);
        }
        savedCourse = inserted;
      }

      // Verify the course was saved
      if (savedCourse) {
        // Notify enrolled users about the course (new or updated)
        try {
          const { data: enrolledUsers } = await insforge.database
            .from('user_course_progress')
            .select('user_id')
            .eq('course_id', savedCourse.id);

          if (enrolledUsers && enrolledUsers.length > 0) {
            const uniqueUserIds = Array.from(new Set(enrolledUsers.map((e: any) => e.user_id)));
            const notifications = uniqueUserIds.map((userId: string) => ({
              user_id: userId,
              type: 'course',
              title: editingCourse ? 'Course Updated' : 'New Course Available',
              message: editingCourse
                ? `The course "${savedCourse.title}" has been updated. Check for new content.`
                : `A new course "${savedCourse.title}" is now available for enrollment.`,
              related_id: savedCourse.id,
              link_url: '/dashboard/courses',
              read: false
            }));

            await insforge.database
              .from('notifications')
              .insert(notifications);
          }

          // If it's a new course, notify all users
          if (!editingCourse) {
            const { data: allUsers } = await insforge.database
              .from('users')
              .select('id');

            if (allUsers && allUsers.length > 0) {
              const notifications = allUsers.map((u: any) => ({
                user_id: u.id,
                type: 'course',
                title: 'New Course Available',
                message: `A new course "${savedCourse.title}" is now available for enrollment.`,
                related_id: savedCourse.id,
                link_url: '/dashboard/courses',
                read: false
              }));

              // Insert in batches
              const batchSize = 100;
              for (let i = 0; i < notifications.length; i += batchSize) {
                const batch = notifications.slice(i, i + batchSize);
                await insforge.database
                  .from('notifications')
                  .insert(batch);
              }
            }
          }
        } catch (notifError) {
          console.error('Error creating course notifications:', notifError);
          // Don't fail the course creation if notifications fail
        }

        setShowCourseForm(false);
        resetCourse();
        setImageFile(null);
        fetchData();
        alert('Course saved successfully!');
      } else {
        throw new Error('Course save completed but verification failed');
      }
    } catch (err: any) {
      console.error('Course save error:', err);
      alert(err.message || 'Failed to save course. Please try again.');
    }
  };

  const handleCreateLesson = (courseId: string) => {
    resetLesson();
    setEditingLesson(null);
    setSelectedCourse(courseId);
    setVideoFile(null);
    setResourcesFile(null);
    setShowLessonForm(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setLessonValue('title', lesson.title);
    setLessonValue('description', lesson.description || '');
    setLessonValue('order_index', lesson.order_index.toString());
    setLessonValue('scheduled_date', lesson.scheduled_date ? new Date(lesson.scheduled_date).toISOString().split('T')[0] : '');
    setLessonValue('meeting_link', lesson.meeting_link || '');
    setEditingLesson(lesson);
    setSelectedCourse(lesson.course_id);
    setVideoFile(null);
    setResourcesFile(null);
    setShowLessonForm(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const lesson = Object.values(lessons).flat().find(l => l.id === lessonId);
      if (lesson?.video_key) {
        await insforge.storage.from('courses').remove(lesson.video_key);
      }
      if (lesson?.resources_key) {
        await insforge.storage.from('courses').remove(lesson.resources_key);
      }

      await insforge.database
        .from('course_lessons')
        .delete()
        .eq('id', lessonId);

      fetchData();
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Failed to delete lesson');
    }
  };

  const onLessonSubmit = async (data: LessonFormData) => {
    if (!selectedCourse) return;

    try {
      let videoUrl = editingLesson?.video_url || null;
      let videoKey = editingLesson?.video_key || null;
      let resourcesUrl = editingLesson?.resources_url || null;
      let resourcesKey = editingLesson?.resources_key || null;

      if (videoFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('courses')
          .upload(`lessons/${Date.now()}_${videoFile.name}`, videoFile);

        if (uploadError) {
          console.error('Video upload error:', uploadError);
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }
        videoUrl = uploadData.url;
        videoKey = uploadData.key;

        if (editingLesson?.video_key) {
          try {
            await insforge.storage.from('courses').remove(editingLesson.video_key);
          } catch (removeErr) {
            console.warn('Could not remove old video:', removeErr);
          }
        }
      }

      if (resourcesFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('courses')
          .upload(`lessons/${Date.now()}_${resourcesFile.name}`, resourcesFile);

        if (uploadError) {
          console.error('Resources upload error:', uploadError);
          throw new Error(`Failed to upload resources: ${uploadError.message}`);
        }
        resourcesUrl = uploadData.url;
        resourcesKey = uploadData.key;

        if (editingLesson?.resources_key) {
          try {
            await insforge.storage.from('courses').remove(editingLesson.resources_key);
          } catch (removeErr) {
            console.warn('Could not remove old resources:', removeErr);
          }
        }
      }

      const lessonData: any = {
        course_id: selectedCourse,
        title: data.title,
        description: data.description || null,
        order_index: parseInt(data.order_index) || 0,
        video_url: videoUrl,
        video_key: videoKey,
        resources_url: resourcesUrl,
        resources_key: resourcesKey,
        scheduled_date: data.scheduled_date || null,
        meeting_link: data.meeting_link || null
      };

      let savedLesson;
      if (editingLesson) {
        const { data: updated, error: updateError } = await insforge.database
          .from('course_lessons')
          .update(lessonData)
          .eq('id', editingLesson.id)
          .select()
          .single();

        if (updateError) {
          console.error('Lesson update error:', updateError);
          throw new Error(`Failed to update lesson: ${updateError.message}`);
        }
        savedLesson = updated;
      } else {
        const { data: inserted, error: insertError } = await insforge.database
          .from('course_lessons')
          .insert([lessonData])
          .select()
          .single();

        if (insertError) {
          console.error('Lesson insert error:', insertError);
          throw new Error(`Failed to create lesson: ${insertError.message}`);
        }
        savedLesson = inserted;
      }

      // Verify the lesson was saved
      if (savedLesson) {
        // Notify enrolled users about the new/updated lesson
        try {
          const { data: enrolledUsers } = await insforge.database
            .from('user_course_progress')
            .select('user_id')
            .eq('course_id', selectedCourse!);

          if (enrolledUsers && enrolledUsers.length > 0) {
            const uniqueUserIds = Array.from(new Set(enrolledUsers.map((e: any) => e.user_id)));
            const notifications = uniqueUserIds.map((userId: string) => ({
              user_id: userId,
              type: 'course',
              title: editingLesson ? 'Lesson Updated' : 'New Lesson Available',
              message: editingLesson
                ? `The lesson "${savedLesson.title}" in your course has been updated.`
                : `A new lesson "${savedLesson.title}" is now available in your course.${savedLesson.scheduled_date ? ` Scheduled for: ${new Date(savedLesson.scheduled_date).toLocaleDateString()}` : ''}`,
              related_id: savedLesson.id,
              link_url: `/dashboard/courses/${selectedCourse}/lessons/${savedLesson.id}`,
              read: false
            }));

            await insforge.database
              .from('notifications')
              .insert(notifications);
          }
        } catch (notifError) {
          console.error('Error creating lesson notifications:', notifError);
          // Don't fail the lesson creation if notifications fail
        }

        setShowLessonForm(false);
        resetLesson();
        setVideoFile(null);
        setResourcesFile(null);
        fetchData();
        alert('Lesson saved successfully!');
      } else {
        throw new Error('Lesson save completed but verification failed');
      }
    } catch (err: any) {
      console.error('Lesson save error:', err);
      alert(err.message || 'Failed to save lesson. Please try again.');
    }
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">
            Course Management
          </h1>
          <p className="text-gray-600">
            Create and manage educational programs
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateCourse}>
          <Plus size={20} className="mr-2" />
          Create Course
        </Button>
      </div>
      {/* Course Form Modal */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-soft p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </h2>
              <button onClick={() => setShowCourseForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit(onCourseSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Title *</label>
                <input
                  type="text"
                  {...registerCourse('title', { required: 'Title is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {courseErrors.title && <p className="text-red-500 text-sm mt-1">{courseErrors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                <textarea
                  {...registerCourse('description')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Instructor</label>
                  <input
                    type="text"
                    {...registerCourse('instructor')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Program</label>
                  <select
                    {...registerCourse('program_id')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <option value="">Select Program (Optional)</option>
                    {programs.map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Course Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex space-x-4">
                <Button type="submit" variant="primary">
                  <Save className="mr-2" size={16} />
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCourseForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Form Modal */}
      {showLessonForm && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-soft p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">
                {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
              </h2>
              <button onClick={() => setShowLessonForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleLessonSubmit(onLessonSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Title *</label>
                <input
                  type="text"
                  {...registerLesson('title', { required: 'Title is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {lessonErrors.title && <p className="text-red-500 text-sm mt-1">{lessonErrors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                <textarea
                  {...registerLesson('description')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Order Index *</label>
                  <input
                    type="number"
                    {...registerLesson('order_index', { required: 'Order is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {lessonErrors.order_index && <p className="text-red-500 text-sm mt-1">{lessonErrors.order_index.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    {...registerLesson('scheduled_date')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Meeting Link</label>
                <input
                  type="url"
                  {...registerLesson('meeting_link')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="https://zoom.us/j/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Video File</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Resources File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResourcesFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex space-x-4">
                <Button type="submit" variant="primary">
                  <Save className="mr-2" size={16} />
                  {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowLessonForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="text-blue-500" size={32} />
          </div>
          <p className="text-gray-600 text-sm">Total Courses</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-green-500" size={32} />
          </div>
          <p className="text-gray-600 text-sm">Total Students</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.totalStudents}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-amber-500" size={32} />
          </div>
          <p className="text-gray-600 text-sm">Active Courses</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.active}</p>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No courses created yet.</p>
          <Button variant="primary" onClick={handleCreateCourse}>
            Create Your First Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const courseLessons = lessons[course.id] || [];
            return (
              <div key={course.id} className="bg-white rounded-card shadow-soft overflow-hidden">
                {course.image_url ? (
                  <div className="h-32 overflow-hidden">
                    <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-r from-brand-dark-blue to-navy-ink"></div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-navy-ink">{course.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                  {course.instructor && (
                    <p className="text-sm text-gray-500 mb-2">Instructor: {course.instructor}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-4">
                    {courseLessons.length} lesson{courseLessons.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCreateLesson(course.id)}
                    >
                      <Plus size={16} className="mr-1" />
                      Add Lesson
                    </Button>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditCourse(course)}>
                        <Edit size={16} className="mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDeleteCourse(course.id)}>
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Lessons List */}
                  {courseLessons.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-navy-ink mb-2">Lessons:</p>
                      <div className="space-y-1">
                        {courseLessons.map(lesson => (
                          <div key={lesson.id} className="flex items-center justify-between p-2 bg-muted-gray rounded-card">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">{lesson.order_index}.</span>
                              <span className="text-sm text-navy-ink">{lesson.title}</span>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEditLesson(lesson)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>;
}