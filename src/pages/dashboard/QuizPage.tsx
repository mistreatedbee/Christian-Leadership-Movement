import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Quiz {
  id: string;
  course_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  time_limit?: number;
  passing_score: number;
  max_attempts: number;
  is_active: boolean;
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

interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: any;
  score?: number;
  percentage?: number;
  passed?: boolean;
  submitted_at?: string;
}

export function QuizPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchQuizzes();
    }
  }, [courseId]);

  const fetchQuizzes = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      // Fetch quizzes for this course (including UP course quizzes that have course_id set)
      const { data } = await insforge.database
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading quizzes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Course Quizzes</h1>
        <p className="text-gray-600">Test your knowledge and track your progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} courseId={courseId || ''} />
        ))}
      </div>

      {quizzes.length === 0 && (
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No quizzes available for this course</p>
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, courseId }: { quiz: Quiz; courseId: string }) {
  const { user } = useUser();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAttempts();
    }
  }, [user, quiz.id]);

  const fetchAttempts = async () => {
    if (!user) return;

    try {
      const { data } = await insforge.database
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quiz.id)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      setAttempts(data || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const canTakeQuiz = attempts.length < quiz.max_attempts;
  const bestAttempt = attempts.length > 0
    ? attempts.reduce((best, current) => 
        (current.percentage || 0) > (best.percentage || 0) ? current : best
      )
    : null;

  return (
    <div className="bg-white p-6 rounded-card shadow-soft">
      <div className="flex items-start justify-between mb-4">
        <BookOpen className="w-8 h-8 text-blue-500" />
        {bestAttempt && bestAttempt.passed && (
          <CheckCircle className="w-6 h-6 text-green-500" />
        )}
      </div>
      <h3 className="text-xl font-bold text-navy-ink mb-2">{quiz.title}</h3>
      {quiz.description && (
        <p className="text-gray-600 mb-4 line-clamp-2">{quiz.description}</p>
      )}
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        {quiz.time_limit && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{quiz.time_limit} minutes</span>
          </div>
        )}
        <div>
          <span>Passing Score: {quiz.passing_score}%</span>
        </div>
        <div>
          <span>Attempts: {attempts.length} / {quiz.max_attempts}</span>
        </div>
        {bestAttempt && (
          <div className="pt-2 border-t">
            <span className="font-semibold">
              Best Score: {bestAttempt.percentage}%
              {bestAttempt.passed ? ' ✓' : ' ✗'}
            </span>
          </div>
        )}
      </div>
      {canTakeQuiz ? (
        <Link to={`/dashboard/courses/${courseId}/quizzes/${quiz.id}/take`}>
          <Button variant="primary" className="w-full">
            Take Quiz <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      ) : (
        <div className="text-center text-sm text-gray-500 py-2">
          Maximum attempts reached
        </div>
      )}
      {attempts.length > 0 && (
        <Link to={`/dashboard/courses/${courseId}/quizzes/${quiz.id}/results`}>
          <Button variant="outline" className="w-full mt-2">
            View Results
          </Button>
        </Link>
      )}
    </div>
  );
}

