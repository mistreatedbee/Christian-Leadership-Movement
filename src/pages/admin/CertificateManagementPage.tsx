import React, { useState, useEffect } from 'react';
import { Award, Download, Send, Search, Filter, Plus, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { useForm } from 'react-hook-form';
import { sendEmailNotification } from '../../lib/email';
import jsPDF from 'jspdf';

interface Certificate {
  id: string;
  user_id: string;
  course_id: string | null;
  certificate_number: string;
  issued_date: string;
  status: 'issued' | 'pending' | 'revoked';
  certificate_url: string | null;
  user_name?: string;
  course_name?: string;
}

interface CertificateFormData {
  userId: string;
  courseId: string;
  certificateNumber: string;
}

export function CertificateManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [stats, setStats] = useState({
    totalIssued: 0,
    thisMonth: 0,
    pending: 0,
    total: 0
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CertificateFormData>();

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCourse]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch certificates with user and course info
      let query = insforge.database
        .from('certificates')
        .select(`
          *,
          users!certificates_user_id_fkey(id, nickname),
          courses!certificates_course_id_fkey(id, title)
        `)
        .order('issued_date', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data: certs, error: certError } = await query;

      if (certError) {
        // If table doesn't exist, show empty state
        if (certError.code === '42P01' || certError.message?.includes('does not exist')) {
          console.log('Certificates table not found');
          setCertificates([]);
          setStats({ totalIssued: 0, thisMonth: 0, pending: 0, total: 0 });
          setLoading(false);
          return;
        }
        throw certError;
      }

      const formattedCerts = (certs || []).map((cert: any) => ({
        id: cert.id,
        user_id: cert.user_id,
        course_id: cert.course_id,
        certificate_number: cert.certificate_number || `CLM-${cert.id.slice(0, 8).toUpperCase()}`,
        issued_date: cert.issued_date || cert.created_at,
        status: cert.status || 'issued',
        certificate_url: cert.certificate_url,
        user_name: cert.users?.nickname || 'Unknown User',
        course_name: cert.courses?.title || 'Course Completion'
      }));

      // Filter by course if selected
      let filteredCerts = formattedCerts;
      if (filterCourse !== 'all') {
        filteredCerts = formattedCerts.filter(c => c.course_id === filterCourse);
      }

      setCertificates(filteredCerts);

      // Calculate stats
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthCerts = formattedCerts.filter(c => 
        new Date(c.issued_date) >= thisMonthStart
      );
      const issuedCerts = formattedCerts.filter(c => c.status === 'issued');
      const pendingCerts = formattedCerts.filter(c => c.status === 'pending');

      setStats({
        totalIssued: issuedCerts.length,
        thisMonth: thisMonthCerts.length,
        pending: pendingCerts.length,
        total: formattedCerts.length
      });

      // Fetch users for generation form
      const { data: usersData } = await insforge.database
        .from('user_profiles')
        .select(`
          user_id,
          users!inner(id, nickname)
        `)
        .order('created_at', { ascending: false });

      const formattedUsers = (usersData || []).map((u: any) => ({
        id: u.user_id,
        user_id: u.user_id,
        nickname: u.users?.nickname || 'Unknown'
      }));

      setUsers(formattedUsers);

      // Fetch courses
      const { data: coursesData } = await insforge.database
        .from('courses')
        .select('id, title')
        .order('title');

      setCourses(coursesData || []);
    } catch (err: any) {
      console.error('Error fetching certificates:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch certificates' });
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const generateCertificateNumber = (): string => {
    const prefix = 'CLM';
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  };

  const generateCertificatePDF = async (certificate: Certificate, userName: string, courseName: string): Promise<string> => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(27, 28, 95); // navy-ink
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Gold border
    doc.setDrawColor(212, 175, 55); // gold
    doc.setLineWidth(2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

    // Title
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(36);
    doc.setFont(undefined, 'bold');
    doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 50, { align: 'center' });

    // Subtitle
    doc.setFontSize(18);
    doc.setFont(undefined, 'normal');
    doc.text('This is to certify that', pageWidth / 2, 70, { align: 'center' });

    // Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text(userName, pageWidth / 2, 95, { align: 'center' });

    // Course
    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text(`has successfully completed the course`, pageWidth / 2, 110, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.text(courseName, pageWidth / 2, 125, { align: 'center' });

    // Date
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    const issueDate = new Date(certificate.issued_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Issued on ${issueDate}`, pageWidth / 2, 150, { align: 'center' });

    // Certificate Number
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text(`Certificate Number: ${certificate.certificate_number}`, pageWidth / 2, 170, { align: 'center' });

    // Signature line
    doc.setDrawColor(212, 175, 55);
    doc.line(pageWidth / 2 - 40, 185, pageWidth / 2 + 40, 185);
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('Authorized Signature', pageWidth / 2, 195, { align: 'center' });

    // Convert to blob URL
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    return pdfUrl;
  };

  const onGenerateCertificate = async (data: CertificateFormData) => {
    try {
      const certificateNumber = data.certificateNumber || generateCertificateNumber();

      // Create certificate record
      const { data: newCert, error: certError } = await insforge.database
        .from('certificates')
        .insert([{
          user_id: data.userId,
          course_id: data.courseId || null,
          certificate_number: certificateNumber,
          issued_date: new Date().toISOString(),
          status: 'issued'
        }])
        .select()
        .single();

      if (certError) {
        // If table doesn't exist, create it first
        if (certError.code === '42P01' || certError.message?.includes('does not exist')) {
          setMessage({
            type: 'error',
            text: 'Certificates table does not exist. Please create it in the database first.'
          });
          return;
        }
        throw certError;
      }

      // Generate PDF
      const user = users.find(u => u.user_id === data.userId);
      const course = courses.find(c => c.id === data.courseId);
      const pdfUrl = await generateCertificatePDF(
        newCert,
        user?.nickname || 'Student',
        course?.title || 'Course'
      );

      // Upload PDF to storage
      try {
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const file = new File([blob], `certificate-${certificateNumber}.pdf`, { type: 'application/pdf' });

        const filePath = `certificates/${newCert.id}/${file.name}`;
        const { data: uploadData, error: uploadError } = await insforge.storage
          .from('courses')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Update certificate with URL
        await insforge.database
          .from('certificates')
          .update({ certificate_url: uploadData.url })
          .eq('id', newCert.id);

        URL.revokeObjectURL(pdfUrl);
      } catch (uploadErr) {
        console.warn('Failed to upload certificate PDF:', uploadErr);
        // Certificate is still created, just without PDF URL
      }

      // Create notification
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: data.userId,
          type: 'certificate',
          title: 'Certificate Issued',
          message: `Your certificate for ${course?.title || 'course completion'} has been issued.`,
          related_id: newCert.id
        }]);

      // Send email notification
      await sendEmailNotification(data.userId, {
        type: 'certificate',
        subject: 'Certificate Issued - Christian Leadership Movement',
        message: `Congratulations! Your certificate for ${course?.title || 'course completion'} has been issued. Certificate Number: ${certificateNumber}`
      });

      setMessage({ type: 'success', text: 'Certificate generated successfully!' });
      setShowGenerateForm(false);
      reset();
      fetchData();
    } catch (err: any) {
      console.error('Error generating certificate:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to generate certificate' });
    }
  };

  const handleDownload = async (certificate: Certificate) => {
    if (certificate.certificate_url) {
      window.open(certificate.certificate_url, '_blank');
    } else {
      // Generate on-the-fly
      try {
        const pdfUrl = await generateCertificatePDF(
          certificate,
          certificate.user_name || 'Student',
          certificate.course_name || 'Course'
        );
        window.open(pdfUrl, '_blank');
      } catch (err) {
        console.error('Error generating PDF:', err);
        setMessage({ type: 'error', text: 'Failed to generate certificate PDF' });
      }
    }
  };

  const handleSend = async (certificate: Certificate) => {
    try {
      if (!certificate.certificate_url) {
        setMessage({ type: 'error', text: 'Certificate PDF not available. Please generate it first.' });
        return;
      }

      await sendEmailNotification(certificate.user_id, {
        type: 'certificate',
        subject: 'Your Certificate - Christian Leadership Movement',
        message: `Your certificate for ${certificate.course_name || 'course completion'} is ready. Certificate Number: ${certificate.certificate_number}`,
        html: `<p>Your certificate is ready for download.</p><p><a href="${certificate.certificate_url}">Download Certificate</a></p>`
      });

      setMessage({ type: 'success', text: 'Certificate sent to user via email!' });
    } catch (err: any) {
      console.error('Error sending certificate:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to send certificate' });
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = !searchTerm ||
      cert.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">
            Certificate Management
          </h1>
          <p className="text-gray-600">
            Generate and manage course certificates
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowGenerateForm(true)}>
          <Plus size={20} className="mr-2" />
          Generate Certificate
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-card shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Issued</p>
              <p className="text-2xl font-bold text-navy-ink">{stats.totalIssued}</p>
            </div>
            <Award className="text-gold" size={32} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm">This Month</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.thisMonth}</p>
        </div>
        <div className="bg-white p-4 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm">Total</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.total}</p>
        </div>
      </div>

      {/* Generate Certificate Modal */}
      {showGenerateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">Generate Certificate</h2>
              <button
                onClick={() => {
                  setShowGenerateForm(false);
                  reset();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onGenerateCertificate)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Select User *
                </label>
                <select
                  {...register('userId', { required: 'Please select a user' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="">Select a user...</option>
                  {users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.nickname || 'Unknown User'}
                    </option>
                  ))}
                </select>
                {errors.userId && (
                  <p className="text-red-500 text-sm mt-1">{errors.userId.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Select Course
                </label>
                <select
                  {...register('courseId')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="">No specific course (General Certificate)</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Certificate Number (leave empty for auto-generation)
                </label>
                <input
                  type="text"
                  {...register('certificateNumber')}
                  placeholder="Auto-generated if empty"
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowGenerateForm(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Generate Certificate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Status</option>
            <option value="issued">Issued</option>
            <option value="pending">Pending</option>
            <option value="revoked">Revoked</option>
          </select>
          <select
            value={filterCourse}
            onChange={e => setFilterCourse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Student</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Course</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Certificate #</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Issued Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    Loading certificates...
                  </td>
                </tr>
              ) : filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    No certificates found
                  </td>
                </tr>
              ) : (
                filteredCertificates.map(cert => (
                  <tr key={cert.id} className="hover:bg-muted-gray/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold mr-3">
                          {cert.user_name?.charAt(0) || 'U'}
                        </div>
                        <span className="font-medium text-navy-ink">
                          {cert.user_name || 'Unknown User'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {cert.course_name || 'General Certificate'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                      {cert.certificate_number}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(cert.issued_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-sm rounded-full ${
                        cert.status === 'issued' ? 'bg-green-100 text-green-800' :
                        cert.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cert.status === 'issued' ? (
                          <span className="flex items-center">
                            <CheckCircle size={12} className="mr-1" />
                            Issued
                          </span>
                        ) : cert.status === 'pending' ? (
                          <span className="flex items-center">
                            <Clock size={12} className="mr-1" />
                            Pending
                          </span>
                        ) : (
                          'Revoked'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownload(cert)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleSend(cert)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-card"
                          title="Send via Email"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
