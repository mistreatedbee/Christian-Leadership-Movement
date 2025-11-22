import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Target, Calendar, MessageSquare, CheckCircle, Plus, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

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
  bio?: string;
  max_mentees: number;
  current_mentees: number;
  status: string;
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
  areas_of_interest?: string[];
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
  end_date?: string;
  mentors?: Mentor;
  mentees?: Mentee;
}

export function MentorshipPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [programs, setPrograms] = useState<MentorshipProgram[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [myMatches, setMyMatches] = useState<MentorshipMatch[]>([]);
  const [myMentorStatus, setMyMentorStatus] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-mentorship'>('browse');
  const [showMentorForm, setShowMentorForm] = useState(false);
  const [showMenteeForm, setShowMenteeForm] = useState(false);
  const [mentorFormData, setMentorFormData] = useState({
    program_id: '',
    expertise_areas: [] as string[],
    bio: '',
    max_mentees: 5
  });
  const [menteeFormData, setMenteeFormData] = useState({
    program_id: '',
    goals: '',
    areas_of_interest: [] as string[]
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [programsRes, mentorsRes, matchesRes, myMentorRes] = await Promise.all([
        insforge.database
          .from('mentorship_programs')
          .select('*')
          .eq('is_active', true),
        insforge.database
          .from('mentors')
          .select('*, users(*)')
          .in('status', ['available', 'full']) // Only show approved and available mentors
          .limit(10),
        insforge.database
          .from('mentorship_matches')
          .select('*, mentors(*, users(*)), mentees(*, users(*))')
          .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
          .eq('status', 'active'),
        insforge.database
          .from('mentors')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      setPrograms(programsRes.data || []);
      setMentors(mentorsRes.data || []);
      setMyMatches(matchesRes.data || []);
      setMyMentorStatus(myMentorRes.data || null);
    } catch (error) {
      console.error('Error fetching mentorship data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data: mentor, error: mentorError } = await insforge.database
        .from('mentors')
        .insert({
          user_id: user.id,
          program_id: mentorFormData.program_id || null,
          expertise_areas: mentorFormData.expertise_areas || [],
          bio: mentorFormData.bio || null,
          max_mentees: mentorFormData.max_mentees || 5,
          current_mentees: 0, // Initialize to 0
          status: 'pending' // New mentors need admin approval
        })
        .select()
        .single();

      if (mentorError) {
        console.error('Mentor insert error:', mentorError);
        throw mentorError;
      }

      // Create notification for admin (we'll notify all admins)
      // Note: In a real system, you might want to create notifications for specific admin users
      // For now, the notification count in the sidebar will pick this up via the pending count

      setShowMentorForm(false);
      setMentorFormData({
        program_id: '',
        expertise_areas: [],
        bio: '',
        max_mentees: 5
      });
      fetchData();
      alert('Your mentor application has been submitted! It is pending admin approval. You will be notified once it is reviewed.');
    } catch (error: any) {
      console.error('Error registering mentor:', error);
      const errorMessage = error?.message || 'Error registering as mentor';
      alert(`Error: ${errorMessage}. Please check the console for details.`);
    }
  };

  const handleRegisterMentee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await insforge.database
        .from('mentees')
        .insert({
          user_id: user.id,
          program_id: menteeFormData.program_id || null,
          goals: menteeFormData.goals,
          areas_of_interest: menteeFormData.areas_of_interest,
          status: 'seeking'
        });

      setShowMenteeForm(false);
      setMenteeFormData({
        program_id: '',
        goals: '',
        areas_of_interest: []
      });
      fetchData();
      alert('Successfully registered as a mentee!');
    } catch (error) {
      console.error('Error registering mentee:', error);
      alert('Error registering as mentee');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to access mentorship programs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading mentorship programs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Mentorship Programs</h1>
          <p className="text-gray-600">Connect with mentors and grow in your leadership journey</p>
        </div>
        <div className="flex gap-2">
          {user && (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          )}
          <Button onClick={() => setShowMentorForm(true)} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Become a Mentor
          </Button>
          <Button onClick={() => setShowMenteeForm(true)} variant="secondary">
            <Plus className="w-4 h-4 mr-2" />
            Find a Mentor
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'browse'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Browse Mentors
          </button>
          <button
            onClick={() => setActiveTab('my-mentorship')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'my-mentorship'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            My Mentorship ({myMatches.length})
          </button>
        </div>
      </div>

      {/* Mentor Application Status */}
      {myMentorStatus && (
        <div className={`p-4 rounded-card mb-6 ${
          myMentorStatus.status === 'pending' ? 'bg-amber-50 border-2 border-amber-300' :
          myMentorStatus.status === 'available' ? 'bg-green-50 border-2 border-green-300' :
          myMentorStatus.status === 'rejected' ? 'bg-red-50 border-2 border-red-300' :
          'bg-gray-50 border-2 border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-navy-ink mb-1">
                {myMentorStatus.status === 'pending' && '⏳ Mentor Application Pending'}
                {myMentorStatus.status === 'available' && '✅ Mentor Application Approved'}
                {myMentorStatus.status === 'rejected' && '❌ Mentor Application Rejected'}
                {myMentorStatus.status === 'inactive' && '⏸️ Mentor Status: Inactive'}
              </h3>
              <p className="text-sm text-gray-600">
                {myMentorStatus.status === 'pending' && 'Your application is being reviewed by administrators. You will be notified once a decision is made.'}
                {myMentorStatus.status === 'available' && 'Congratulations! You are now an approved mentor and can be matched with mentees.'}
                {myMentorStatus.status === 'rejected' && 'Your mentor application was not approved. Please contact support if you have questions.'}
                {myMentorStatus.status === 'inactive' && 'Your mentor status is currently inactive.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Registration Form */}
      {showMentorForm && !myMentorStatus && (
        <div className="bg-white p-6 rounded-card shadow-soft mb-6">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Register as Mentor</h2>
          <p className="text-sm text-gray-600 mb-4">
            Your application will be reviewed by administrators before you can be matched with mentees.
          </p>
          <form onSubmit={handleRegisterMentor} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program (Optional)</label>
              <select
                value={mentorFormData.program_id}
                onChange={(e) => setMentorFormData({ ...mentorFormData, program_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              >
                <option value="">No Specific Program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expertise Areas</label>
              <div className="space-y-2">
                {['Leadership', 'Ministry', 'Business', 'Education', 'Counseling', 'Music', 'Media'].map((area) => (
                  <label key={area} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={mentorFormData.expertise_areas.includes(area)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMentorFormData({
                            ...mentorFormData,
                            expertise_areas: [...mentorFormData.expertise_areas, area]
                          });
                        } else {
                          setMentorFormData({
                            ...mentorFormData,
                            expertise_areas: mentorFormData.expertise_areas.filter(a => a !== area)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{area}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={mentorFormData.bio}
                onChange={(e) => setMentorFormData({ ...mentorFormData, bio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={4}
                placeholder="Tell us about your experience and how you can help..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Mentees</label>
              <input
                type="number"
                value={mentorFormData.max_mentees}
                onChange={(e) => setMentorFormData({ ...mentorFormData, max_mentees: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                min="1"
                max="10"
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Register</Button>
              <Button type="button" onClick={() => setShowMentorForm(false)} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Mentee Registration Form */}
      {showMenteeForm && (
        <div className="bg-white p-6 rounded-card shadow-soft mb-6">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Find a Mentor</h2>
          <form onSubmit={handleRegisterMentee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program (Optional)</label>
              <select
                value={menteeFormData.program_id}
                onChange={(e) => setMenteeFormData({ ...menteeFormData, program_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
              >
                <option value="">No Specific Program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Goals</label>
              <textarea
                value={menteeFormData.goals}
                onChange={(e) => setMenteeFormData({ ...menteeFormData, goals: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={4}
                placeholder="What do you hope to achieve through mentorship?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Areas of Interest</label>
              <div className="space-y-2">
                {['Leadership', 'Ministry', 'Business', 'Education', 'Counseling', 'Music', 'Media'].map((area) => (
                  <label key={area} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={menteeFormData.areas_of_interest.includes(area)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMenteeFormData({
                            ...menteeFormData,
                            areas_of_interest: [...menteeFormData.areas_of_interest, area]
                          });
                        } else {
                          setMenteeFormData({
                            ...menteeFormData,
                            areas_of_interest: menteeFormData.areas_of_interest.filter(a => a !== area)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{area}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Register</Button>
              <Button type="button" onClick={() => setShowMenteeForm(false)} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Browse Mentors */}
      {activeTab === 'browse' && (
        <div>
          <h2 className="text-2xl font-bold text-navy-ink mb-4">Available Mentors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <div key={mentor.id} className="bg-white p-6 rounded-card shadow-soft">
                <div className="flex items-start justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-500" />
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {mentor.current_mentees}/{mentor.max_mentees} mentees
                  </span>
                </div>
                <h3 className="text-lg font-bold text-navy-ink mb-2">
                  {mentor.users?.nickname || mentor.users?.email || 'Mentor'}
                </h3>
                {mentor.bio && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{mentor.bio}</p>
                )}
                {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mentor.expertise_areas.slice(0, 3).map((area, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {area}
                      </span>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full" size="sm">
                  View Profile
                </Button>
              </div>
            ))}
          </div>
          {mentors.length === 0 && (
            <div className="bg-white p-12 rounded-card shadow-soft text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No mentors available at the moment</p>
            </div>
          )}
        </div>
      )}

      {/* My Mentorship */}
      {activeTab === 'my-mentorship' && (
        <div>
          <h2 className="text-2xl font-bold text-navy-ink mb-4">My Mentorship Matches</h2>
          <div className="space-y-4">
            {myMatches.map((match) => {
              const isMentor = match.mentor_id === user.id;
              const otherPerson = isMentor ? match.mentees : match.mentors;
              return (
                <div key={match.id} className="bg-white p-6 rounded-card shadow-soft">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isMentor ? (
                          <Target className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Users className="w-5 h-5 text-green-500" />
                        )}
                        <h3 className="text-lg font-bold text-navy-ink">
                          {isMentor ? 'Mentoring' : 'Mentored by'}: {otherPerson?.users?.nickname || otherPerson?.users?.email || 'Unknown'}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 mb-4">
                        <p>Started: {new Date(match.start_date).toLocaleDateString()}</p>
                        {match.end_date && (
                          <p>Ends: {new Date(match.end_date).toLocaleDateString()}</p>
                        )}
                      </div>
                      {!isMentor && match.mentees?.goals && (
                        <p className="text-gray-700 mb-2">
                          <span className="font-semibold">Goals:</span> {match.mentees.goals}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      match.status === 'active' ? 'bg-green-100 text-green-800' :
                      match.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {match.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Session
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {myMatches.length === 0 && (
            <div className="bg-white p-12 rounded-card shadow-soft text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No active mentorship matches</p>
              <p className="text-sm text-gray-500 mt-2">Register as a mentor or mentee to get started</p>
            </div>
          )}
        </div>
      )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

