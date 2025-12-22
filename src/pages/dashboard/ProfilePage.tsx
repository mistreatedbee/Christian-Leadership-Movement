import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { User, Mail, Phone, MapPin, Calendar, Upload } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { ensureUserExists, uploadFileWithUserCheck } from '../../lib/uploadHelpers';
import { getStorageUrl } from '../../lib/connection';

// Helper function to ensure avatar URL is a full public URL
function getPublicAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  
  // If already a full URL, return as is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // Use connection utility for consistent URL handling
  // Remove any leading slashes from the key
  const key = avatarUrl.startsWith('/') ? avatarUrl.slice(1) : avatarUrl;
  return getStorageUrl('avatars', key);
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  gender: string;
  bio: string;
}

export function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileFormData>();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchProfile = async () => {
      try {
        // Fetch user data
        const { data: userData } = await insforge.database
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        // Fetch profile data
        const { data: profileData } = await insforge.database
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // For existing users: Check applications for registration data
        // This helps populate profile for users who registered before we saved to user_profiles
        let applicationData: any = null;
        try {
          const { data: applications } = await insforge.database
            .from('applications')
            .select('form_data, first_name, last_name, email, phone, address, city, province, postal_code, date_of_birth, gender')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (applications) {
            applicationData = applications;
          }
        } catch (appErr) {
          console.log('No application data found or error fetching:', appErr);
        }

        // Extract data from multiple sources with priority:
        // 1. user_profiles (most recent/accurate)
        // 2. applications form_data (for existing users)
        // 3. applications individual columns
        // 4. users table
        const formData = applicationData?.form_data || {};
        
        // Get first_name and last_name with fallback chain
        const firstName = profileData?.first_name || 
          formData.firstName || 
          formData.first_name ||
          applicationData?.first_name ||
          ((userData?.nickname || user.name || '').split(' ')[0] || '');
        
        const lastName = profileData?.last_name || 
          formData.lastName || 
          formData.last_name ||
          applicationData?.last_name ||
          ((userData?.nickname || user.name || '').split(' ').slice(1).join(' ') || '');

        // Get email with fallback chain
        const email = user.email || 
          profileData?.email || 
          formData.email || 
          applicationData?.email || 
          '';

        // Get phone with fallback chain
        const phone = profileData?.phone || 
          formData.phone || 
          formData.contactNumber ||
          applicationData?.phone || 
          '';

        // Get date of birth with fallback chain
        const dateOfBirth = profileData?.date_of_birth || 
          formData.dateOfBirth || 
          formData.date_of_birth ||
          applicationData?.date_of_birth || 
          '';

        // Get address with fallback chain
        const address = profileData?.address || 
          formData.address || 
          formData.physicalAddress ||
          applicationData?.address || 
          '';

        // Get city with fallback chain
        const city = profileData?.city || 
          formData.city ||
          applicationData?.city || 
          '';

        // Get province with fallback chain
        const province = profileData?.province || 
          formData.province ||
          applicationData?.province || 
          '';

        // Get postal code with fallback chain
        const postalCode = profileData?.postal_code || 
          formData.postalCode ||
          applicationData?.postal_code || 
          '';

        // Get gender with fallback chain
        const gender = profileData?.gender || 
          formData.gender ||
          applicationData?.gender || 
          '';

        reset({
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth,
          address,
          city,
          province,
          postalCode,
          gender,
          bio: userData?.bio || ''
        });

        // Auto-sync missing profile data from applications for existing users
        // This ensures existing users' data is available on their profile
        if (applicationData && !profileData?.first_name && !profileData?.last_name) {
          try {
            // Only sync if we have data from applications and profile is missing it
            const syncData: any = {
              user_id: user.id,
              email: email || null,
              first_name: firstName || null,
              last_name: lastName || null,
              phone: phone || null,
              address: address || null,
              city: city || null,
              province: province || null,
              postal_code: postalCode || null,
              date_of_birth: dateOfBirth || null,
              gender: gender || null,
              role: profileData?.role || 'user'
            };

            if (profileData) {
              // Update existing profile
              await insforge.database
                .from('user_profiles')
                .update(syncData)
                .eq('user_id', user.id);
              console.log('✅ Synced existing user data from applications to profile');
            } else {
              // Create new profile with synced data
              await insforge.database
                .from('user_profiles')
                .insert([syncData]);
              console.log('✅ Created profile with synced data from applications');
            }
          } catch (syncErr) {
            console.log('Note: Could not auto-sync profile data (non-critical):', syncErr);
            // Non-critical error - continue anyway
          }
        }

        if (userData?.avatar_url) {
          const publicUrl = getPublicAvatarUrl(userData.avatar_url);
          if (publicUrl) {
            setAvatarPreview(publicUrl);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, isLoaded, reset]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // CRITICAL: Ensure user exists in users table BEFORE any upload
      // This prevents foreign key constraint violations in _storage table
      await ensureUserExists(user.id, user.email || null, user.name || null);

      // Upload avatar if changed - user is guaranteed to exist now
      let avatarUrl = null;
      
      // First, get current avatar URL if it exists (to preserve it if no new upload)
      const { data: currentUserData } = await insforge.database
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      avatarUrl = currentUserData?.avatar_url || null;
      
      if (avatarFile) {
        console.log('Starting avatar upload for user:', user.id);
        
        // Ensure user exists in public.users table first (critical for storage foreign key)
        try {
          const { data: userCheck } = await insforge.database
            .from('users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!userCheck) {
            console.log('User not in public.users, creating record...');
            const { error: createError } = await insforge.database
              .from('users')
              .insert([{
                id: user.id,
                email: user.email || null,
                nickname: user.name || null
              }]);
            
            if (createError && createError.code !== '23505') {
              console.warn('Could not create user record (may already exist):', createError);
            } else {
              console.log('User record created, waiting for commit...');
              // Wait for database commit
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (userErr) {
          console.warn('Error checking/creating user (non-fatal):', userErr);
        }
        
        // Upload to public avatars bucket using helper function
        const filePath = `${user.id}/avatar_${Date.now()}_${avatarFile.name}`;
        
        try {
          const uploadData = await uploadFileWithUserCheck(
            'avatars',
            filePath,
            avatarFile,
            user.id,
            user.email || null,
            user.name || null
          );
          
          // For public buckets, store the key (we'll construct full URL when displaying)
          avatarUrl = uploadData.key;
          console.log('Avatar uploaded successfully - key:', avatarUrl);
        } catch (uploadErr: any) {
          console.error('Avatar upload exception:', uploadErr);
          throw new Error(`Failed to upload avatar: ${uploadErr.message || 'Unknown error'}`);
        }
      }

      // Update user table - check for errors
      const { error: userUpdateError } = await insforge.database
        .from('users')
        .update({
          nickname: `${data.firstName} ${data.lastName}`,
          bio: data.bio || null,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error('User update error:', userUpdateError);
        throw new Error(`Failed to update user information: ${userUpdateError.message}`);
      }

      // Update or create profile - check if exists first
      // Get email from users table to sync to profile
      const { data: userData } = await insforge.database
        .from('users')
        .select('email')
        .eq('id', user.id)
        .maybeSingle();
      
      const profileData = {
        user_id: user.id,
        email: userData?.email || user.email || null, // Sync email to profile
        first_name: data.firstName || null, // Save first name to profile
        last_name: data.lastName || null, // Save last name to profile
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        province: data.province || null,
        postal_code: data.postalCode || null,
        date_of_birth: data.dateOfBirth || null,
        gender: data.gender || null // Save gender to profile
      };

      // Check if profile exists - use a simple query that won't trigger recursion
      let existingProfile = null;
      try {
        const { data, error: checkError } = await insforge.database
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (checkError) {
          // If it's a "not found" error, that's fine - profile doesn't exist
          if (checkError.code === 'PGRST116' || checkError.message?.includes('No rows')) {
            existingProfile = null;
          } else {
            console.warn('Error checking profile (non-fatal):', checkError);
            // Continue anyway - we'll try to insert/update
          }
        } else {
          existingProfile = data;
        }
      } catch (checkErr: any) {
        console.warn('Exception checking profile (non-fatal):', checkErr);
        // Continue anyway - we'll try to insert/update
      }

      let profileError;
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await insforge.database
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        profileError = updateError;
      } else {
        // Insert new profile (preserve role if it exists, otherwise default to 'user')
        const { error: insertError } = await insforge.database
          .from('user_profiles')
          .insert([{
            ...profileData,
            role: 'user' // Default role for new profiles
          }]);
        profileError = insertError;
      }

      if (profileError) {
        console.error('Profile save error:', profileError);
        throw new Error(`Failed to save profile: ${profileError.message}`);
      }

      // Verify the data was saved by re-fetching
      const { data: verifyUser, error: verifyUserError } = await insforge.database
        .from('users')
        .select('nickname, bio, avatar_url')
        .eq('id', user.id)
        .single();

      const { data: verifyProfile, error: verifyProfileError } = await insforge.database
        .from('user_profiles')
        .select('phone, address, city, province, postal_code, date_of_birth, gender, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (verifyUserError || verifyProfileError) {
        console.warn('Verification fetch had errors, but save may have succeeded:', verifyUserError, verifyProfileError);
      }

      // Reload the form with saved data
      reset({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: verifyProfile?.phone || data.phone || '',
        dateOfBirth: verifyProfile?.date_of_birth || data.dateOfBirth || '',
        address: verifyProfile?.address || data.address || '',
        city: verifyProfile?.city || data.city || '',
        province: verifyProfile?.province || data.province || '',
        postalCode: verifyProfile?.postal_code || data.postalCode || '',
        gender: verifyProfile?.gender || data.gender || '',
        bio: verifyUser?.bio || data.bio || ''
      });

      // IMPORTANT: Update avatar preview with the saved URL (not the data URL)
      // Use the verified URL from database, or fall back to the uploaded URL, or keep current preview if no change
      const savedAvatarKey = verifyUser?.avatar_url || avatarUrl;
      
      // Convert to public URL for display
      const finalAvatarUrl = savedAvatarKey ? getPublicAvatarUrl(savedAvatarKey) : null;
      
      if (finalAvatarUrl) {
        setAvatarPreview(finalAvatarUrl);
        console.log('Avatar preview updated to:', finalAvatarUrl);
      } else if (avatarPreview && avatarPreview.startsWith('data:')) {
        // Keep data URL preview if no saved avatar yet
        console.log('Keeping data URL preview');
      } else {
        // Only clear if there's no avatar at all
        setAvatarPreview(null);
      }

      setMessage({ type: 'success', text: 'Profile updated successfully and saved!' });
      
      // Clear avatar file after successful save (but keep the preview URL)
      if (avatarFile) {
        setAvatarFile(null);
      }
    } catch (err: any) {
      console.error('Profile save error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return <div className="text-center py-12">Loading profile...</div>;
  }

  if (!user) {
    return <div className="text-center py-12">Please log in to view your profile.</div>;
  }
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your personal information</p>
      </div>
      {message && (
        <div className={`p-4 rounded-card mb-6 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
      <div className="bg-white rounded-card shadow-soft p-6">
        <div className="flex items-center space-x-6 mb-8 pb-6 border-b">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  // Fallback if image fails to load
                  console.error('Avatar image failed to load:', avatarPreview);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('Avatar image loaded successfully:', avatarPreview);
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gold flex items-center justify-center text-white text-3xl font-bold">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-gold text-white p-2 rounded-full cursor-pointer hover:bg-opacity-90">
              <Upload size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-navy-ink">{user.name || user.email}</h2>
            <p className="text-gray-600">Member</p>
          </div>
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
              })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" {...register('lastName', {
                required: 'Last name is required'
              })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="email" {...register('email', {
                required: 'Email is required'
              })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="tel" {...register('phone', {
                required: 'Phone is required'
              })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="date" {...register('dateOfBirth')} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
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
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="text" {...register('address')} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                City
              </label>
              <input type="text" {...register('city')} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Province
              </label>
              <select {...register('province')} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold">
                <option value="Gauteng">Gauteng</option>
                <option value="Western Cape">Western Cape</option>
                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                <option value="Eastern Cape">Eastern Cape</option>
                <option value="Free State">Free State</option>
                <option value="Limpopo">Limpopo</option>
                <option value="Mpumalanga">Mpumalanga</option>
                <option value="Northern Cape">Northern Cape</option>
                <option value="North West">North West</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-ink mb-2">
                Postal Code
              </label>
              <input type="text" {...register('postalCode')} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-ink mb-2">
              Bio
            </label>
            <textarea {...register('bio')} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" placeholder="Tell us about yourself..." />
          </div>
          <div className="flex justify-end space-x-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>;
}