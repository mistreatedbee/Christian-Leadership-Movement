import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useUser } from '@insforge/react';
import { Button } from '../components/ui/Button';
import { X, FileText, Save, ArrowLeft, DollarSign } from 'lucide-react';
import { insforge } from '../lib/insforge';
import { sendEmailNotification } from '../lib/email';
import { uploadFileWithUserCheck } from '../lib/uploadHelpers';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

interface CourseApplicationFormData {
  // Personal Information
  fullName: string;
  idNumber: string;
  email: string;
  contactNumber: string;
  dateOfBirth: string;
  gender: string;
  physicalAddress: string;
  city: string;
  province: string;
  country: string;
  
  // Educational Background
  highestQualification: string;
  previousEducation: string;
  workExperience: string;
  
  // Additional Information
  motivation: string;
  expectations: string;
  additionalInfo?: string;
  
  // Declaration
  signature: string;
  declarationDate: string;
}

const BANK_DETAILS = {
  accountName: "Ken's Training Institute",
  bank: "Standard Bank",
  accountNumber: "1234567890",
  branchCode: "123456",
  branch: "Main Branch",
  swift: "SBZAJJZ"
};

export function ApplyCoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [courseFees, setCourseFees] = useState({ application_fee: 0, registration_fee: 0 });
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CourseApplicationFormData>({
    defaultValues: {
      declarationDate: new Date().toISOString().split('T')[0],
      country: 'South Africa'
    }
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate(`/login?redirect=/apply/course/${courseId}`);
      return;
    }
    
    if (courseId) {
      fetchCourseData();
      
      // Check if editing an existing application
      const editId = searchParams.get('edit');
      if (editId) {
        setEditingApplicationId(editId);
        setIsEditMode(true);
        loadApplicationForEdit(editId);
      }
    }
  }, [user, isLoaded, courseId, searchParams]);

  const fetchCourseData = async () => {
    if (!courseId) return;
    
    try {
      // Fetch course and fees
      const { data: courseData, error: courseError } = await insforge.database
        .from('courses')
        .select('*, course_fees(application_fee, registration_fee)')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      
      setCourse(courseData);
      
      // Set fees
      if (courseData.course_fees && courseData.course_fees.length > 0) {
        setCourseFees({
          application_fee: courseData.course_fees[0].application_fee || 0,
          registration_fee: courseData.course_fees[0].registration_fee || 0
        });
      }
    } catch (err: any) {
      console.error('Error fetching course:', err);
      setError('Failed to load course information');
    }
  };

  const loadApplicationForEdit = async (applicationId: string) => {
    try {
      const { data: application, error } = await insforge.database
        .from('course_applications')
        .select('*, application_data')
        .eq('id', applicationId)
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .single();
      
      if (error) throw error;
      if (!application) {
        setError('Application not found or cannot be edited');
        return;
      }
      
      // Load form data from application_data JSONB
      const formData = application.application_data || {};
      Object.keys(formData).forEach(key => {
        setValue(key as any, formData[key]);
      });
    } catch (err: any) {
      console.error('Error loading application for edit:', err);
      setError('Failed to load application for editing');
    }
  };

  const uploadFile = async (file: File, path: string): Promise<{ url: string; key: string } | null> => {
    if (!user) return null;
    
    try {
      return await uploadFileWithUserCheck(
        'applications',
        path,
        file,
        user.id,
        user.email || null,
        user.nickname || null
      );
    } catch (err: any) {
      console.error('Upload error:', err);
      throw new Error(`Failed to upload file: ${err.message}`);
    }
  };

  const onSubmit = async (data: CourseApplicationFormData) => {
    if (!user || !courseId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Upload ID file
      let idDocumentUrl = null;
      let idDocumentKey = null;
      if (idFile) {
        const idUpload = await uploadFile(idFile, `${user.id}/course_${courseId}/id_${Date.now()}_${idFile.name}`);
        if (!idUpload) {
          throw new Error('Failed to upload ID document');
        }
        idDocumentUrl = idUpload.url;
        idDocumentKey = idUpload.key;
      }

      // Upload payment proof
      let paymentProofUrl = null;
      let paymentProofKey = null;
      if (paymentProofFile) {
        const paymentUpload = await uploadFile(paymentProofFile, `${user.id}/course_${courseId}/payment_${Date.now()}_${paymentProofFile.name}`);
        if (!paymentUpload) {
          throw new Error('Failed to upload payment proof');
        }
        paymentProofUrl = paymentUpload.url;
        paymentProofKey = paymentUpload.key;
      }

      // Calculate total fees
      const totalFees = courseFees.application_fee + courseFees.registration_fee;

      // Save application data
      const applicationData: any = {
        course_id: courseId,
        user_id: user.id,
        application_data: data,
        status: 'pending',
        payment_status: 'pending',
        application_fee_paid: courseFees.application_fee,
        registration_fee_paid: courseFees.registration_fee,
        id_document_url: idDocumentUrl,
        id_document_key: idDocumentKey,
        payment_proof_url: paymentProofUrl,
        payment_proof_key: paymentProofKey
      };

      let savedApplication;
      if (isEditMode && editingApplicationId) {
        // Update existing application
        const { data: updated, error: updateError } = await insforge.database
          .from('course_applications')
          .update(applicationData)
          .eq('id', editingApplicationId)
          .select()
          .single();

        if (updateError) throw updateError;
        savedApplication = updated;
      } else {
        // Create new application
        const { data: inserted, error: insertError } = await insforge.database
          .from('course_applications')
          .insert([applicationData])
          .select()
          .single();

        if (insertError) throw insertError;
        savedApplication = inserted;
      }

      // Create payment record if fees are required
      if (totalFees > 0 && savedApplication) {
        const { data: payment, error: paymentError } = await insforge.database
          .from('payments')
          .insert([{
            user_id: user.id,
            amount: totalFees,
            currency: 'ZAR',
            payment_type: 'course_application',
            status: 'pending',
            related_id: savedApplication.id
          }])
          .select()
          .single();

        if (paymentError) {
          console.error('Payment record creation error:', paymentError);
        } else if (payment) {
          // Update application with payment_id
          await insforge.database
            .from('course_applications')
            .update({ payment_id: payment.id })
            .eq('id', savedApplication.id);
        }
      }

      // Create notification for user
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'course_application',
          title: 'Application Submitted',
          message: `Your application for "${course?.title}" has been submitted successfully. ${totalFees > 0 ? 'Please complete payment to finalize your application.' : ''}`,
          related_id: savedApplication.id,
          link_url: `/dashboard/applications`,
          read: false
        }]);

      // Notify admins
      try {
        const { data: admins } = await insforge.database
          .from('user_profiles')
          .select('user_id')
          .in('role', ['admin', 'super_admin']);

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.user_id,
            type: 'course_application',
            title: 'New Course Application',
            message: `A new application for "${course?.title}" has been submitted.`,
            related_id: savedApplication.id,
            link_url: `/admin/applications?type=course`,
            read: false
          }));

          await insforge.database
            .from('notifications')
            .insert(notifications);
        }
      } catch (notifError) {
        console.error('Error creating admin notifications:', notifError);
      }

      // Redirect to payment or success page
      if (totalFees > 0) {
        navigate(`/payment?payment_id=${savedApplication.payment_id}&return_url=/dashboard/applications`);
      } else {
        navigate('/dashboard/applications?success=true');
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalFees = courseFees.application_fee + courseFees.registration_fee;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TopNav />
      <main className="flex-grow py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="bg-white rounded-card shadow-soft p-8">
            <h1 className="text-3xl font-bold text-navy-ink mb-2">
              Apply for {course?.title || 'Course'}
            </h1>
            <p className="text-gray-600 mb-6">
              Complete the form below to apply for this course. All fields marked with * are required.
            </p>

            {/* Course Fees Display */}
            {totalFees > 0 && (
              <div className="bg-gold/10 border border-gold rounded-card p-4 mb-6">
                <h3 className="font-semibold text-navy-ink mb-2 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Course Fees
                </h3>
                <div className="space-y-1 text-sm">
                  {courseFees.application_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Application Fee:</span>
                      <span className="font-semibold">R{courseFees.application_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {courseFees.registration_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Registration Fee:</span>
                      <span className="font-semibold">R{courseFees.registration_fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gold/30">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">R{totalFees.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Payment details: {BANK_DETAILS.accountName}, {BANK_DETAILS.bank}, Account: {BANK_DETAILS.accountNumber}, Branch: {BANK_DETAILS.branchCode}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Personal Information */}
              <div className="border-b pb-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Full Name *</label>
                    <input
                      type="text"
                      {...register('fullName', { required: 'Full name is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">ID Number *</label>
                    <input
                      type="text"
                      {...register('idNumber', { required: 'ID number is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.idNumber && <p className="text-red-500 text-sm mt-1">{errors.idNumber.message}</p>}
                  </div>
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
                    <label className="block text-sm font-medium text-navy-ink mb-2">Contact Number *</label>
                    <input
                      type="tel"
                      {...register('contactNumber', { required: 'Contact number is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      {...register('dateOfBirth', { required: 'Date of birth is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Gender *</label>
                    <select
                      {...register('gender', { required: 'Gender is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Physical Address *</label>
                    <input
                      type="text"
                      {...register('physicalAddress', { required: 'Physical address is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.physicalAddress && <p className="text-red-500 text-sm mt-1">{errors.physicalAddress.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">City *</label>
                    <input
                      type="text"
                      {...register('city', { required: 'City is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Province *</label>
                    <input
                      type="text"
                      {...register('province', { required: 'Province is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Country *</label>
                    <input
                      type="text"
                      {...register('country', { required: 'Country is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
                  </div>
                </div>
              </div>

              {/* Step 2: Educational Background */}
              <div className="border-b pb-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Educational Background</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Highest Qualification *</label>
                    <input
                      type="text"
                      {...register('highestQualification', { required: 'Highest qualification is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="e.g., Matric, Diploma, Degree"
                    />
                    {errors.highestQualification && <p className="text-red-500 text-sm mt-1">{errors.highestQualification.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Previous Education *</label>
                    <textarea
                      {...register('previousEducation', { required: 'Previous education is required' })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Please provide details of your educational background"
                    />
                    {errors.previousEducation && <p className="text-red-500 text-sm mt-1">{errors.previousEducation.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Work Experience</label>
                    <textarea
                      {...register('workExperience')}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Please provide details of your work experience (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Additional Information */}
              <div className="border-b pb-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Additional Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Motivation for Applying *</label>
                    <textarea
                      {...register('motivation', { required: 'Motivation is required' })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Why do you want to take this course?"
                    />
                    {errors.motivation && <p className="text-red-500 text-sm mt-1">{errors.motivation.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Expectations *</label>
                    <textarea
                      {...register('expectations', { required: 'Expectations are required' })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="What do you expect to gain from this course?"
                    />
                    {errors.expectations && <p className="text-red-500 text-sm mt-1">{errors.expectations.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Additional Information</label>
                    <textarea
                      {...register('additionalInfo')}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Any additional information you would like to share (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Documents */}
              <div className="border-b pb-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Required Documents</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">ID Copy / Passport *</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload a clear copy of your ID or passport</p>
                  </div>
                  {totalFees > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-navy-ink mb-2">Payment Proof *</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      <p className="text-xs text-gray-500 mt-1">Upload proof of payment for the application and registration fees</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 5: Declaration */}
              <div className="pb-6">
                <h2 className="text-xl font-bold text-navy-ink mb-4">Declaration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Signature (Full Name) *</label>
                    <input
                      type="text"
                      {...register('signature', { required: 'Signature is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Type your full name as signature"
                    />
                    {errors.signature && <p className="text-red-500 text-sm mt-1">{errors.signature.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">Declaration Date *</label>
                    <input
                      type="date"
                      {...register('declarationDate', { required: 'Declaration date is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    {errors.declarationDate && <p className="text-red-500 text-sm mt-1">{errors.declarationDate.message}</p>}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-card">
                    <p className="text-sm text-gray-700">
                      I declare that the information provided in this application is true and correct to the best of my knowledge. 
                      I understand that providing false information may result in the rejection of my application.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Submitting...' : isEditMode ? 'Update Application' : 'Submit Application'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

