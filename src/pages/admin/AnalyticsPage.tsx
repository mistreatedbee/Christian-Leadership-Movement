import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, BookOpen, Award, Calendar, DollarSign } from 'lucide-react';
import { insforge } from '../../lib/insforge';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    courseEnrollments: 0,
    certificatesIssued: 0,
    eventAttendance: 0,
    totalDonations: 0,
    totalPayments: 0
  });
  const [provinceData, setProvinceData] = useState<Array<{ province: string; users: number; percentage: number }>>([]);
  const [coursePerformance, setCoursePerformance] = useState<Array<{
    course: string;
    enrolled: number;
    completed: number;
    completionRate: number;
  }>>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all metrics
      const [users, enrollments, certificates, eventRegs, donations, payments, courses] = await Promise.all([
        insforge.database.from('user_profiles').select('*', { count: 'exact' }),
        insforge.database.from('user_course_progress').select('*', { count: 'exact' }),
        insforge.database.from('certificates').select('*', { count: 'exact' }),
        insforge.database.from('event_registrations').select('*', { count: 'exact' }),
        insforge.database.from('donations').select('amount').eq('status', 'confirmed'),
        insforge.database.from('payments').select('amount').eq('status', 'confirmed'),
        insforge.database.from('courses').select('id, title')
      ]);

      // Calculate province distribution
      const provinceCounts: Record<string, number> = {};
      users.data?.forEach((user: any) => {
        const province = user.province || 'Unknown';
        provinceCounts[province] = (provinceCounts[province] || 0) + 1;
      });

      const totalUsers = users.count || 0;
      const provinceArray = Object.entries(provinceCounts).map(([province, count]) => ({
        province,
        users: count,
        percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
      })).sort((a, b) => b.users - a.users);

      // Calculate course performance
      const coursePerf = await Promise.all(
        (courses.data || []).map(async (course: any) => {
          const { data: progress } = await insforge.database
            .from('user_course_progress')
            .select('*')
            .eq('course_id', course.id);

          const enrolled = progress?.length || 0;
          const completed = progress?.filter((p: any) => p.progress_percentage >= 100).length || 0;
          const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

          return {
            course: course.title,
            enrolled,
            completed,
            completionRate
          };
        })
      );

      const totalDonations = donations.data?.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0) || 0;
      const totalPayments = payments.data?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0;

      setMetrics({
        totalUsers: users.count || 0,
        courseEnrollments: enrollments.count || 0,
        certificatesIssued: certificates.count || 0,
        eventAttendance: eventRegs.count || 0,
        totalDonations,
        totalPayments
      });

      setProvinceData(provinceArray);
      setCoursePerformance(coursePerf);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const metricsData = [
    {
      icon: Users,
      label: 'Total Users',
      value: metrics.totalUsers.toString(),
      change: '',
      trend: 'up',
      color: 'bg-blue-500'
    },
    {
      icon: BookOpen,
      label: 'Course Enrollments',
      value: metrics.courseEnrollments.toString(),
      change: '',
      trend: 'up',
      color: 'bg-green-500'
    },
    {
      icon: Award,
      label: 'Certificates Issued',
      value: metrics.certificatesIssued.toString(),
      change: '',
      trend: 'up',
      color: 'bg-gold'
    },
    {
      icon: Calendar,
      label: 'Event Attendance',
      value: metrics.eventAttendance.toString(),
      change: '',
      trend: 'up',
      color: 'bg-purple-500'
    },
    {
      icon: DollarSign,
      label: 'Total Donations',
      value: `R${metrics.totalDonations.toFixed(2)}`,
      change: '',
      trend: 'up',
      color: 'bg-pink-500'
    },
    {
      icon: DollarSign,
      label: 'Total Payments',
      value: `R${metrics.totalPayments.toFixed(2)}`,
      change: '',
      trend: 'up',
      color: 'bg-indigo-500'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Analytics & Reporting</h1>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">
          Analytics & Reporting
        </h1>
        <p className="text-gray-600">
          Track performance and engagement metrics
        </p>
      </div>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricsData.map(metric => (
          <div key={metric.label} className="bg-white p-6 rounded-card shadow-soft">
            <div className="flex items-start justify-between mb-4">
              <div className={`${metric.color} w-12 h-12 rounded-card flex items-center justify-center`}>
                <metric.icon className="text-white" size={24} />
              </div>
              {metric.change && (
                <span className={`text-sm font-medium flex items-center ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp size={16} className="mr-1" />
                  {metric.change}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-navy-ink">{metric.value}</p>
          </div>
        ))}
      </div>
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by Province */}
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">
            Users by Province
          </h2>
          {provinceData.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No province data available</p>
          ) : (
            <div className="space-y-4">
              {provinceData.map(data => (
                <div key={data.province}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{data.province}</span>
                    <span className="text-sm font-medium text-navy-ink">
                      {data.users}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-gold rounded-full"
                      style={{ width: `${data.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* User Growth Chart Placeholder */}
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">User Growth</h2>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>Chart visualization coming soon</p>
          </div>
        </div>
      </div>
      {/* Course Performance */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">
          Course Performance
        </h2>
        {coursePerformance.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No course data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                    Enrolled
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {coursePerformance.map((course, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-navy-ink font-medium">
                      {course.course}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{course.enrolled}</td>
                    <td className="px-6 py-4 text-gray-600">{course.completed}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${
                        course.completionRate >= 70 ? 'text-green-600' :
                        course.completionRate >= 50 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {course.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
