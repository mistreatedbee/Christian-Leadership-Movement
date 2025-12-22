import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Database, Globe, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { useForm } from 'react-hook-form';

interface SettingsFormData {
  organizationName: string;
  contactEmail: string;
  phoneNumber: string;
  emailNotifications: boolean;
  smsAlerts: boolean;
  weeklyReports: boolean;
  approvalWorkflow: string;
  certificateTemplate: string;
  defaultLanguage: string;
  timeZone: string;
}

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SettingsFormData>({
    defaultValues: {
      organizationName: 'Christian Leadership Movement',
      contactEmail: 'kenstraining04@gmail.com',
      phoneNumber: '073 204 7642',
      emailNotifications: true,
      smsAlerts: true,
      weeklyReports: false,
      approvalWorkflow: 'single',
      certificateTemplate: 'template_a',
      defaultLanguage: 'english',
      timeZone: 'SAST'
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch settings from content_sections or a dedicated settings table
      // For now, we'll use content_sections for organization info
      const { data: orgInfo } = await insforge.database
        .from('content_sections')
        .select('*')
        .eq('section_type', 'organization_info')
        .maybeSingle();

      if (orgInfo) {
        const parsed = JSON.parse(orgInfo.content || '{}');
        reset({
          organizationName: parsed.organizationName || 'Christian Leadership Movement',
          contactEmail: parsed.contactEmail || 'kenstraining04@gmail.com',
          phoneNumber: parsed.phoneNumber || '073 204 7642',
          emailNotifications: parsed.emailNotifications !== false,
          smsAlerts: parsed.smsAlerts !== false,
          weeklyReports: parsed.weeklyReports === true,
          approvalWorkflow: parsed.approvalWorkflow || 'single',
          certificateTemplate: parsed.certificateTemplate || 'template_a',
          defaultLanguage: parsed.defaultLanguage || 'english',
          timeZone: parsed.timeZone || 'SAST'
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    setMessage(null);

    try {
      // Save settings to content_sections table
      const settingsData = {
        organizationName: data.organizationName,
        contactEmail: data.contactEmail,
        phoneNumber: data.phoneNumber,
        emailNotifications: data.emailNotifications,
        smsAlerts: data.smsAlerts,
        weeklyReports: data.weeklyReports,
        approvalWorkflow: data.approvalWorkflow,
        certificateTemplate: data.certificateTemplate,
        defaultLanguage: data.defaultLanguage,
        timeZone: data.timeZone
      };

      // Check if organization_info section exists
      const { data: existing } = await insforge.database
        .from('content_sections')
        .select('id')
        .eq('section_type', 'organization_info')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await insforge.database
          .from('content_sections')
          .update({
            content: JSON.stringify(settingsData),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await insforge.database
          .from('content_sections')
          .insert([{
            section_type: 'organization_info',
            title: 'Organization Information',
            content: JSON.stringify(settingsData)
          }]);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Settings</h1>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage system configuration and preferences
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Settings Sections */}
        <div className="grid grid-cols-1 gap-6">
          {/* General Settings */}
          <div className="bg-white rounded-card shadow-soft p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="text-blue-500" size={24} />
              <h2 className="text-xl font-bold text-navy-ink">
                General Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  {...register('organizationName', { required: 'Organization name is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {errors.organizationName && (
                  <p className="text-red-500 text-sm mt-1">{errors.organizationName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  {...register('contactEmail', {
                    required: 'Contact email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {errors.contactEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactEmail.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  {...register('phoneNumber', { required: 'Phone number is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-card shadow-soft p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Bell className="text-purple-500" size={24} />
              <h2 className="text-xl font-bold text-navy-ink">
                Notification Settings
              </h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-muted-gray rounded-card cursor-pointer">
                <span className="text-navy-ink">
                  Email notifications for new applications
                </span>
                <input
                  type="checkbox"
                  {...register('emailNotifications')}
                  className="w-5 h-5"
                />
              </label>
              <label className="flex items-center justify-between p-4 bg-muted-gray rounded-card cursor-pointer">
                <span className="text-navy-ink">
                  SMS alerts for urgent matters
                </span>
                <input
                  type="checkbox"
                  {...register('smsAlerts')}
                  className="w-5 h-5"
                />
              </label>
              <label className="flex items-center justify-between p-4 bg-muted-gray rounded-card cursor-pointer">
                <span className="text-navy-ink">Weekly summary reports</span>
                <input
                  type="checkbox"
                  {...register('weeklyReports')}
                  className="w-5 h-5"
                />
              </label>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-card shadow-soft p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="text-green-500" size={24} />
              <h2 className="text-xl font-bold text-navy-ink">System Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Application Approval Workflow
                </label>
                <select
                  {...register('approvalWorkflow', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="single">Single Approval</option>
                  <option value="two_stage">Two-Stage Approval</option>
                  <option value="three_stage">Three-Stage Approval</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Certificate Template
                </label>
                <select
                  {...register('certificateTemplate', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="template_a">Template A</option>
                  <option value="template_b">Template B</option>
                  <option value="template_c">Template C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white rounded-card shadow-soft p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Globe className="text-amber-500" size={24} />
              <h2 className="text-xl font-bold text-navy-ink">
                Regional Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Default Language
                </label>
                <select
                  {...register('defaultLanguage', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="english">English</option>
                  <option value="afrikaans">Afrikaans</option>
                  <option value="zulu">Zulu</option>
                  <option value="xhosa">Xhosa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Time Zone
                </label>
                <select
                  {...register('timeZone', { required: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="SAST">South Africa Standard Time (SAST)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button type="submit" variant="primary" size="lg" disabled={saving}>
            <Save size={20} className="mr-2" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
