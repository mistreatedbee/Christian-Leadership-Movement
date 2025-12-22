import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Edit, Trash2, Send, Settings, CheckCircle } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface SMSConfig {
  id: string;
  provider: string;
  api_key?: string;
  api_secret?: string;
  sender_id?: string;
  is_active: boolean;
}

interface SMSTemplate {
  id: string;
  template_key: string;
  name: string;
  message: string;
  variables?: any;
  is_active: boolean;
}

interface ScheduledSMS {
  id: string;
  template_id?: string;
  recipient_phone: string;
  message: string;
  scheduled_for: string;
  status: string;
  sms_templates?: SMSTemplate;
}

export function SMSNotificationsPage() {
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledSMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'scheduled'>('config');
  const [configFormData, setConfigFormData] = useState({
    provider: 'twilio',
    api_key: '',
    api_secret: '',
    sender_id: '',
    is_active: false
  });
  const [templateFormData, setTemplateFormData] = useState({
    template_key: '',
    name: '',
    message: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, templatesRes, scheduledRes] = await Promise.all([
        insforge.database
          .from('sms_config')
          .select('*')
          .single(),
        insforge.database
          .from('sms_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('scheduled_sms')
          .select('*, sms_templates(*)')
          .order('scheduled_for', { ascending: false })
          .limit(50)
      ]);

      setConfig(configRes.data);
      setTemplates(templatesRes.data || []);
      setScheduled(scheduledRes.data || []);

      if (configRes.data) {
        setConfigFormData({
          provider: configRes.data.provider,
          api_key: configRes.data.api_key || '',
          api_secret: configRes.data.api_secret || '',
          sender_id: configRes.data.sender_id || '',
          is_active: configRes.data.is_active
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (config) {
        await insforge.database
          .from('sms_config')
          .update(configFormData)
          .eq('id', config.id);
      } else {
        await insforge.database
          .from('sms_config')
          .insert(configFormData);
      }
      setShowConfigForm(false);
      fetchData();
      alert('SMS configuration saved!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...templateFormData,
        template_key: templateFormData.template_key || templateFormData.name.toLowerCase().replace(/\s+/g, '_')
      };

      if (editingTemplate) {
        await insforge.database
          .from('sms_templates')
          .update(data)
          .eq('id', editingTemplate.id);
      } else {
        await insforge.database
          .from('sms_templates')
          .insert(data);
      }

      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateFormData({
        template_key: '',
        name: '',
        message: '',
        is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await insforge.database
        .from('sms_templates')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const sendTestSMS = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const phone = prompt('Enter phone number to send test SMS:');
    if (!phone) return;

    try {
      // In a real app, this would call a backend function
      alert(`Test SMS would be sent to ${phone} with message: ${template.message}`);
    } catch (error) {
      console.error('Error sending test SMS:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading SMS settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">SMS Notifications</h1>
          <p className="text-gray-600">Configure SMS provider and manage SMS templates</p>
        </div>
        {activeTab === 'templates' && (
          <Button onClick={() => {
            setEditingTemplate(null);
            setTemplateFormData({
              template_key: '',
              name: '',
              message: '',
              is_active: true
            });
            setShowTemplateForm(true);
          }} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'config'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Configuration
          </button>
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
            Scheduled ({scheduled.length})
          </button>
        </div>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-navy-ink">SMS Provider Configuration</h2>
            {config?.is_active && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Active
              </span>
            )}
          </div>
          {!showConfigForm ? (
            <div>
              {config ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Provider</p>
                    <p className="font-semibold capitalize">{config.provider}</p>
                  </div>
                  {config.sender_id && (
                    <div>
                      <p className="text-sm text-gray-600">Sender ID</p>
                      <p className="font-semibold">{config.sender_id}</p>
                    </div>
                  )}
                  <Button onClick={() => setShowConfigForm(true)} variant="primary">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Configuration
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">No SMS configuration found. Set up your provider to enable SMS notifications.</p>
                  <Button onClick={() => setShowConfigForm(true)} variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Configure SMS Provider
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider *</label>
                <select
                  value={configFormData.provider}
                  onChange={(e) => setConfigFormData({ ...configFormData, provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  required
                >
                  <option value="twilio">Twilio</option>
                  <option value="africas_talking">Africa's Talking</option>
                  <option value="clickatell">Clickatell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key *</label>
                <input
                  type="text"
                  value={configFormData.api_key}
                  onChange={(e) => setConfigFormData({ ...configFormData, api_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Secret *</label>
                <input
                  type="password"
                  value={configFormData.api_secret}
                  onChange={(e) => setConfigFormData({ ...configFormData, api_secret: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sender ID</label>
                <input
                  type="text"
                  value={configFormData.sender_id}
                  onChange={(e) => setConfigFormData({ ...configFormData, sender_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                  placeholder="CLM"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={configFormData.is_active}
                  onChange={(e) => setConfigFormData({ ...configFormData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Activate SMS notifications</label>
              </div>
              <div className="flex gap-4">
                <Button type="submit" variant="primary">Save Configuration</Button>
                <Button type="button" onClick={() => setShowConfigForm(false)} variant="outline">Cancel</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {showTemplateForm && (
            <div className="bg-white p-6 rounded-card shadow-soft mb-6">
              <h2 className="text-xl font-bold text-navy-ink mb-4">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Key *</label>
                  <input
                    type="text"
                    value={templateFormData.template_key}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, template_key: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    placeholder="payment_confirmation"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    value={templateFormData.message}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    rows={4}
                    maxLength={160}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {templateFormData.message.length}/160 characters. Use {'{{variable}}'} for dynamic content.
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={templateFormData.is_active}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Active</label>
                </div>
                <div className="flex gap-4">
                  <Button type="submit" variant="primary">Save Template</Button>
                  <Button type="button" onClick={() => {
                    setShowTemplateForm(false);
                    setEditingTemplate(null);
                  }} variant="outline">Cancel</Button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-card shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted-gray">
                  <tr>
                    <th className="text-left py-3 px-6">Name</th>
                    <th className="text-left py-3 px-6">Key</th>
                    <th className="text-left py-3 px-6">Message</th>
                    <th className="text-left py-3 px-6">Status</th>
                    <th className="text-left py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b">
                      <td className="py-4 px-6 font-medium">{template.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 font-mono">{template.template_key}</td>
                      <td className="py-4 px-6 text-sm">{template.message}</td>
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
                            onClick={() => sendTestSMS(template.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Send Test"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateFormData({
                                template_key: template.template_key,
                                name: template.name,
                                message: template.message,
                                is_active: template.is_active
                              });
                              setShowTemplateForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
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
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No SMS templates yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scheduled SMS Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y">
            {scheduled.map((sms) => (
              <div key={sms.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-navy-ink">{sms.message}</p>
                    <p className="text-sm text-gray-600">
                      To: {sms.recipient_phone}
                    </p>
                    <p className="text-sm text-gray-600">
                      Scheduled: {new Date(sms.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    sms.status === 'sent' ? 'bg-green-100 text-green-800' :
                    sms.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    sms.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {sms.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {scheduled.length === 0 && (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No scheduled SMS</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

