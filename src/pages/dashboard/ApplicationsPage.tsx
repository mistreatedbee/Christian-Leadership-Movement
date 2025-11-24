import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, FileText, Eye, Edit, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { useNavigate } from 'react-router-dom';
import { getStorageUrl } from '../../lib/connection';

interface Application {
  id: string;
  program_type: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;
  program_id: string | null;
  form_data?: any;
  id_passport_url?: string;
  id_passport_key?: string;
  payment_proof_url?: string;
  payment_proof_key?: string;
}

export function ApplicationsPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchData = async () => {
      try {
        // Fetch applications with form_data
        const { data: apps, error: appsError } = await insforge.database
          .from('applications')
          .select('*, form_data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (appsError) throw appsError;
        setApplications(apps || []);
      } catch (err) {
        console.error('Error fetching applications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isLoaded]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'pending':
        return <Clock className="text-amber-500" size={24} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return <FileText className="text-gray-500" size={24} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>;
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const handleEdit = (application: Application) => {
    // Navigate to the appropriate application form based on program_type
    if (application.program_type === 'bible_school') {
      navigate(`/apply/bible-school?edit=${application.id}`);
    } else if (application.program_type === 'membership') {
      navigate(`/apply/membership?edit=${application.id}`);
    }
  };

  const renderFormData = (formData: any) => {
    if (!formData || typeof formData !== 'object') return null;

    const sections: { [key: string]: any[] } = {
      'Personal Information': [],
      'Spiritual Background': [],
      'Leadership Interests': [],
      'Vision & Calling': [],
      'References': [],
      'Other': []
    };

    Object.entries(formData).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      const displayKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();

      let displayValue: string;
      if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      } else if (Array.isArray(value)) {
        displayValue = value.length > 0 ? value.map((v: any) => 
          typeof v === 'object' ? `${v.title || 'Untitled'}: ${v.description || ''}` : String(v)
        ).join(', ') : 'N/A';
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value, null, 2);
      } else {
        displayValue = String(value);
      }

      // Categorize fields
      if (key.toLowerCase().includes('name') || key.toLowerCase().includes('email') || 
          key.toLowerCase().includes('phone') || key.toLowerCase().includes('address') ||
          key.toLowerCase().includes('id') || key.toLowerCase().includes('gender') ||
          key.toLowerCase().includes('marital') || key.toLowerCase().includes('country')) {
        sections['Personal Information'].push([displayKey, displayValue]);
      } else if (key.toLowerCase().includes('church') || key.toLowerCase().includes('baptism') ||
                 key.toLowerCase().includes('christ') || key.toLowerCase().includes('ministry') ||
                 key.toLowerCase().includes('denomination') || key.toLowerCase().includes('pastor')) {
        sections['Spiritual Background'].push([displayKey, displayValue]);
      } else if (key.toLowerCase().includes('leadership') || key.toLowerCase().includes('role')) {
        sections['Leadership Interests'].push([displayKey, displayValue]);
      } else if (key.toLowerCase().includes('calling') || key.toLowerCase().includes('vision') ||
                 key.toLowerCase().includes('ambition')) {
        sections['Vision & Calling'].push([displayKey, displayValue]);
      } else if (key.toLowerCase().includes('referee') || key.toLowerCase().includes('reference')) {
        sections['References'].push([displayKey, displayValue]);
      } else {
        sections['Other'].push([displayKey, displayValue]);
      }
    });

    return Object.entries(sections).map(([sectionTitle, fields]) => {
      if (fields.length === 0) return null;
      return (
        <div key={sectionTitle} className="mb-6">
          <h3 className="text-lg font-bold text-navy-ink mb-3">{sectionTitle}</h3>
          <div className="space-y-2">
            {fields.map(([label, value], idx) => (
              <div key={idx} className="flex">
                <span className="font-medium text-gray-700 w-1/3">{label}:</span>
                <span className="text-gray-900 w-2/3">{value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">
            My Applications
          </h1>
          <p className="text-gray-600">
            Track the status of your program applications
          </p>
        </div>
        <Button href="/apply" variant="primary">
          New Application
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">You haven't submitted any applications yet.</p>
          <Button href="/apply" variant="primary">
            Start New Application
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(application => {
            const programName = application.program_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const formData = application.form_data || {};
            const fullName = formData.fullName || formData.firstName + ' ' + formData.lastName || 'N/A';
            
            return (
              <div key={application.id} className="bg-white p-6 rounded-card shadow-soft">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    {getStatusIcon(application.status)}
                    <div>
                      <h3 className="text-xl font-bold text-navy-ink mb-1">
                        {programName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Submitted on {new Date(application.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Payment Status: <span className={`font-medium ${
                          application.payment_status === 'confirmed' ? 'text-green-600' :
                          application.payment_status === 'pending' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {application.payment_status?.charAt(0).toUpperCase() + application.payment_status?.slice(1) || 'N/A'}
                        </span>
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(application.status)}
                </div>
                {application.updated_at && (
                  <p className="text-sm text-gray-600 mb-4">
                    Last updated: {new Date(application.updated_at).toLocaleDateString()}
                  </p>
                )}
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDetails(application)}
                  >
                    <Eye className="mr-2" size={16} />
                    View Details
                  </Button>
                  {application.status === 'pending' && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => handleEdit(application)}
                    >
                      <Edit className="mr-2" size={16} />
                      Edit Application
                    </Button>
                  )}
                  {application.status === 'approved' && (
                    <Button variant="primary" size="sm">
                      Accept Offer
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-navy-ink">
                Application Details
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-navy-ink">
                      {selectedApplication.program_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Submitted: {new Date(selectedApplication.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedApplication.status)}
                </div>
              </div>

              {/* Form Data */}
              {selectedApplication.form_data && renderFormData(selectedApplication.form_data)}

              {/* Documents */}
              {(selectedApplication.id_passport_url || selectedApplication.payment_proof_url) && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-navy-ink mb-3">Uploaded Documents</h3>
                  <div className="space-y-2">
                    {selectedApplication.id_passport_url && (
                      <div>
                        <span className="font-medium text-gray-700">ID/Passport: </span>
                        <a
                          href={selectedApplication.id_passport_key 
                            ? getStorageUrl('applications', selectedApplication.id_passport_key)
                            : selectedApplication.id_passport_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                    {selectedApplication.payment_proof_url && (
                      <div>
                        <span className="font-medium text-gray-700">Payment Proof: </span>
                        <a
                          href={selectedApplication.payment_proof_key
                            ? getStorageUrl('applications', selectedApplication.payment_proof_key)
                            : selectedApplication.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                {selectedApplication.status === 'pending' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedApplication);
                    }}
                  >
                    <Edit className="mr-2" size={16} />
                    Edit Application
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
