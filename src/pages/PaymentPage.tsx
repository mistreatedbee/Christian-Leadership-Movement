import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { CreditCard, Smartphone, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  provider: 'payfast' | 'ozow';
}

export function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const paymentId = searchParams.get('payment_id');
  const returnUrl = searchParams.get('return_url') || '/dashboard';

  const [payment, setPayment] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only PayFast and Ozow - best for South Africa
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'payfast',
      name: 'PayFast',
      icon: <CreditCard size={24} />,
      description: 'Credit/Debit Card, EFT, Instant EFT - Connects to all major SA banks',
      provider: 'payfast'
    },
    {
      id: 'ozow',
      name: 'Ozow',
      icon: <Smartphone size={24} />,
      description: 'Instant EFT - Direct bank transfers from major SA banks',
      provider: 'ozow'
    }
  ];

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    if (!paymentId) {
      navigate('/dashboard');
      return;
    }

    fetchPayment();
  }, [paymentId, user, isLoaded]);

  const fetchPayment = async () => {
    try {
      const { data, error } = await insforge.database
        .from('payments')
        .select('*, applications(*), donations(*)')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      if (data.user_id !== user?.id) {
        navigate('/dashboard');
        return;
      }
      setPayment(data);
    } catch (err: any) {
      console.error('Error fetching payment:', err);
      setError(err.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentUrl = (payment: any, method: string): string => {
    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}/payment/success?payment_id=${payment.id}`;
    const cancelUrl = `${baseUrl}/payment/cancel?payment_id=${payment.id}`;
    const notifyUrl = `${baseUrl}/api/payment/webhook`;

    // Get payment gateway credentials from environment
    const merchantId = method === 'payfast' 
      ? import.meta.env.VITE_PAYFAST_MERCHANT_ID
      : import.meta.env.VITE_OZOW_SITE_CODE;
    
    const merchantKey = method === 'payfast'
      ? import.meta.env.VITE_PAYFAST_MERCHANT_KEY
      : import.meta.env.VITE_OZOW_API_KEY;

    if (!merchantId || !merchantKey) {
      throw new Error(`Payment gateway credentials not configured for ${method}. Please check your .env file.`);
    }

    // Determine item name based on payment type
    let itemName = 'Payment';
    if (payment.payment_type === 'donation') {
      itemName = payment.donations?.campaign_name || 'Donation to Christian Leadership Movement';
    } else if (payment.payment_type === 'application') {
      const programType = payment.applications?.program_type || 'application';
      itemName = `${programType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Application Fee`;
    } else if (payment.payment_type === 'registration') {
      itemName = 'Registration Fee - Christian Leadership Movement';
    } else {
      itemName = payment.payment_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Payment';
    }

    // Build payment URL based on gateway
    if (method === 'payfast') {
      const mode = import.meta.env.VITE_PAYFAST_MODE || 'sandbox';
      const gatewayBase = mode === 'live' 
        ? 'https://www.payfast.co.za/eng/process'
        : 'https://sandbox.payfast.co.za/eng/process';

      const params = new URLSearchParams({
        merchant_id: merchantId,
        merchant_key: merchantKey,
        amount: parseFloat(payment.amount).toFixed(2),
        item_name: itemName,
        return_url: successUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        email_address: user?.email || '',
        m_payment_id: payment.id
      });

      // Add passphrase if set
      const passphrase = import.meta.env.VITE_PAYFAST_PASSPHRASE;
      if (passphrase) {
        params.append('passphrase', passphrase);
      }

      return `${gatewayBase}?${params.toString()}`;
    } else if (method === 'ozow') {
      // Ozow integration - connects directly to SA banks
      const params = new URLSearchParams({
        SiteCode: merchantId,
        CountryCode: 'ZA',
        CurrencyCode: 'ZAR',
        Amount: parseFloat(payment.amount).toFixed(2),
        TransactionReference: payment.id,
        BankReference: payment.id,
        CancelUrl: cancelUrl,
        SuccessUrl: successUrl,
        NotifyUrl: notifyUrl,
        IsTest: import.meta.env.VITE_OZOW_MODE === 'sandbox' ? 'true' : 'false'
      });

      return `https://pay.ozow.com?${params.toString()}`;
    }

    throw new Error(`Payment method ${method} not implemented`);
  };

  const handlePayment = async () => {
    if (!selectedMethod || !payment) {
      setError('Please select a payment method');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Update payment with selected method
      await insforge.database
        .from('payments')
        .update({
          payment_method: selectedMethod,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      // Generate payment gateway URL
      const gatewayUrl = generatePaymentUrl(payment, selectedMethod);
      
      // Redirect to payment gateway
      window.location.href = gatewayUrl;
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      setError(err.message || 'Failed to initiate payment. Please check your payment gateway credentials in .env file.');
      setProcessing(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-navy-ink mb-2">Payment Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'Unable to load payment details'}</p>
            <Button onClick={() => navigate('/dashboard')} variant="primary">
              Go to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-card shadow-soft p-8">
            <div className="text-center mb-8">
              <Lock className="mx-auto text-gold mb-4" size={48} />
              <h1 className="text-3xl font-bold text-navy-ink mb-2">Complete Payment</h1>
              <p className="text-gray-600">Secure payment processing via South African payment gateways</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                <div className="flex items-center">
                  <AlertCircle size={20} className="mr-2" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-muted-gray rounded-card p-6 mb-6">
              <h3 className="font-bold text-navy-ink mb-4">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="font-medium text-navy-ink">
                    {payment.payment_type === 'donation' 
                      ? (payment.donations?.campaign_name || 'Donation')
                      : payment.payment_type === 'application'
                      ? (payment.applications?.program_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Application') + ' Application Fee'
                      : payment.payment_type === 'registration'
                      ? 'Registration Fee'
                      : 'Payment'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-gold text-xl">R{parseFloat(payment.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium text-navy-ink">{payment.currency || 'ZAR'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    payment.status === 'confirmed' ? 'text-green-600' :
                    payment.status === 'pending' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <h3 className="font-bold text-navy-ink mb-4">Select Payment Method</h3>
              <p className="text-sm text-gray-600 mb-4">Both methods connect directly to major South African banks</p>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full p-4 border-2 rounded-card text-left transition-all ${
                      selectedMethod === method.id
                        ? 'border-gold bg-gold/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-card ${
                        selectedMethod === method.id ? 'bg-gold text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-navy-ink">{method.name}</h4>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                      {selectedMethod === method.id && (
                        <CheckCircle className="text-gold" size={24} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-card p-4 mb-6">
              <p className="text-sm text-blue-700">
                <Lock size={16} className="inline mr-2" />
                Your payment is secured with SSL encryption. We do not store your card or bank details.
              </p>
            </div>

            {/* Pay Button */}
            <Button
              variant="primary"
              className="w-full py-4 text-lg"
              onClick={handlePayment}
              disabled={!selectedMethod || processing}
            >
              {processing ? 'Processing...' : `Pay R${parseFloat(payment.amount).toFixed(2)}`}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-4">
              By proceeding, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
