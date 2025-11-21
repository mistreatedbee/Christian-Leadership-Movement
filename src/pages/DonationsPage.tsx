import React, { useState } from 'react';
import { useUser } from '@insforge/react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { insforge } from '../lib/insforge';
import { sendEmailNotification } from '../lib/email';
import { Button } from '../components/ui/Button';
import { Heart, DollarSign } from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

interface DonationFormData {
  amount: number;
  campaign?: string;
  message?: string;
  anonymous: boolean;
}

export function DonationsPage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<DonationFormData>();

  const onSubmit = async (data: DonationFormData) => {
    if (!user) {
      navigate('/login?redirect=/donations');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create donation record
      const { data: donation, error: donationError } = await insforge.database
        .from('donations')
        .insert([{
          user_id: user.id,
          amount: data.amount,
          campaign_name: data.campaign || null,
          message: data.message || null,
          anonymous: data.anonymous || false,
          status: 'pending'
        }])
        .select()
        .single();

      if (donationError) throw donationError;

      // Create payment record
      const { data: payment, error: paymentError } = await insforge.database
        .from('payments')
        .insert([{
          user_id: user.id,
          amount: data.amount,
          currency: 'ZAR',
          payment_type: 'donation',
          status: 'pending'
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update donation with payment_id
      await insforge.database
        .from('donations')
        .update({ payment_id: payment.id })
        .eq('id', donation.id);

      // Create notification
      const amount = parseFloat(data.amount.toString()) || 0;
      await insforge.database
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'donation',
          title: 'Donation Submitted',
          message: `Thank you for your donation of R${amount.toFixed(2)}. Payment processing...`,
          related_id: donation.id
        }]);

      // Send email notification
      await sendEmailNotification(user.id, {
        type: 'donation_submitted',
        subject: 'Donation Submitted - Payment Required',
        message: `Thank you for your donation of R${amount.toFixed(2)}. Please complete payment to finalize your donation.`
      });

      setSuccess(true);
      // Redirect to payment page
      navigate(`/payment?payment_id=${payment.id}&return_url=/donations`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Heart className="mx-auto text-gold mb-4" size={48} />
            <h1 className="text-4xl font-bold text-navy-ink mb-4">
              Support Our Mission
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your generous donation helps us develop Christian leaders and transform communities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Donation Form */}
            <div className="bg-white rounded-card shadow-soft p-8">
              <h2 className="text-2xl font-bold text-navy-ink mb-6">Make a Donation</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                  {error}
                </div>
              )}

              {success ? (
                <div className="text-center py-8">
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">
                    Thank you for your donation! You will be redirected to complete payment.
                  </div>
                  <Button onClick={() => navigate('/dashboard')} variant="primary">
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">
                      Amount (ZAR) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        {...register('amount', {
                          required: 'Amount is required',
                          min: { value: 1, message: 'Minimum donation is R1' }
                        })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="0.00"
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">
                      Campaign (Optional)
                    </label>
                    <input
                      type="text"
                      {...register('campaign')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="e.g., Leadership Development"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-ink mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      {...register('message')}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
                      placeholder="Leave a message of encouragement..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('anonymous')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">
                        Make this donation anonymous
                      </span>
                    </label>
                  </div>

                  {!user && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
                      Please <button type="button" onClick={() => navigate('/login')} className="underline font-medium">log in</button> to make a donation.
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting || !user}
                  >
                    {isSubmitting ? 'Processing...' : 'Donate Now'}
                  </Button>
                </form>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              <div className="bg-gold/10 rounded-card p-6">
                <h3 className="text-xl font-bold text-navy-ink mb-4">Why Donate?</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    Support leadership development programs
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    Enable accessible theological education
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    Fund community transformation initiatives
                  </li>
                  <li className="flex items-start">
                    <span className="text-gold mr-2">•</span>
                    Empower the next generation of leaders
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-card shadow-soft p-6">
                <h3 className="text-xl font-bold text-navy-ink mb-4">Donation Impact</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">R500</p>
                    <p className="font-semibold text-navy-ink">Sponsors one student's course materials</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">R1,000</p>
                    <p className="font-semibold text-navy-ink">Covers event venue for 50 participants</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">R5,000</p>
                    <p className="font-semibold text-navy-ink">Funds a complete leadership training program</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

