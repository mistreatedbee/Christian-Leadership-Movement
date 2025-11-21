import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Users, TrendingUp } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

interface ReferralCode {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_rewards: number;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_id?: string;
  email?: string;
  status: string;
  created_at: string;
}

export function ReferralProgramPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [codeRes, referralsRes] = await Promise.all([
        insforge.database
          .from('user_referral_codes')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        insforge.database
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      setReferralCode(codeRes.data);
      setReferrals(referralsRes.data || []);

      // Create referral code if doesn't exist
      if (!codeRes.data) {
        const newCode = `REF-${user.id.substring(0, 8).toUpperCase()}`;
        const { data } = await insforge.database
          .from('user_referral_codes')
          .insert({
            user_id: user.id,
            referral_code: newCode
          })
          .select()
          .single();

        setReferralCode(data);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralCode) return;

    const link = `${window.location.origin}/register?ref=${referralCode.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (!referralCode) return;

    navigator.clipboard.writeText(referralCode.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Please log in to access the referral program</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading referral program...</p>
      </div>
    );
  }

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode.referral_code}`
    : '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-navy-ink mb-2">Referral Program</h1>
            <p className="text-gray-600">Invite friends and earn rewards</p>
          </div>
          {user && (
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-card shadow-soft">
          <Users className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Total Referrals</p>
          <p className="text-2xl font-bold text-navy-ink">
            {referralCode?.total_referrals || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-gray-600 text-sm mb-1">Completed</p>
          <p className="text-2xl font-bold text-navy-ink">
            {referrals.filter(r => r.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-card shadow-soft">
          <Gift className="w-8 h-8 text-gold mb-2" />
          <p className="text-gray-600 text-sm mb-1">Total Rewards</p>
          <p className="text-2xl font-bold text-navy-ink">
            R{referralCode?.total_rewards.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Referral Code */}
      {referralCode && (
        <div className="bg-white p-6 rounded-card shadow-soft mb-8">
          <h2 className="text-xl font-bold text-navy-ink mb-4">Your Referral Code</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-muted-gray px-4 py-3 rounded-lg font-mono text-lg">
              {referralCode.referral_code}
            </div>
            <Button onClick={copyCode} variant="primary">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Referral Link</label>
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-muted-gray px-4 py-2 rounded-lg"
              />
              <Button onClick={copyReferralLink} variant="primary">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Share this link with friends. When they sign up using your code, you'll earn rewards!
          </p>
        </div>
      )}

      {/* Referrals List */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-navy-ink">Your Referrals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="text-left py-3 px-6">Email</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => (
                <tr key={referral.id} className="border-b">
                  <td className="py-4 px-6">{referral.email || 'N/A'}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                      referral.status === 'rewarded' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {referral.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {referrals.length === 0 && (
          <div className="p-12 text-center">
            <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No referrals yet. Start sharing your link!</p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white p-6 rounded-card shadow-soft mt-8">
        <h2 className="text-xl font-bold text-navy-ink mb-4">How It Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Share your referral link with friends and family</li>
          <li>They sign up using your unique referral code</li>
          <li>When they complete their registration, you earn rewards</li>
          <li>Track your referrals and rewards in your dashboard</li>
        </ol>
      </div>
    </div>
  );
}

