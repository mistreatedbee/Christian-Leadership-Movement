import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Clock, BookOpen, X, Save, Upload, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { insforge } from '../../lib/insforge';
import { clearFeeCache } from '../../lib/feeHelpers';

// --- Interface Fixes ---
interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor: string | null;
  image_url: string | null;
  image_key: string | null;
  program_id: string | null;
  course_fees?: {
    application_fee: number;
    registration_fee: number;
  };
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
  // --- Missing properties added to fix TS2339 errors ---
  video_key: string | null; 
  resources_key: string | null;
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

// Interface for fee state
interface FeeAmounts {
  application_fee: string;
  registration_fee: string;
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
  
  // --- Missing state declarations added here ---
  const [feeAmounts, setFeeAmounts] = useState<Record<string, FeeAmounts>>({});
  const [editingFees, setEditingFees] = useState<string | null>(null);
  // ---------------------------------------------
  
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

  // Ensure feeAmounts stays in sync with courses after they're loaded
  useEffect(() => {
    if (courses.length > 0 && Object.keys(feeAmounts).length === 0) {
      // If courses are loaded but feeAmounts is empty, initialize it
      const feeMap: Record<string, FeeAmounts> = {};
      courses.forEach((course: Course) => {
        feeMap[course.id] = {
          application_fee: (course.course_fees?.application_fee || 0).toString(),
          registration_fee: (course.course_fees?.registration_fee || 0).toString()
        };
      });
      setFeeAmounts(feeMap);
    }
  }, [courses]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch courses and programs
      const [coursesData, programsData] = await Promise.all([
        insforge.database.from('courses').select('*').order('created_at', { ascending: false }),
        insforge.database.from('programs').select('*')
      ]);

      // Fetch ALL course fees separately to ensure we get them reliably
      // Don't filter by is_active - admins should see all fees
      const { data: allFeesData, error: feesError } = await insforge.database
        .from('course_fees')
        .select('course_id, application_fee, registration_fee');

      if (feesError) {
        console.error('Error fetching course fees:', feesError);
      }

      // Create a map of course_id -> fees for quick lookup
      const feesMap: Record<string, { application_fee: number; registration_fee: number }> = {};
      (allFeesData || []).forEach((fee: any) => {
        feesMap[fee.course_id] = {
          application_fee: parseFloat(fee.application_fee) || 0,
          registration_fee: parseFloat(fee.registration_fee) || 0
        };
      });

      // Map courses with fees from the separate fees query
      const coursesWithFees: Course[] = (coursesData.data || []).map((course: any) => {
        const fees = feesMap[course.id];
        
        return {
          ...course,
          course_fees: fees || { application_fee: 0, registration_fee: 0 }
        };
      });

      setCourses(coursesWithFees);
      setPrograms(programsData.data || []);

      // Initialize fee amounts state - CRITICAL: Always set from fetched fees data
      const feeMap: Record<string, FeeAmounts> = {};
      coursesWithFees.forEach((course: Course) => {
        // Always use the course_fees from the fetched data
        const appFee = course.course_fees?.application_fee || 0;
        const regFee = course.course_fees?.registration_fee || 0;
        
        feeMap[course.id] = {
          application_fee: appFee.toString(),
          registration_fee: regFee.toString()
        };
      });
      setFeeAmounts(feeMap);

      // Fetch lessons for each course
      const lessonsMap: Record<string, Lesson[]> = {};
      for (const course of coursesData.data || []) {
        const { data: lessonsData } = await insforge.database
          .from('course_lessons')
          .select('*')
          .eq('course_id', course.id)
          .order('order_index', { ascending: true });
        // Lessons data will not have video_key and resources_key unless you selected them.
        // For robustness, ensure the Lesson interface matches the database schema if those keys are used.
        // Assuming your DB query returns video_key and resources_key, but if it doesn't, 
        // they will be undefined and TS will complain if not set to null or added to the interface.
        // Since I added them to the interface, we'll cast it to Lesson[].
        lessonsMap[course.id] = lessonsData as Lesson[] || [];
      }
      setLessons(lessonsMap);

      // Calculate stats
      // ... (stats calculation logic remains the same)
      const { data: enrollments } = await insforge.database
        .from('user_course_progress')
        .select('user_id'); // Select user_id to count unique students

      // Fix: enrollments array items may not have user_id property unless explicitly selected. 
      // The original code was fine if 'user_id' was selected.
      const uniqueStudents = new Set((enrollments || []).map((e: any) => e.user_id));

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
    
    // Set fee amounts for editing (Fixes TS2304 for setFeeAmounts here)
    if (course.course_fees) {
      setFeeAmounts(prev => ({ // Fixes TS7006 (Implicit 'any' type) by inferring type from declaration
        ...prev,
        [course.id]: {
          application_fee: (course.course_fees?.application_fee || 0).toString(),
          registration_fee: (course.course_fees?.registration_fee || 0).toString()
        }
      }));
    }
    
    setShowCourseForm(true);
  };

