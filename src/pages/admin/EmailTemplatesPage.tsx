import React, { useEffect, useState } from 'react';
import { Mail, Plus, Edit, Trash2, Eye, Send, Calendar } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables?: any;
  is_active: boolean;
}

interface ScheduledEmail {
  id: string;
  template_id?: string;
  recipient_email: string;
  subject: string;
  scheduled_for: string;
  status: string;
  email_templates?: EmailTemplate;
}

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'scheduled'>('templates');
  const [formData, setFormData] = useState({
    template_key: '',
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesRes, scheduledRes] = await Promise.all([
        insforge.database
          .from('email_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('scheduled_emails')
          .select('*, email_templates(*)')
          .order('scheduled_for', { ascending: false })
          .limit(50)
      ]);

      setTemplates(templatesRes.data || []);
      setScheduled(scheduledRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        template_key: formData.template_key || formData.name.toLowerCase().replace(/\s+/g, '_')
      };

      if (editingTemplate) {
        await insforge.database
          .from('email_templates')
          .update(data)
          .eq('id', editingTemplate.id);
      } else {
        await insforge.database
          .from('email_templates')
          .insert(data);
      }

      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
  };

  const resetForm = () => {
    setFormData({
      template_key: '',
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      is_active: true
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_key: template.template_key,
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || '',
      is_active: template.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await insforge.database
        .from('email_templates')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const previewTemplate = (template: EmailTemplate) => {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) return;

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Preview: ${template.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
            .email-preview { border: 1px solid #ddd; padding: 20px; }
          </style>
        </head>
        <body>
          <h2>${template.subject}</h2>
          <div class="email-preview">
            ${template.body_html}
          </div>
        </body>
      </html>
    `);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading email templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Email Templates</h1>
          <p className="text-gray-600">Create and manage email templates</p>
        </div>
        <Button onClick={() => {
          setEditingTemplate(null);
          resetForm();
          setShowForm(true);
        }} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'templates'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'scheduled'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Scheduled Emails ({scheduled.length})
          </button>
        </div>
      </div>

      {/* Template Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <h2 className="text-xl font-bold text-navy-ink mb-4">
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Key *</label>
                <input
                  type="text"
                  value={formData.template_key}
                  onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  placeholder="e.g., donation_confirmation"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HTML Body *</label>
              <textarea
                value={formData.body_html}
                onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold font-mono text-sm"
                rows={10}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use HTML. Variables: {'{{name}}'}, {'{{amount}}'}, {'{{date}}'}, etc.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plain Text Body (Optional)</label>
              <textarea
                value={formData.body_text}
                onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                rows={5}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Save Template</Button>
              <Button type="button" onClick={() => {
                setShowForm(false);
                setEditingTemplate(null);
                resetForm();
              }} variant="outline">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">Name</th>
                  <th className="text-left py-3 px-6">Key</th>
                  <th className="text-left py-3 px-6">Subject</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b">
                    <td className="py-4 px-6 font-medium">{template.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-mono">{template.template_key}</td>
                    <td className="py-4 px-6">{template.subject}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => previewTemplate(template)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {templates.length === 0 && (
            <div className="p-12 text-center">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No email templates yet</p>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Emails Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y">
            {scheduled.map((email) => (
              <div key={email.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-navy-ink">{email.subject}</p>
                    <p className="text-sm text-gray-600">
                      To: {email.recipient_email}
                    </p>
                    <p className="text-sm text-gray-600">
                      Scheduled: {new Date(email.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    email.status === 'sent' ? 'bg-green-100 text-green-800' :
                    email.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    email.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {email.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {scheduled.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No scheduled emails</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

