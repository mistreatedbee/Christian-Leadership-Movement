import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  time_limit?: number;
  passing_score: number;
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

export function QuizTakePage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (quiz?.time_limit && startedAt) {
      const totalSeconds = quiz.time_limit * 60;
      const interval = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - startedAt.getTime()) / 1000);
        const remaining = totalSeconds - elapsed;
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          handleSubmit();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [quiz, startedAt]);

  const fetchQuiz = async () => {
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
      setStartedAt(new Date());
      if (quizRes.data?.time_limit) {
        setTimeRemaining(quizRes.data.time_limit * 60);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((question) => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];

      if (question.question_type === 'multiple_choice') {
        const correctOption = question.options?.find((opt: any) => opt.correct);
        if (correctOption && userAnswer === correctOption.text) {
          earnedPoints += question.points;
        }
      } else if (question.question_type === 'true_false') {
        if (userAnswer === question.correct_answer) {
          earnedPoints += question.points;
        }
      } else if (question.question_type === 'short_answer') {
        if (userAnswer?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim()) {
          earnedPoints += question.points;
        }
      } else if (question.question_type === 'long_answer') {
        // Long answer questions require manual grading - don't auto-score
        // They will be marked as needing review
        // For now, we'll give 0 points and mark for manual review
      }
    });

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = percentage >= (quiz?.passing_score || 70);

    return { earnedPoints, totalPoints, percentage, passed };
  };

  const handleSubmit = async () => {
    if (!user || !quizId || submitting) return;

    try {
      setSubmitting(true);
      const { earnedPoints, totalPoints, percentage, passed } = calculateScore();
      const timeTaken = startedAt
        ? Math.floor((new Date().getTime() - startedAt.getTime()) / 1000)
        : 0;

      await insforge.database
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          answers,
          score: earnedPoints,
          percentage,
          passed,
          time_taken: timeTaken,
          submitted_at: new Date().toISOString()
        });

      navigate(`/dashboard/courses/${courseId}/quizzes/${quizId}/results`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading quiz...</p>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Quiz not found</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const totalMarks = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Quiz Information */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-navy-ink mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-4">{quiz.description}</p>
          )}
        </div>
        
        {/* Quiz Information Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted-gray rounded-lg">
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Questions</p>
            <p className="text-lg font-bold text-navy-ink">{questions.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Marks</p>
            <p className="text-lg font-bold text-gold">{totalMarks}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Passing Mark</p>
            <p className="text-lg font-bold text-navy-ink">{quiz.passing_score}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Time Limit</p>
            <p className="text-lg font-bold text-navy-ink">
              {quiz.time_limit ? `${quiz.time_limit} min` : 'No limit'}
            </p>
          </div>
        </div>

        {/* Timer and Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gold h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-lg font-semibold ml-4">
              <Clock className="w-5 h-5" />
              <span className={timeRemaining < 60 ? 'text-red-600' : ''}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {quiz.instructions && currentQuestionIndex === 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-blue-800">{quiz.instructions}</p>
        </div>
      )}

      {/* Question */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-bold text-navy-ink flex-1">
              {currentQuestion.question_text}
            </h2>
            <div className="ml-4 bg-gold/10 px-3 py-1 rounded-lg">
              <p className="text-sm font-semibold text-gold">
                {currentQuestion.points} mark{currentQuestion.points !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Question Type: {currentQuestion.question_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </p>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.question_type === 'multiple_choice' && (
            currentQuestion.options?.map((option: any, index: number) => (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  answers[currentQuestion.id] === option.text
                    ? 'border-gold bg-gold/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.text}
                  checked={answers[currentQuestion.id] === option.text}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="mr-3"
                />
                <span>{option.text}</span>
              </label>
            ))
          )}

          {currentQuestion.question_type === 'true_false' && (
            <>
              <label
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  answers[currentQuestion.id] === 'true'
                    ? 'border-gold bg-gold/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value="true"
                  checked={answers[currentQuestion.id] === 'true'}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="mr-3"
                />
                <span>True</span>
              </label>
              <label
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  answers[currentQuestion.id] === 'false'
                    ? 'border-gold bg-gold/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value="false"
                  checked={answers[currentQuestion.id] === 'false'}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="mr-3"
                />
                <span>False</span>
              </label>
            </>
          )}

          {currentQuestion.question_type === 'short_answer' && (
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              rows={4}
              placeholder="Type your answer..."
            />
          )}

          {currentQuestion.question_type === 'long_answer' && (
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              rows={10}
              placeholder="Type your detailed answer here. Be thorough and provide examples where applicable..."
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          variant="outline"
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              variant="primary"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigation */}
      <div className="bg-white p-4 rounded-card shadow-soft">
        <p className="text-sm font-medium text-gray-700 mb-2">Question Navigation</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-gold text-white'
                  : answers[q.id]
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

