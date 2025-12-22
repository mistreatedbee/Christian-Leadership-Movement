import React, { useEffect, useState } from 'react';
import { Download, FileText, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface FinancialReport {
  period: string;
  donations: number;
  payments: number;
  fees: number;
  total: number;
}

export function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    setDateRange({
      start: startOfYear.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchReport();
    }
  }, [dateRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const [donationsRes, paymentsRes] = await Promise.all([
        insforge.database
          .from('donations')
          .select('*')
          .eq('status', 'confirmed')
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end),
        insforge.database
          .from('payments')
          .select('*')
          .eq('status', 'confirmed')
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      ]);

      const donationsData = donationsRes.data || [];
      const paymentsData = paymentsRes.data || [];

      const totalDonations = donationsData.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
      const totalPayments = paymentsData.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalFees = paymentsData
        .filter(p => p.payment_type === 'application' || p.payment_type === 'registration')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      setDonations(donationsData);
      setPayments(paymentsData);
      setReport({
        period: `${dateRange.start} to ${dateRange.end}`,
        donations: totalDonations,
        payments: totalPayments,
        fees: totalFees,
        total: totalDonations + totalPayments
      });
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    // Create CSV content
    const csvRows = [
      ['Financial Report', report?.period || ''],
      [''],
      ['Category', 'Amount (ZAR)'],
      ['Donations', report?.donations.toFixed(2) || '0.00'],
      ['Application/Registration Fees', report?.fees.toFixed(2) || '0.00'],
      ['Other Payments', (report?.payments - report?.fees).toFixed(2) || '0.00'],
      ['Total', report?.total.toFixed(2) || '0.00'],
      [''],
      ['Donations Breakdown'],
      ['Date', 'Amount', 'Campaign', 'Status'],
      ...donations.map(d => [
        new Date(d.created_at).toLocaleDateString(),
        d.amount,
        d.campaign_name || 'N/A',
        d.status
      ]),
      [''],
      ['Payments Breakdown'],
      ['Date', 'Amount', 'Type', 'Status'],
      ...payments.map(p => [
        new Date(p.created_at).toLocaleDateString(),
        p.amount,
        p.payment_type,
        p.status
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    // For PDF, we'll create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1a365d; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Financial Report</h1>
          <p><strong>Period:</strong> ${report?.period || ''}</p>
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Donations:</strong> R${report?.donations.toFixed(2) || '0.00'}</p>
            <p><strong>Total Fees:</strong> R${report?.fees.toFixed(2) || '0.00'}</p>
            <p><strong>Total Payments:</strong> R${report?.payments.toFixed(2) || '0.00'}</p>
            <p><strong>Grand Total:</strong> R${report?.total.toFixed(2) || '0.00'}</p>
          </div>
          <h2>Donations</h2>
          <table>
            <tr><th>Date</th><th>Amount</th><th>Campaign</th><th>Status</th></tr>
            ${donations.map(d => `
              <tr>
                <td>${new Date(d.created_at).toLocaleDateString()}</td>
                <td>R${parseFloat(d.amount || 0).toFixed(2)}</td>
                <td>${d.campaign_name || 'N/A'}</td>
                <td>${d.status}</td>
              </tr>
            `).join('')}
          </table>
          <h2>Payments</h2>
          <table>
            <tr><th>Date</th><th>Amount</th><th>Type</th><th>Status</th></tr>
            ${payments.map(p => `
              <tr>
                <td>${new Date(p.created_at).toLocaleDateString()}</td>
                <td>R${parseFloat(p.amount || 0).toFixed(2)}</td>
                <td>${p.payment_type}</td>
                <td>${p.status}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generateAnnualStatements = async () => {
    try {
      // Get all users with donations/payments
      const { data: allDonations } = await insforge.database
        .from('donations')
        .select('user_id, amount, created_at')
        .eq('status', 'confirmed');

      const { data: allPayments } = await insforge.database
        .from('payments')
        .select('user_id, amount, created_at')
        .eq('status', 'confirmed');

      // Group by user and year
      const userYearMap = new Map();
      const currentYear = new Date().getFullYear();

      [...(allDonations || []), ...(allPayments || [])].forEach(item => {
        const year = new Date(item.created_at).getFullYear();
        if (year === currentYear) {
          const userId = item.user_id;
          if (!userYearMap.has(userId)) {
            userYearMap.set(userId, { donations: 0, payments: 0 });
          }
          const totals = userYearMap.get(userId);
          if (item.amount) {
            if (allDonations?.some(d => d.id === item.id)) {
              totals.donations += parseFloat(item.amount);
            } else {
              totals.payments += parseFloat(item.amount);
            }
          }
        }
      });

      // Create giving statements
      for (const [userId, totals] of userYearMap.entries()) {
        await insforge.database
          .from('giving_statements')
          .upsert({
            user_id: userId,
            year: currentYear,
            total_donations: totals.donations,
            total_payments: totals.payments,
            status: 'generated'
          }, { onConflict: 'user_id,year' });
      }

      alert(`Annual giving statements generated for ${userYearMap.size} users`);
    } catch (error) {
      console.error('Error generating statements:', error);
      alert('Error generating annual statements');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading financial report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Financial Reports</h1>
          <p className="text-gray-600">View and export financial data</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={generateAnnualStatements} variant="secondary">
            <Calendar className="w-4 h-4 mr-2" />
            Generate Annual Statements
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Select Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-card shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-gold" />
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm mb-1">Total Donations</p>
            <p className="text-2xl font-bold text-navy-ink">R{report.donations.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-card shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-500" />
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm mb-1">Application Fees</p>
            <p className="text-2xl font-bold text-navy-ink">R{report.fees.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-card shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-500" />
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm mb-1">Total Payments</p>
            <p className="text-2xl font-bold text-navy-ink">R{report.payments.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-card shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-gray-600 text-sm mb-1">Grand Total</p>
            <p className="text-2xl font-bold text-navy-ink">R{report.total.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Export Report</h2>
        <div className="flex gap-4">
          <Button onClick={exportToExcel} variant="primary">
            <Download className="w-4 h-4 mr-2" />
            Export to Excel (CSV)
          </Button>
          <Button onClick={exportToPDF} variant="secondary">
            <FileText className="w-4 h-4 mr-2" />
            Export to PDF
          </Button>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donations Table */}
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Donations</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-left py-2 px-4">Amount</th>
                  <th className="text-left py-2 px-4">Campaign</th>
                </tr>
              </thead>
              <tbody>
                {donations.slice(0, 10).map((donation) => (
                  <tr key={donation.id} className="border-b">
                    <td className="py-2 px-4">{new Date(donation.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-4">R{parseFloat(donation.amount || 0).toFixed(2)}</td>
                    <td className="py-2 px-4">{donation.campaign_name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Payments</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-left py-2 px-4">Amount</th>
                  <th className="text-left py-2 px-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="py-2 px-4">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-4">R{parseFloat(payment.amount || 0).toFixed(2)}</td>
                    <td className="py-2 px-4">{payment.payment_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

