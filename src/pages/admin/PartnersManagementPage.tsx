import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Upload, X, Save, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useUser } from '@insforge/react';
import { useForm } from 'react-hook-form';
import { insforge } from '../../lib/insforge';
import { getStorageUrl } from '../../lib/connection';

interface Partner {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  logo_key: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  partner_type: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface PartnerFormData {
  name: string;
  description: string;
  website_url: string;
  contact_email: string;
  contact_phone: string;
  partner_type: string;
  is_active: boolean;
  display_order: number;
}

export function PartnersManagementPage() {
  const { user } = useUser();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<PartnerFormData>({
    defaultValues: {
      is_active: true,
      display_order: 0,
      partner_type: 'educational'
    }
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const { data, error } = await insforge.database
        .from('partners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (err: any) {
      console.error('Error fetching partners:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch partners' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    reset();
    setEditingPartner(null);
    setLogoFile(null);
    setValue('is_active', true);
    setValue('display_order', 0);
    setValue('partner_type', 'educational');
    setShowForm(true);
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setValue('name', partner.name);
    setValue('description', partner.description || '');
    setValue('website_url', partner.website_url || '');
    setValue('contact_email', partner.contact_email || '');
    setValue('contact_phone', partner.contact_phone || '');
    setValue('partner_type', partner.partner_type || 'educational');
    setValue('is_active', partner.is_active);
    setValue('display_order', partner.display_order);
    setLogoFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this partner? This action cannot be undone.')) return;

    try {
      const partner = partners.find(p => p.id === id);
      
      // Delete logo from storage if it exists
      if (partner?.logo_key) {
        try {
          await insforge.storage.from('gallery').remove([partner.logo_key]);
        } catch (storageErr) {
          console.warn('Could not delete logo from storage:', storageErr);
          // Continue with partner deletion even if logo deletion fails
        }
      }

      // Delete partner record
      const { error } = await insforge.database
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchPartners();
      setMessage({ type: 'success', text: 'Partner deleted successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting partner:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete partner' });
    }
  };

  const onSubmit = async (data: PartnerFormData) => {
    try {
      let logoUrl = editingPartner?.logo_url || null;
      let logoKey = editingPartner?.logo_key || null;

      // Upload logo if provided
      if (logoFile) {
        if (!user) {
          throw new Error('User must be logged in to upload files');
        }

        // Use upload helper to ensure user exists
        const { uploadFileWithUserCheck } = await import('../../lib/uploadHelpers');
        const uploadData = await uploadFileWithUserCheck(
          'gallery',
          `partners/${user.id}/${Date.now()}_${logoFile.name}`,
          logoFile,
          user.id,
          user.email || null,
          user.name || null
        );

        logoUrl = uploadData.url;
        logoKey = uploadData.key;

        // Delete old logo if exists
        if (editingPartner?.logo_key) {
          try {
            await insforge.storage.from('gallery').remove([editingPartner.logo_key]);
          } catch (removeErr) {
            console.warn('Could not remove old logo:', removeErr);
            // Continue with update even if old logo deletion fails
          }
        }
      }

      const partnerData: any = {
        name: data.name,
        description: data.description || null,
        website_url: data.website_url || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        partner_type: data.partner_type || null,
        is_active: data.is_active,
        display_order: parseInt(data.display_order.toString()) || 0,
        updated_at: new Date().toISOString()
      };

      if (logoUrl) partnerData.logo_url = logoUrl;
      if (logoKey) partnerData.logo_key = logoKey;

      if (editingPartner) {
        const { data: updated, error: updateError } = await insforge.database
          .from('partners')
          .update(partnerData)
          .eq('id', editingPartner.id)
          .select()
          .single();

        if (updateError) throw updateError;
        setMessage({ type: 'success', text: 'Partner updated successfully!' });
      } else {
        partnerData.created_by = user?.id;
        const { data: inserted, error: insertError } = await insforge.database
          .from('partners')
          .insert([partnerData])
          .select()
          .single();

        if (insertError) throw insertError;
        setMessage({ type: 'success', text: 'Partner created successfully!' });
      }

      reset();
      setShowForm(false);
      setEditingPartner(null);
      setLogoFile(null);
      fetchPartners();
    } catch (err: any) {
      console.error('Error saving partner:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save partner' });
    }
  };

  const partnerTypes = [
    { value: 'educational', label: 'Educational Institution' },
    { value: 'government', label: 'Government Organization' },
    { value: 'ministry', label: 'Ministry' },
    { value: 'church', label: 'Church' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">Partners Management</h1>
          <p className="text-gray-600">Manage partner organizations and their information</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={20} className="mr-2" />
          Add Partner
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-card shadow-soft p-6">
          {partners.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No partners found. Create one to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map(partner => {
                const logoUrl = partner.logo_key 
                  ? getStorageUrl('gallery', partner.logo_key) 
                  : partner.logo_url;
                
                return (
                  <div key={partner.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={partner.name}
                            className="max-h-20 max-w-full object-contain mb-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-20 h-16 bg-gray-200 rounded flex items-center justify-center mb-3"
                          style={{ display: logoUrl ? 'none' : 'flex' }}
                        >
                          <ImageIcon className="text-gray-400" size={24} />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(partner)}
                          title="Edit Partner"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(partner.id)}
                          title="Delete Partner"
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-navy-ink mb-2">{partner.name}</h3>
                    {partner.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{partner.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {partner.partner_type && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {partner.partner_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded ${
                        partner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {partner.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {partner.website_url && (
                        <a
                          href={partner.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                          title="Visit Website"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Website
                        </a>
                      )}
                    </div>
                    {partner.display_order !== undefined && (
                      <div className="mt-2 text-xs text-gray-500">
                        Display Order: {partner.display_order}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-soft p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">
                {editingPartner ? 'Edit' : 'Create'} Partner
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Name *</label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Partner Type</label>
                  <select
                    {...register('partner_type')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    {partnerTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Display Order</label>
                  <input
                    type="number"
                    {...register('display_order', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Website URL</label>
                  <input
                    type="url"
                    {...register('website_url')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-ink mb-2">Contact Email</label>
                  <input
                    type="email"
                    {...register('contact_email')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">Contact Phone</label>
                <input
                  type="tel"
                  {...register('contact_phone')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-ink mb-2">
                  Logo / Image *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validate file size (max 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
                        e.target.value = '';
                        return;
                      }
                      // Validate file type
                      if (!file.type.startsWith('image/')) {
                        setMessage({ type: 'error', text: 'Please select a valid image file' });
                        e.target.value = '';
                        return;
                      }
                      setLogoFile(file);
                      setMessage(null);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: PNG, JPG, or SVG. Max size: 5MB. Square or landscape images work best.
                </p>
                {editingPartner && (editingPartner.logo_url || editingPartner.logo_key) && !logoFile && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-card">
                    <p className="text-sm text-gray-600 mb-2">Current logo:</p>
                    <img
                      src={editingPartner.logo_key ? getStorageUrl('gallery', editingPartner.logo_key) : editingPartner.logo_url || ''}
                      alt="Current logo"
                      className="max-h-20 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Upload a new image to replace the current logo.
                    </p>
                  </div>
                )}
                {logoFile && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-card">
                    <p className="text-sm text-blue-700 mb-2">New logo selected:</p>
                    <img
                      src={URL.createObjectURL(logoFile)}
                      alt="Preview"
                      className="max-h-20 object-contain"
                    />
                    <p className="text-xs text-blue-600 mt-2">{logoFile.name} ({(logoFile.size / 1024).toFixed(2)} KB)</p>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={watch('is_active') || false}
                  onChange={(e) => setValue('is_active', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-navy-ink">Active</label>
              </div>

              <div className="flex space-x-4">
                <Button type="submit" variant="primary">
                  <Save className="mr-2" size={16} />
                  {editingPartner ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

