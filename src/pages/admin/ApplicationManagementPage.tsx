import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Eye, Clock, Download, FileText, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { sendEmailNotification } from '../../lib/email';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ApplicationManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'bible_school' | 'membership'>('all');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    bibleSchool: 0,
    membership: 0,
    totalUsers: 0,
    approvedMembers: 0,
    bibleSchoolStudents: 0
  });

  useEffect(() => {
    fetchApplications();
    fetchStatistics();
  }, [filterStatus, activeTab]);

  const fetchStatistics = async () => {
    try {
      const [usersRes, approvedMembersRes, bibleSchoolStudentsRes] = await Promise.all([
        insforge.database.from('user_profiles').select('id', { count: 'exact', head: true }),
        insforge.database
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('program_type', 'membership')
          .eq('status', 'approved'),
        insforge.database
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('program_type', 'bible_school')
          .eq('status', 'approved')
      ]);

      setStats(prev => ({
        ...prev,
        totalUsers: usersRes.count || 0,
        approvedMembers: approvedMembersRes.count || 0,
        bibleSchoolStudents: bibleSchoolStudentsRes.count || 0
      }));
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = insforge.database
        .from('applications')
        .select('*, programs(title)')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      // Apply tab filter
      if (activeTab === 'pending') {
        filteredData = filteredData.filter((a: any) => a.status === 'pending');
      } else if (activeTab === 'approved') {
        filteredData = filteredData.filter((a: any) => a.status === 'approved');
      } else if (activeTab === 'rejected') {
        filteredData = filteredData.filter((a: any) => a.status === 'rejected');
      } else if (activeTab === 'bible_school') {
        filteredData = filteredData.filter((a: any) => a.program_type === 'bible_school');
      } else if (activeTab === 'membership') {
        filteredData = filteredData.filter((a: any) => a.program_type === 'membership');
      }

      setApplications(filteredData);

      // Calculate stats from all data
      const allData = data || [];
      const pending = allData.filter((a: any) => a.status === 'pending').length || 0;
      const approved = allData.filter((a: any) => a.status === 'approved').length || 0;
      const rejected = allData.filter((a: any) => a.status === 'rejected').length || 0;
      const bibleSchool = allData.filter((a: any) => a.program_type === 'bible_school').length || 0;
      const membership = allData.filter((a: any) => a.program_type === 'membership').length || 0;

      setStats(prev => ({
        ...prev,
        pending,
        approved,
        rejected,
        total: allData.length,
        bibleSchool,
        membership
      }));
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      await insforge.database
        .from('applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      // Create notification
      const app = applications.find(a => a.id === applicationId);
      if (app) {
        const notification = {
          user_id: app.user_id,
          type: 'application',
          title: `Application ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your application for ${app.programs?.title || app.program_type} has been ${newStatus}.`,
          related_id: applicationId
        };

        await insforge.database
          .from('notifications')
          .insert([notification]);

        // Send email notification
        await sendEmailNotification(app.user_id, {
          type: `application_${newStatus}`,
          subject: notification.title,
          message: notification.message
        });
      }

      fetchApplications();
    } catch (err) {
      console.error('Error updating application:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Program', 'Status', 'Payment Status', 'Date'];
    const rows = applications.map(app => [
      app.full_name,
      app.email,
      app.phone,
      app.programs?.title || app.program_type,
      app.status,
      app.payment_status,
      new Date(app.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = (application: any) => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const maxWidth = 180;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(27, 28, 95); // navy-ink
    doc.text('Christian Leadership Movement', margin, yPos);
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${application.program_type === 'membership' ? 'CLM Membership' : 'Bible School / Ordination'} Application Details`, margin, yPos);
    yPos += 10;

    // Helper function to add section
    const addSection = (title: string, data: Array<[string, any]>) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPos);
      yPos += 8;
      doc.setFont(undefined, 'normal');
      
      data.forEach(([label, value]) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : 'N/A';
        doc.setFont(undefined, 'bold');
        doc.text(label, margin, yPos);
        doc.setFont(undefined, 'normal');
        const valueLines = doc.splitTextToSize(displayValue, maxWidth - 60);
        doc.text(valueLines, margin + 60, yPos);
        yPos += valueLines.length * 7;
      });
      yPos += 5;
    };

    // Personal Information
    const personalInfo: Array<[string, any]> = [
      ['Full Name:', application.full_name],
      ['First Name:', application.first_name],
      ['Middle Name:', application.middle_name],
      ['Last Name:', application.last_name],
      ['Preferred Name:', application.preferred_name],
      ['Title:', application.title],
      ['ID Number:', application.id_number],
      ['Nationality:', application.nationality],
      ['Email:', application.email],
      ['Phone:', application.phone],
      ['Contact Number:', application.contact_number],
      ['Date of Birth:', application.date_of_birth],
      ['Gender:', application.gender],
      ['Marital Status:', application.marital_status],
      ['Province:', application.province],
      ['City:', application.city],
      ['Postal Code:', application.postal_code],
      ['Physical Address:', application.physical_address || application.address],
      ['Country:', application.country],
      ['Residential Status:', application.residential_status],
      ['Home Language:', application.home_language],
      ['Population Group:', application.population_group]
    ].filter(([_, value]) => value);

    addSection('Personal Information', personalInfo);

    // Disability Information (Membership)
    if (application.disabilities && Array.isArray(application.disabilities) && application.disabilities.length > 0) {
      addSection('Disability Information', [['Disabilities:', application.disabilities.join(', ')]]);
    }

    // Spiritual Background (Bible School)
    if (application.program_type === 'bible_school') {
      const spiritualInfo: Array<[string, any]> = [
        ['Date Accepted Christ:', application.date_accepted_christ],
        ['Baptized:', application.is_baptized ? 'Yes' : 'No'],
        ['Baptism Date:', application.baptism_date],
        ['Attends Local Church:', application.attends_local_church ? 'Yes' : 'No'],
        ['Church Name:', application.church_name],
        ['Denomination:', application.denomination],
        ['Pastor Name:', application.pastor_name],
        ['Serves in Ministry:', application.serves_in_ministry ? 'Yes' : 'No'],
        ['Ministry Service Description:', application.ministry_service_description]
      ].filter(([_, value]) => value && value !== 'No');
      if (spiritualInfo.length > 0) {
        addSection('Spiritual Background', spiritualInfo);
      }
    }

    // Ministry Involvement (Membership)
    if (application.program_type === 'membership') {
      const ministryInfo: Array<[string, any]> = [
        ['Current Ministry Name:', application.current_ministry_name],
        ['Denomination:', application.denomination],
        ['Ministry Types:', Array.isArray(application.ministry_types) ? application.ministry_types.join(', ') : application.ministry_types],
        ['Ministry Position:', application.ministry_position],
        ['Ministry Website:', application.ministry_website],
        ['Years Part-Time Ministry:', application.years_part_time],
        ['Years Full-Time Ministry:', application.years_full_time],
        ['Primary Income Source:', application.primary_income_source],
        ['Primary Income Other:', application.primary_income_other]
      ].filter(([_, value]) => value);
      if (ministryInfo.length > 0) {
        addSection('Ministry Involvement', ministryInfo);
      }
    }

    // Leadership Interests (Bible School)
    if (application.program_type === 'bible_school') {
      const leadershipInfo: Array<[string, any]> = [
        ['Why Join Bible School:', application.why_join_bible_school],
        ['Previous Leadership Experience:', application.previous_leadership_experience]
      ].filter(([_, value]) => value);
      if (leadershipInfo.length > 0) {
        addSection('Leadership Interests', leadershipInfo);
      }

      // Leadership Roles
      if (application.leadership_roles && Array.isArray(application.leadership_roles) && application.leadership_roles.length > 0) {
        yPos += 5;
        doc.setFont(undefined, 'bold');
        doc.text('Leadership Roles:', margin, yPos);
        yPos += 8;
        application.leadership_roles.forEach((role: any, idx: number) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${role.title || 'Untitled'}`, margin, yPos);
          yPos += 7;
          doc.setFont(undefined, 'normal');
          const descLines = doc.splitTextToSize(role.description || 'N/A', maxWidth);
          doc.text(descLines, margin + 10, yPos);
          yPos += descLines.length * 7 + 3;
        });
      }
    }

    // Vision & Calling (Bible School)
    if (application.program_type === 'bible_school') {
      const visionInfo: Array<[string, any]> = [
        ['Calling Statement:', application.calling_statement],
        ['Leadership Ambitions:', application.leadership_ambitions]
      ].filter(([_, value]) => value);
      if (visionInfo.length > 0) {
        addSection('Vision & Calling', visionInfo);
      }
    }

    // Qualifications (Membership)
    if (application.program_type === 'membership') {
      const qualInfo: Array<[string, any]> = [
        ['High School:', application.high_school],
        ['Highest Ministry Qualification:', application.highest_ministry_qualification],
        ['Highest Other Qualification:', application.highest_other_qualification],
        ['Other Training:', application.other_training]
      ].filter(([_, value]) => value);
      if (qualInfo.length > 0) {
        addSection('Qualifications', qualInfo);
      }
    }

    // Reference Information
    const refInfo: Array<[string, any]> = [
      ['Referee Name:', application.referee_name],
      ['Reference First Name:', application.reference_first_name],
      ['Reference Last Name:', application.reference_last_name],
      ['Reference Contact:', application.referee_contact || application.reference_contact],
      ['Reference Email:', application.reference_email],
      ['Reference Title:', application.reference_title],
      ['Relationship to Referee:', application.relationship_to_referee]
    ].filter(([_, value]) => value);
    if (refInfo.length > 0) {
      addSection('Reference Information', refInfo);
    }

    // Registration & Payment (Bible School)
    if (application.program_type === 'bible_school') {
      addSection('Registration & Payment', [
        ['Registration Option:', application.registration_option?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())]
      ]);
    }

    // Declaration
    addSection('Declaration', [
      ['Signature:', application.signature],
      ['Declaration Date:', application.declaration_date]
    ]);

    // Program Information
    addSection('Application Status', [
      ['Program Type:', application.program_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())],
      ['Program:', application.programs?.title || 'N/A'],
      ['Status:', application.status],
      ['Payment Status:', application.payment_status],
      ['Submitted:', new Date(application.created_at).toLocaleDateString()],
      ['Last Updated:', application.updated_at ? new Date(application.updated_at).toLocaleDateString() : 'N/A']
    ]);

    // Save PDF
    const fileName = `application_${(application.full_name || 'unknown').replace(/[^a-z0-9]/gi, '_')}_${application.id}.pdf`;
    doc.save(fileName);
  };
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <span className={`px-2 py-1 text-sm rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>;
  };
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">
          Application Management
        </h1>
        <p className="text-gray-600">Review and process program applications</p>
      </div>
      {/* Statistics Overview */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Statistics Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-muted-gray p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Total Users</p>
            <p className="text-2xl font-bold text-navy-ink">{stats.totalUsers}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Pending Apps</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Bible School</p>
            <p className="text-2xl font-bold text-blue-600">{stats.bibleSchool}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Membership</p>
            <p className="text-2xl font-bold text-purple-600">{stats.membership}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Approved Members</p>
            <p className="text-2xl font-bold text-green-600">{stats.approvedMembers}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-card">
            <p className="text-gray-600 text-xs mb-1">Bible School Students</p>
            <p className="text-2xl font-bold text-blue-600">{stats.bibleSchoolStudents}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'all' ? 'bg-gold text-white' : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            All Applications ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium relative ${
              activeTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Pending ({stats.pending})
            {stats.pending > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {stats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'approved' ? 'bg-green-500 text-white' : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Approved ({stats.approved})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'rejected' ? 'bg-red-500 text-white' : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Rejected ({stats.rejected})
          </button>
          <button
            onClick={() => setActiveTab('bible_school')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'bible_school' ? 'bg-blue-500 text-white' : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Bible School ({stats.bibleSchool})
          </button>
          <button
            onClick={() => setActiveTab('membership')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'membership' ? 'bg-purple-500 text-white' : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Membership ({stats.membership})
          </button>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search applications..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button variant="outline" onClick={exportToCSV}>
            <Download size={20} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      {/* Applications Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Program
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    No applications found
                  </td>
                </tr>
              ) : (
                applications
                  .filter(app => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      app.full_name?.toLowerCase().includes(search) ||
                      app.email?.toLowerCase().includes(search) ||
                      app.programs?.title?.toLowerCase().includes(search)
                    );
                  })
                  .map(app => (
                    <tr key={app.id} className="hover:bg-muted-gray/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold mr-3">
                            {app.full_name?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <p className="font-medium text-navy-ink">
                              {app.full_name}
                        </p>
                        <p className="text-sm text-gray-600">{app.email}</p>
                      </div>
                    </div>
                  </td>
                      <td className="px-6 py-4 text-gray-600">
                        {app.programs?.title || app.program_type}
                      </td>
                  <td className="px-6 py-4 text-gray-600">
                        {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          app.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          app.payment_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {app.payment_status}
                        </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                          <button
                            onClick={() => exportToPDF(app)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-card"
                            title="Download PDF"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApplication(app);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(app.id, 'approved')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-card"
                                title="Approve"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(app.id, 'rejected')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-card"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                    </div>
                  </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-navy-ink">
                Application Details - {selectedApplication.full_name}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedApplication(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal Information - Complete */}
              <div>
                <h3 className="text-lg font-bold text-navy-ink mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">{selectedApplication.full_name || 'N/A'}</p>
                  </div>
                  {selectedApplication.program_type === 'membership' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Title</p>
                        <p className="font-medium">{selectedApplication.title || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">First Name</p>
                        <p className="font-medium">{selectedApplication.first_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Middle Name</p>
                        <p className="font-medium">{selectedApplication.middle_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Name</p>
                        <p className="font-medium">{selectedApplication.last_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Initials</p>
                        <p className="font-medium">{selectedApplication.initials || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Preferred Name</p>
                        <p className="font-medium">{selectedApplication.preferred_name || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">ID Number</p>
                    <p className="font-medium">{selectedApplication.id_number || 'N/A'}</p>
                  </div>
                  {selectedApplication.program_type === 'membership' && (
                    <div>
                      <p className="text-sm text-gray-600">Nationality</p>
                      <p className="font-medium">{selectedApplication.nationality || 'N/A'}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedApplication.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone / Contact Number</p>
                    <p className="font-medium">{selectedApplication.phone || selectedApplication.contact_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">{selectedApplication.date_of_birth ? new Date(selectedApplication.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-medium">{selectedApplication.gender || 'N/A'}</p>
                  </div>
                  {selectedApplication.program_type === 'bible_school' && (
                    <div>
                      <p className="text-sm text-gray-600">Marital Status</p>
                      <p className="font-medium">{selectedApplication.marital_status || 'N/A'}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Province</p>
                    <p className="font-medium">{selectedApplication.province || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium">{selectedApplication.city || 'N/A'}</p>
                  </div>
                  {selectedApplication.program_type === 'membership' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Postal Code</p>
                        <p className="font-medium">{selectedApplication.postal_code || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Residential Status</p>
                        <p className="font-medium">{selectedApplication.residential_status || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Home Language</p>
                        <p className="font-medium">{selectedApplication.home_language || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Population Group</p>
                        <p className="font-medium">{selectedApplication.population_group || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Physical Address</p>
                    <p className="font-medium">{selectedApplication.physical_address || selectedApplication.address || 'N/A'}</p>
                  </div>
                  {selectedApplication.program_type === 'bible_school' && (
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-medium">{selectedApplication.country || 'N/A'}</p>
                    </div>
                  )}
                  {selectedApplication.program_type === 'membership' && selectedApplication.disabilities && Array.isArray(selectedApplication.disabilities) && selectedApplication.disabilities.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Disabilities</p>
                      <p className="font-medium">{selectedApplication.disabilities.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Spiritual Background - Bible School Only */}
              {selectedApplication.program_type === 'bible_school' && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Spiritual Background</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Date Accepted Christ</p>
                      <p className="font-medium">{selectedApplication.date_accepted_christ ? new Date(selectedApplication.date_accepted_christ).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Baptized</p>
                      <p className="font-medium">{selectedApplication.is_baptized ? 'Yes' : 'No'}</p>
                    </div>
                    {selectedApplication.is_baptized && (
                      <div>
                        <p className="text-sm text-gray-600">Baptism Date</p>
                        <p className="font-medium">{selectedApplication.baptism_date ? new Date(selectedApplication.baptism_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Attends Local Church</p>
                      <p className="font-medium">{selectedApplication.attends_local_church ? 'Yes' : 'No'}</p>
                    </div>
                    {selectedApplication.attends_local_church && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Church Name</p>
                          <p className="font-medium">{selectedApplication.church_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Denomination</p>
                          <p className="font-medium">{selectedApplication.denomination || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pastor Name</p>
                          <p className="font-medium">{selectedApplication.pastor_name || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Serves in Ministry</p>
                      <p className="font-medium">{selectedApplication.serves_in_ministry ? 'Yes' : 'No'}</p>
                    </div>
                    {selectedApplication.serves_in_ministry && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Ministry Service Description</p>
                        <p className="font-medium">{selectedApplication.ministry_service_description || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Leadership Interests - Bible School Only */}
              {selectedApplication.program_type === 'bible_school' && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Leadership Interests</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedApplication.why_join_bible_school && (
                      <div>
                        <p className="text-sm text-gray-600">Why Join Bible School</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedApplication.why_join_bible_school}</p>
                      </div>
                    )}
                    {selectedApplication.previous_leadership_experience && (
                      <div>
                        <p className="text-sm text-gray-600">Previous Leadership Experience</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedApplication.previous_leadership_experience}</p>
                      </div>
                    )}
                    {selectedApplication.leadership_roles && Array.isArray(selectedApplication.leadership_roles) && selectedApplication.leadership_roles.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Leadership Roles</p>
                        <div className="space-y-2">
                          {selectedApplication.leadership_roles.map((role: any, idx: number) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium">{role.title || `Role ${idx + 1}`}</p>
                              {role.description && <p className="text-sm text-gray-600 mt-1">{role.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vision & Calling - Bible School Only */}
              {selectedApplication.program_type === 'bible_school' && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Vision & Calling</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedApplication.calling_statement && (
                      <div>
                        <p className="text-sm text-gray-600">Calling Statement</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedApplication.calling_statement}</p>
                      </div>
                    )}
                    {selectedApplication.leadership_ambitions && (
                      <div>
                        <p className="text-sm text-gray-600">Leadership Ambitions</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedApplication.leadership_ambitions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ministry Involvement - Membership Only */}
              {selectedApplication.program_type === 'membership' && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Ministry Involvement</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Current Ministry Name</p>
                      <p className="font-medium">{selectedApplication.current_ministry_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Denomination</p>
                      <p className="font-medium">{selectedApplication.denomination || 'N/A'}</p>
                    </div>
                    {selectedApplication.ministry_types && Array.isArray(selectedApplication.ministry_types) && selectedApplication.ministry_types.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Ministry Types</p>
                        <p className="font-medium">{selectedApplication.ministry_types.join(', ')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Ministry Position</p>
                      <p className="font-medium">{selectedApplication.ministry_position || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ministry Website</p>
                      <p className="font-medium">{selectedApplication.ministry_website ? (
                        <a href={selectedApplication.ministry_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedApplication.ministry_website}
                        </a>
                      ) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Years Part-Time Ministry</p>
                      <p className="font-medium">{selectedApplication.years_part_time || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Years Full-Time Ministry</p>
                      <p className="font-medium">{selectedApplication.years_full_time || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Primary Income Source</p>
                      <p className="font-medium">{selectedApplication.primary_income_source || 'N/A'}</p>
                    </div>
                    {selectedApplication.primary_income_other && (
                      <div>
                        <p className="text-sm text-gray-600">Primary Income Other</p>
                        <p className="font-medium">{selectedApplication.primary_income_other}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Qualifications - Membership Only */}
              {selectedApplication.program_type === 'membership' && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Qualifications</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">High School</p>
                      <p className="font-medium">{selectedApplication.high_school || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Highest Ministry Qualification</p>
                      <p className="font-medium">{selectedApplication.highest_ministry_qualification || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Highest Other Qualification</p>
                      <p className="font-medium">{selectedApplication.highest_other_qualification || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Other Training</p>
                      <p className="font-medium">{selectedApplication.other_training || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Information - Complete */}
              {(selectedApplication.referee_name || selectedApplication.reference_first_name || selectedApplication.reference_contact) && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Reference Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedApplication.program_type === 'bible_school' ? (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Referee Name</p>
                          <p className="font-medium">{selectedApplication.referee_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Referee Contact</p>
                          <p className="font-medium">{selectedApplication.referee_contact || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Relationship to Referee</p>
                          <p className="font-medium">{selectedApplication.relationship_to_referee || 'N/A'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Reference First Name</p>
                          <p className="font-medium">{selectedApplication.reference_first_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Reference Last Name</p>
                          <p className="font-medium">{selectedApplication.reference_last_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Reference Contact</p>
                          <p className="font-medium">{selectedApplication.reference_contact || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Reference Email</p>
                          <p className="font-medium">{selectedApplication.reference_email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Reference Title</p>
                          <p className="font-medium">{selectedApplication.reference_title || 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Registration Option - Bible School Only */}
              {selectedApplication.program_type === 'bible_school' && selectedApplication.registration_option && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Registration & Payment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Registration Option</p>
                      <p className="font-medium">{selectedApplication.registration_option?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Program Information */}
              <div>
                <h3 className="text-lg font-bold text-navy-ink mb-4">Application Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Program Type</p>
                    <p className="font-medium">{selectedApplication.program_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Program</p>
                    <p className="font-medium">{selectedApplication.programs?.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium">{getStatusBadge(selectedApplication.status)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedApplication.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      selectedApplication.payment_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedApplication.payment_status || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              {selectedApplication.documents && (
                <div>
                  <h3 className="text-lg font-bold text-navy-ink mb-4">Documents</h3>
                  <div className="space-y-2">
                    {Array.isArray(selectedApplication.documents) ? (
                      selectedApplication.documents.map((doc: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{doc.name || doc.filename || `Document ${idx + 1}`}</span>
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              View
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">Documents available in PDF export</p>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="text-lg font-bold text-navy-ink mb-4">Timestamps</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-medium">{new Date(selectedApplication.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="font-medium">{selectedApplication.updated_at ? new Date(selectedApplication.updated_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => exportToPDF(selectedApplication)}
                >
                  <FileText size={18} className="mr-2" />
                  Download PDF
                </Button>
                {selectedApplication.status === 'pending' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleStatusChange(selectedApplication.id, 'approved');
                        setShowDetailsModal(false);
                      }}
                    >
                      <CheckCircle size={18} className="mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleStatusChange(selectedApplication.id, 'rejected');
                        setShowDetailsModal(false);
                      }}
                    >
                      <XCircle size={18} className="mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>;
}