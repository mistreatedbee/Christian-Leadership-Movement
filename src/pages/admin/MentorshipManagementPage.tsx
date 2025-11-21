import React, { useEffect, useState } from 'react';
import { Users, Target, Search, CheckCircle, XCircle, Plus, Link as LinkIcon, Eye, Trash2 } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface MentorshipProgram {
  id: string;
  name: string;
  description?: string;
  duration_months?: number;
  is_active: boolean;
}

interface Mentor {
  id: string;
  user_id: string;
  program_id?: string;
  expertise_areas?: string[];
  status: string;
  max_mentees: number;
  current_mentees: number;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

interface Mentee {
  id: string;
  user_id: string;
  program_id?: string;
  goals?: string;
  status: string;
  users?: {
    id: string;
    nickname?: string;
    email?: string;
  };
}

interface MentorshipMatch {
  id: string;
  mentor_id: string;
  mentee_id: string;
  program_id?: string;
  status: string;
  start_date: string;
  mentors?: Mentor;
  mentees?: Mentee;
}

export function MentorshipManagementPage() {
  const [programs, setPrograms] = useState<MentorshipProgram[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'programs' | 'mentors' | 'mentees' | 'matches' | 'pending-mentors'>('pending-mentors');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [showMentorDetails, setShowMentorDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [programsRes, mentorsRes, menteesRes, matchesRes] = await Promise.all([
        insforge.database
          .from('mentorship_programs')
          .select('*')
          .order('created_at', { ascending: false }),
        (() => {
          let query = insforge.database
            .from('mentors')
            .select('*, users(*)')
            .order('created_at', { ascending: false });
          
          if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
          }
          return query;
        })(),
        insforge.database
          .from('mentees')
          .select('*, users(*)')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('mentorship_matches')
          .select('*, mentors(*, users(*)), mentees(*, users(*))')
          .order('start_date', { ascending: false })
      ]);

      setPrograms(programsRes.data || []);
      setMentors(mentorsRes.data || []);
      setMentees(menteesRes.data || []);
      setMatches(matchesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMatch = async (mentorId: string, menteeId: string) => {
    try {
      const mentor = mentors.find(m => m.id === mentorId);
      if (mentor && mentor.current_mentees >= mentor.max_mentees) {
        alert('Mentor has reached maximum mentees');
        return;
      }

      await insforge.database
        .from('mentorship_matches')
        .insert({
          mentor_id: mentorId,
          mentee_id: menteeId,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0]
        });

      // Update mentor current_mentees count
      await insforge.database
        .from('mentors')
        .update({ current_mentees: (mentor?.current_mentees || 0) + 1 })
        .eq('id', mentorId);

      // Update mentee status
      await insforge.database
        .from('mentees')
        .update({ status: 'matched' })
        .eq('id', menteeId);

      fetchData();
      alert('Mentorship match created successfully!');
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Error creating match');
    }
  };

  const updateMatchStatus = async (matchId: string, status: string) => {
    try {
      await insforge.database
        .from('mentorship_matches')
        .update({ status, end_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null })
        .eq('id', matchId);
      fetchData();
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  const approveMentor = async (mentorId: string) => {
    if (!confirm('Approve this mentor application? They will become available for matching.')) {
      return;
    }

    try {
      await insforge.database
        .from('mentors')
        .update({ status: 'available' })
        .eq('id', mentorId);
      
      fetchData();
      alert('Mentor approved successfully!');
    } catch (error) {
      console.error('Error approving mentor:', error);
      alert('Failed to approve mentor');
    }
  };

  const rejectMentor = async (mentorId: string) => {
    if (!confirm('Reject this mentor application? This action can be undone later.')) {
      return;
    }

    try {
      await insforge.database
        .from('mentors')
        .update({ status: 'rejected' })
        .eq('id', mentorId);
      
      fetchData();
      alert('Mentor application rejected.');
    } catch (error) {
      console.error('Error rejecting mentor:', error);
      alert('Failed to reject mentor');
    }
  };

  const deleteMentor = async (mentorId: string) => {
    if (!confirm('Are you sure you want to delete this mentor application? This action cannot be undone.')) {
      return;
    }

    try {
      await insforge.database
        .from('mentors')
        .delete()
        .eq('id', mentorId);
      
      fetchData();
      alert('Mentor application deleted.');
    } catch (error) {
      console.error('Error deleting mentor:', error);
      alert('Failed to delete mentor');
    }
  };

  const updateMentorStatus = async (mentorId: string, newStatus: string) => {
    try {
      await insforge.database
        .from('mentors')
        .update({ status: newStatus })
        .eq('id', mentorId);
      
      fetchData();
    } catch (error) {
      console.error('Error updating mentor status:', error);
      alert('Failed to update mentor status');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading mentorship data...</p>
      </div>
    );
  }

  const filteredMentors = mentors.filter(m => {
    const matchesSearch = m.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const pendingMentors = mentors.filter(m => m.status === 'pending');
  const approvedMentors = mentors.filter(m => m.status === 'available' || m.status === 'full');

  const filteredMentees = mentees.filter(m =>
    m.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.status === 'seeking'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Mentorship Management</h1>
        <p className="text-gray-600">Manage mentorship programs, mentors, mentees, and matches</p>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('pending-mentors');
                setSearchTerm('');
                setFilterStatus('pending');
              }}
              className={`px-4 py-2 rounded-lg font-medium relative ${
                activeTab === 'pending-mentors'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Pending Approval
              {pendingMentors.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingMentors.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('programs');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'programs'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Programs ({programs.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('mentors');
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'mentors'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              All Mentors ({mentors.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('mentees');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'mentees'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Mentees ({mentees.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('matches');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'matches'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Matches ({matches.length})
            </button>
          </div>
          <div className="flex gap-2 flex-1 max-w-md ml-4">
            {activeTab === 'mentors' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="available">Available</option>
                <option value="full">Full</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Mentors Tab */}
      {activeTab === 'pending-mentors' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-navy-ink">Pending Mentor Applications</h2>
            <p className="text-sm text-gray-600 mt-1">Review and approve new mentor applications</p>
          </div>
          {pendingMentors.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-gray-600">No pending mentor applications</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingMentors.map((mentor) => (
                <div key={mentor.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-navy-ink">
                          {mentor.users?.nickname || mentor.users?.email || 'Unknown User'}
                        </h3>
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                          Pending Approval
                        </span>
                      </div>
                      
                      {mentor.bio && (
                        <p className="text-gray-600 mb-3">{mentor.bio}</p>
                      )}
                      
                      {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Expertise Areas:</p>
                          <div className="flex flex-wrap gap-2">
                            {mentor.expertise_areas.map((area, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Max Mentees: {mentor.max_mentees}</span>
                        <span>Applied: {new Date(mentor.created_at || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => approveMentor(mentor.id)}
                        variant="primary"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectMentor(mentor.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedMentor(mentor);
                          setShowMentorDetails(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-navy-ink">Mentorship Programs</h2>
          </div>
          <div className="divide-y">
            {programs.map((program) => (
              <div key={program.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-navy-ink mb-2">{program.name}</h3>
                    {program.description && (
                      <p className="text-gray-600 mb-2">{program.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {program.duration_months && (
                        <span>Duration: {program.duration_months} months</span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        program.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {program.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mentors Tab */}
      {activeTab === 'mentors' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">Mentor</th>
                  <th className="text-left py-3 px-6">Expertise</th>
                  <th className="text-left py-3 px-6">Mentees</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMentors.map((mentor) => (
                  <tr key={mentor.id} className="border-b">
                    <td className="py-4 px-6">
                      {mentor.users?.nickname || mentor.users?.email || 'Unknown'}
                    </td>
                    <td className="py-4 px-6">
                      {mentor.expertise_areas && mentor.expertise_areas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {mentor.expertise_areas.slice(0, 2).map((area, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {area}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No expertise listed</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {mentor.current_mentees} / {mentor.max_mentees}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={mentor.status}
                        onChange={(e) => updateMentorStatus(mentor.id, e.target.value)}
                        className={`px-2 py-1 text-xs rounded border ${
                          mentor.status === 'available' ? 'bg-green-100 text-green-800 border-green-300' :
                          mentor.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          mentor.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                          mentor.status === 'full' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="available">Available</option>
                        <option value="full">Full</option>
                        <option value="inactive">Inactive</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {mentor.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => approveMentor(mentor.id)}
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => rejectMentor(mentor.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => deleteMentor(mentor.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mentees Tab */}
      {activeTab === 'mentees' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">Mentee</th>
                  <th className="text-left py-3 px-6">Goals</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMentees.map((mentee) => (
                  <tr key={mentee.id} className="border-b">
                    <td className="py-4 px-6">
                      {mentee.users?.nickname || mentee.users?.email || 'Unknown'}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {mentee.goals || 'No goals specified'}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        mentee.status === 'matched' ? 'bg-green-100 text-green-800' :
                        mentee.status === 'seeking' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {mentee.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {mentee.status === 'seeking' && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              createMatch(e.target.value, mentee.id);
                            }
                          }}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                          defaultValue=""
                        >
                          <option value="">Match with mentor...</option>
                          {mentors
                            .filter(m => m.status === 'available' && m.current_mentees < m.max_mentees)
                            .map((mentor) => (
                              <option key={mentor.id} value={mentor.id}>
                                {mentor.users?.nickname || mentor.users?.email}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y">
            {matches.map((match) => (
              <div key={match.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <p className="font-semibold text-navy-ink">Mentor</p>
                        <p className="text-sm text-gray-600">
                          {match.mentors?.users?.nickname || match.mentors?.users?.email || 'Unknown'}
                        </p>
                      </div>
                      <LinkIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-semibold text-navy-ink">Mentee</p>
                        <p className="text-sm text-gray-600">
                          {match.mentees?.users?.nickname || match.mentees?.users?.email || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Started: {new Date(match.start_date).toLocaleDateString()}
                      {match.end_date && (
                        <span> • Ended: {new Date(match.end_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      match.status === 'active' ? 'bg-green-100 text-green-800' :
                      match.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {match.status}
                    </span>
                    {match.status === 'active' && (
                      <Button
                        onClick={() => updateMatchStatus(match.id, 'completed')}
                        variant="outline"
                        size="sm"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {matches.length === 0 && (
            <div className="p-12 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No matches yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

