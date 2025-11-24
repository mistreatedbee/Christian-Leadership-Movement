import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Quiz {
  id: string;
  title: string;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  options?: any[];
  correct_answer?: string;
  points: number;
  order_index: number;
}

export function QuizQuestionsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: [{ text: '', correct: false }, { text: '', correct: false }],
    correct_answer: '',
    points: 1,
    order_index: 0
  });

  useEffect(() => {
    if (quizId) {
      fetchData();
    }
  }, [quizId]);

  const fetchData = async () => {
    if (!quizId) return;

    try {
      setLoading(true);
      const [quizRes, questionsRes] = await Promise.all([
        insforge.database
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single(),
        insforge.database
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index')
      ]);

      setQuiz(quizRes.data);
      setQuestions(questionsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    setFormData({
      ...formData,
      options: [...(formData.options || []), { text: '', correct: false }]
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = formData.options?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, options: newOptions });
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId) return;

    try {
      const data: any = {
        quiz_id: quizId,
        question_text: formData.question_text,
        question_type: formData.question_type,
        points: formData.points,
        order_index: formData.order_index || questions.length
      };

      if (formData.question_type === 'multiple_choice') {
        data.options = formData.options;
      } else if (formData.question_type === 'true_false' || formData.question_type === 'short_answer') {
        data.correct_answer = formData.correct_answer;
      } else if (formData.question_type === 'long_answer') {
        // For long answer, store guidelines in correct_answer field (will be used for manual grading)
        data.correct_answer = formData.correct_answer || null;
      }

      if (editingQuestion) {
        await insforge.database
          .from('quiz_questions')
          .update(data)
          .eq('id', editingQuestion.id);
      } else {
        await insforge.database
          .from('quiz_questions')
          .insert(data);
      }

      setShowForm(false);
      setEditingQuestion(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Error saving question');
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'multiple_choice',
      options: [{ text: '', correct: false }, { text: '', correct: false }],
      correct_answer: '',
      points: 1,
      order_index: 0
    });
  };

  const handleEdit = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || [{ text: '', correct: false }, { text: '', correct: false }],
      correct_answer: question.correct_answer || '',
      points: question.points,
      order_index: question.order_index
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await insforge.database
        .from('quiz_questions')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Error deleting question');
    }
  };

  const moveQuestion = async (questionId: string, direction: 'up' | 'down') => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const currentIndex = question.order_index;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapQuestion = questions.find(q => q.order_index === newIndex);

    if (swapQuestion) {
      // Swap order indices
      await Promise.all([
        insforge.database
          .from('quiz_questions')
          .update({ order_index: newIndex })
          .eq('id', questionId),
        insforge.database
          .from('quiz_questions')
          .update({ order_index: currentIndex })
          .eq('id', swapQuestion.id)
      ]);
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/quizzes" className="inline-flex items-center text-gold hover:underline mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quizzes
          </Link>
          <h1 className="text-3xl font-bold text-navy-ink">Quiz Questions</h1>
          <p className="text-gray-600">{quiz?.title}</p>
        </div>
        <Button
          onClick={() => {
            setEditingQuestion(null);
            resetForm();
            setFormData({ ...formData, order_index: questions.length });
            setShowForm(true);
          }}
          variant="primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Question Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">
            {editingQuestion ? 'Edit Question' : 'Add Question'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question Type *</label>
              <select
                value={formData.question_type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    question_type: e.target.value,
                    options: e.target.value === 'multiple_choice'
                      ? [{ text: '', correct: false }, { text: '', correct: false }]
                      : formData.options
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
                <option value="long_answer">Long Answer (Essay)</option>
              </select>
            </div>

            {formData.question_type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options *</label>
                {formData.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={option.correct}
                        onChange={() => {
                          const newOptions = formData.options?.map((opt, i) => ({
                            ...opt,
                            correct: i === index
                          })) || [];
                          setFormData({ ...formData, options: newOptions });
                        }}
                        className="mr-2"
                      />
                      Correct
                    </label>
                    {formData.options && formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <Button type="button" onClick={handleAddOption} variant="outline" size="sm">
                  Add Option
                </Button>
              </div>
            )}

            {(formData.question_type === 'true_false' || formData.question_type === 'short_answer') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
                {formData.question_type === 'true_false' ? (
                  <select
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    required
                  />
                )}
              </div>
            )}

            {formData.question_type === 'long_answer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Guidelines (Optional)</label>
                <textarea
                  value={formData.correct_answer || ''}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  rows={4}
                  placeholder="Provide guidelines or key points for grading this essay question..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: Long answer questions require manual grading. Provide guidelines to help with evaluation.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points *</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Index</label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" variant="primary">Save Question</Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingQuestion(null);
                  resetForm();
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy-ink">Questions ({questions.length})</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Marks</p>
              <p className="text-2xl font-bold text-gold">
                {questions.reduce((sum, q) => sum + q.points, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y">
          {questions.map((question, index) => (
            <div key={question.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-navy-ink">Q{index + 1}</span>
                    <span className="text-sm text-gray-600">({question.points} point{question.points !== 1 ? 's' : ''})</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {question.question_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{question.question_text}</p>
                  {question.question_type === 'multiple_choice' && question.options && (
                    <div className="space-y-1 ml-4">
                      {question.options.map((opt: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${opt.correct ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={opt.correct ? 'font-semibold text-green-700' : 'text-gray-600'}>
                            {opt.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(question.question_type === 'true_false' || question.question_type === 'short_answer') && (
                    <div className="ml-4">
                      <span className="text-sm text-gray-600">Correct Answer: </span>
                      <span className="font-semibold text-green-700">{question.correct_answer}</span>
                    </div>
                  )}
                  {question.question_type === 'long_answer' && (
                    <div className="ml-4">
                      <span className="text-sm text-gray-600">Grading Guidelines: </span>
                      <span className="font-semibold text-blue-700">{question.correct_answer || 'No guidelines provided'}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => moveQuestion(question.id, 'up')}
                    disabled={index === 0}
                    className="text-gray-600 hover:text-navy-ink disabled:text-gray-300"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveQuestion(question.id, 'down')}
                    disabled={index === questions.length - 1}
                    className="text-gray-600 hover:text-navy-ink disabled:text-gray-300"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleEdit(question)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {questions.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-600">No questions yet. Add your first question!</p>
          </div>
        )}
      </div>
    </div>
  );
}

