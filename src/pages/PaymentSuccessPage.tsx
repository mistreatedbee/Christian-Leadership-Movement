import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { sendEmailNotification } from '../lib/email';
import { generateEventTicketPDF } from '../lib/ticketGenerator';
import { Download } from 'lucide-react';

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const paymentId = searchParams.get('payment_id');
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!paymentId) {
      navigate('/dashboard');
      return;
    }

    processPayment();
  }, [paymentId, user, isLoaded]);

  const processPayment = async () => {
    try {
      // Fetch payment details
      const { data: paymentData, error: fetchError } = await insforge.database
        .from('payments')
        .select('*, applications(*), donations(*), event_registrations(*, events(*))')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;
      if (paymentData.user_id !== user?.id) {
        navigate('/dashboard');
        return;
      }

      setPayment(paymentData);

      // Check if payment is already confirmed
      if (paymentData.status === 'confirmed') {
        setProcessing(false);
        setLoading(false);
        return;
      }

      // Update payment status to confirmed
      // Note: In production, this should be verified via webhook signature
      const { error: updateError } = await insforge.database
        .from('payments')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // Determine payment type and amount for email
      const amount = parseFloat(paymentData.amount).toFixed(2);
      const paymentMethod = paymentData.payment_method?.charAt(0).toUpperCase() + paymentData.payment_method?.slice(1) || 'Payment Gateway';

      // Handle different payment types
      if (paymentData.payment_type === 'donation') {
        // Update donation status
        await insforge.database
          .from('donations')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('payment_id', paymentId);

        // Create notification
        await insforge.database
          .from('notifications')
          .insert([{
            user_id: user.id,
            type: 'donation',
            title: 'Donation Confirmed',
            message: `Thank you! Your donation of R${amount} has been confirmed.`,
            related_id: paymentData.donations?.id || null
          }]);

        // Send email for donation
        await sendEmailNotification(user.id, {
          type: 'donation_confirmed',
          subject: 'Donation Confirmed - Thank You!',
          message: `Your donation of R${amount} has been successfully processed via ${paymentMethod}. Thank you for your generous support of Christian Leadership Movement!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1B1C5F;">Donation Confirmed</h2>
              <p>Dear ${user.name || 'Valued Supporter'},</p>
              <p>Thank you for your generous donation to Christian Leadership Movement!</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Donation Amount:</strong> R${amount}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed</p>
                ${paymentData.donations?.campaign_name ? `<p style="margin: 5px 0;"><strong>Campaign:</strong> ${paymentData.donations.campaign_name}</p>` : ''}
              </div>
              <p>Your donation helps us develop Christian leaders and transform communities. We are grateful for your support!</p>
              <p>Blessings,<br>Christian Leadership Movement Team</p>
            </div>
          `
        });

      } else if (paymentData.payment_type === 'application') {
        // Update application payment status
        if (paymentData.applications) {
          const programType = paymentData.applications.program_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Application';
          
          await insforge.database
            .from('applications')
            .update({
              payment_status: 'confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentData.applications.id);

          // Create notification
          await insforge.database
            .from('notifications')
            .insert([{
              user_id: user.id,
              type: 'payment',
              title: 'Application Fee Payment Confirmed',
              message: `Your payment of R${amount} for your ${programType} application has been confirmed.`,
              related_id: paymentData.applications.id
            }]);

          // Send email for application fee
          await sendEmailNotification(user.id, {
            type: 'application_fee_confirmed',
            subject: 'Application Fee Payment Confirmed',
            message: `Your payment of R${amount} for your ${programType} application has been successfully processed via ${paymentMethod}. Your application is now being reviewed.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1B1C5F;">Application Fee Payment Confirmed</h2>
                <p>Dear ${user.name || 'Applicant'},</p>
                <p>Thank you for your payment! Your application fee has been successfully processed.</p>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Application Type:</strong> ${programType}</p>
                  <p style="margin: 5px 0;"><strong>Payment Amount:</strong> R${amount}</p>
                  <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed</p>
                </div>
                <p>Your application is now being reviewed by our team. You will be notified once a decision has been made.</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Blessings,<br>Christian Leadership Movement Team</p>
              </div>
            `
          });
        }
      } else if (paymentData.payment_type === 'event_registration') {
        // Handle event registration fee payment
        if (paymentData.event_registrations && paymentData.event_registrations.length > 0) {
          const registration = paymentData.event_registrations[0];
          const event = registration.events;

          // Update event registration payment status
          await insforge.database
            .from('event_registrations')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', paymentId);

          // Create notification
          await insforge.database
            .from('notifications')
            .insert([{
              user_id: user.id,
              type: 'event',
              title: 'Event Registration Confirmed',
              message: `Your registration for "${event?.title || 'the event'}" has been confirmed. Payment of R${amount} received.`,
              related_id: registration.event_id,
              link_url: `/events/${registration.event_id}/registration`,
              read: false
            }]);

          // Send email for event registration
          await sendEmailNotification(user.id, {
            type: 'event_registration_confirmed',
            subject: 'Event Registration Confirmed',
            message: `Your registration for "${event?.title || 'the event'}" has been confirmed. Payment of R${amount} received via ${paymentMethod}.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1B1C5F;">Event Registration Confirmed</h2>
                <p>Dear ${user.name || 'Attendee'},</p>
                <p>Thank you for registering! Your event registration has been confirmed.</p>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Event:</strong> ${event?.title || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Event Date:</strong> ${event?.event_date ? new Date(event.event_date).toLocaleDateString() : 'TBA'}</p>
                  <p style="margin: 5px 0;"><strong>Location:</strong> ${event?.location || 'TBA'}</p>
                  <p style="margin: 5px 0;"><strong>Payment Amount:</strong> R${amount}</p>
                  <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed</p>
                </div>
                <p>You can download your ticket from your dashboard. We look forward to seeing you at the event!</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Blessings,<br>Christian Leadership Movement Team</p>
              </div>
            `
          });
        }
      } else if (paymentData.payment_type === 'registration') {
        // Handle registration fee payment
        await insforge.database
          .from('notifications')
          .insert([{
            user_id: user.id,
            type: 'payment',
            title: 'Registration Fee Payment Confirmed',
            message: `Your registration fee payment of R${amount} has been confirmed.`,
            related_id: paymentId
          }]);

        // Send email for registration fee
        await sendEmailNotification(user.id, {
          type: 'registration_fee_confirmed',
          subject: 'Registration Fee Payment Confirmed',
          message: `Your registration fee payment of R${amount} has been successfully processed via ${paymentMethod}. Thank you for completing your registration!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1B1C5F;">Registration Fee Payment Confirmed</h2>
              <p>Dear ${user.name || 'Member'},</p>
              <p>Thank you for your payment! Your registration fee has been successfully processed.</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Payment Type:</strong> Registration Fee</p>
                <p style="margin: 5px 0;"><strong>Payment Amount:</strong> R${amount}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed</p>
              </div>
              <p>Your registration is now complete. Welcome to Christian Leadership Movement!</p>
              <p>If you have any questions, please don't hesitate to contact us.</p>
              <p>Blessings,<br>Christian Leadership Movement Team</p>
            </div>
          `
        });
      } else {
        // Generic payment confirmation
        await insforge.database
          .from('notifications')
          .insert([{
            user_id: user.id,
            type: 'payment',
            title: 'Payment Confirmed',
            message: `Your payment of R${amount} has been confirmed.`,
            related_id: paymentId
          }]);

        // Send generic payment email
        await sendEmailNotification(user.id, {
          type: 'payment_confirmed',
          subject: 'Payment Confirmed',
          message: `Your payment of R${amount} has been successfully processed via ${paymentMethod}.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1B1C5F;">Payment Confirmed</h2>
              <p>Dear ${user.name || 'Valued Member'},</p>
              <p>Your payment has been successfully processed.</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Payment Amount:</strong> R${amount}</p>
                <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed</p>
              </div>
              <p>Thank you for your payment!</p>
              <p>Blessings,<br>Christian Leadership Movement Team</p>
            </div>
          `
        });
      }

      // Refresh payment data
      const { data: updatedPayment } = await insforge.database
        .from('payments')
        .select('*, applications(*), donations(*)')
        .eq('id', paymentId)
        .single();

      setPayment(updatedPayment);
      setProcessing(false);
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setError(err.message || 'Failed to process payment confirmation');
      setProcessing(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader className="mx-auto text-gold mb-4 animate-spin" size={48} />
            <p className="text-gray-600">Processing payment...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-card shadow-soft p-8 text-center">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h2 className="text-2xl font-bold text-navy-ink mb-2">Payment Processing Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/dashboard')} variant="primary">
                  Go to Dashboard
                </Button>
                <Button onClick={() => navigate('/payment?payment_id=' + paymentId)} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Determine payment type label for display
  const getPaymentTypeLabel = () => {
    if (payment?.payment_type === 'donation') {
      return 'Donation';
    } else if (payment?.payment_type === 'application') {
      const programType = payment?.applications?.program_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Application';
      return `${programType} Application Fee`;
    } else if (payment?.payment_type === 'registration') {
      return 'Registration Fee';
    }
    return 'Payment';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-card shadow-soft p-8 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
            <h1 className="text-3xl font-bold text-navy-ink mb-4">Payment Successful!</h1>
            <p className="text-lg text-gray-600 mb-6">
              Thank you for your payment. Your transaction has been processed successfully.
            </p>

            {payment && (
              <div className="bg-muted-gray rounded-card p-6 mb-6 text-left">
                <h3 className="font-bold text-navy-ink mb-4">Payment Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Type:</span>
                    <span className="font-medium text-navy-ink">{getPaymentTypeLabel()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-gold text-xl">R{parseFloat(payment.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium text-navy-ink">
                      {payment.payment_method?.charAt(0).toUpperCase() + payment.payment_method?.slice(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Confirmed</span>
                  </div>
                  {payment.payment_type === 'donation' && payment.donations?.campaign_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Campaign:</span>
                      <span className="font-medium text-navy-ink">
                        {payment.donations.campaign_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              {payment?.payment_type === 'event_registration' && payment.event_registrations && payment.event_registrations.length > 0 && (
                <Button onClick={handleDownloadTicket} variant="primary">
                  <Download className="mr-2" size={16} />
                  Download Ticket
                </Button>
              )}
              <Button onClick={() => navigate('/dashboard')} variant="primary">
                Go to Dashboard
              </Button>
              {payment?.payment_type === 'donation' && (
                <Button onClick={() => navigate('/donations')} variant="outline">
                  Make Another Donation
                </Button>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-6">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
