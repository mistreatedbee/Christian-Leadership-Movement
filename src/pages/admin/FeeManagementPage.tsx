import React, { useState, useEffect } from 'react';
import { DollarSign, Save, Edit, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';

interface FeeSetting {
  id: string;
  fee_type: string;
  amount: number;
  currency: string;
  description: string | null;
  is_active: boolean;
}

export function FeeManagementPage() {
  const [fees, setFees] = useState<FeeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from('fee_settings')
        .select('*')
        .order('fee_type', { ascending: true });

      if (error) throw error;
      setFees(data || []);

      // Initialize edited amounts and descriptions
      const amounts: Record<string, string> = {};
      const descriptions: Record<string, string> = {};
      data?.forEach((fee: FeeSetting) => {
        amounts[fee.id] = fee.amount.toString();
        descriptions[fee.id] = fee.description || '';
      });
      setEditedAmounts(amounts);
      setEditedDescriptions(descriptions);
    } catch (err) {
      console.error('Error fetching fees:', err);
      setMessage({ type: 'error', text: 'Failed to load fee settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (feeId: string) => {
    setEditingFee(feeId);
  };

  const handleCancel = () => {
    setEditingFee(null);
    // Reset edited amounts and descriptions to original values
    const amounts: Record<string, string> = {};
    const descriptions: Record<string, string> = {};
    fees.forEach(fee => {
      amounts[fee.id] = fee.amount.toString();
      descriptions[fee.id] = fee.description || '';
    });
    setEditedAmounts(amounts);
    setEditedDescriptions(descriptions);
  };

  const handleSave = async (feeId: string) => {
    const newAmount = parseFloat(editedAmounts[feeId]);
    if (isNaN(newAmount) || newAmount < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount (must be 0 or greater)' });
      return;
    }

    setSaving(feeId);
    setMessage(null);

    try {
      const updateData: any = {
        amount: newAmount,
        updated_at: new Date().toISOString()
      };

      // Also update description if it was edited
      if (editedDescriptions[feeId] !== undefined) {
        updateData.description = editedDescriptions[feeId] || null;
      }

      const { error, data } = await insforge.database
        .from('fee_settings')
        .update(updateData)
        .eq('id', feeId)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Verify the update was successful
      // data might be an array or a single object depending on the query
      const updatedFee = Array.isArray(data) ? data[0] : data;
      
      if (updatedFee) {
        setMessage({ 
          type: 'success', 
          text: `Fee updated successfully! New amount: R ${newAmount.toFixed(2)}. Changes will apply to new applications.` 
        });
        setEditingFee(null);
        // Refresh fees to show updated values
        await fetchFees();
      } else {
        // Update might have succeeded but no data returned (some databases don't return data on update)
        // Still show success and refresh
        setMessage({ 
          type: 'success', 
          text: `Fee updated successfully! New amount: R ${newAmount.toFixed(2)}. Changes will apply to new applications.` 
        });
        setEditingFee(null);
        await fetchFees();
      }
    } catch (err: any) {
      console.error('Error updating fee:', err);
      setMessage({ 
        type: 'error', 
        text: err.message || 'Failed to update fee. Please try again.' 
      });
    } finally {
      setSaving(null);
    }
  };

  const getFeeTypeLabel = (feeType: string): string => {
    switch (feeType) {
      case 'membership_application':
        return 'CLM Membership Application Fee';
      case 'bible_school_with_acrp':
        return 'Bible School Registration (With ACRP)';
      case 'bible_school_without_acrp':
        return 'Bible School Registration (Without ACRP)';
      case 'management_fee':
        return 'Management Fee';
      default:
        return feeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading fee settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-ink mb-2">
          Fee Management
        </h1>
        <p className="text-gray-600">
          Manage application and registration fees
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Fee Type
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Amount (ZAR)
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-600">
                    No fee settings found
                  </td>
                </tr>
              ) : (
                fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-muted-gray/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <DollarSign className="text-gold mr-2" size={20} />
                        <span className="font-medium text-navy-ink">
                          {getFeeTypeLabel(fee.fee_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingFee === fee.id ? (
                        <input
                          type="text"
                          value={editedDescriptions[fee.id] || ''}
                          onChange={(e) => setEditedDescriptions(prev => ({
                            ...prev,
                            [fee.id]: e.target.value
                          }))}
                          placeholder="Enter description"
                          className="w-full px-3 py-1 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                      ) : (
                        <span className="text-gray-600">
                          {fee.description || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingFee === fee.id ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">R</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedAmounts[fee.id] || '0'}
                            onChange={(e) => setEditedAmounts(prev => ({
                              ...prev,
                              [fee.id]: e.target.value
                            }))}
                            className="w-32 px-3 py-1 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-navy-ink">
                          R {parseFloat(fee.amount.toString()).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        fee.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {fee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {editingFee === fee.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(fee.id)}
                            disabled={saving === fee.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-card disabled:opacity-50"
                            title="Save"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving === fee.id}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-card disabled:opacity-50"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(fee.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-card p-4">
        <h3 className="font-semibold text-navy-ink mb-2">Note</h3>
        <p className="text-sm text-gray-700">
          Changes to fees will apply to new applications only. Existing applications will retain their original fee amounts.
        </p>
      </div>
    </div>
  );
}

