import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { User, Mail, Phone, MapPin, Calendar, Upload, Save } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { ensureUserExists, uploadFileWithUserCheck } from '../../lib/uploadHelpers';
import { getStorageUrl } from '../../lib/connection';

// Helper function to ensure avatar URL is a full public URL
function getPublicAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
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
  bio: string;
}

export function AdminProfilePage() {
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
        const { data: userData } = await insforge.database
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        const { data: profileData } = await insforge.database
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const nameParts = (userData?.nickname || user.name || '').split(' ') || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        reset({
          firstName,
          lastName,
          email: user.email || '',
          phone: profileData?.phone || '',
          dateOfBirth: profileData?.date_of_birth || '',
          address: profileData?.address || '',
          city: profileData?.city || '',
          province: profileData?.province || '',
          postalCode: profileData?.postal_code || '',
          bio: userData?.bio || ''
        });

        if (userData?.avatar_url) {
          const publicUrl = getPublicAvatarUrl(userData.avatar_url);
          if (publicUrl) {
            setAvatarPreview(publicUrl);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setMessage({ type: 'error', text: 'Failed to load profile data' });
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
      await ensureUserExists(user.id, user.email || null, user.name || null);

      let avatarUrl = null;
      
      const { data: currentUserData } = await insforge.database
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      avatarUrl = currentUserData?.avatar_url || null;
      
      if (avatarFile) {
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
          
          avatarUrl = uploadData.key;
        } catch (uploadErr: any) {
          console.error('Avatar upload exception:', uploadErr);
          throw new Error(`Failed to upload avatar: ${uploadErr.message || 'Unknown error'}`);
        }
      }

      const { error: userUpdateError } = await insforge.database
        .from('users')
        .update({
          nickname: `${data.firstName} ${data.lastName}`,
          bio: data.bio || null,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (userUpdateError) {
        throw new Error(`Failed to update user information: ${userUpdateError.message}`);
      }

      const profileData = {
        user_id: user.id,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        province: data.province || null,
        postal_code: data.postalCode || null,
        date_of_birth: data.dateOfBirth || null
      };

      const { data: existingProfile } = await insforge.database
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let profileError;
      if (existingProfile) {
        const { error: updateError } = await insforge.database
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        profileError = updateError;
      } else {
        const { error: insertError } = await insforge.database
          .from('user_profiles')
          .insert([profileData]);
        profileError = insertError;
      }

      if (profileError) {
        throw new Error(`Failed to save profile: ${profileError.message}`);
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setAvatarFile(null);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Admin Profile</h1>
        <p className="text-gray-600">Manage your profile information</p>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-card shadow-soft p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6 pb-6 border-b">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-gold"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gold flex items-center justify-center text-white text-2xl font-bold border-4 border-gold">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-gold text-white p-2 rounded-full cursor-pointer hover:bg-opacity-90 transition-colors">
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
            <h3 className="text-lg font-bold text-navy-ink">Profile Picture</h3>
            <p className="text-sm text-gray-600">Upload a new profile picture</p>
          </div>
        </div>

        {/* Personal Information */}
        <div>
          <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-gold" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                {...register('firstName', { required: 'First name is required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                {...register('lastName', { required: 'Last name is required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-card bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phone')}
                placeholder="+27 12 345 6789"
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Date of Birth
              </label>
              <input
                type="date"
                {...register('dateOfBirth')}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-gold" />
            Address Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                {...register('address')}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                {...register('city')}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province
              </label>
              <input
                type="text"
                {...register('province')}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                {...register('postalCode')}
                className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div>
          <h2 className="text-xl font-bold text-navy-ink mb-4">Bio</h2>
          <textarea
            {...register('bio')}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-2 border border-gray-300 rounded-card focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

