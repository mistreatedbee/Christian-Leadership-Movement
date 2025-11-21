import React, { useEffect, useState } from 'react';
import { Users, Clock, Calendar, Search, Edit, CheckCircle, XCircle } from 'lucide-react';
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
  };
  users?: {
    id: string;
    email?: string;
    nickname?: string;
  };
}

interface VolunteerShift {
  id: string;
  volunteer_id: string;
  event_id?: string;
  start_time: string;
  end_time: string;
  hours_worked?: number;
  status: string;
  volunteers?: Volunteer;
  events?: {
    id: string;
    title: string;
  };
}

export function VolunteerManagementPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'volunteers' | 'shifts'>('volunteers');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [volunteersRes, shiftsRes, rolesRes, eventsRes] = await Promise.all([
        insforge.database
          .from('volunteers')
          .select('*, volunteer_roles(*), users(*)')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('volunteer_shifts')
          .select('*, volunteers(*, users(*)), events(*)')
          .order('start_time', { ascending: false })
          .limit(50),
        insforge.database
          .from('volunteer_roles')
          .select('*'),
        insforge.database
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString())
          .order('event_date')
      ]);

      setVolunteers(volunteersRes.data || []);
      setShifts(shiftsRes.data || []);
      setRoles(rolesRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVolunteerStatus = async (id: string, status: string) => {
    try {
      await insforge.database
        .from('volunteers')
        .update({ status })
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateShiftStatus = async (id: string, status: string, hoursWorked?: number) => {
    try {
      await insforge.database
        .from('volunteer_shifts')
        .update({ status, hours_worked: hoursWorked })
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error updating shift:', error);
    }
  };

  const filteredVolunteers = volunteers.filter(v =>
    v.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.volunteer_roles?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredShifts = shifts.filter(s =>
    s.events?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.volunteers?.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading volunteer data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Volunteer Management</h1>
        <p className="text-gray-600">Manage volunteers and their shifts</p>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('volunteers');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'volunteers'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Volunteers ({volunteers.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('shifts');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'shifts'
                  ? 'bg-gold text-white'
                  : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
              }`}
            >
              Shifts ({shifts.length})
            </button>
          </div>
          <div className="relative flex-1 max-w-md">
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

      {/* Volunteers Tab */}
      {activeTab === 'volunteers' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">Volunteer</th>
                  <th className="text-left py-3 px-6">Role</th>
                  <th className="text-left py-3 px-6">Skills</th>
                  <th className="text-left py-3 px-6">Total Hours</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVolunteers.map((volunteer) => (
                  <tr key={volunteer.id} className="border-b">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-navy-ink">
                          {volunteer.users?.nickname || volunteer.users?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">{volunteer.users?.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">{volunteer.volunteer_roles?.name || 'No role'}</td>
                    <td className="py-4 px-6">
                      {volunteer.skills && volunteer.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {volunteer.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                          {volunteer.skills.length > 3 && (
                            <span className="text-xs text-gray-500">+{volunteer.skills.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No skills</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{volunteer.total_hours.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        volunteer.status === 'active' ? 'bg-green-100 text-green-800' :
                        volunteer.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {volunteer.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {volunteer.status === 'active' ? (
                          <button
                            onClick={() => updateVolunteerStatus(volunteer.id, 'inactive')}
                            className="text-amber-600 hover:text-amber-800"
                            title="Deactivate"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateVolunteerStatus(volunteer.id, 'active')}
                            className="text-green-600 hover:text-green-800"
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredVolunteers.length === 0 && (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No volunteers found</p>
            </div>
          )}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">Volunteer</th>
                  <th className="text-left py-3 px-6">Event</th>
                  <th className="text-left py-3 px-6">Date & Time</th>
                  <th className="text-left py-3 px-6">Hours</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShifts.map((shift) => (
                  <tr key={shift.id} className="border-b">
                    <td className="py-4 px-6">
                      {shift.volunteers?.users?.nickname || shift.volunteers?.users?.email || 'Unknown'}
                    </td>
                    <td className="py-4 px-6">{shift.events?.title || 'No event'}</td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <div>{new Date(shift.start_time).toLocaleDateString()}</div>
                        <div className="text-gray-600">
                          {new Date(shift.start_time).toLocaleTimeString()} - {new Date(shift.end_time).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {shift.hours_worked ? `${shift.hours_worked.toFixed(1)}h` : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        shift.status === 'completed' ? 'bg-green-100 text-green-800' :
                        shift.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        shift.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {shift.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {shift.status === 'scheduled' && (
                        <Button
                          onClick={() => updateShiftStatus(shift.id, 'completed', 4)}
                          variant="outline"
                          size="sm"
                        >
                          Mark Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredShifts.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No shifts found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

