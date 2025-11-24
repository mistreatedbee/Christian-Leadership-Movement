import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Save } from 'lucide-react';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { uploadFileWithUserCheck } from '../lib/uploadHelpers';

interface MentorApplicationFormData {
  // Personal Information
  fullName: string;
  email: string;
  phone: string;
  location: string;
  
  // Mentorship Details
  program_id: string;
  mentorship_about: string;
  what_offers: string;
  goals: string;
  program_description: string;
  
  // Qualifications & Experience
  qualifications: string;
  experience_years: number;
  specializations: string[];
  bio: string;
  
  // Availability & Preferences
  availability: string;
  contact_preferences: string;
  
  // References
  reference1_name: string;
  reference1_contact: string;
  reference1_relationship: string;
  reference2_name: string;
  reference2_contact: string;
  reference2_relationship: string;
  
  // Social Links
  website_url: string;
  linkedin_url: string;
  
  // Expertise Areas
  expertise_areas: string[];
  max_mentees: number;
}

export function ApplyMentorPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<MentorApplicationFormData>({
    defaultValues: {
      max_mentees: 5,
      experience_years: 0,
      specializations: [],
      expertise_areas: []
    }
  });

  React.useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data } = await insforge.database
        .from('mentorship_programs')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setPrograms(data || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const specializationOptions = [
    'Leadership Development',
    'Spiritual Growth',
    'Career Guidance',
    'Life Coaching',
    'Ministry Training',
    'Business Development',
    'Personal Development',
    'Youth Mentoring',
    'Marriage & Family',
    'Financial Planning',
    'Education',
    'Healthcare',
    'Technology',
    'Other'
  ];

  const expertiseOptions = [
    'Strategic Planning',
    'Team Building',
    'Communication',
    'Conflict Resolution',
    'Time Management',
    'Goal Setting',
    'Public Speaking',
    'Writing',
    'Teaching',
    'Counseling',
    'Networking',
    'Marketing',
    'Finance',
    'Operations',
    'Other'
  ];

  const toggleSpecialization = (spec: string) => {
    const updated = selectedSpecializations.includes(spec)
      ? selectedSpecializations.filter(s => s !== spec)
      : [...selectedSpecializations, spec];
    setSelectedSpecializations(updated);
    setValue('specializations', updated);
  };

  const toggleExpertise = (exp: string) => {
    const updated = selectedExpertise.includes(exp)
      ? selectedExpertise.filter(e => e !== exp)
      : [...selectedExpertise, exp];
    setSelectedExpertise(updated);
    setValue('expertise_areas', updated);
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const onSubmit = async (data: MentorApplicationFormData) => {
    if (!user) {
      setError('Please log in to apply');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let profileImageUrl = null;
      let profileImageKey = null;

      // Upload profile image if provided
      if (profileImage && user) {
        const filePath = `mentors/${user.id}/profile_${Date.now()}_${profileImage.name}`;
        const uploadData = await uploadFileWithUserCheck(
          'avatars',
          filePath,
          profileImage,
          user.id,
          user.email || null,
          user.name || null
        );
        profileImageUrl = uploadData.url;
        profileImageKey = uploadData.key;
      }

      // Prepare references
      const references = [];
      if (data.reference1_name) {
        references.push({
          name: data.reference1_name,
          contact: data.reference1_contact,
          relationship: data.reference1_relationship
        });
      }
      if (data.reference2_name) {
        references.push({
          name: data.reference2_name,
          contact: data.reference2_contact,
          relationship: data.reference2_relationship
        });
      }

      // Prepare complete application data
      const applicationData = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        program_id: data.program_id || null,
        mentorship_about: data.mentorship_about,
        what_offers: data.what_offers,
        goals: data.goals,
        program_description: data.program_description,
        qualifications: data.qualifications,
        experience_years: data.experience_years,
        specializations: selectedSpecializations,
        availability: data.availability,
        contact_preferences: data.contact_preferences,
        mentor_references: references,
        website_url: data.website_url || null,
        linkedin_url: data.linkedin_url || null,
        bio: data.bio
      };

      // Create mentor application
      const mentorData: any = {
        user_id: user.id,
        program_id: data.program_id || null,
        bio: data.bio,
        expertise_areas: selectedExpertise,
        max_mentees: data.max_mentees || 5,
        current_mentees: 0,
        status: 'pending',
        application_data: applicationData,
        mentorship_about: data.mentorship_about,
        what_offers: data.what_offers,
        goals: data.goals,
        program_description: data.program_description,
        qualifications: data.qualifications,
        experience_years: data.experience_years,
        specializations: selectedSpecializations,
        availability: data.availability,
        contact_preferences: data.contact_preferences,
        mentor_references: references.length > 0 ? references : null,
        website_url: data.website_url || null,
        linkedin_url: data.linkedin_url || null
      };

      if (profileImageUrl) {
        mentorData.profile_image_url = profileImageUrl;
        mentorData.profile_image_key = profileImageKey;
      }

      const { error: insertError } = await insforge.database
        .from('mentors')
        .insert([mentorData]);

      if (insertError) throw insertError;

      // Create notification for admins
      try {
        const { data: admins } = await insforge.database
          .from('user_profiles')
          .select('user_id')
          .in('role', ['admin', 'super_admin']);

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.user_id,
            type: 'mentor_application',
            title: 'New Mentor Application',
            message: `${data.fullName} has submitted a mentor application. Please review.`,
            related_id: user.id,
            link_url: '/admin/mentorship',
            read: false
          }));

          await insforge.database
            .from('notifications')
            .insert(notifications);
        }
      } catch (notifErr) {
        console.error('Error creating notifications:', notifErr);
      }

      alert('Your mentor application has been submitted successfully! You will be notified once it is reviewed.');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please log in to apply as a mentor</p>
            <Button onClick={() => navigate('/login')}>Log In</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted-gray">
      <TopNav />
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/mentorship')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Mentorship
            </Button>
            <h1 className="text-3xl font-bold text-navy-ink mb-2">Apply to Become a Mentor</h1>
            <p className="text-gray-600">Complete the form below to apply for mentorship opportunities</p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-white rounded-card shadow-soft p-6 mb-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    currentStep >= step ? 'bg-gold text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 5 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? 'bg-gold' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Personal Info</span>
              <span>Mentorship Details</span>
              <span>Qualifications</span>
              <span>Availability</span>
              <span>References</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-card mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="bg-white rounded-card shadow-soft p-6 space-y-4">
                <h2 className="text-2xl font-bold text-navy-ink mb-4">Personal Information</h2>
                
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Full Name *</label>
                  <input
                    type="text"
                    {...register('fullName', { required: 'Full name is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Email *</label>
                    <input
                      type="email"
                      {...register('email', { required: 'Email is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Phone *</label>
                    <input
                      type="tel"
                      {...register('phone', { required: 'Phone is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Location *</label>
                  <input
                    type="text"
                    {...register('location', { required: 'Location is required' })}
                    placeholder="City, Country"
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Profile Image (Optional)</label>
                  <div className="flex items-center gap-4">
                    {profileImagePreview && (
                      <img src={profileImagePreview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <Button type="button" variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        {profileImage ? 'Change Image' : 'Upload Image'}
                      </Button>
                    </label>
                    {profileImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProfileImage(null);
                          setProfileImagePreview(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Mentorship Details */}
            {currentStep === 2 && (
              <div className="bg-white rounded-card shadow-soft p-6 space-y-4">
                <h2 className="text-2xl font-bold text-navy-ink mb-4">Mentorship Details</h2>
                
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Mentorship Program (Optional)</label>
                  <select
                    {...register('program_id')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <option value="">Select a program (optional)</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">What is your mentorship about? *</label>
                  <textarea
                    {...register('mentorship_about', { required: 'This field is required' })}
                    rows={4}
                    placeholder="Describe what your mentorship program focuses on..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.mentorship_about && <p className="text-red-500 text-sm mt-1">{errors.mentorship_about.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">What do you offer? *</label>
                  <textarea
                    {...register('what_offers', { required: 'This field is required' })}
                    rows={4}
                    placeholder="Describe what you offer to your mentees..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.what_offers && <p className="text-red-500 text-sm mt-1">{errors.what_offers.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Goals for your mentorship program *</label>
                  <textarea
                    {...register('goals', { required: 'This field is required' })}
                    rows={4}
                    placeholder="What goals do you aim to achieve with your mentees?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.goals && <p className="text-red-500 text-sm mt-1">{errors.goals.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Program Description *</label>
                  <textarea
                    {...register('program_description', { required: 'This field is required' })}
                    rows={5}
                    placeholder="Provide a detailed description of your mentorship program..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.program_description && <p className="text-red-500 text-sm mt-1">{errors.program_description.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Bio *</label>
                  <textarea
                    {...register('bio', { required: 'Bio is required' })}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Maximum Mentees *</label>
                  <input
                    type="number"
                    {...register('max_mentees', { required: true, min: 1, max: 50, valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.max_mentees && <p className="text-red-500 text-sm mt-1">Please enter a valid number (1-50)</p>}
                </div>
              </div>
            )}

            {/* Step 3: Qualifications & Experience */}
            {currentStep === 3 && (
              <div className="bg-white rounded-card shadow-soft p-6 space-y-4">
                <h2 className="text-2xl font-bold text-navy-ink mb-4">Qualifications & Experience</h2>
                
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Qualifications *</label>
                  <textarea
                    {...register('qualifications', { required: 'Qualifications are required' })}
                    rows={4}
                    placeholder="List your qualifications, certifications, degrees, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.qualifications && <p className="text-red-500 text-sm mt-1">{errors.qualifications.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Years of Experience *</label>
                  <input
                    type="number"
                    {...register('experience_years', { required: true, min: 0, valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.experience_years && <p className="text-red-500 text-sm mt-1">Please enter a valid number</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Specializations *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {specializationOptions.map(spec => (
                      <label key={spec} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSpecializations.includes(spec)}
                          onChange={() => toggleSpecialization(spec)}
                          className="rounded"
                        />
                        <span className="text-sm">{spec}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSpecializations.length === 0 && (
                    <p className="text-red-500 text-sm mt-1">Please select at least one specialization</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Expertise Areas *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {expertiseOptions.map(exp => (
                      <label key={exp} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedExpertise.includes(exp)}
                          onChange={() => toggleExpertise(exp)}
                          className="rounded"
                        />
                        <span className="text-sm">{exp}</span>
                      </label>
                    ))}
                  </div>
                  {selectedExpertise.length === 0 && (
                    <p className="text-red-500 text-sm mt-1">Please select at least one expertise area</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Website URL (Optional)</label>
                    <input
                      type="url"
                      {...register('website_url')}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">LinkedIn URL (Optional)</label>
                    <input
                      type="url"
                      {...register('linkedin_url')}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Availability */}
            {currentStep === 4 && (
              <div className="bg-white rounded-card shadow-soft p-6 space-y-4">
                <h2 className="text-2xl font-bold text-navy-ink mb-4">Availability & Contact Preferences</h2>
                
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Availability *</label>
                  <textarea
                    {...register('availability', { required: 'Availability is required' })}
                    rows={4}
                    placeholder="Describe your availability (e.g., Monday-Friday 9am-5pm, Weekends available, etc.)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.availability && <p className="text-red-500 text-sm mt-1">{errors.availability.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Contact Preferences *</label>
                  <textarea
                    {...register('contact_preferences', { required: 'Contact preferences are required' })}
                    rows={3}
                    placeholder="How do you prefer to be contacted? (Email, Phone, Video call, etc.)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {errors.contact_preferences && <p className="text-red-500 text-sm mt-1">{errors.contact_preferences.message}</p>}
                </div>
              </div>
            )}

            {/* Step 5: References */}
            {currentStep === 5 && (
              <div className="bg-white rounded-card shadow-soft p-6 space-y-4">
                <h2 className="text-2xl font-bold text-navy-ink mb-4">References</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-navy-ink mb-3">Reference 1</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Name *</label>
                        <input
                          type="text"
                          {...register('reference1_name', { required: 'Reference name is required' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.reference1_name && <p className="text-red-500 text-sm mt-1">{errors.reference1_name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Contact *</label>
                        <input
                          type="text"
                          {...register('reference1_contact', { required: 'Reference contact is required' })}
                          placeholder="Email or Phone"
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.reference1_contact && <p className="text-red-500 text-sm mt-1">{errors.reference1_contact.message}</p>}
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-navy-ink mb-2">Relationship *</label>
                      <input
                        type="text"
                        {...register('reference1_relationship', { required: 'Relationship is required' })}
                        placeholder="e.g., Former Supervisor, Colleague, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.reference1_relationship && <p className="text-red-500 text-sm mt-1">{errors.reference1_relationship.message}</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-navy-ink mb-3">Reference 2</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Name *</label>
                        <input
                          type="text"
                          {...register('reference2_name', { required: 'Reference name is required' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.reference2_name && <p className="text-red-500 text-sm mt-1">{errors.reference2_name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Contact *</label>
                        <input
                          type="text"
                          {...register('reference2_contact', { required: 'Reference contact is required' })}
                          placeholder="Email or Phone"
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.reference2_contact && <p className="text-red-500 text-sm mt-1">{errors.reference2_contact.message}</p>}
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-navy-ink mb-2">Relationship *</label>
                      <input
                        type="text"
                        {...register('reference2_relationship', { required: 'Relationship is required' })}
                        placeholder="e.g., Former Supervisor, Colleague, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.reference2_relationship && <p className="text-red-500 text-sm mt-1">{errors.reference2_relationship.message}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="bg-white rounded-card shadow-soft p-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              {currentStep < 5 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

