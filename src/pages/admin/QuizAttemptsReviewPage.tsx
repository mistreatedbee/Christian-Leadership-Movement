import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, User, MessageSquare, Save, Star } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: any;
  score?: number;
  percentage?: number;
  passed?: boolean;
  time_taken?: number;
  completed_at?: string;
  started_at?: string;
  feedback?: string;
  graded_by?: string;
  graded_at?: string;
  is_graded: boolean;
  question_scores?: Record<string, number>;
  question_feedback?: Record<string, string>;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  time_limit?: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: any[];
  correct_answer?: string;
  points: number;
  order_index: number;
}

export function QuizAttemptsReviewPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useUser();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [filterGraded, setFilterGraded] = useState<'all' | 'graded' | 'ungraded'>('all');

  useEffect(() => {
    if (quizId) {
      fetchData();
    }
  }, [quizId, filterGraded]);

  const fetchData = async () => {
    if (!quizId) return;

    try {
      setLoading(true);
      const [quizRes, questionsRes, attemptsRes] = await Promise.all([
        insforge.database
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single(),
        insforge.database
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index'),
        insforge.database
          .from('quiz_attempts')
          .select('*, users(id, nickname, email)')
          .eq('quiz_id', quizId)
          .order('completed_at', { ascending: false })
      ]);

      setQuiz(quizRes.data);
      setQuestions(questionsRes.data || []);
      
      let filteredAttempts = attemptsRes.data || [];
      if (filterGraded === 'graded') {
        filteredAttempts = filteredAttempts.filter((a: QuizAttempt) => a.is_graded);
      } else if (filterGraded === 'ungraded') {
        filteredAttempts = filteredAttempts.filter((a: QuizAttempt) => !a.is_graded);
      }
      
      setAttempts(filteredAttempts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (attempt: QuizAttempt) => {
    setSelectedAttempt(attempt);
    setQuestionScores(attempt.question_scores || {});
    setQuestionFeedback(attempt.question_feedback || {});
    setOverallFeedback(attempt.feedback || '');
    setShowReviewModal(true);
  };

  const calculateTotalScore = () => {
    let total = 0;
    questions.forEach((q) => {
      const awardedPoints = questionScores[q.id] ?? (selectedAttempt?.answers[q.id] ? calculateAutoScore(q, selectedAttempt.answers[q.id]) : 0);
      total += awardedPoints;
    });
    return total;
  };

  const calculateAutoScore = (question: QuizQuestion, userAnswer: any): number => {
    if (question.question_type === 'multiple_choice') {
      const correctOption = question.options?.find((opt: any) => opt.correct);
      if (correctOption && userAnswer === correctOption.text) {
        return question.points;
      }
    } else if (question.question_type === 'true_false') {
      if (userAnswer === question.correct_answer) {
        return question.points;
      }
    } else if (question.question_type === 'short_answer') {
      if (userAnswer?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim()) {
        return question.points;
      }
    }
    // Long answer and ungraded questions default to 0
    return 0;
  };

  const handleSaveGrading = async () => {
    if (!selectedAttempt || !user || !quiz) return;

    try {
      setSaving(true);
      const totalScore = calculateTotalScore();
      const totalMarks = questions.reduce((sum, q) => sum + q.points, 0);
      const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
      const passed = percentage >= quiz.passing_score;

      await insforge.database
        .from('quiz_attempts')
        .update({
          score: totalScore,
          percentage,
          passed,
          feedback: overallFeedback || null,
          question_scores: questionScores,
          question_feedback: questionFeedback,
          is_graded: true,
          graded_by: user.id,
          graded_at: new Date().toISOString()
        })
        .eq('id', selectedAttempt.id);

      alert('Grading saved successfully!');
      setShowReviewModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving grading:', error);
      alert('Error saving grading. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading quiz attempts...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Quiz not found</p>
        <Link to="/admin/quizzes">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quizzes
          </Button>
        </Link>
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
          <h1 className="text-3xl font-bold text-navy-ink">Quiz Attempts Review</h1>
          <p className="text-gray-600">{quiz.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={filterGraded}
            onChange={(e) => setFilterGraded(e.target.value as 'all' | 'graded' | 'ungraded')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Attempts</option>
            <option value="ungraded">Ungraded</option>
            <option value="graded">Graded</option>
          </select>
        </div>
      </div>

      {/* Attempts List */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Student</th>
                <th className="text-left py-3 px-6">Score</th>
                <th className="text-left py-3 px-6">Percentage</th>
                <th className="text-left py-3 px-6">Time Taken</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Graded</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="border-b hover:bg-muted-gray/50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-navy-ink">
                          {attempt.users?.nickname || attempt.users?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold">
                      {attempt.score ?? 'N/A'} / {questions.reduce((sum, q) => sum + q.points, 0)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-semibold ${
                      attempt.passed ? 'text-green-600' : attempt.passed === false ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {attempt.percentage ?? 'N/A'}%
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {formatTime(attempt.time_taken)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {attempt.passed !== undefined ? (
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit ${
                        attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {attempt.passed ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Passed
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Failed
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-500">Pending</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {attempt.is_graded ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" />
                        Graded
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <Button
                      onClick={() => handleReview(attempt)}
                      variant="primary"
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {attempt.is_graded ? 'Review' : 'Grade'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {attempts.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-600">No attempts found</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedAttempt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card shadow-soft max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-navy-ink">Review Quiz Attempt</h2>
                  <p className="text-gray-600">
                    Student: {selectedAttempt.users?.nickname || selectedAttempt.users?.email || 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Attempt Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted-gray rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Current Score</p>
                  <p className="text-lg font-bold text-navy-ink">
                    {calculateTotalScore()} / {questions.reduce((sum, q) => sum + q.points, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Percentage</p>
                  <p className="text-lg font-bold text-gold">
                    {questions.reduce((sum, q) => sum + q.points, 0) > 0
                      ? Math.round((calculateTotalScore() / questions.reduce((sum, q) => sum + q.points, 0)) * 100)
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Time Taken</p>
                  <p className="text-lg font-bold text-navy-ink">
                    {formatTime(selectedAttempt.time_taken)}
                  </p>
                </div>
              </div>

              {/* Questions Review */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-navy-ink">Questions</h3>
                {questions.map((question, index) => {
                  const userAnswer = selectedAttempt.answers[question.id];
                  const awardedPoints = questionScores[question.id] ?? calculateAutoScore(question, userAnswer);
                  const feedback = questionFeedback[question.id] || '';

                  return (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-navy-ink">Q{index + 1}</span>
                            <span className="text-sm text-gray-600">
                              ({question.points} mark{question.points !== 1 ? 's' : ''})
                            </span>
                            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                              {question.question_type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{question.question_text}</p>
                        </div>
                      </div>

                      {/* Student Answer */}
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Student Answer:</p>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {userAnswer || 'No answer provided'}
                          </p>
                        </div>
                      </div>

                      {/* Grading Section */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Awarded Points (Max: {question.points})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={question.points}
                            value={awardedPoints}
                            onChange={(e) => {
                              const points = Math.max(0, Math.min(question.points, parseInt(e.target.value) || 0));
                              setQuestionScores({
                                ...questionScores,
                                [question.id]: points
                              });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Feedback (Optional)
                          </label>
                          <textarea
                            value={feedback}
                            onChange={(e) => {
                              setQuestionFeedback({
                                ...questionFeedback,
                                [question.id]: e.target.value
                              });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                            rows={2}
                            placeholder="Add feedback for this answer..."
                          />
                        </div>
                      </div>

                      {/* Show correct answer for reference */}
                      {question.question_type !== 'long_answer' && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Correct Answer: </span>
                          <span>
                            {question.question_type === 'multiple_choice'
                              ? question.options?.find((opt: any) => opt.correct)?.text
                              : question.correct_answer}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Overall Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Feedback
                </label>
                <textarea
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  rows={4}
                  placeholder="Add overall feedback for this quiz attempt..."
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-4 sticky bottom-0 bg-white">
              <Button
                onClick={() => setShowReviewModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveGrading}
                variant="primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Grading'}
                <Save className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

