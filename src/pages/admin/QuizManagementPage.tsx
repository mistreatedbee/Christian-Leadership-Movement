import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Edit, Trash2, Search, Settings } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Quiz {
  id: string;
  course_id?: string;
  title: string;
  description?: string;
  time_limit?: number;
  passing_score: number;
  max_attempts: number;
  is_active: boolean;
  courses?: {
    id: string;
    title: string;
  };
}

export function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    course_id: '',
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
      const [quizzesRes, coursesRes] = await Promise.all([
        insforge.database
          .from('quizzes')
          .select('*, courses(*)')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('courses')
          .select('*')
          .order('title')
      ]);

      setQuizzes(quizzesRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        course_id: formData.course_id || null,
        time_limit: formData.time_limit ? parseInt(formData.time_limit) : null,
        passing_score: parseInt(formData.passing_score.toString()),
        max_attempts: parseInt(formData.max_attempts.toString())
      };

      if (editingQuiz) {
        await insforge.database
          .from('quizzes')
          .update(data)
          .eq('id', editingQuiz.id);
      } else {
        await insforge.database
          .from('quizzes')
          .insert(data);
      }

      setShowForm(false);
      setEditingQuiz(null);
      setFormData({
        course_id: '',
        title: '',
        description: '',
        instructions: '',
        time_limit: '',
        passing_score: 70,
        max_attempts: 1,
        is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Error saving quiz');
    }
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      course_id: quiz.course_id || '',
      title: quiz.title,
      description: quiz.description || '',
      instructions: '',
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

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <p className="text-gray-600">Create and manage course quizzes</p>
        </div>
        <Button onClick={() => {
          setEditingQuiz(null);
          setFormData({
            course_id: '',
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

      {/* Search */}
      <div className="bg-white p-6 rounded-card shadow-soft">
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
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">
            {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course (Optional)</label>
              <select
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              >
                <option value="">No Course (General Quiz)</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
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
                <th className="text-left py-3 px-6">Course</th>
                <th className="text-left py-3 px-6">Time Limit</th>
                <th className="text-left py-3 px-6">Passing Score</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b">
                  <td className="py-4 px-6 font-medium">{quiz.title}</td>
                  <td className="py-4 px-6">{quiz.courses?.title || 'General'}</td>
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
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/admin/quizzes/${quiz.id}/questions`}
                        className="text-gold hover:text-gold/80"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
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

