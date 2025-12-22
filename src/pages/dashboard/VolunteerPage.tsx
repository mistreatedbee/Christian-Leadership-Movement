import React, { useEffect, useState } from 'react';
import { Users, Clock, Calendar, CheckCircle, Plus } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Volunteer {
  id: string;
  user_id: string;
  role_id?: string;
  skills?: string[];
  status: string;
  total_hours: number;
  volunteer_roles?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface VolunteerShift {
  id: string;
  volunteer_id: string;
  event_id?: string;
  role_id?: string;
  start_time: string;
  end_time: string;
  hours_worked?: number;
  status: string;
  events?: {
    id: string;
    title: string;
    event_date: string;
  };
}

export function VolunteerPage() {
  const { user } = useUser();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [formData, setFormData] = useState({
    skills: [] as string[],
    availability: {
      days: [] as string[],
      hours: ''
    }
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [volunteerRes, shiftsRes] = await Promise.all([
        insforge.database
          .from('volunteers')
          .select('*, volunteer_roles(*)')
          .eq('user_id', user.id)
          .single(),
        insforge.database
          .from('volunteer_shifts')
          .select('*, events(*)')
          .eq('volunteer_id', user.id)
          .order('start_time', { ascending: false })
          .limit(10)
      ]);

      setVolunteer(volunteerRes.data);
      setShifts(shiftsRes.data || []);

      if (!volunteerRes.data) {
        setShowRegistration(true);
      }
    } catch (error) {
      console.error('Error fetching volunteer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await insforge.database
        .from('volunteers')
        .insert({
          user_id: user.id,
          skills: formData.skills,
          availability: formData.availability,
          status: 'active'
        });

      setShowRegistration(false);
      fetchData();
      alert('Successfully registered as a volunteer!');
    } catch (error) {
      console.error('Error registering volunteer:', error);
      alert('Error registering as volunteer');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to view volunteer information</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading volunteer information...</p>
      </div>
    );
  }

  if (showRegistration || !volunteer) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Become a Volunteer</h1>
          <p className="text-gray-600">Join our volunteer team and make a difference</p>
        </div>

        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Volunteer Registration</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills (select all that apply)
              </label>
              <div className="space-y-2">
                {['Teaching', 'Administration', 'Event Planning', 'Technical', 'Music', 'Media', 'Outreach', 'Counseling'].map((skill) => (
                  <label key={skill} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.skills.includes(skill)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            skills: [...formData.skills, skill]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            skills: formData.skills.filter(s => s !== skill)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Days
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.availability.days.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            availability: {
                              ...formData.availability,
                              days: [...formData.availability.days, day]
                            }
                          });
                        } else {
                          setFormData({
                            ...formData,
                            availability: {
                              ...formData.availability,
                              days: formData.availability.days.filter(d => d !== day)
                            }
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Hours (e.g., "9am-5pm")
              </label>
              <input
                type="text"
                value={formData.availability.hours}
                onChange={(e) => setFormData({
                  ...formData,
                  availability: { ...formData.availability, hours: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                placeholder="9am-5pm"
              />
            </div>
            <Button type="submit" variant="primary">Register as Volunteer</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Volunteer Dashboard</h1>
          <p className="text-gray-600">Manage your volunteer activities</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-card shadow-soft">
          <Users className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Status</p>
          <p className="text-2xl font-bold text-navy-ink capitalize">{volunteer.status}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <Clock className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-navy-ink">{volunteer.total_hours.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <Calendar className="w-8 h-8 text-purple-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Upcoming Shifts</p>
          <p className="text-2xl font-bold text-navy-ink">
            {shifts.filter(s => new Date(s.start_time) > new Date() && s.status === 'scheduled').length}
          </p>
        </div>
      </div>

      {/* Volunteer Info */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Your Information</h2>
        <div className="space-y-3">
          {volunteer.volunteer_roles && (
            <div>
              <span className="text-gray-600">Role: </span>
              <span className="font-semibold">{volunteer.volunteer_roles.name}</span>
            </div>
          )}
          {volunteer.skills && volunteer.skills.length > 0 && (
            <div>
              <span className="text-gray-600">Skills: </span>
              <span className="font-semibold">{volunteer.skills.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Shifts */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-navy-ink">Your Shifts</h2>
        </div>
        <div className="divide-y">
          {shifts.map((shift) => (
            <div key={shift.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {shift.events && (
                    <h3 className="text-lg font-semibold text-navy-ink mb-2">
                      {shift.events.title}
                    </h3>
                  )}
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(shift.start_time).toLocaleDateString()} at{' '}
                        {new Date(shift.start_time).toLocaleTimeString()}
                      </span>
                    </div>
                    {shift.hours_worked && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{shift.hours_worked} hours</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  shift.status === 'completed' ? 'bg-green-100 text-green-800' :
                  shift.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  shift.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {shift.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        {shifts.length === 0 && (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No shifts scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}

