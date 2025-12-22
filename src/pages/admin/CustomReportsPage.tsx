import React, { useEffect, useState } from 'react';
import { FileText, Plus, Play, Download, Calendar, Settings, Trash2 } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  query_config: any;
  export_formats: string[];
  schedule_config?: any;
  is_active: boolean;
}

interface ReportRun {
  id: string;
  template_id: string;
  status: string;
  file_url?: string;
  started_at: string;
  completed_at?: string;
  report_templates?: ReportTemplate;
}

export function CustomReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'users',
    query_config: {},
    export_formats: ['pdf', 'excel'] as string[],
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesRes, runsRes] = await Promise.all([
        insforge.database
          .from('report_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('report_runs')
          .select('*, report_templates(*)')
          .order('started_at', { ascending: false })
          .limit(20)
      ]);

      setTemplates(templatesRes.data || []);
      setRuns(runsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await insforge.database
        .from('report_templates')
        .insert({
          ...formData,
          query_config: getDefaultQueryConfig(formData.report_type)
        });

      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        report_type: 'users',
        query_config: {},
        export_formats: ['pdf', 'excel'],
        is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Error creating template');
    }
  };

  const getDefaultQueryConfig = (reportType: string) => {
    const configs: Record<string, any> = {
      users: {
        table: 'user_profiles',
        columns: ['user_id', 'phone', 'city', 'province', 'role'],
        filters: {},
        groupBy: null
      },
      donations: {
        table: 'donations',
        columns: ['amount', 'campaign_name', 'created_at'],
        filters: { status: 'confirmed' },
        groupBy: 'campaign_name'
      },
      applications: {
        table: 'applications',
        columns: ['program_type', 'status', 'created_at'],
        filters: {},
        groupBy: 'program_type'
      },
      payments: {
        table: 'payments',
        columns: ['amount', 'payment_type', 'status', 'created_at'],
        filters: {},
        groupBy: 'payment_type'
      }
    };
    return configs[reportType] || {};
  };

  const runReport = async (templateId: string) => {
    try {
      // Create report run
      const { data: run } = await insforge.database
        .from('report_runs')
        .insert({
          template_id: templateId,
          status: 'running'
        })
        .select()
        .single();

      // Simulate report generation (in real app, this would be a backend job)
      setTimeout(async () => {
        await insforge.database
          .from('report_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            file_url: `#report-${run.id}` // Placeholder
          })
          .eq('id', run.id);
        fetchData();
      }, 2000);

      fetchData();
      alert('Report generation started!');
    } catch (error) {
      console.error('Error running report:', error);
      alert('Error running report');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await insforge.database
        .from('report_templates')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Custom Reports Builder</h1>
          <p className="text-gray-600">Create and schedule custom reports</p>
        </div>
        <Button onClick={() => setShowForm(true)} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Create Template Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Create Report Template</h2>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type *</label>
              <select
                value={formData.report_type}
                onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              >
                <option value="users">Users</option>
                <option value="donations">Donations</option>
                <option value="applications">Applications</option>
                <option value="payments">Payments</option>
                <option value="courses">Courses</option>
                <option value="events">Events</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Formats</label>
              <div className="space-y-2">
                {['pdf', 'excel', 'csv'].map((format) => (
                  <label key={format} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.export_formats.includes(format)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            export_formats: [...formData.export_formats, format]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            export_formats: formData.export_formats.filter(f => f !== format)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="capitalize">{format}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Create Template</Button>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Templates */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-navy-ink">Report Templates</h2>
        </div>
        <div className="divide-y">
          {templates.map((template) => (
            <div key={template.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-navy-ink">{template.name}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded capitalize">
                      {template.report_type}
                    </span>
                    {template.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Inactive</span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-gray-600 mb-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Formats: {template.export_formats.join(', ').toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => runReport(template.id)}
                    variant="primary"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run
                  </Button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {templates.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No report templates yet</p>
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-navy-ink">Recent Report Runs</h2>
        </div>
        <div className="divide-y">
          {runs.map((run) => (
            <div key={run.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-navy-ink">
                    {run.report_templates?.name || 'Unknown Report'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Started: {new Date(run.started_at).toLocaleString()}
                    {run.completed_at && (
                      <span> • Completed: {new Date(run.completed_at).toLocaleString()}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    run.status === 'completed' ? 'bg-green-100 text-green-800' :
                    run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    run.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {run.status}
                  </span>
                  {run.status === 'completed' && run.file_url && (
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {runs.length === 0 && (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No report runs yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

