import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, BookOpen, DollarSign, Calendar, Target, MapPin, BarChart3 } from 'lucide-react';
import { insforge } from '../../lib/insforge';

interface AnalyticsData {
  userEngagement: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowth: number;
  };
  courseMetrics: {
    totalCourses: number;
    enrollments: number;
    completions: number;
    completionRate: number;
  };
  donationTrends: {
    total: number;
    monthly: { month: string; amount: number }[];
    average: number;
  };
  applicationMetrics: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    conversionRate: number;
  };
  geographic: {
    province: string;
    count: number;
  }[];
}

export function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // User Engagement
      const [allUsers, recentUsers, userProfiles] = await Promise.all([
        insforge.database.from('users').select('*', { count: 'exact' }),
        insforge.database
          .from('users')
          .select('*', { count: 'exact' })
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end),
        insforge.database.from('user_profiles').select('province')
      ]);

      // Course Metrics
      const [courses, enrollments, completions] = await Promise.all([
        insforge.database.from('courses').select('*', { count: 'exact' }),
        insforge.database.from('course_enrollments').select('*', { count: 'exact' }),
        insforge.database
          .from('user_course_progress')
          .select('*')
          .eq('completed', true)
      ]);

      // Donation Trends
      const donations = await insforge.database
        .from('donations')
        .select('amount, created_at')
        .eq('status', 'confirmed')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      // Application Metrics
      const [allApps, approvedApps, pendingApps, rejectedApps] = await Promise.all([
        insforge.database.from('applications').select('*', { count: 'exact' }),
        insforge.database.from('applications').select('*', { count: 'exact' }).eq('status', 'approved'),
        insforge.database.from('applications').select('*', { count: 'exact' }).eq('status', 'pending'),
        insforge.database.from('applications').select('*', { count: 'exact' }).eq('status', 'rejected')
      ]);

      // Geographic Distribution
      const provinceCounts = new Map<string, number>();
      userProfiles.data?.forEach((profile: any) => {
        if (profile.province) {
          provinceCounts.set(profile.province, (provinceCounts.get(profile.province) || 0) + 1);
        }
      });

      // Monthly donation breakdown
      const monthlyDonations = new Map<string, number>();
      donations.data?.forEach((donation: any) => {
        const month = new Date(donation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyDonations.set(month, (monthlyDonations.get(month) || 0) + parseFloat(donation.amount || 0));
      });

      const totalDonations = donations.data?.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0) || 0;

      setData({
        userEngagement: {
          totalUsers: allUsers.count || 0,
          activeUsers: allUsers.count || 0, // Simplified
          newUsers: recentUsers.count || 0,
          userGrowth: allUsers.count ? ((recentUsers.count || 0) / allUsers.count) * 100 : 0
        },
        courseMetrics: {
          totalCourses: courses.count || 0,
          enrollments: enrollments.count || 0,
          completions: completions.data?.length || 0,
          completionRate: enrollments.count ? ((completions.data?.length || 0) / enrollments.count) * 100 : 0
        },
        donationTrends: {
          total: totalDonations,
          monthly: Array.from(monthlyDonations.entries()).map(([month, amount]) => ({ month, amount })),
          average: donations.data?.length ? totalDonations / donations.data.length : 0
        },
        applicationMetrics: {
          total: allApps.count || 0,
          approved: approvedApps.count || 0,
          pending: pendingApps.count || 0,
          rejected: rejectedApps.count || 0,
          conversionRate: allApps.count ? ((approvedApps.count || 0) / allApps.count) * 100 : 0
        },
        geographic: Array.from(provinceCounts.entries())
          .map(([province, count]) => ({ province, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Advanced Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into platform performance</p>
        </div>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          />
        </div>
      </div>

      {/* User Engagement */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Engagement Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Users</p>
            <p className="text-2xl font-bold text-navy-ink">{data.userEngagement.totalUsers}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Active Users</p>
            <p className="text-2xl font-bold text-navy-ink">{data.userEngagement.activeUsers}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">New Users (Period)</p>
            <p className="text-2xl font-bold text-navy-ink">{data.userEngagement.newUsers}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Growth Rate</p>
            <p className="text-2xl font-bold text-navy-ink">{data.userEngagement.userGrowth.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Course Metrics */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Course Completion Rates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Courses</p>
            <p className="text-2xl font-bold text-navy-ink">{data.courseMetrics.totalCourses}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Enrollments</p>
            <p className="text-2xl font-bold text-navy-ink">{data.courseMetrics.enrollments}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Completions</p>
            <p className="text-2xl font-bold text-navy-ink">{data.courseMetrics.completions}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-navy-ink">{data.courseMetrics.completionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Donation Trends */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Donation Trends
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Donations</p>
            <p className="text-2xl font-bold text-navy-ink">R{data.donationTrends.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Average Donation</p>
            <p className="text-2xl font-bold text-navy-ink">R{data.donationTrends.average.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Monthly Breakdown</p>
            <p className="text-2xl font-bold text-navy-ink">{data.donationTrends.monthly.length} months</p>
          </div>
        </div>
        {data.donationTrends.monthly.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Monthly Donations</h3>
            <div className="space-y-2">
              {data.donationTrends.monthly.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div
                      className="bg-gold h-4 rounded-full"
                      style={{
                        width: `${(item.amount / data.donationTrends.total) * 100}%`
                      }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-semibold">R{item.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Application Conversion */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Application Conversion Rates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Applications</p>
            <p className="text-2xl font-bold text-navy-ink">{data.applicationMetrics.total}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-600">{data.applicationMetrics.approved}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{data.applicationMetrics.pending}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{data.applicationMetrics.rejected}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold text-navy-ink">{data.applicationMetrics.conversionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Geographic Analytics */}
      {data.geographic.length > 0 && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geographic Distribution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.geographic.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted-gray rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-ink">{item.province}</p>
                    <p className="text-sm text-gray-600">{item.count} users</p>
                  </div>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gold h-2 rounded-full"
                    style={{
                      width: `${(item.count / data.geographic[0].count) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

