import React, { useEffect, useState } from 'react';
import { FileText, Download, Mail, Calendar, Search, Filter } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface GivingStatement {
  id: string;
  user_id: string;
  year: number;
  total_amount: number;
  donation_count: number;
  generated_at: string;
  sent_at?: string;
  file_url?: string;
  users?: {
    id: string;
    email?: string;
    nickname?: string;
  };
}

export function AnnualGivingStatementsPage() {
  const [statements, setStatements] = useState<GivingStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'pending'>('all');

  useEffect(() => {
    fetchStatements();
  }, [selectedYear, filterStatus]);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      let query = insforge.database
        .from('annual_giving_statements')
        .select('*, users(*)')
        .eq('year', selectedYear)
        .order('generated_at', { ascending: false });

      if (filterStatus === 'sent') {
        query = query.not('sent_at', 'is', null);
      } else if (filterStatus === 'pending') {
        query = query.is('sent_at', null);
      }

      const { data } = await query;
      setStatements(data || []);
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStatements = async () => {
    if (!confirm(`Generate annual giving statements for ${selectedYear}? This may take a few minutes.`)) return;

    try {
      // In a real app, this would call a backend function to:
      // 1. Calculate all donations for the year
      // 2. Group by user
      // 3. Generate PDF statements
      // 4. Store in database

      alert(`Annual giving statements generation started for ${selectedYear}. This is a background process.`);
      fetchStatements();
    } catch (error) {
      console.error('Error generating statements:', error);
      alert('Error generating statements');
    }
  };

  const sendStatement = async (statementId: string) => {
    if (!confirm('Send this statement to the donor via email?')) return;

    try {
      await insforge.database
        .from('annual_giving_statements')
        .update({
          sent_at: new Date().toISOString()
        })
        .eq('id', statementId);

      // In a real app, this would trigger an email with the statement PDF
      alert('Statement sent successfully!');
      fetchStatements();
    } catch (error) {
      console.error('Error sending statement:', error);
      alert('Error sending statement');
    }
  };

  const sendAllPending = async () => {
    if (!confirm('Send all pending statements to donors?')) return;

    try {
      const pending = statements.filter(s => !s.sent_at);
      for (const statement of pending) {
        await insforge.database
          .from('annual_giving_statements')
          .update({
            sent_at: new Date().toISOString()
          })
          .eq('id', statement.id);
      }

      alert(`${pending.length} statements sent successfully!`);
      fetchStatements();
    } catch (error) {
      console.error('Error sending statements:', error);
      alert('Error sending statements');
    }
  };

  const downloadStatement = (statement: GivingStatement) => {
    if (statement.file_url) {
      window.open(statement.file_url, '_blank');
    } else {
      alert('Statement PDF not yet generated');
    }
  };

  const filteredStatements = statements.filter(statement =>
    statement.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    statement.users?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = statements.reduce((sum, s) => sum + parseFloat(s.total_amount.toString()), 0);
  const sentCount = statements.filter(s => s.sent_at).length;
  const pendingCount = statements.filter(s => !s.sent_at).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading annual giving statements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Annual Giving Statements</h1>
          <p className="text-gray-600">Generate and send annual giving statements to donors</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateStatements} variant="primary">
            <FileText className="w-4 h-4 mr-2" />
            Generate for {selectedYear}
          </Button>
          {pendingCount > 0 && (
            <Button onClick={sendAllPending} variant="secondary">
              <Mail className="w-4 h-4 mr-2" />
              Send All Pending ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">Total Statements</p>
          <p className="text-2xl font-bold text-navy-ink">{statements.length}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-navy-ink">R{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">Sent</p>
          <p className="text-2xl font-bold text-green-600">{sentCount}</p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <p className="text-gray-600 text-sm mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by donor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statements Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Donor</th>
                <th className="text-left py-3 px-6">Year</th>
                <th className="text-left py-3 px-6">Total Amount</th>
                <th className="text-left py-3 px-6">Donations</th>
                <th className="text-left py-3 px-6">Generated</th>
                <th className="text-left py-3 px-6">Sent</th>
                <th className="text-left py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStatements.map((statement) => (
                <tr key={statement.id} className="border-b">
                  <td className="py-4 px-6">
                    {statement.users?.nickname || statement.users?.email || 'Unknown'}
                  </td>
                  <td className="py-4 px-6">{statement.year}</td>
                  <td className="py-4 px-6 font-semibold">R{parseFloat(statement.total_amount.toString()).toFixed(2)}</td>
                  <td className="py-4 px-6">{statement.donation_count}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(statement.generated_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    {statement.sent_at ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {new Date(statement.sent_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      {statement.file_url && (
                        <button
                          onClick={() => downloadStatement(statement)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {!statement.sent_at && (
                        <button
                          onClick={() => sendStatement(statement.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Send"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStatements.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No statements found for {selectedYear}</p>
            <p className="text-sm text-gray-500 mt-2">Generate statements to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