  // --- Fee Management Handlers (Fixes TS2304 and TS7006) ---
  const handleEditFees = (courseId: string) => {
    setEditingFees(courseId);
  };

  const handleSaveFees = async (courseId: string) => {
    try {
      const fees = feeAmounts[courseId]; // Fixes TS2304 for feeAmounts
      if (!fees) return;

      const applicationFee = parseFloat(fees.application_fee) || 0;
      const registrationFee = parseFloat(fees.registration_fee) || 0;

      if (applicationFee < 0 || registrationFee < 0) {
        alert('Fees cannot be negative');
        return;
      }

      // Check if fees exist
      const { data: existingFees, error: checkError } = await insforge.database
        .from('course_fees')
        .select('id')
        .eq('course_id', courseId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing fees:', checkError);
        throw new Error(`Failed to check existing fees: ${checkError.message}`);
      }

      let saveError;
      if (existingFees) {
        // Update existing fees
        const { error } = await insforge.database
          .from('course_fees')
          .update({
            application_fee: applicationFee,
            registration_fee: registrationFee,
            updated_at: new Date().toISOString()
          })
          .eq('course_id', courseId);
        saveError = error;
      } else {
        // Create new fees
        const { error } = await insforge.database
          .from('course_fees')
          .insert({
            course_id: courseId,
            application_fee: applicationFee,
            registration_fee: registrationFee,
            currency: 'ZAR',
            is_active: true
          });
        saveError = error;
      }

      if (saveError) {
        console.error('Error saving fees:', saveError);
        throw new Error(`Failed to save fees: ${saveError.message}`);
      }

      // Verify the fees were saved by fetching them back
      const { data: verifyFees, error: verifyError } = await insforge.database
        .from('course_fees')
        .select('application_fee, registration_fee')
        .eq('course_id', courseId)
        .maybeSingle();

      if (verifyError) {
        console.error('Error verifying saved fees:', verifyError);
      } else if (verifyFees) {
        // Verify the saved values match what we intended to save
        const savedAppFee = parseFloat(verifyFees.application_fee) || 0;
        const savedRegFee = parseFloat(verifyFees.registration_fee) || 0;
        
        if (Math.abs(savedAppFee - applicationFee) > 0.01 || Math.abs(savedRegFee - registrationFee) > 0.01) {
          console.warn('Saved fees do not match intended values:', {
            intended: { applicationFee, registrationFee },
            saved: { savedAppFee, savedRegFee }
          });
        }
      }

      // Clear fee cache so user-facing pages get updated fees immediately
      clearFeeCache();
      
      // CRITICAL: Refresh data from database to ensure we have the latest saved values
      await fetchData();
      
      setEditingFees(null);
      
      alert('Fees updated successfully!');
    } catch (error: any) {
      console.error('Error saving fees:', error);
      alert(`Failed to save fees: ${error.message}`);
    }
  };

