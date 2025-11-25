// Payment Webhook Handlers for PayFast and Ozow
// This file handles payment callbacks from payment gateways

import { insforge } from './insforge';

interface PayFastITNData {
  m_payment_id?: string;
  pf_payment_id?: string;
  payment_status?: string;
  item_name?: string;
  amount_gross?: string;
  amount_fee?: string;
  amount_net?: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_str4?: string;
  custom_str5?: string;
  custom_int1?: string;
  custom_int2?: string;
  custom_int3?: string;
  custom_int4?: string;
  custom_int5?: string;
  name_first?: string;
  name_last?: string;
  email_address?: string;
  cell_number?: string;
  signature?: string;
}

interface OzowWebhookData {
  SiteCode?: string;
  CountryCode?: string;
  CurrencyCode?: string;
  Amount?: string;
  TransactionReference?: string;
  BankReference?: string;
  Status?: string;
  StatusMessage?: string;
  IsTest?: string;
  Hash?: string;
}

/**
 * Verify PayFast ITN (Instant Transaction Notification) signature
 */
function verifyPayFastSignature(data: PayFastITNData, signature: string): boolean {
  // PayFast signature verification logic
  // In production, you should verify the signature using PayFast's method
  // This is a simplified version - implement proper signature verification
  const merchantKey = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
  if (!merchantKey) return false;

  // Create parameter string (excluding signature)
  const paramString = Object.keys(data)
    .filter(key => key !== 'signature' && data[key as keyof PayFastITNData])
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key as keyof PayFastITNData]!)}`)
    .join('&');

  // Add merchant key
  const fullString = `${paramString}&passphrase=${merchantKey}`;

  // Generate MD5 hash (in production, use crypto library)
  // This is a placeholder - implement proper MD5 hashing
  return true; // Simplified - implement proper verification
}

/**
 * Verify Ozow webhook signature
 */
function verifyOzowSignature(data: OzowWebhookData, hash: string): boolean {
  // Ozow signature verification logic
  const apiKey = import.meta.env.VITE_OZOW_API_KEY;
  if (!apiKey) return false;

  // Create parameter string for hashing
  const paramString = Object.keys(data)
    .filter(key => key !== 'Hash' && data[key as keyof OzowWebhookData])
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key as keyof OzowWebhookData]!)}`)
    .join('&');

  // Add API key
  const fullString = `${paramString}&PrivateKey=${apiKey}`;

  // Generate SHA512 hash (in production, use crypto library)
  // This is a placeholder - implement proper SHA512 hashing
  return true; // Simplified - implement proper verification
}

/**
 * Handle PayFast ITN (Instant Transaction Notification)
 */
export async function handlePayFastITN(data: PayFastITNData): Promise<{ success: boolean; message: string }> {
  try {
    // Verify signature
    if (!verifyPayFastSignature(data, data.signature || '')) {
      return { success: false, message: 'Invalid signature' };
    }

    const paymentId = data.m_payment_id || data.custom_str1;
    if (!paymentId) {
      return { success: false, message: 'Payment ID not found' };
    }

    // Determine payment status
    let paymentStatus = 'pending';
    if (data.payment_status === 'COMPLETE') {
      paymentStatus = 'confirmed';
    } else if (data.payment_status === 'FAILED' || data.payment_status === 'CANCELLED') {
      paymentStatus = 'failed';
    }

    // Update payment record
    const { error: paymentError } = await insforge.database
      .from('payments')
      .update({
        status: paymentStatus,
        payment_gateway_response: JSON.stringify(data),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return { success: false, message: 'Failed to update payment' };
    }

    // Update associated application if exists
    if (paymentStatus === 'confirmed') {
      const { data: payment } = await insforge.database
        .from('payments')
        .select('application_id')
        .eq('id', paymentId)
        .single();

      if (payment?.application_id) {
        await insforge.database
          .from('applications')
          .update({
            payment_status: 'confirmed',
            status: 'pending' // Keep as pending for admin review
          })
          .eq('id', payment.application_id);

        // Create notification for user
        const { data: application } = await insforge.database
          .from('applications')
          .select('user_id')
          .eq('id', payment.application_id)
          .single();

        if (application?.user_id) {
          await insforge.database
            .from('notifications')
            .insert([{
              user_id: application.user_id,
              type: 'payment',
              title: 'Payment Confirmed',
              message: 'Your payment has been confirmed successfully. Your application is now pending review.',
              related_id: paymentId,
              read: false
            }]);
        }
      }
    }

    return { success: true, message: 'Payment updated successfully' };
  } catch (error: any) {
    console.error('Error handling PayFast ITN:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

/**
 * Handle Ozow webhook
 */
export async function handleOzowWebhook(data: OzowWebhookData): Promise<{ success: boolean; message: string }> {
  try {
    // Verify signature
    if (!verifyOzowSignature(data, data.Hash || '')) {
      return { success: false, message: 'Invalid signature' };
    }

    const transactionRef = data.TransactionReference;
    if (!transactionRef) {
      return { success: false, message: 'Transaction reference not found' };
    }

    // Determine payment status
    let paymentStatus = 'pending';
    if (data.Status === 'Complete') {
      paymentStatus = 'confirmed';
    } else if (data.Status === 'Error' || data.Status === 'Cancelled') {
      paymentStatus = 'failed';
    }

    // Update payment record
    const { error: paymentError } = await insforge.database
      .from('payments')
      .update({
        status: paymentStatus,
        payment_gateway_response: JSON.stringify(data),
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionRef);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return { success: false, message: 'Failed to update payment' };
    }

    // Update associated application if exists
    if (paymentStatus === 'confirmed') {
      const { data: payment } = await insforge.database
        .from('payments')
        .select('application_id')
        .eq('id', transactionRef)
        .single();

      if (payment?.application_id) {
        await insforge.database
          .from('applications')
          .update({
            payment_status: 'confirmed',
            status: 'pending' // Keep as pending for admin review
          })
          .eq('id', payment.application_id);

        // Create notification for user
        const { data: application } = await insforge.database
          .from('applications')
          .select('user_id')
          .eq('id', payment.application_id)
          .single();

        if (application?.user_id) {
          await insforge.database
            .from('notifications')
            .insert([{
              user_id: application.user_id,
              type: 'payment',
              title: 'Payment Confirmed',
              message: 'Your payment has been confirmed successfully. Your application is now pending review.',
              related_id: transactionRef,
              read: false
            }]);
        }
      }
    }

    return { success: true, message: 'Payment updated successfully' };
  } catch (error: any) {
    console.error('Error handling Ozow webhook:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

