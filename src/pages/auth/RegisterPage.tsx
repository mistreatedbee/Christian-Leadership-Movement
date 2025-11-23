import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { User, Mail, Lock, Phone, Eye, EyeOff, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '@insforge/react';
import { insforge } from '../../lib/insforge';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  dateOfBirth?: string;
  gender?: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: {
      errors
    }
  } = useForm<RegisterFormData>();
  const password = watch('password');
  
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Attempting to sign up user:', data.email);
      
      // Sign up user - signUp takes (email, password) as separate arguments
      const result = await signUp(data.email, data.password);
      
      console.log('SignUp result:', result);
      
      // Check if result has error property (failed signup)
      if ('error' in result && result.error) {
        console.error('SignUp error:', result.error);
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error.message || 'Failed to create account. Please try again.';
        setError(errorMessage);
        setIsLoading(false);
        return;
      }
      
      // Check if result has user property (successful signup)
      if (!('user' in result) || !result.user) {
        console.log('Account created successfully, navigating to login');
        // Account was created successfully, just navigate to login
        navigate('/login', { 
          state: { 
            message: '🎉 Your account has been created successfully! Please log in with your email and password to continue.' 
          } 
        });
        return;
      }
      
      console.log('User created, ID:', result.user.id);
      
        // CRITICAL: Create user record in public.users FIRST (before profile)
        // This ensures the user exists for storage foreign key constraints
        try {
          const { error: userCreateError } = await insforge.database
            .from('users')
            .insert([{
              id: result.user.id,
              email: data.email,
              nickname: `${data.firstName} ${data.lastName}`,
              name: `${data.firstName} ${data.lastName}`
            }]);
          
          if (userCreateError) {
            // If user already exists (race condition), that's okay
            if (userCreateError.code !== '23505' && !userCreateError.message?.includes('duplicate')) {
              console.error('Error creating user record:', userCreateError);
            } else {
              console.log('User record already exists, updating...');
              // Update existing record with all available data
              await insforge.database
                .from('users')
                .update({ 
                  email: data.email,
                  nickname: `${data.firstName} ${data.lastName}`,
                  name: `${data.firstName} ${data.lastName}`
                })
                .eq('id', result.user.id);
            }
          } else {
            console.log('User record created in public.users');
          }
          
          // Wait to ensure user record is committed (important for storage foreign keys)
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (userErr) {
          console.error('Exception creating user record:', userErr);
          // Continue - user might already exist
        }
        
        // Create user profile with ALL registration information (including email)
        // Email is saved to user_profiles so admins can access it with same RLS logic as other fields
        try {
          const { error: profileError } = await insforge.database
            .from('user_profiles')
            .insert([{
              user_id: result.user.id,
              email: data.email, // Save email to user_profiles - admins can access it with same RLS logic
              phone: data.phone,
              address: data.address || null,
              city: data.city || null,
              province: data.province || null,
              postal_code: data.postalCode || null,
              date_of_birth: data.dateOfBirth || null,
              role: 'user'
            }]);
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Try to update if insert fails (profile might already exist)
            try {
              await insforge.database
                .from('user_profiles')
                .update({
                  email: data.email, // Update email in user_profiles as well
                  phone: data.phone,
                  address: data.address || null,
                  city: data.city || null,
                  province: data.province || null,
                  postal_code: data.postalCode || null,
                  date_of_birth: data.dateOfBirth || null
                })
                .eq('user_id', result.user.id);
            } catch (updateErr) {
              console.error('Error updating profile:', updateErr);
            }
          } else {
            console.log('User profile created with all registration data');
          }
        } catch (profileErr) {
          console.error('Exception creating profile:', profileErr);
          // Continue even if profile creation fails
        }
      
              // Show success message before navigating
              setError(null);
              setIsLoading(false);
              // Navigate to login with success message
              navigate('/login', { 
                state: { 
                  message: '🎉 Welcome to Christian Leadership Movement! Your account has been created successfully. You can now log in with your email and password to access all features.' 
                } 
              });
              return;
    } catch (err: any) {
      console.error('Registration exception:', err);
      const errorMessage = err?.message || err?.toString() || 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen bg-muted-gray flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-card shadow-soft p-8">
          <div className="text-center mb-8">
            <img
              src="/assets/images/hero.jpeg"
              alt="CLM Logo"
              className="mx-auto h-16 w-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-navy-ink mb-2">
              Create Your Account
            </h1>
            <p className="text-gray-600">
              Join the Christian Leadership Movement
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" {...register('firstName', {
                  required: 'First name is required'
                })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="John" />
                </div>
                {errors.firstName && <p className="text-red-500 text-sm mt-1">
                    {errors.firstName.message}
                  </p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" {...register('lastName', {
                  required: 'Last name is required'
                })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="Doe" />
                </div>
                {errors.lastName && <p className="text-red-500 text-sm mt-1">
                    {errors.lastName.message}
                  </p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="email" {...register('email', {
                required: 'Email is required'
              })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="your@email.com" />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="tel" {...register('phone', {
                required: 'Phone number is required'
              })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="+27 12 345 6789" />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">
                  {errors.phone.message}
                </p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Physical Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" {...register('address')} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="Street address, suburb" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  City
                </label>
                <input type="text" {...register('city')} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="City" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Province
                </label>
                <select {...register('province')} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold">
                  <option value="">Select Province</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Northern Cape">Northern Cape</option>
                  <option value="North West">North West</option>
                  <option value="Western Cape">Western Cape</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Postal Code
                </label>
                <input type="text" {...register('postalCode')} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="date" {...register('dateOfBirth')} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Gender
              </label>
              <select {...register('gender')} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type={showPassword ? 'text' : 'password'} {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })} className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">
                    {errors.password.message}
                  </p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })} className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">
                    {errors.confirmPassword.message}
                  </p>}
              </div>
            </div>
            <div>
              <label className="flex items-start">
                <input type="checkbox" {...register('agreeToTerms', {
                required: 'You must agree to the terms'
              })} className="mr-2 mt-1" />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms-of-service" className="text-gold hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="text-gold hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.agreeToTerms && <p className="text-red-500 text-sm mt-1">
                  {errors.agreeToTerms.message}
                </p>}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-gold hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
          <div className="mt-6">
            <Link to="/" className="text-sm text-gray-600 hover:text-gold flex items-center justify-center">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>;
}