  const handleCancelFees = (courseId: string) => {
    setEditingFees(null); // Fixes TS2304 for setEditingFees
    // Reset to original values
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setFeeAmounts(prev => ({ // Fixes TS2304 for setFeeAmounts
        ...prev,
        [courseId]: {
          application_fee: (course.course_fees?.application_fee || 0).toString(),
          registration_fee: (course.course_fees?.registration_fee || 0).toString()
        }
      }));
    }
  };
  // -----------------------------------------------------------------

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
        // Fix TS18047: check if uploadData is null/undefined before accessing properties
        imageUrl = uploadData?.url || null; 
        imageKey = uploadData?.key || null; 

        if (editingCourse?.image_key) {
          try {
            await insforge.storage.from('courses').remove(editingCourse.image_key);
          } catch (removeErr) {
            console.warn('Could not remove old image:', removeErr);
          }
        }
      }

      const courseData: any = { // Keeping 'any' here as per your original code, but could be typed more strictly
        title: data.title,
        description: data.description || null,
        instructor: data.instructor || null,
        program_id: data.program_id || null,
        image_url: imageUrl,
        image_key: imageKey,
        created_by: user?.id
      };

      let savedCourse: any; // Explicitly typing to 'any' to resolve TS7034 (implicitly has type 'any')
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
            .eq('course_id', savedCourse.id); // Fixes TS7005 (implicitly has an 'any' type)

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
      // Fix TS2339: The Lesson interface now includes video_key and resources_key
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
      let videoKey = editingLesson?.video_key || null; // Fix TS2339
      let resourcesUrl = editingLesson?.resources_url || null;
      let resourcesKey = editingLesson?.resources_key || null; // Fix TS2339

      if (videoFile) {
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('courses')
          .upload(`lessons/${Date.now()}_${videoFile.name}`, videoFile);

        if (uploadError) {
          console.error('Video upload error:', uploadError);
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }
        // Fix TS18047
        videoUrl = uploadData?.url || null; 
        videoKey = uploadData?.key || null; // Fix TS18047
        
        // Fix TS2339
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
        // Fix TS18047
        resourcesUrl = uploadData?.url || null;
        resourcesKey = uploadData?.key || null; // Fix TS18047

        // Fix TS2339
        if (editingLesson?.resources_key) {
          try {
            await insforge.storage.from('courses').remove(editingLesson.resources_key);
          } catch (removeErr) {
            console.warn('Could not remove old resources:', removeErr);
          }
        }
      }

      const lessonData: any = { // Keeping 'any' here as per your original code
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

      let savedLesson: any; // Explicitly typing to 'any' to resolve TS7034 (implicitly has type 'any')
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
            .eq('course_id', selectedCourse);

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
                
                {/* Course Fees Display/Edit */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-navy-ink">Course Fees</span>
                    {editingFees !== course.id && ( // Fix TS2304 for editingFees
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditFees(course.id)}
                      >
                        <Edit size={14} />
                      </Button>
                    )}
                  </div>
                  {editingFees === course.id ? ( // Edit mode: show inputs
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600">Application Fee (ZAR)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={feeAmounts[course.id]?.application_fee || '0'} // Fix TS2304 for feeAmounts
                          onChange={(e) => setFeeAmounts(prev => ({ // Fix TS2304 for setFeeAmounts
                            ...prev,
                            [course.id]: {
                              ...prev[course.id],
                              application_fee: e.target.value
                            }
                          }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Registration Fee (ZAR)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={feeAmounts[course.id]?.registration_fee || '0'} // Fix TS2304 for feeAmounts
                          onChange={(e) => setFeeAmounts(prev => ({ // Fix TS2304 for setFeeAmounts
                            ...prev,
                            [course.id]: {
                              ...prev[course.id],
                              registration_fee: e.target.value
                            }
                          }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSaveFees(course.id)}
                        >
                          <Save size={14} className="mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCancelFees(course.id)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode: Always use feeAmounts state which is synced with database
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        Application: R{' '}
                        {(
                          parseFloat(feeAmounts[course.id]?.application_fee || '0') || 0
                        ).toFixed(2)}
                      </div>
                      <div>
                        Registration: R{' '}
                        {(
                          parseFloat(feeAmounts[course.id]?.registration_fee || '0') || 0
                        ).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

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
