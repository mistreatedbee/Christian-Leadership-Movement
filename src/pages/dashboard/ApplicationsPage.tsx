import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';

interface Application {
  id: string;
  program_type: string;
  full_name: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;
  program_id: string | null;
}

export function ApplicationsPage() {
  const { user, isLoaded } = useUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchData = async () => {
      try {
        // Fetch applications
        const { data: apps, error: appsError } = await insforge.database
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (appsError) throw appsError;
        setApplications(apps || []);

        // Fetch programs for display
        if (apps && apps.length > 0) {
          const programIds = apps.filter(a => a.program_id).map(a => a.program_id);
          if (programIds.length > 0) {
            const { data: progs } = await insforge.database
              .from('programs')
              .select('*')
              .in('id', programIds);
            
            const progMap: Record<string, any> = {};
            progs?.forEach((p: any) => {
              progMap[p.id] = p;
            });
            setPrograms(progMap);
          }
        }
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
  return <div className="space-y-6">
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
            const program = application.program_id ? programs[application.program_id] : null;
            const programName = program?.title || application.program_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
                    Submitted on{' '}
                        {new Date(application.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Payment Status: <span className={`font-medium ${
                          application.payment_status === 'confirmed' ? 'text-green-600' :
                          application.payment_status === 'pending' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {application.payment_status.charAt(0).toUpperCase() + application.payment_status.slice(1)}
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
              <Button variant="outline" size="sm">
                View Details
              </Button>
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
    </div>;
}