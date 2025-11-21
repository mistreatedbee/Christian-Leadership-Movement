import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { getInsForgeBaseUrl, getInsForgeAnonKey } from '../../lib/connection';

interface ForgotPasswordFormData {
  email: string;
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

            try {
              // Use InsForge auth API to send password reset email
              const baseUrl = getInsForgeBaseUrl();
              const anonKey = getInsForgeAnonKey();

      const response = await fetch(`${baseUrl}/api/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({
          email: data.email
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.message || 'Failed to send reset email');
      }

      // Success - show message
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      const errorMessage = err?.message || err?.toString() || 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          {/* Logo */}
          <div className="text-center mb-6">
            <img
              src="/assets/images/hero.jpeg"
              alt="Logo"
              className="mx-auto h-16 w-auto mb-4 animate-fadeIn"
            />
            <h1 className="text-3xl font-bold text-navy-ink mb-2">Forgot Password?</h1>
            <p className="text-gray-600">Enter your email to receive a password reset link</p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
                <h2 className="text-xl font-bold text-green-800 mb-2">Check Your Email</h2>
                <p className="text-green-700">
                  We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
                </p>
              </div>
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Didn't receive the email?{' '}
                    <button
                      onClick={() => setSuccess(false)}
                      className="text-gold hover:underline font-medium"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gold flex items-center justify-center"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

