import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Award, ArrowLeft } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface QuizAttempt {
  id: string;
  quiz_id: string;
  answers: any;
  score?: number;
  percentage?: number;
  passed?: boolean;
  time_taken?: number;
  submitted_at?: string;
}

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: any[];
  correct_answer?: string;
  points: number;
}

export function QuizResultsPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { user } = useUser();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizId && user) {
      fetchData();
    }
  }, [quizId, user]);

  const fetchData = async () => {
    if (!quizId || !user) return;

    try {
      setLoading(true);
      const [attemptRes, quizRes, questionsRes] = await Promise.all([
        insforge.database
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single(),
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

      setAttempt(attemptRes.data);
      setQuiz(quizRes.data);
      setQuestions(questionsRes.data || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAnswerCorrect = (question: QuizQuestion): boolean => {
    if (!attempt) return false;
    const userAnswer = attempt.answers[question.id];

    if (question.question_type === 'multiple_choice') {
      const correctOption = question.options?.find((opt: any) => opt.correct);
      return correctOption ? userAnswer === correctOption.text : false;
    } else if (question.question_type === 'true_false') {
      return userAnswer === question.correct_answer;
    } else if (question.question_type === 'short_answer') {
      return userAnswer?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
    }
    return false;
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
        <p className="text-gray-600">Loading results...</p>
      </div>
    );
  }

  if (!attempt || !quiz) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Results not found</p>
        <Link to={`/dashboard/courses/${courseId}/quizzes`} className="text-gold hover:underline mt-4 inline-block">
          Back to Quizzes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-card shadow-soft text-center">
        <div className="mb-4">
          {attempt.passed ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">{quiz.title}</h1>
        <p className={`text-2xl font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
          {attempt.percentage}% - {attempt.passed ? 'Passed' : 'Failed'}
        </p>
        <p className="text-gray-600 mt-2">
          Passing Score: {quiz.passing_score}%
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <Award className="w-8 h-8 text-gold mx-auto mb-2" />
          <p className="text-gray-600 text-sm mb-1">Score</p>
          <p className="text-2xl font-bold text-navy-ink">
            {attempt.score || 0} / {questions.reduce((sum, q) => sum + q.points, 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 text-sm mb-1">Time Taken</p>
          <p className="text-2xl font-bold text-navy-ink">
            {formatTime(attempt.time_taken)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft text-center">
          <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${attempt.passed ? 'text-green-500' : 'text-red-500'}`} />
          <p className="text-gray-600 text-sm mb-1">Status</p>
          <p className={`text-2xl font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
            {attempt.passed ? 'Passed' : 'Failed'}
          </p>
        </div>
      </div>

      {/* Question Review */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-navy-ink">Question Review</h2>
        </div>
        <div className="divide-y">
          {questions.map((question, index) => {
            const isCorrect = isAnswerCorrect(question);
            const userAnswer = attempt.answers[question.id];

            return (
              <div
                key={question.id}
                className={`p-6 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <h3 className="text-lg font-semibold text-navy-ink">
                        Question {index + 1}
                      </h3>
                      <span className="text-sm text-gray-600">
                        ({question.points} point{question.points !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">{question.question_text}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                    <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                      <p className={isCorrect ? 'text-green-800' : 'text-red-800'}>
                        {userAnswer || 'No answer provided'}
                      </p>
                    </div>
                  </div>
                  {!isCorrect && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Correct Answer:</p>
                      <div className="p-3 rounded-lg bg-green-100">
                        <p className="text-green-800">
                          {question.question_type === 'multiple_choice'
                            ? question.options?.find((opt: any) => opt.correct)?.text
                            : question.correct_answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link to={`/dashboard/courses/${courseId}/quizzes`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quizzes
          </Button>
        </Link>
        <Link to={`/dashboard/courses/${courseId}`}>
          <Button variant="primary">
            Continue Course
          </Button>
        </Link>
      </div>
    </div>
  );
}

