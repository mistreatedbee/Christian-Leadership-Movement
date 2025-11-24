import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useUser } from '@insforge/react';
import { Button } from '../components/ui/Button';
import { X, FileText, Save, Plus, Trash2, Copy, ArrowLeft } from 'lucide-react';
import { insforge } from '../lib/insforge';
import { sendEmailNotification } from '../lib/email';
import { uploadFileWithUserCheck } from '../lib/uploadHelpers';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

interface BibleSchoolFormData {
  // Step 1: Personal Information
  fullName: string;
  idNumber: string;
  gender: string;
  maritalStatus: string;
  contactNumber: string;
  email: string;
  physicalAddress: string;
  country: string;

  // Step 2: Spiritual Background
  dateAcceptedChrist?: string;
  isBaptized: boolean;
  baptismDate?: string;
  attendsLocalChurch: boolean;
  churchName?: string;
  denomination?: string;
  pastorName?: string;
  servesInMinistry: boolean;
  ministryServiceDescription?: string;

  // Step 3: Leadership Interests
  whyJoinBibleSchool: string;
  leadershipRoles: Array<{ title: string; description: string }>;
  previousLeadershipExperience?: string;

  // Step 4: Vision & Calling
  callingStatement: string;
  leadershipAmbitions?: string;

  // Step 5: References & Fees
  refereeName: string;
  refereeContact: string;
  relationshipToReferee: string;
  registrationOption: string;
  signature: string;
  declarationDate: string;
}

// Registration fees will be fetched from database

const BANK_DETAILS = {
  accountName: "Ken's Training Institute",
  bank: "Standard Bank",
  accountNumber: "1234567890",
  branchCode: "123456",
  branch: "Main Branch",
  swift: "SBZAJJZ"
};

