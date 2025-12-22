import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, Clock, TrendingUp, Search } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface Attendance {
  id: string;
  user_id: string;
  event_id?: string;
  course_id?: string;
  lesson_id?: string;
  attendance_type: string;
  status: string;
  check_in_time: string;
  check_out_time?: string;
  events?: {
    id: string;
    title: string;
    event_date: string;
  };
  courses?: {
    id: string;
    title: string;
  };
}

export function AttendancePage() {
  const { user } = useUser();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, filter]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [attendanceRes, eventsRes] = await Promise.all([
        (() => {
          let query = insforge.database
            .from('attendance')
            .select('*, events(*), courses(*)')
            .eq('user_id', user.id)
            .order('check_in_time', { ascending: false });

          if (filter !== 'all') {
            query = query.eq('attendance_type', filter);
          }
          return query;
        })(),
        insforge.database
          .from('events')
          .select('*')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(5)
      ]);

      setAttendance(attendanceRes.data || []);
      setUpcomingEvents(eventsRes.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (eventId: string) => {
    if (!user) return;

    try {
      // Check if already checked in
      const { data: existing } = await insforge.database
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .eq('check_in_time', new Date().toISOString().split('T')[0])
        .single();

      if (existing) {
        alert('You have already checked in for this event today');
        return;
      }

      await insforge.database
        .from('attendance')
        .insert({
          user_id: user.id,
          event_id: eventId,
          attendance_type: 'event',
          status: 'present',
          check_in_time: new Date().toISOString()
        });

      alert('Checked in successfully!');
      fetchData();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Error checking in');
    }
  };

  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    events: attendance.filter(a => a.attendance_type === 'event').length,
    courses: attendance.filter(a => a.attendance_type === 'course').length
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to view attendance</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading attendance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Attendance</h1>
        <p className="text-gray-600">Track your attendance at events and courses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-card shadow-soft">
          <Calendar className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Total Records</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Present</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.present}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Events</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.events}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <Clock className="w-8 h-8 text-gold mb-2" />
          <p className="text-gray-600 text-sm mb-1">Courses</p>
          <p className="text-2xl font-bold text-navy-ink">{stats.courses}</p>
        </div>
      </div>

      {/* Upcoming Events - Quick Check-in */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Upcoming Events - Quick Check-in</h2>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 bg-muted-gray rounded-lg"
              >
                <div>
                  <h3 className="font-semibold text-navy-ink">{event.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(event.event_date).toLocaleDateString()} at{' '}
                    {new Date(event.event_date).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  onClick={() => handleCheckIn(event.id)}
                  variant="primary"
                  size="sm"
                >
                  Check In
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All</option>
            <option value="event">Events</option>
            <option value="course">Courses</option>
            <option value="lesson">Lessons</option>
          </select>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-navy-ink">Attendance History</h2>
        </div>
        <div className="divide-y">
          {attendance.map((record) => (
            <div key={record.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-ink mb-2">
                    {record.events?.title || record.courses?.title || 'Attendance Record'}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(record.check_in_time).toLocaleDateString()} at{' '}
                        {new Date(record.check_in_time).toLocaleTimeString()}
                      </span>
                    </div>
                    {record.check_out_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          Checked out: {new Date(record.check_out_time).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="capitalize">{record.attendance_type}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  record.status === 'present' ? 'bg-green-100 text-green-800' :
                  record.status === 'absent' ? 'bg-red-100 text-red-800' :
                  record.status === 'late' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {record.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        {attendance.length === 0 && (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No attendance records yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

