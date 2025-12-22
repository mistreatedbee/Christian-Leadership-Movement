import React, { useEffect, useState } from 'react';
import { Shield, Search, Filter, Download, Calendar } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  users?: {
    id: string;
    email?: string;
    nickname?: string;
  };
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterResource, dateRange]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = insforge.database
        .from('audit_logs')
        .select('*, users(*)')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }
      if (filterResource !== 'all') {
        query = query.eq('resource_type', filterResource);
      }

      const { data } = await query;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csvRows = [
      ['Date', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details'],
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.users?.email || 'System',
        log.action,
        log.resource_type,
        log.resource_id || 'N/A',
        log.ip_address || 'N/A',
        JSON.stringify(log.details || {})
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueResources = Array.from(new Set(logs.map(l => l.resource_type)));

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Audit Logs</h1>
          <p className="text-gray-600">Track all system actions and security events</p>
        </div>
        <Button onClick={exportLogs} variant="primary">
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Resources</option>
            {uniqueResources.map(resource => (
              <option key={resource} value={resource}>{resource}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Date & Time</th>
                <th className="text-left py-3 px-6">User</th>
                <th className="text-left py-3 px-6">Action</th>
                <th className="text-left py-3 px-6">Resource</th>
                <th className="text-left py-3 px-6">IP Address</th>
                <th className="text-left py-3 px-6">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-muted-gray">
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    {log.users?.email || log.users?.nickname || 'System'}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      log.action.includes('delete') ? 'bg-red-100 text-red-800' :
                      log.action.includes('create') || log.action.includes('insert') ? 'bg-green-100 text-green-800' :
                      log.action.includes('update') ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm">{log.resource_type}</span>
                    {log.resource_id && (
                      <span className="text-xs text-gray-500 ml-2">({log.resource_id.substring(0, 8)}...)</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {log.ip_address || 'N/A'}
                  </td>
                  <td className="py-4 px-6">
                    {log.details && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-w-md">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No audit logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}

