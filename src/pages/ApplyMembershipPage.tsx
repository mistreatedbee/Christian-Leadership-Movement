import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useUser } from '@insforge/react';
import { Button } from '../components/ui/Button';
import { Upload, X, CheckCircle, User, Mail, Phone, MapPin, Calendar, FileText, Save, ArrowLeft } from 'lucide-react';
import { insforge } from '../lib/insforge';
import { sendEmailNotification } from '../lib/email';
import { uploadFileWithUserCheck } from '../lib/uploadHelpers';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

interface MembershipFormData {
  // Step 1: Personal Information
  idNumber: string;
  nationality: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  initials?: string;
  preferredName?: string;
  dateOfBirth: string;
  gender: string;
  province: string;
  residentialStatus: string;
  phone: string;
  email: string;
  homeLanguage: string;
  populationGroup: string;
  city?: string;
  postalCode?: string;
  disabilityNone: boolean;
  disabilitySight: boolean;
  disabilityHearing: boolean;
  disabilitySpeech: boolean;
  disabilityPhysical: boolean;
  disabilityOther?: string;

  // Step 2: Ministry Involvement
  currentMinistryName?: string;
  denomination?: string;
  ministryTypeLocalChurch: boolean;
  ministryTypeTeaching: boolean;
  ministryTypeCounselling: boolean;
  ministryTypeYouth: boolean;
  ministryTypeOther: boolean;
  ministryTypeNotApplicable: boolean;
  ministryTypeOtherText?: string;
  ministryPosition?: string;
  ministryWebsite?: string;
  yearsPartTime?: string;
  yearsFullTime?: string;
  primaryIncomeSource: string;
  primaryIncomeOther?: string;

  // Step 3: Qualifications & References
  highSchool?: string;
  highestMinistryQualification?: string;
  highestOtherQualification?: string;
  otherTraining?: string;
  referenceFirstName: string;
  referenceLastName: string;
  referenceContact: string;
  referenceEmail: string;
  referenceTitle?: string;
  signature: string;
  declarationDate: string;
}

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
];

const POPULATION_GROUPS = [
  'African', 'Coloured', 'Indian/Asian', 'White', 'Other'
];

