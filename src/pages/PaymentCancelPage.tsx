import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { Button } from '../components/ui/Button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

export function PaymentCancelPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, isLoaded]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow py-16 bg-muted-gray">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-card shadow-soft p-8 text-center">
            <div className="mb-6">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-navy-ink mb-4">Payment Cancelled</h1>
              <p className="text-lg text-gray-600 mb-6">
                Your payment was cancelled. No charges have been made to your account.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-card p-6 mb-6">
              <h2 className="text-xl font-semibold text-amber-800 mb-2">What happens next?</h2>
              <ul className="text-left text-amber-700 space-y-2">
                <li>• Your application remains pending</li>
                <li>• You can complete the payment at any time</li>
                <li>• No payment has been processed</li>
                <li>• You can try again when ready</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                variant="primary"
                onClick={() => {
                  if (paymentId) {
                    navigate(`/payment?payment_id=${paymentId}`);
                  } else {
                    navigate('/dashboard/applications');
                  }
                }}
              >
                Try Payment Again
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="mr-2" size={16} />
                Back to Dashboard
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              If you need assistance, please contact our support team.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

