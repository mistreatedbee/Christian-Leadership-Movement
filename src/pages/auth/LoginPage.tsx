import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@insforge/react';
import { insforge } from '../../lib/insforge';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for success message from registration
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent showing it again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Attempting sign in with email:', data.email);
      console.log('Base URL:', import.meta.env.VITE_INSFORGE_BASE_URL);
      console.log('Anon Key present:', !!import.meta.env.VITE_INSFORGE_ANON_KEY);
      
      // signIn takes (email, password) as separate arguments
      const result = await signIn(data.email, data.password);
      
      console.log('Sign in result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result || {}));
      
      // Check if result has error property (failed signin)
      if (result && 'error' in result && result.error) {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || 'Failed to sign in. Please check your credentials.';
        console.error('Sign in error:', errorMessage);
        setError(errorMessage);
        setIsLoading(false);
        return;
      }
      
      // Check if result has user property (successful signin)
      if (result && 'user' in result && result.user) {
        try {
          const { data: profile, error: profileError } = await insforge.database
            .from('user_profiles')
            .select('*')
            .eq('user_id', result.user.id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            // Continue anyway - profile might not exist yet
          }
          
          if (!profile) {
            try {
              // Get email from users table or auth
              const { data: userData } = await insforge.database
                .from('users')
                .select('email')
                .eq('id', result.user.id)
                .maybeSingle();
              
              const userEmail = userData?.email || result.user.email || null;
              
              const { error: insertError } = await insforge.database
                .from('user_profiles')
                .insert([{ 
                  user_id: result.user.id, 
                  role: 'user',
                  email: userEmail // Include email when creating profile during login
                }]);
              
              if (insertError) {
                console.error('Error creating profile:', insertError);
                // Continue anyway - user can still log in
              }
            } catch (insertErr) {
              console.error('Exception creating profile:', insertErr);
              // Continue anyway
            }
          } else if (profile && !profile.email) {
            // If profile exists but email is missing, sync it from users table
            try {
              const { data: userData } = await insforge.database
                .from('users')
                .select('email')
                .eq('id', result.user.id)
                .maybeSingle();
              
              if (userData?.email) {
                await insforge.database
                  .from('user_profiles')
                  .update({ email: userData.email })
                  .eq('user_id', result.user.id);
              }
            } catch (syncErr) {
              console.error('Exception syncing email to profile:', syncErr);
              // Continue anyway
            }
          }
        } catch (profileErr) {
          console.error('Exception fetching/creating profile:', profileErr);
          // Continue anyway - user is authenticated
        }
        
        // Check if user is admin and redirect accordingly
        try {
          const { data: userProfile, error: profileError } = await insforge.database
            .from('user_profiles')
            .select('role')
            .eq('user_id', result.user.id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error fetching user profile for redirect:', profileError);
            // If RLS error, try to continue - might be a policy issue
            if (profileError.code === '42501' || profileError.message?.includes('permission')) {
              console.warn('RLS policy may be blocking profile access, defaulting to user dashboard');
              navigate('/dashboard');
              return;
            }
          }
          
          console.log('User profile for redirect:', userProfile);
          
          if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'super_admin')) {
            console.log('Admin detected, redirecting to /admin');
            // Admin users go to admin dashboard
            navigate('/admin');
          } else {
            console.log('Regular user, redirecting to /dashboard');
            // Regular users go to user dashboard
            navigate('/dashboard');
          }
        } catch (redirectErr) {
          console.error('Error checking user role for redirect:', redirectErr);
          // Default to user dashboard if check fails
          navigate('/dashboard');
        }
      } else {
        // No user in result and no error - unexpected state
        console.error('Unexpected result structure:', result);
        setError('Unexpected error: No user returned from sign in. Please check your credentials or try registering a new account.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      console.error('Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        toString: err?.toString(),
        cause: err?.cause
      });
      
      // Handle "Failed to fetch" specifically
      let errorMessage = err?.message || err?.toString() || 'An unexpected error occurred.';
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Connection failed. Please check:\n1. Your internet connection\n2. That you restarted the dev server after updating .env\n3. That your InsForge project is active (not paused)\n4. Browser console for more details';
      }
      
      setError(`Sign in failed: ${errorMessage}. Please check your credentials or try registering a new account.`);
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
              src="/assets/images/hero.jpeg" // ✅ Correct Vercel-compatible path
              alt="Logo"
              className="mx-auto h-16 w-auto mb-4 animate-fadeIn"
            />
            <h1 className="text-3xl font-bold text-navy-ink mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to access your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                    </div>

                    {successMessage && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-800 px-5 py-4 rounded-xl text-sm font-medium shadow-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">✨</span>
                          <span>{successMessage}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" {...register('rememberMe')} className="mr-2" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-gold hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" className="w-full py-3 rounded-xl" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-gold hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gold flex items-center justify-center">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