export function ApplyBibleSchoolPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [registrationFees, setRegistrationFees] = useState({ withACRP: 0, withoutACRP: 0 });
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    control
  } = useForm<BibleSchoolFormData>({
    defaultValues: {
      declarationDate: new Date().toISOString().split('T')[0],
      isBaptized: false,
      attendsLocalChurch: false,
      servesInMinistry: false,
      leadershipRoles: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'leadershipRoles'
  });

  const isBaptized = watch('isBaptized');
  const attendsLocalChurch = watch('attendsLocalChurch');
  const servesInMinistry = watch('servesInMinistry');

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate('/login?redirect=/apply/bible-school');
      return;
    }
    
    // Check if editing an existing application
    const editId = searchParams.get('edit');
    if (editId) {
      setEditingApplicationId(editId);
      setIsEditMode(true);
      loadApplicationForEdit(editId);
    } else {
      loadDraft();
    }
    
    fetchRegistrationFees();
  }, [user, isLoaded, searchParams]);
  
  const loadApplicationForEdit = async (applicationId: string) => {
    try {
      const { data: application, error } = await insforge.database
        .from('applications')
        .select('*, form_data')
        .eq('id', applicationId)
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .single();
      
      if (error) throw error;
      if (!application) {
        setError('Application not found or cannot be edited');
        return;
      }
      
      // Load form data from form_data JSONB
      const formData = application.form_data || {};
      Object.keys(formData).forEach(key => {
        if (key === 'leadershipRoles' && Array.isArray(formData[key])) {
          formData[key].forEach((role: any) => append(role));
        } else {
          setValue(key as any, formData[key]);
        }
      });
      
      // Set file URLs if they exist (for display, not re-upload)
      if (application.id_passport_url) {
        // File already uploaded, user can see it but would need to re-upload to change
      }
    } catch (err: any) {
      console.error('Error loading application for edit:', err);
      setError('Failed to load application for editing');
    }
  };

  const fetchRegistrationFees = async () => {
    try {
      const { data, error } = await insforge.database
        .from('fee_settings')
        .select('fee_type, amount')
        .in('fee_type', ['bible_school_with_acrp', 'bible_school_without_acrp'])
        .eq('is_active', true);

      if (error) throw error;
      if (data) {
        const fees: any = {};
        data.forEach((fee: any) => {
          if (fee.fee_type === 'bible_school_with_acrp') {
            fees.withACRP = parseFloat(fee.amount) || 0;
          } else if (fee.fee_type === 'bible_school_without_acrp') {
            fees.withoutACRP = parseFloat(fee.amount) || 0;
          }
        });
        setRegistrationFees(fees);
      }
    } catch (err) {
      console.error('Error fetching registration fees:', err);
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
        .eq('form_type', 'bible_school')
        .maybeSingle();

      if (data?.form_data) {
        const formData = data.form_data;
        Object.keys(formData).forEach(key => {
          if (key === 'leadershipRoles' && Array.isArray(formData[key])) {
            formData[key].forEach((role: any) => append(role));
          } else {
            setValue(key as any, formData[key]);
          }
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
          form_type: 'bible_school',
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
      if (!values.fullName || values.fullName.length < 2) return false;
      if (!values.idNumber || values.idNumber.length !== 13) return false;
      if (!values.gender) return false;
      if (!values.maritalStatus) return false;
      if (!values.contactNumber || values.contactNumber.length < 10) return false;
      if (!values.email) return false;
      if (!values.physicalAddress || values.physicalAddress.length < 10) return false;
      if (!values.country || values.country.length < 2) return false;
      return true;
    }
    
    if (step === 2) {
      // Optional fields, no validation needed
      return true;
    }
    
    if (step === 3) {
      if (!values.whyJoinBibleSchool || values.whyJoinBibleSchool.length < 50) return false;
      return true;
    }
    
    if (step === 4) {
      if (!values.callingStatement || values.callingStatement.length < 100) return false;
      return true;
    }
    
    if (step === 5) {
      if (!values.refereeName) return false;
      if (!values.refereeContact) return false;
      if (!values.relationshipToReferee) return false;
      if (!values.registrationOption) return false;
      if (!values.signature) return false;
      if (!idFile) return false;
      // Payment proof is optional - can pay online after submission
      return true;
    }
    
    return true;
  };

  const handleNext = () => {
    const values = getValues();
    const missingFields: string[] = [];
    
    if (currentStep === 1) {
      if (!values.fullName) missingFields.push('Full Name');
      if (!values.idNumber) missingFields.push('ID Number');
      if (!values.gender) missingFields.push('Gender');
      if (!values.maritalStatus) missingFields.push('Marital Status');
      if (!values.contactNumber) missingFields.push('Contact Number');
      if (!values.email) missingFields.push('Email');
      if (!values.physicalAddress) missingFields.push('Physical Address');
      if (!values.country) missingFields.push('Country');
    } else if (currentStep === 2) {
      // Step 2 validation
      if (values.attendsLocalChurch && !values.churchName) missingFields.push('Church Name');
      if (values.servesInMinistry && !values.ministryServiceDescription) missingFields.push('Ministry Service Description');
    } else if (currentStep === 3) {
      if (!values.whyJoinBibleSchool) missingFields.push('Why Join Bible School');
      else if (values.whyJoinBibleSchool.length < 50) {
        setError(`"Why Join Bible School" must be at least 50 characters. Current: ${values.whyJoinBibleSchool.length} characters. Please provide more details.`);
        return;
      }
    } else if (currentStep === 4) {
      if (!values.callingStatement) missingFields.push('Calling Statement');
      else if (values.callingStatement.length < 100) {
        setError(`"Calling Statement" must be at least 100 characters. Current: ${values.callingStatement.length} characters. Please provide more details.`);
        return;
      }
    } else if (currentStep === 5) {
      if (!values.refereeName) missingFields.push('Referee Name');
      if (!values.refereeContact) missingFields.push('Referee Contact');
      if (!values.relationshipToReferee) missingFields.push('Relationship to Referee');
      if (!values.registrationOption) missingFields.push('Registration Option');
      if (!values.signature) missingFields.push('Signature');
    }
    
    if (missingFields.length > 0) {
      setError(`Please complete the following required fields before proceeding: ${missingFields.join(', ')}`);
      return;
    }
    
    if (validateStep(currentStep)) {
      saveDraft();
      setCurrentStep(prev => Math.min(prev + 1, 5));
      setError(null);
    } else {
      setError('Please complete all required fields before proceeding');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const copyBankDetails = () => {
    const details = `Account Name: ${BANK_DETAILS.accountName}\nBank: ${BANK_DETAILS.bank}\nAccount Number: ${BANK_DETAILS.accountNumber}\nBranch Code: ${BANK_DETAILS.branchCode}\nBranch: ${BANK_DETAILS.branch}\nSWIFT: ${BANK_DETAILS.swift}`;
    navigator.clipboard.writeText(details);
    setAutoSaveStatus('Bank details copied to clipboard');
    setTimeout(() => setAutoSaveStatus(''), 2000);
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

  const onSubmit = async (data: BibleSchoolFormData) => {
    if (!user || !idFile) {
      setError('Please upload your ID copy');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Upload ID file
      const idUpload = await uploadFile(idFile, `${user.id}/bible_school/id_${Date.now()}_${idFile.name}`);
      if (!idUpload) return;

      // Upload payment proof if provided
      let paymentUpload: { url: string; key: string } | null = null;
      if (paymentProofFile) {
        paymentUpload = await uploadFile(paymentProofFile, `${user.id}/bible_school/payment_${Date.now()}_${paymentProofFile.name}`);
        if (!paymentUpload) return;
      }

      // Save ALL form data to form_data JSONB column for complete data preservation
      // This ensures admins can see every single field that was submitted
      const completeFormData = {
        // Step 1: Personal Information
        fullName: data.fullName,
        idNumber: data.idNumber,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        contactNumber: data.contactNumber,
        email: data.email,
        physicalAddress: data.physicalAddress,
        country: data.country,
        // Step 2: Spiritual Background
        dateAcceptedChrist: data.dateAcceptedChrist,
        isBaptized: data.isBaptized,
        baptismDate: data.baptismDate,
        attendsLocalChurch: data.attendsLocalChurch,
        churchName: data.churchName,
        denomination: data.denomination,
        pastorName: data.pastorName,
        servesInMinistry: data.servesInMinistry,
        ministryServiceDescription: data.ministryServiceDescription,
        // Step 3: Leadership Interests
        whyJoinBibleSchool: data.whyJoinBibleSchool,
        leadershipRoles: data.leadershipRoles,
        previousLeadershipExperience: data.previousLeadershipExperience,
        // Step 4: Vision & Calling
        callingStatement: data.callingStatement,
        leadershipAmbitions: data.leadershipAmbitions,
        // Step 5: References & Fees
        refereeName: data.refereeName,
        refereeContact: data.refereeContact,
        relationshipToReferee: data.relationshipToReferee,
        registrationOption: data.registrationOption,
        signature: data.signature,
        declarationDate: data.declarationDate
      };

      // Create application - Save only essential columns and ALL form data to form_data JSONB
      // Only use columns that definitely exist in the applications table
      // All detailed data goes in form_data JSONB column
      const applicationData: any = {
        user_id: user.id,
        program_type: 'bible_school',
        // File URLs (if these columns exist)
        id_passport_url: idUpload.url,
        id_passport_key: idUpload.key,
        payment_proof_url: paymentUpload?.url || null,
        payment_proof_key: paymentUpload?.key || null,
        // CRITICAL: Save ALL form data to form_data JSONB column
        // This ensures admins can see every single field that was submitted
        // All fields including full_name, email, etc. are in form_data
        form_data: completeFormData,
        status: 'pending',
        payment_status: 'pending'
      };

      const { data: application, error: appError } = await insforge.database
        .from('applications')
        .insert([applicationData])
        .select()
        .single();

      if (appError) throw appError;

      // Get the selected fee amount
      const selectedFee = data.registrationOption === 'with_acrp' 
        ? registrationFees.withACRP 
        : registrationFees.withoutACRP;

      // Create payment record
      let paymentId: string | null = null;
      if (selectedFee > 0) {
        // If payment proof is uploaded, mark as confirmed, otherwise pending
        const paymentStatus = paymentProofFile ? 'confirmed' : 'pending';
        
        const { data: payment, error: paymentError } = await insforge.database
          .from('payments')
          .insert([{
            user_id: user.id,
            application_id: application.id,
            amount: selectedFee,
            currency: 'ZAR',
            payment_type: 'application',
            status: paymentStatus
          }])
          .select()
          .single();

        if (paymentError) throw paymentError;
        paymentId = payment.id;

        await insforge.database
          .from('applications')
          .update({ 
            payment_id: payment.id, 
            payment_status: paymentStatus 
          })
          .eq('id', application.id);
      }

      // Create notification for user
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'application',
          title: 'Bible School Application Submitted',
          message: 'Your Bible School application has been submitted successfully and is pending review.',
          related_id: application.id
        }]);

      // Create notifications for all admins (only if new application, not edit)
      if (!isEditMode) {
        try {
          const { data: admins } = await insforge.database
            .from('user_profiles')
            .select('user_id')
            .in('role', ['admin', 'super_admin']);

          if (admins && admins.length > 0) {
            const adminNotifications = admins.map((admin: any) => ({
              user_id: admin.user_id,
              type: 'application',
              title: 'New Bible School Application',
              message: `A new Bible School application has been submitted by ${data.fullName || user.email || 'a user'}. Please review it.`,
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
      }

      // Send email notification (only if new application)
      if (!isEditMode) {
        await sendEmailNotification(user.id, {
          type: 'application_submitted',
          subject: 'Bible School Application Submitted',
          message: 'Your Bible School application has been submitted successfully.'
        });
      }

      // Delete draft
      await insforge.database
        .from('application_drafts')
        .delete()
        .eq('user_id', user.id)
        .eq('form_type', 'bible_school');

      // Redirect to payment if fee required and no proof uploaded, otherwise to applications
      if (selectedFee > 0 && !paymentProofFile && paymentId) {
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
          errorMessage = 'Please complete all required fields before submitting. Check that all fields marked with * are filled in, including "Why Join Bible School" (minimum 50 characters) and "Calling Statement" (minimum 100 characters).';
        } else if (err.message.includes('minLength') || err.message.includes('minimum') || err.message.includes('50') || err.message.includes('100')) {
          errorMessage = 'Some fields do not meet the minimum length requirement. Please check:\n- "Why Join Bible School" must be at least 50 characters\n- "Calling Statement" must be at least 100 characters';
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

  const progress = ((currentStep / 5) * 100).toFixed(0);

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
                Bible School / Ordination Application Form
              </h1>
              <p className="text-gray-600">
                Complete all 5 steps to submit your application
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-navy-ink">Step {currentStep} of 5</span>
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
                {autoSaveStatus.includes('Bank details') ? <Copy size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
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
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        {...register('fullName', {
                          required: 'Full name is required',
                          minLength: { value: 2, message: 'Full name must be at least 2 characters' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        ID Number *
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        {...register('idNumber', {
                          required: 'ID number is required',
                          minLength: { value: 13, message: 'ID must be exactly 13 digits' },
                          maxLength: { value: 13, message: 'ID must be exactly 13 digits' },
                          pattern: { value: /^\d+$/, message: 'ID must contain only numbers' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="13-digit ID number"
                      />
                      {errors.idNumber && <p className="text-red-500 text-sm mt-1">{errors.idNumber.message}</p>}
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
                        Marital Status *
                      </label>
                      <select
                        {...register('maritalStatus', { required: 'Marital status is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                      {errors.maritalStatus && <p className="text-red-500 text-sm mt-1">{errors.maritalStatus.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Contact Number *
                      </label>
                      <input
                        type="tel"
                        {...register('contactNumber', {
                          required: 'Contact number is required',
                          minLength: { value: 10, message: 'Contact number must be at least 10 digits' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber.message}</p>}
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

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Physical Address *
                      </label>
                      <textarea
                        {...register('physicalAddress', {
                          required: 'Physical address is required',
                          minLength: { value: 10, message: 'Address must be at least 10 characters' }
                        })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.physicalAddress && <p className="text-red-500 text-sm mt-1">{errors.physicalAddress.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">
                        Country *
                      </label>
                      <input
                        type="text"
                        {...register('country', {
                          required: 'Country is required',
                          minLength: { value: 2, message: 'Country must be at least 2 characters' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SPIRITUAL BACKGROUND */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-navy-ink border-b pb-2">
                    Step 2: Spiritual Background
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Date You Accepted Christ</label>
                      <input
                        type="date"
                        {...register('dateAcceptedChrist')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>

                    <div>
                      <label className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          {...register('isBaptized')}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-navy-ink">Baptized</span>
                      </label>
                      {isBaptized && (
                        <div>
                          <label className="block text-sm font-medium text-navy-ink mb-2">Baptism Date</label>
                          <input
                            type="date"
                            {...register('baptismDate')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          {...register('attendsLocalChurch')}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-navy-ink">Attends Local Church</span>
                      </label>
                      {attendsLocalChurch && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                          <div>
                            <label className="block text-sm font-medium text-navy-ink mb-2">Church Name</label>
                            <input
                              type="text"
                              {...register('churchName')}
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
                          <div>
                            <label className="block text-sm font-medium text-navy-ink mb-2">Pastor Name</label>
                            <input
                              type="text"
                              {...register('pastorName')}
                              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          {...register('servesInMinistry')}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-navy-ink">Serves in Ministry</span>
                      </label>
                      {servesInMinistry && (
                        <div className="ml-6">
                          <label className="block text-sm font-medium text-navy-ink mb-2">Ministry Service Description</label>
                          <textarea
                            {...register('ministryServiceDescription')}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: LEADERSHIP INTERESTS */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-navy-ink border-b pb-2">
                    Step 3: Leadership Interests
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">
                      Why Join Bible School? *
                    </label>
                    <textarea
                      {...register('whyJoinBibleSchool', {
                        required: 'Why Join Bible School field is required. Please explain why you want to join.',
                        minLength: { 
                          value: 50, 
                          message: 'Your explanation must be at least 50 characters long. Please provide more details about why you want to join Bible School.' 
                        }
                      })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Please provide a detailed explanation (minimum 50 characters)"
                    />
                    {errors.whyJoinBibleSchool && (
                      <p className="text-red-500 text-sm mt-1 font-medium">
                        {errors.whyJoinBibleSchool.message}
                        {errors.whyJoinBibleSchool.type === 'minLength' && (
                          <span className="block mt-1 text-xs">
                            Current length: {watch('whyJoinBibleSchool')?.length || 0} characters. Required: 50 characters minimum.
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">
                      Leadership Roles
                    </label>
                    {fields.map((field, index) => (
                      <div key={field.id} className="mb-4 p-4 border border-gray-300 rounded-card">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                          <div>
                            <label className="block text-sm font-medium text-navy-ink mb-2">Role Title</label>
                            <input
                              type="text"
                              {...register(`leadershipRoles.${index}.title` as const)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-navy-ink mb-2">Role Description</label>
                          <textarea
                            {...register(`leadershipRoles.${index}.description` as const)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => append({ title: '', description: '' })}
                      className="mb-4"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Leadership Role
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Previous Leadership Experience</label>
                    <textarea
                      {...register('previousLeadershipExperience')}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: VISION & CALLING */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-navy-ink border-b pb-2">
                    Step 4: Vision & Calling
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">
                      Calling Statement *
                    </label>
                    <textarea
                      {...register('callingStatement', {
                        required: 'Calling Statement field is required. Please describe your calling and ministry vision.',
                        minLength: { 
                          value: 100, 
                          message: 'Your calling statement must be at least 100 characters long. Please provide more details about your calling and ministry vision.' 
                        }
                      })}
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Please describe your calling and ministry vision (minimum 100 characters)"
                    />
                    {errors.callingStatement && (
                      <p className="text-red-500 text-sm mt-1 font-medium">
                        {errors.callingStatement.message}
                        {errors.callingStatement.type === 'minLength' && (
                          <span className="block mt-1 text-xs">
                            Current length: {watch('callingStatement')?.length || 0} characters. Required: 100 characters minimum.
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Leadership Ambitions</label>
                    <textarea
                      {...register('leadershipAmbitions')}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: REFERENCES & FEES */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-navy-ink border-b pb-2">
                    Step 5: References & Fees
                  </h2>

                  {/* Reference Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-navy-ink mb-4">Reference Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Referee Name *
                        </label>
                        <input
                          type="text"
                          {...register('refereeName', { required: 'Referee name is required' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.refereeName && <p className="text-red-500 text-sm mt-1">{errors.refereeName.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Referee Contact Number *
                        </label>
                        <input
                          type="tel"
                          {...register('refereeContact', { required: 'Referee contact is required' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.refereeContact && <p className="text-red-500 text-sm mt-1">{errors.refereeContact.message}</p>}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-navy-ink mb-2">
                          Relationship to Referee *
                        </label>
                        <input
                          type="text"
                          {...register('relationshipToReferee', { required: 'Relationship is required' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.relationshipToReferee && <p className="text-red-500 text-sm mt-1">{errors.relationshipToReferee.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Registration Fees */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-navy-ink mb-4">Registration Fees</h3>
                    <div className="space-y-3">
                      <label className="flex items-center p-4 border border-gray-300 rounded-card cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          {...register('registrationOption', { required: 'Please select a registration option' })}
                          value="with_acrp"
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium text-navy-ink">Option 1: With ACRP Registration</span>
                          <span className="text-gold font-semibold ml-2">R {registrationFees.withACRP.toFixed(2)}</span>
                        </div>
                      </label>
                      <label className="flex items-center p-4 border border-gray-300 rounded-card cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          {...register('registrationOption')}
                          value="without_acrp"
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium text-navy-ink">Option 2: Without ACRP Registration</span>
                          <span className="text-gold font-semibold ml-2">R {registrationFees.withoutACRP.toFixed(2)}</span>
                        </div>
                      </label>
                      {errors.registrationOption && <p className="text-red-500 text-sm mt-1">{errors.registrationOption.message}</p>}
                    </div>
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-card p-4">
                      <p className="text-sm text-gray-700">
                        You can either upload proof of bank payment below, or pay online after form submission.
                      </p>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-navy-ink mb-4">Bank Details for Payment</h3>
                    <div className="bg-muted-gray p-6 rounded-card">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">Account Name:</span>
                          <span>{BANK_DETAILS.accountName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Bank:</span>
                          <span>{BANK_DETAILS.bank}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Account Number:</span>
                          <span>{BANK_DETAILS.accountNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Branch Code:</span>
                          <span>{BANK_DETAILS.branchCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Branch:</span>
                          <span>{BANK_DETAILS.branch}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">SWIFT:</span>
                          <span>{BANK_DETAILS.swift}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyBankDetails}
                        className="mt-4"
                      >
                        <Copy size={16} className="mr-2" />
                        Copy Bank Details
                      </Button>
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
                          Proof of Bank Payment (Optional - PDF, JPG, JPEG, PNG - Max 10MB)
                        </label>
                        <p className="text-xs text-gray-600 mb-2">
                          If you've already paid via bank transfer, upload proof here. Otherwise, you can pay online after submission.
                        </p>
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
                              setPaymentProofFile(file);
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {paymentProofFile && (
                          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                            <FileText size={16} />
                            <span>{paymentProofFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setPaymentProofFile(null)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
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
                          {...register('signature', { required: 'Signature is required' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        {errors.signature && <p className="text-red-500 text-sm mt-1">{errors.signature.message}</p>}
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
                {currentStep < 5 ? (
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

