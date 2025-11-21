import React, { useEffect, useState } from 'react';
import { Award, Download, CheckCircle, Clock } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Certificate {
  id: string;
  user_id: string;
  course_id: string | null;
  course_name: string | null;
  certificate_number: string;
  issued_date: string;
  status: 'issued' | 'pending';
  certificate_url: string | null;
}

export function CertificatesPage() {
  const { user, isLoaded } = useUser();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchCertificates = async () => {
      try {
        // Fetch certificates for the user
        // Note: You'll need to create a certificates table in your database
        // For now, we'll check if there's a table or use course completions
        const { data, error } = await insforge.database
          .from('certificates')
          .select(`
            *,
            courses:course_id (
              title
            )
          `)
          .eq('user_id', user.id)
          .order('issued_date', { ascending: false });

        if (error) {
          // If table doesn't exist, show empty state
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.log('Certificates table not found, showing empty state');
            setCertificates([]);
          } else {
            throw error;
          }
        } else {
          const formattedCertificates = (data || []).map((cert: any) => ({
            id: cert.id,
            user_id: cert.user_id,
            course_id: cert.course_id,
            course_name: cert.courses?.title || cert.course_name || 'Course Completion',
            certificate_number: cert.certificate_number || `CLM-${cert.id.slice(0, 8).toUpperCase()}`,
            issued_date: cert.issued_date || cert.created_at,
            status: cert.status || 'issued',
            certificate_url: cert.certificate_url
          }));
          setCertificates(formattedCertificates);
        }
      } catch (err: any) {
        console.error('Error fetching certificates:', err);
        // Show empty state on error
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [user, isLoaded]);

  const handleDownload = async (certificate: Certificate) => {
    if (certificate.certificate_url) {
      // Open certificate URL in new tab
      window.open(certificate.certificate_url, '_blank');
    } else {
      // Generate or download certificate
      alert('Certificate download feature coming soon!');
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading certificates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">My Certificates</h1>
        <p className="text-gray-600">View and download your course completion certificates</p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-card shadow-soft p-12 text-center">
          <Award className="mx-auto text-gray-400 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-navy-ink mb-2">No Certificates Yet</h2>
          <p className="text-gray-600 mb-6">
            Complete courses to earn certificates. Your certificates will appear here once issued.
          </p>
          <Button href="/dashboard/courses" variant="primary">
            Browse Courses
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <div
              key={certificate.id}
              className="bg-white rounded-card shadow-soft p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-gold/10 p-3 rounded-full">
                  <Award className="text-gold" size={32} />
                </div>
                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    certificate.status === 'issued'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {certificate.status === 'issued' ? (
                    <span className="flex items-center">
                      <CheckCircle size={12} className="mr-1" />
                      Issued
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      Pending
                    </span>
                  )}
                </span>
              </div>

              <h3 className="text-lg font-bold text-navy-ink mb-2">
                {certificate.course_name}
              </h3>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Certificate #:</span>{' '}
                  {certificate.certificate_number}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Issued:</span>{' '}
                  {new Date(certificate.issued_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {certificate.status === 'issued' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleDownload(certificate)}
                >
                  <Download size={18} className="mr-2" />
                  Download Certificate
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

