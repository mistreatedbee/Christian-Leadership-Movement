import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Edit, Trash2, Search, Settings, GraduationCap, Users } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

interface Quiz {
  id: string;
  course_id?: string;
  program_id?: string;
  bible_school_context?: string;
  quiz_type?: string;
  title: string;
  description?: string;
  instructions?: string;
  time_limit?: number;
  passing_score: number;
  max_attempts: number;
  is_active: boolean;
  courses?: {
    id: string;
    title: string;
  };
  programs?: {
    id: string;
    name: string;
    type: string;
  };
}

export function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [upCourses, setUpCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    quiz_type: 'course',
    course_id: '',
    program_id: '',
    bible_school_context: '',
    title: '',
    description: '',
    instructions: '',
    time_limit: '',
    passing_score: 70,
    max_attempts: 1,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizzesRes, coursesRes, programsRes, upCoursesRes] = await Promise.all([
        insforge.database
          .from('quizzes')
          .select('*, courses(*), programs(*)')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('courses')
          .select('*')
          .order('title'),
        insforge.database
          .from('programs')
          .select('*')
          .order('name'),
        insforge.database
          .from('courses')
          .select('*')
          .eq('is_up_endorsed', true)
          .order('title')
      ]);

      setQuizzes(quizzesRes.data || []);
      setCourses(coursesRes.data || []);
      setPrograms(programsRes.data || []);
      setUpCourses(upCoursesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        quiz_type: formData.quiz_type,
        title: formData.title,
        description: formData.description || null,
        instructions: formData.instructions || null,
        time_limit: formData.time_limit ? parseInt(formData.time_limit) : null,
        passing_score: parseInt(formData.passing_score.toString()),
        max_attempts: parseInt(formData.max_attempts.toString()),
        is_active: formData.is_active
      };

      // Set context-specific fields based on quiz type
      if (formData.quiz_type === 'course') {
        data.course_id = formData.course_id || null;
        data.program_id = null;
        data.bible_school_context = null;
      } else if (formData.quiz_type === 'program') {
        data.program_id = formData.program_id || null;
        // If UP program is selected and a course is chosen, set course_id
        if (formData.program_id && formData.course_id) {
          data.course_id = formData.course_id;
        } else {
          data.course_id = null;
        }
        data.bible_school_context = null;
      } else if (formData.quiz_type === 'bible_school') {
        data.bible_school_context = formData.bible_school_context || null;
        data.course_id = null;
        data.program_id = null;
      } else {
        // General quiz - no specific context
        data.course_id = null;
        data.program_id = null;
        data.bible_school_context = null;
      }

      if (editingQuiz) {
        await insforge.database
          .from('quizzes')
          .update(data)
          .eq('id', editingQuiz.id);
        alert('Quiz updated successfully!');
      } else {
        await insforge.database
          .from('quizzes')
          .insert([data]);
        alert('Quiz created successfully!');
      }

      setShowForm(false);
      setEditingQuiz(null);
      setFormData({
        quiz_type: 'course',
        course_id: '',
        program_id: '',
        bible_school_context: '',
        title: '',
        description: '',
        instructions: '',
        time_limit: '',
        passing_score: 70,
        max_attempts: 1,
        is_active: true
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      alert(error.message || 'Error saving quiz');
    }
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      quiz_type: quiz.quiz_type || 'course',
      course_id: quiz.course_id || '',
      program_id: quiz.program_id || '',
      bible_school_context: quiz.bible_school_context || '',
      title: quiz.title,
      description: quiz.description || '',
      instructions: quiz.instructions || '',
      time_limit: quiz.time_limit?.toString() || '',
      passing_score: quiz.passing_score,
      max_attempts: quiz.max_attempts,
      is_active: quiz.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await insforge.database
        .from('quizzes')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Error deleting quiz');
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || quiz.quiz_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading quizzes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Quiz Management</h1>
          <p className="text-gray-600">Create and manage quizzes for courses, programs, and Bible School</p>
        </div>
        <Button onClick={() => {
          setEditingQuiz(null);
          setFormData({
            quiz_type: 'course',
            course_id: '',
            program_id: '',
            bible_school_context: '',
            title: '',
            description: '',
            instructions: '',
            time_limit: '',
            passing_score: 70,
            max_attempts: 1,
            is_active: true
          });
          setShowForm(true);
        }} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Quiz
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Types</option>
            <option value="course">Course Quizzes</option>
            <option value="program">Program Quizzes</option>
            <option value="bible_school">Bible School Quizzes</option>
            <option value="general">General Quizzes</option>
          </select>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">
            {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Type *</label>
              <select
                value={formData.quiz_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData({
                    ...formData,
                    quiz_type: newType,
                    course_id: newType !== 'course' ? '' : formData.course_id,
                    program_id: newType !== 'program' ? '' : formData.program_id,
                    bible_school_context: newType !== 'bible_school' ? '' : formData.bible_school_context
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              >
                <option value="course">Course Quiz</option>
                <option value="program">Program Quiz</option>
                <option value="bible_school">Bible School Quiz</option>
                <option value="general">General Quiz</option>
              </select>
            </div>

            {formData.quiz_type === 'course' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  required
                >
                  <option value="">Select a Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.quiz_type === 'program' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Program *</label>
                  <select
                    value={formData.program_id}
                    onChange={(e) => {
                      const selectedProgramId = e.target.value;
                      const selectedProgram = programs.find(p => p.id === selectedProgramId);
                      setFormData({ 
                        ...formData, 
                        program_id: selectedProgramId,
                        course_id: '' // Reset course when program changes
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    required
                  >
                    <option value="">Select a Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({program.type})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Show UP courses if University of Pretoria is selected */}
                {formData.program_id && programs.find(p => p.id === formData.program_id)?.name?.toLowerCase().includes('pretoria') && upCourses.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      University of Pretoria Course (Optional)
                    </label>
                    <select
                      value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    >
                      <option value="">Select a UP Course (Optional)</option>
                      {upCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: Select a specific course within the University of Pretoria program
                    </p>
                  </div>
                )}
              </>
            )}

            {formData.quiz_type === 'bible_school' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bible School Context</label>
                <select
                  value={formData.bible_school_context}
                  onChange={(e) => setFormData({ ...formData, bible_school_context: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                >
                  <option value="">General Bible School</option>
                  <option value="study">Bible Study</option>
                  <option value="class">Class</option>
                  <option value="meeting">Meeting</option>
                  <option value="resource">Resource</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Optional: Specify the Bible School context for this quiz (Study, Class, Meeting, or Resource)</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
                <input
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
                <input
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Attempts</label>
                <input
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Save</Button>
              <Button type="button" onClick={() => {
                setShowForm(false);
                setEditingQuiz(null);
              }} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Quizzes List */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Title</th>
                <th className="text-left py-3 px-6">Type</th>
                <th className="text-left py-3 px-6">Context</th>
                <th className="text-left py-3 px-6">Time Limit</th>
                <th className="text-left py-3 px-6">Passing Score</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((quiz) => {
                const getContextLabel = () => {
                  if (quiz.quiz_type === 'course') {
                    return quiz.courses?.title || 'No Course';
                  } else if (quiz.quiz_type === 'program') {
                    return quiz.programs?.name || 'No Program';
                  } else if (quiz.quiz_type === 'bible_school') {
                    return quiz.bible_school_context 
                      ? `Bible School: ${quiz.bible_school_context.charAt(0).toUpperCase() + quiz.bible_school_context.slice(1)}`
                      : 'Bible School: General';
                  }
                  return 'General';
                };

                const getTypeBadge = () => {
                  const badges: Record<string, { bg: string; text: string; icon: any }> = {
                    course: { bg: 'bg-blue-100', text: 'text-blue-800', icon: BookOpen },
                    program: { bg: 'bg-purple-100', text: 'text-purple-800', icon: GraduationCap },
                    bible_school: { bg: 'bg-green-100', text: 'text-green-800', icon: BookOpen },
                    general: { bg: 'bg-gray-100', text: 'text-gray-800', icon: BookOpen }
                  };
                  const badge = badges[quiz.quiz_type || 'general'] || badges.general;
                  const Icon = badge.icon;
                  return (
                    <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                      <Icon className="w-3 h-3" />
                      {quiz.quiz_type?.charAt(0).toUpperCase() + quiz.quiz_type?.slice(1) || 'General'}
                    </span>
                  );
                };

                return (
                  <tr key={quiz.id} className="border-b">
                    <td className="py-4 px-6 font-medium">{quiz.title}</td>
                    <td className="py-4 px-6">{getTypeBadge()}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{getContextLabel()}</td>
                    <td className="py-4 px-6">{quiz.time_limit ? `${quiz.time_limit} min` : 'No limit'}</td>
                    <td className="py-4 px-6">{quiz.passing_score}%</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        quiz.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {quiz.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(quiz)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/admin/quizzes/${quiz.id}/questions`}
                          className="text-gold hover:text-gold/80"
                          title="Manage Questions"
                        >
                          <Settings className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredQuizzes.length === 0 && (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No quizzes found</p>
          </div>
        )}
      </div>
    </div>
  );
}