export function ApplyMembershipPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [applicationFee, setApplicationFee] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useForm<MembershipFormData>({
    defaultValues: {
      declarationDate: new Date().toISOString().split('T')[0],
      disabilityNone: false,
      ministryTypeNotApplicable: false
    }
  });

  const disabilityNone = watch('disabilityNone');
  const hasDisability = watch('disabilitySight') || watch('disabilityHearing') || 
                        watch('disabilitySpeech') || watch('disabilityPhysical');

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate('/login?redirect=/apply/membership');
      return;
    }
    loadDraft();
    fetchApplicationFee();
  }, [user, isLoaded]);

  const fetchApplicationFee = async () => {
    try {
      const { data, error } = await insforge.database
        .from('fee_settings')
        .select('amount')
        .eq('fee_type', 'membership_application')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (data) {
        setApplicationFee(parseFloat(data.amount) || 0);
      }
    } catch (err) {
      console.error('Error fetching application fee:', err);
    }
  };

  // Auto-save every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, 15000);
    return () => clearInterval(interval);
  }, [watch()]);

  const loadDraft = async () => {
    try {
      const { data } = await insforge.database
        .from('application_drafts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('form_type', 'membership')
        .maybeSingle();

      if (data?.form_data) {
        const formData = data.form_data;
        Object.keys(formData).forEach(key => {
          setValue(key as any, formData[key]);
        });
        if (data.current_step) setCurrentStep(data.current_step);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
    }
  };

  const saveDraft = async () => {
    if (!user) return;
    try {
      const formData = getValues();
      await insforge.database
        .from('application_drafts')
        .upsert({
          user_id: user.id,
          form_type: 'membership',
          form_data: formData,
          current_step: currentStep,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,form_type'
        });
      setAutoSaveStatus('Draft saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  };

  const validateStep = (step: number): boolean => {
    const values = getValues();
    
    if (step === 1) {
      if (!values.idNumber || values.idNumber.length !== 13) return false;
      if (!values.nationality) return false;
      if (!values.firstName || values.firstName.length < 2) return false;
      if (!values.lastName || values.lastName.length < 2) return false;
      if (!values.dateOfBirth) return false;
      // Age validation
      const birthDate = new Date(values.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 16) return false;
      if (!values.gender) return false;
      if (!values.province) return false;
      if (!values.residentialStatus) return false;
      if (!values.phone || values.phone.length < 10) return false;
      if (!values.email) return false;
      if (!values.homeLanguage) return false;
      if (!values.populationGroup) return false;
      return true;
    }
    
    if (step === 2) {
      if (!values.primaryIncomeSource) return false;
      return true;
    }
    
    if (step === 3) {
      if (!values.referenceFirstName) return false;
      if (!values.referenceLastName) return false;
      if (!values.referenceContact) return false;
      if (!values.referenceEmail) return false;
      if (!values.signature) return false;
      if (!idFile) return false;
      return true;
    }
    
    return true;
  };

  const handleNext = () => {
    const values = getValues();
    const missingFields: string[] = [];
    
    if (currentStep === 1) {
      if (!values.idNumber) missingFields.push('ID Number');
      if (!values.firstName) missingFields.push('First Name');
      if (!values.lastName) missingFields.push('Last Name');
      if (!values.gender) missingFields.push('Gender');
      if (!values.province) missingFields.push('Province');
      if (!values.residentialStatus) missingFields.push('Residential Status');
      if (!values.phone || values.phone.length < 10) missingFields.push('Phone Number (must be at least 10 digits)');
      if (!values.email) missingFields.push('Email');
      if (!values.homeLanguage) missingFields.push('Home Language');
      if (!values.populationGroup) missingFields.push('Population Group');
    } else if (currentStep === 2) {
      if (!values.primaryIncomeSource) missingFields.push('Primary Income Source');
    } else if (currentStep === 3) {
      if (!values.referenceFirstName) missingFields.push('Reference First Name');
      if (!values.referenceLastName) missingFields.push('Reference Last Name');
      if (!values.referenceContact) missingFields.push('Reference Contact');
      if (!values.referenceEmail) missingFields.push('Reference Email');
      if (!values.signature) missingFields.push('Signature');
      if (!idFile) missingFields.push('ID Copy (upload required)');
    }
    
    if (missingFields.length > 0) {
      setError(`Please complete the following required fields before proceeding: ${missingFields.join(', ')}`);
      return;
    }
    
    if (validateStep(currentStep)) {
      saveDraft();
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setError(null);
    } else {
      setError('Please complete all required fields before proceeding');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const uploadFile = async (file: File, path: string): Promise<{ url: string; key: string } | null> => {
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }
      
      if (!user) {
        throw new Error('User must be logged in to upload files');
      }
      
      // Use helper function to ensure user exists and upload file
      const uploadData = await uploadFileWithUserCheck(
        'applications',
        path,
        file,
        user.id,
        user.email || null,
        user.name || null
      );
      
      return { url: uploadData.url, key: uploadData.key };
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Error uploading file');
      return null;
    }
  };

  const onSubmit = async (data: MembershipFormData) => {
    if (!user || !idFile) {
      setError('Please upload your ID copy');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Upload ID file
      const idUpload = await uploadFile(idFile, `${user.id}/membership/id_${Date.now()}_${idFile.name}`);
      if (!idUpload) return;

      // Upload additional files
      const additionalUrls: string[] = [];
      for (const file of additionalFiles) {
        const upload = await uploadFile(file, `${user.id}/membership/additional_${Date.now()}_${file.name}`);
        if (upload) additionalUrls.push(upload.url);
      }

      // Get ministry types
      const ministryTypes: string[] = [];
      if (data.ministryTypeLocalChurch) ministryTypes.push('Local Church');
      if (data.ministryTypeTeaching) ministryTypes.push('Teaching Institution');
      if (data.ministryTypeCounselling) ministryTypes.push('Counselling');
      if (data.ministryTypeYouth) ministryTypes.push('Youth/Child');
      if (data.ministryTypeOther) ministryTypes.push(data.ministryTypeOtherText || 'Other');
      if (data.ministryTypeNotApplicable) ministryTypes.push('Not Applicable');

      // Get disabilities
      const disabilities: string[] = [];
      if (data.disabilitySight) disabilities.push('Sight');
      if (data.disabilityHearing) disabilities.push('Hearing');
      if (data.disabilitySpeech) disabilities.push('Speech');
      if (data.disabilityPhysical) disabilities.push('Physical');
      if (data.disabilityOther) disabilities.push(`Other: ${data.disabilityOther}`);

      // Create application
      const applicationData: any = {
        user_id: user.id,
        program_type: 'membership',
        full_name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        id_number: data.idNumber,
        nationality: data.nationality,
        title: data.title,
        first_name: data.firstName,
        middle_name: data.middleName,
        last_name: data.lastName,
        initials: data.initials,
        preferred_name: data.preferredName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        province: data.province,
        residential_status: data.residentialStatus,
        home_language: data.homeLanguage,
        population_group: data.populationGroup,
        city: data.city,
        postal_code: data.postalCode,
        disabilities: disabilities,
        current_ministry_name: data.currentMinistryName,
        denomination: data.denomination,
        ministry_types: ministryTypes,
        ministry_position: data.ministryPosition,
        ministry_website: data.ministryWebsite,
        years_part_time: data.yearsPartTime ? parseInt(data.yearsPartTime) : null,
        years_full_time: data.yearsFullTime ? parseInt(data.yearsFullTime) : null,
        primary_income_source: data.primaryIncomeSource,
        primary_income_other: data.primaryIncomeOther,
        high_school: data.highSchool,
        highest_ministry_qualification: data.highestMinistryQualification,
        highest_other_qualification: data.highestOtherQualification,
        other_training: data.otherTraining,
        reference_first_name: data.referenceFirstName,
        reference_last_name: data.referenceLastName,
        reference_contact: data.referenceContact,
        reference_email: data.referenceEmail,
        reference_title: data.referenceTitle,
        signature: data.signature,
        declaration_date: data.declarationDate,
        id_passport_url: idUpload.url,
        id_passport_key: idUpload.key,
        additional_documents_url: additionalUrls,
        status: 'pending',
        payment_status: 'pending'
      };

      const { data: application, error: appError } = await insforge.database
        .from('applications')
        .insert([applicationData])
        .select()
        .single();

      if (appError) throw appError;

      // Create payment record if fee is required
      let paymentId: string | null = null;
      if (applicationFee > 0) {
        const { data: payment, error: paymentError } = await insforge.database
          .from('payments')
          .insert([{
            user_id: user.id,
            application_id: application.id,
            amount: applicationFee,
            currency: 'ZAR',
            payment_type: 'application',
            status: 'pending'
          }])
          .select()
          .single();

        if (paymentError) throw paymentError;
        paymentId = payment.id;

        // Update application with payment_id
        await insforge.database
          .from('applications')
          .update({ payment_id: payment.id })
          .eq('id', application.id);
      }

      // Create notification for user
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'application',
          title: 'Membership Application Submitted',
          message: applicationFee > 0 
            ? `Your CLM membership application has been submitted. Please complete payment of R${applicationFee.toFixed(2)}.`
            : 'Your CLM membership application has been submitted successfully and is pending review.',
          related_id: application.id
        }]);

      // Create notifications for all admins
      try {
        const { data: admins } = await insforge.database
          .from('user_profiles')
          .select('user_id')
          .in('role', ['admin', 'super_admin']);

        if (admins && admins.length > 0) {
          const adminNotifications = admins.map((admin: any) => ({
            user_id: admin.user_id,
            type: 'application',
            title: 'New Membership Application',
            message: `A new CLM Membership application has been submitted by ${data.firstName} ${data.lastName || user.email || 'a user'}. Please review it.`,
            related_id: application.id,
            read: false
          }));

          await insforge.database
            .from('notifications')
            .insert(adminNotifications);
        }
      } catch (adminNotifError) {
        console.error('Error creating admin notifications:', adminNotifError);
        // Don't fail the application submission if admin notification fails
      }

      await sendEmailNotification(user.id, {
        type: 'application_submitted',
        subject: 'Membership Application Submitted',
        message: applicationFee > 0
          ? `Your CLM membership application has been submitted. Please complete payment of R${applicationFee.toFixed(2)}.`
          : 'Your CLM membership application has been submitted successfully.'
      });

      // Delete draft
      await insforge.database
        .from('application_drafts')
        .delete()
        .eq('user_id', user.id)
        .eq('form_type', 'membership');

      // Redirect to payment if fee required, otherwise to applications
      if (applicationFee > 0 && paymentId) {
        navigate(`/payment?payment_id=${paymentId}&return_url=/dashboard/applications`);
      } else {
        navigate('/dashboard/applications');
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to submit application. Please check all required fields and try again.';
      
      if (err.message) {
        if (err.message.includes('required') || err.message.includes('missing')) {
          errorMessage = 'Please complete all required fields before submitting. Check that all fields marked with * are filled in, including your ID copy upload.';
        } else if (err.message.includes('upload') || err.message.includes('file')) {
          errorMessage = `File upload error: ${err.message}. Please ensure your files are less than 10MB and try again.`;
        } else if (err.message.includes('RLS') || err.message.includes('permission')) {
          errorMessage = 'Permission error. Please make sure you are logged in and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const progress = ((currentStep / 3) * 100).toFixed(0);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow py-12 px-4 bg-muted-gray">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-card shadow-soft p-8">
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-navy-ink mb-2">
                CLM Membership Application Form
              </h1>
              <p className="text-gray-600">
                Complete all 3 steps to submit your membership application
              </p>
              {applicationFee > 0 && (
                <div className="mt-4 bg-gold/10 border border-gold/20 rounded-card p-4">
                  <p className="text-sm text-navy-ink">
                    <strong>Application Fee:</strong> R{applicationFee.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Payment will be required after form submission
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-navy-ink">Step {currentStep} of 3</span>
                <span className="text-sm text-gray-600">{progress}% Complete</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-gold rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            {autoSaveStatus && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center">
                <Save size={16} className="mr-2" />
                {autoSaveStatus}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* STEP 1: PERSONAL INFORMATION */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-navy-ink border-b pb-2">
                    Step 1: Personal Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        South African ID Number *
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        {...register('idNumber', {
                          required: 'ID Number is required. Please enter your 13-digit South African ID number.',
                          minLength: { value: 13, message: 'ID Number must be exactly 13 digits. Please enter all 13 digits of your ID number.' },
                          maxLength: { value: 13, message: 'ID Number must be exactly 13 digits. Please enter only 13 digits.' },
                          pattern: { value: /^\d+$/, message: 'ID Number must contain only numbers. Please remove any letters or special characters.' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="13-digit ID number"
                      />
                      {errors.idNumber && (
                        <p className="text-red-500 text-sm mt-1 font-medium">
                          {errors.idNumber.message}
                          {(errors.idNumber.type === 'minLength' || errors.idNumber.type === 'maxLength') && (
                            <span className="block mt-1 text-xs">
                              Current length: {watch('idNumber')?.length || 0} digits. Required: exactly 13 digits.
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Nationality *
                      </label>
                      <input
                        type="text"
                        {...register('nationality', { required: 'Nationality is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Title</label>
                      <select
                        {...register('title')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="">Select Title</option>
                        <option value="Pastor">Pastor</option>
                        <option value="Bishop">Bishop</option>
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                        <option value="Dr">Dr</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        {...register('firstName', {
                          required: 'First Name is required. Please enter your first name.',
                          minLength: { value: 2, message: 'First Name must be at least 2 characters long. Please enter your full first name.' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1 font-medium">
                          {errors.firstName.message}
                          {errors.firstName.type === 'minLength' && (
                            <span className="block mt-1 text-xs">
                              Current length: {watch('firstName')?.length || 0} characters. Required: at least 2 characters.
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Middle Name</label>
                      <input
                        type="text"
                        {...register('middleName')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        {...register('lastName', {
                          required: 'Last Name is required. Please enter your last name.',
                          minLength: { value: 2, message: 'Last Name must be at least 2 characters long. Please enter your full last name.' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1 font-medium">
                          {errors.lastName.message}
                          {errors.lastName.type === 'minLength' && (
                            <span className="block mt-1 text-xs">
                              Current length: {watch('lastName')?.length || 0} characters. Required: at least 2 characters.
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Initials</label>
                      <input
                        type="text"
                        {...register('initials')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Preferred Name</label>
                      <input
                        type="text"
                        {...register('preferredName')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        {...register('dateOfBirth', {
                          required: 'Date of birth is required',
                          validate: (value) => {
                            const birthDate = new Date(value);
                            const today = new Date();
                            const age = today.getFullYear() - birthDate.getFullYear();
                            if (age < 16) return 'You must be at least 16 years old';
                            return true;
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Gender *
                      </label>
                      <select
                        {...register('gender', { required: 'Gender is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Province *
                      </label>
                      <select
                        {...register('province', { required: 'Province is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="">Select Province</option>
                        {SOUTH_AFRICAN_PROVINCES.map(province => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>
                      {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Residential Status *
                      </label>
                      <select
                        {...register('residentialStatus', { required: 'Residential status is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="">Select Status</option>
                        <option value="Citizen">Citizen</option>
                        <option value="Permanent Resident">Permanent Resident</option>
                        <option value="Temporary Resident">Temporary Resident</option>
                        <option value="Refugee">Refugee</option>
                      </select>
                      {errors.residentialStatus && <p className="text-red-500 text-sm mt-1">{errors.residentialStatus.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        {...register('phone', {
                          required: 'Phone Number is required. Please enter your contact phone number.',
                          minLength: { value: 10, message: 'Phone Number must be at least 10 digits long. Please enter a valid phone number including area code.' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1 font-medium">
                          {errors.phone.message}
                          {errors.phone.type === 'minLength' && (
                            <span className="block mt-1 text-xs">
                              Current length: {watch('phone')?.length || 0} digits. Required: at least 10 digits.
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Home Language *
                      </label>
                      <input
                        type="text"
                        {...register('homeLanguage', { required: 'Home language is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.homeLanguage && <p className="text-red-500 text-sm mt-1">{errors.homeLanguage.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Population Group *
                      </label>
                      <select
                        {...register('populationGroup', { required: 'Population group is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="">Select Population Group</option>
                        {POPULATION_GROUPS.map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                      {errors.populationGroup && <p className="text-red-500 text-sm mt-1">{errors.populationGroup.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">City</label>
                      <input
                        type="text"
                        {...register('city')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Postal Code</label>
                      <input
                        type="text"
                        {...register('postalCode')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                  </div>

                  {/* Disability Information */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-navy-ink mb-4">Disability Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('disabilityNone')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setValue('disabilitySight', false);
                              setValue('disabilityHearing', false);
                              setValue('disabilitySpeech', false);
                              setValue('disabilityPhysical', false);
                            }
                          }}
                          className="mr-2"
                        />
                        <span>None</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('disabilitySight')}
                          disabled={disabilityNone}
                          className="mr-2"
                        />
                        <span>Sight</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('disabilityHearing')}
                          disabled={disabilityNone}
                          className="mr-2"
                        />
                        <span>Hearing</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('disabilitySpeech')}
                          disabled={disabilityNone}
                          className="mr-2"
                        />
                        <span>Speech</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('disabilityPhysical')}
                          disabled={disabilityNone}
                          className="mr-2"
                        />
                        <span>Physical</span>
                      </label>
                    </div>
                    {hasDisability && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-navy-ink mb-2">Other (Please specify)</label>
                        <input
                          type="text"
                          {...register('disabilityOther')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: MINISTRY INVOLVEMENT */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-navy-ink border-b pb-2">
                    Step 2: Ministry Involvement
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Current Ministry Name</label>
                      <input
                        type="text"
                        {...register('currentMinistryName')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Denomination</label>
                      <input
                        type="text"
                        {...register('denomination')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Ministry Type *
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <label className="flex items-center">
                          <input type="checkbox" {...register('ministryTypeLocalChurch')} className="mr-2" />
                          <span>Local Church</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" {...register('ministryTypeTeaching')} className="mr-2" />
                          <span>Teaching Institution</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" {...register('ministryTypeCounselling')} className="mr-2" />
                          <span>Counselling</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" {...register('ministryTypeYouth')} className="mr-2" />
                          <span>Youth/Child</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" {...register('ministryTypeOther')} className="mr-2" />
                          <span>Other</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" {...register('ministryTypeNotApplicable')} className="mr-2" />
                          <span>Not Applicable</span>
                        </label>
                      </div>
                      {watch('ministryTypeOther') && (
                        <input
                          type="text"
                          {...register('ministryTypeOtherText')}
                          placeholder="Please specify"
                          className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Ministry Position</label>
                      <input
                        type="text"
                        {...register('ministryPosition')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Ministry Website</label>
                      <input
                        type="url"
                        {...register('ministryWebsite', {
                          pattern: {
                            value: /^https?:\/\/.+/,
                            message: 'Please enter a valid URL'
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.ministryWebsite && <p className="text-red-500 text-sm mt-1">{errors.ministryWebsite.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Years of Part-Time Ministry</label>
                      <input
                        type="number"
                        {...register('yearsPartTime')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Years of Full-Time Ministry</label>
                      <input
                        type="number"
                        {...register('yearsFullTime')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Primary Income Source *
                      </label>
                      <select
                        {...register('primaryIncomeSource', { required: 'Primary income source is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="">Select Income Source</option>
                        <option value="Ministry">Ministry</option>
                        <option value="Non-Ministry">Non-Ministry</option>
                        <option value="None">None</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.primaryIncomeSource && <p className="text-red-500 text-sm mt-1">{errors.primaryIncomeSource.message}</p>}
                      {watch('primaryIncomeSource') === 'Other' && (
                        <input
                          type="text"
                          {...register('primaryIncomeOther')}
                          placeholder="Please specify"
                          className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: QUALIFICATIONS & REFERENCES */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-navy-ink border-b pb-2">
                    Step 3: Qualifications & References
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">High School</label>
                      <input
                        type="text"
                        {...register('highSchool')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Highest Ministry Qualification</label>
                      <input
                        type="text"
                        {...register('highestMinistryQualification')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Highest Other Qualification</label>
                      <input
                        type="text"
                        {...register('highestOtherQualification')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-navy-ink mb-2">Other Training</label>
                      <textarea
                        {...register('otherTraining')}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                  </div>

                  {/* Reference Information */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-navy-ink mb-4">Reference Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Reference First Name *
                        </label>
                        <input
                          type="text"
                          {...register('referenceFirstName', { required: 'Reference First Name is required. Please enter your reference person\'s first name.' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.referenceFirstName && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{errors.referenceFirstName.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Reference Last Name *
                        </label>
                        <input
                          type="text"
                          {...register('referenceLastName', { required: 'Reference Last Name is required. Please enter your reference person\'s last name.' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.referenceLastName && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{errors.referenceLastName.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Reference Contact Number *
                        </label>
                        <input
                          type="tel"
                          {...register('referenceContact', { required: 'Reference Contact is required. Please enter your reference person\'s phone number.' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.referenceContact && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{errors.referenceContact.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Reference Email Address *
                        </label>
                        <input
                          type="email"
                          {...register('referenceEmail', {
                            required: 'Reference Email is required. Please enter your reference person\'s email address.',
                            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format. Please enter a valid email address (e.g., name@example.com).' }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.referenceEmail && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{errors.referenceEmail.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Reference Title</label>
                        <input
                          type="text"
                          {...register('referenceTitle')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-navy-ink mb-4">Document Upload</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          ID Copy * (PDF, JPG, JPEG, PNG - Max 10MB)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                setError('File size must be less than 10MB');
                                return;
                              }
                              setIdFile(file);
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {idFile && (
                          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                            <FileText size={16} />
                            <span>{idFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setIdFile(null)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Additional Certificates/Documents (Optional - Max 10MB each)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setAdditionalFiles(prev => [...prev, ...files]);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {additionalFiles.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {additionalFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center space-x-2 text-sm text-gray-600">
                                <FileText size={16} />
                                <span>{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setAdditionalFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Declaration */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-navy-ink mb-4">Declaration</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Signature (Type your full name) *
                        </label>
                        <input
                          type="text"
                          {...register('signature', { required: 'Signature is required. Please type your full name to confirm your application.' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.signature && (
                          <p className="text-red-500 text-sm mt-1 font-medium">{errors.signature.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">Date *</label>
                        <input
                          type="date"
                          {...register('declarationDate', { required: 'Date is required' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.declarationDate && <p className="text-red-500 text-sm mt-1">{errors.declarationDate.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                {currentStep < 3 ? (
                  <Button type="button" variant="primary" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" disabled={isLoading}>
                    {isLoading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

