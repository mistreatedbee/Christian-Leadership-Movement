import React, { useEffect, useState } from 'react';
import { Bell, Plus, Edit, Trash2, Send, Settings, CheckCircle, XCircle } from 'lucide-react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface PushConfig {
  id: string;
  vapid_public_key?: string;
  vapid_private_key?: string;
  is_active: boolean;
}

interface PushTemplate {
  id: string;
  template_key: string;
  title: string;
  body: string;
  icon_url?: string;
  badge_url?: string;
  action_url?: string;
  is_active: boolean;
}

interface ScheduledPush {
  id: string;
  template_id?: string;
  title: string;
  body: string;
  scheduled_for: string;
  status: string;
  push_templates?: PushTemplate;
}

export function PushNotificationsPage() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [templates, setTemplates] = useState<PushTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPush[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PushTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'scheduled' | 'subscriptions'>('config');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [configFormData, setConfigFormData] = useState({
    vapid_public_key: '',
    vapid_private_key: '',
    is_active: false
  });
  const [templateFormData, setTemplateFormData] = useState({
    template_key: '',
    title: '',
    body: '',
    icon_url: '',
    badge_url: '',
    action_url: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
    requestNotificationPermission();
  }, [activeTab]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, templatesRes, scheduledRes, subscriptionsRes] = await Promise.all([
        insforge.database
          .from('push_config')
          .select('*')
          .single(),
        insforge.database
          .from('push_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        insforge.database
          .from('scheduled_push')
          .select('*, push_templates(*)')
          .order('scheduled_for', { ascending: false })
          .limit(50),
        insforge.database
          .from('push_subscriptions')
          .select('*, users(*)')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      setConfig(configRes.data);
      setTemplates(templatesRes.data || []);
      setScheduled(scheduledRes.data || []);
      setSubscriptions(subscriptionsRes.data || []);

      if (configRes.data) {
        setConfigFormData({
          vapid_public_key: configRes.data.vapid_public_key || '',
          vapid_private_key: configRes.data.vapid_private_key || '',
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
          .from('push_config')
          .update(configFormData)
          .eq('id', config.id);
      } else {
        await insforge.database
          .from('push_config')
          .insert(configFormData);
      }
      setShowConfigForm(false);
      fetchData();
      alert('Push notification configuration saved!');
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
        template_key: templateFormData.template_key || templateFormData.title.toLowerCase().replace(/\s+/g, '_')
      };

      if (editingTemplate) {
        await insforge.database
          .from('push_templates')
          .update(data)
          .eq('id', editingTemplate.id);
      } else {
        await insforge.database
          .from('push_templates')
          .insert(data);
      }

      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateFormData({
        template_key: '',
        title: '',
        body: '',
        icon_url: '',
        badge_url: '',
        action_url: '',
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
        .from('push_templates')
        .delete()
        .eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const sendTestPush = async (templateId: string) => {
    if (!('Notification' in window)) {
      alert('Push notifications are not supported in this browser');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied');
        return;
      }
    }

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    try {
      // In a real app, this would use the Push API and service worker
      new Notification(template.title, {
        body: template.body,
        icon: template.icon_url || '/icon-192x192.png',
        badge: template.badge_url || '/badge-72x72.png',
        tag: template.template_key,
        requireInteraction: false
      });
      alert('Test push notification sent!');
    } catch (error) {
      console.error('Error sending test push:', error);
      alert('Error sending test notification');
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: configFormData.vapid_public_key
      });

      // Save subscription to database
      await insforge.database
        .from('push_subscriptions')
        .insert({
          endpoint: subscription.endpoint,
          keys: JSON.stringify(subscription.toJSON().keys)
        });

      alert('Successfully subscribed to push notifications!');
      fetchData();
    } catch (error) {
      console.error('Error subscribing to push:', error);
      alert('Error subscribing to push notifications');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading push notification settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Push Notifications</h1>
          <p className="text-gray-600">Configure browser push notifications</p>
        </div>
        {activeTab === 'templates' && (
          <Button onClick={() => {
            setEditingTemplate(null);
            setTemplateFormData({
              template_key: '',
              title: '',
              body: '',
              icon_url: '',
              badge_url: '',
              action_url: '',
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
        <div className="flex gap-4 flex-wrap">
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
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'subscriptions'
                ? 'bg-gold text-white'
                : 'bg-muted-gray text-navy-ink hover:bg-gray-200'
            }`}
          >
            Subscriptions ({subscriptions.length})
          </button>
        </div>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="bg-white p-6 rounded-card shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-navy-ink">Push Notification Configuration</h2>
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
                    <p className="text-sm text-gray-600">VAPID Public Key</p>
                    <p className="font-mono text-sm break-all">{config.vapid_public_key || 'Not set'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowConfigForm(true)} variant="primary">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Configuration
                    </Button>
                    <Button onClick={subscribeToPush} variant="secondary">
                      <Bell className="w-4 h-4 mr-2" />
                      Subscribe to Push
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">No push configuration found. Set up VAPID keys to enable push notifications.</p>
                  <Button onClick={() => setShowConfigForm(true)} variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Configure Push Notifications
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VAPID Public Key *</label>
                <input
                  type="text"
                  value={configFormData.vapid_public_key}
                  onChange={(e) => setConfigFormData({ ...configFormData, vapid_public_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold font-mono text-sm"
                  placeholder="BEl62iUYgUivxIkv69yViEuiBIa40HI..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Generate VAPID keys using web-push library</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VAPID Private Key *</label>
                <input
                  type="password"
                  value={configFormData.vapid_private_key}
                  onChange={(e) => setConfigFormData({ ...configFormData, vapid_private_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold font-mono text-sm"
                  placeholder="Private key (keep secure)"
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={configFormData.is_active}
                  onChange={(e) => setConfigFormData({ ...configFormData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Activate push notifications</label>
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
                    placeholder="event_reminder"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={templateFormData.title}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    maxLength={50}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Body *</label>
                  <textarea
                    value={templateFormData.body}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    rows={3}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icon URL</label>
                    <input
                      type="url"
                      value={templateFormData.icon_url}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, icon_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Badge URL</label>
                    <input
                      type="url"
                      value={templateFormData.badge_url}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, badge_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action URL</label>
                    <input
                      type="url"
                      value={templateFormData.action_url}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, action_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold"
                    />
                  </div>
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
                    <th className="text-left py-3 px-6">Title</th>
                    <th className="text-left py-3 px-6">Key</th>
                    <th className="text-left py-3 px-6">Body</th>
                    <th className="text-left py-3 px-6">Status</th>
                    <th className="text-left py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b">
                      <td className="py-4 px-6 font-medium">{template.title}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 font-mono">{template.template_key}</td>
                      <td className="py-4 px-6 text-sm">{template.body}</td>
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
                            onClick={() => sendTestPush(template.id)}
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
                                title: template.title,
                                body: template.body,
                                icon_url: template.icon_url || '',
                                badge_url: template.badge_url || '',
                                action_url: template.action_url || '',
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
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No push templates yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scheduled Push Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="divide-y">
            {scheduled.map((push) => (
              <div key={push.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-navy-ink">{push.title}</p>
                    <p className="text-sm text-gray-600">{push.body}</p>
                    <p className="text-sm text-gray-600">
                      Scheduled: {new Date(push.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    push.status === 'sent' ? 'bg-green-100 text-green-800' :
                    push.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    push.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {push.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {scheduled.length === 0 && (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No scheduled push notifications</p>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-gray">
                <tr>
                  <th className="text-left py-3 px-6">User</th>
                  <th className="text-left py-3 px-6">Endpoint</th>
                  <th className="text-left py-3 px-6">Subscribed</th>
                  <th className="text-left py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b">
                    <td className="py-4 px-6">
                      {sub.users?.email || sub.users?.nickname || 'Unknown'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-mono break-all">
                      {sub.endpoint?.substring(0, 50)}...
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {subscriptions.length === 0 && (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No push subscriptions yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

