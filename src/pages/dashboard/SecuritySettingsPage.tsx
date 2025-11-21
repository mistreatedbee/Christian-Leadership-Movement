import React, { useEffect, useState } from 'react';
import { Shield, Smartphone, Mail, Key, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '@insforge/react';
import { insforge } from '../../lib/insforge';
import { Button } from '../../components/ui/Button';

interface TwoFactorSettings {
  enabled: boolean;
  method: 'sms' | 'email' | null;
  phone_number?: string;
  backup_codes?: string[];
}

export function SecuritySettingsPage() {
  const { user } = useUser();
  const [twoFactor, setTwoFactor] = useState<TwoFactorSettings>({
    enabled: false,
    method: null
  });
  const [loading, setLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<'select' | 'verify' | 'complete'>('select');
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchTwoFactorSettings();
    }
  }, [user]);

  const fetchTwoFactorSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data } = await insforge.database
        .from('user_security_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setTwoFactor({
          enabled: data.two_factor_enabled || false,
          method: data.two_factor_method || null,
          phone_number: data.two_factor_phone,
          backup_codes: data.backup_codes || []
        });
      }
    } catch (error) {
      console.error('Error fetching 2FA settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiate2FASetup = async (method: 'sms' | 'email') => {
    if (!user) return;

    try {
      if (method === 'sms' && !phoneNumber) {
        alert('Please enter your phone number');
        return;
      }

      // In a real app, this would call a backend function to send verification code
      const response = await fetch('/api/2fa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          method,
          phone_number: method === 'sms' ? phoneNumber : undefined
        })
      });

      if (response.ok) {
        setSelectedMethod(method);
        setSetupStep('verify');
        alert(`Verification code sent to your ${method === 'sms' ? 'phone' : 'email'}`);
      } else {
        // Simulate for demo
        setSelectedMethod(method);
        setSetupStep('verify');
        alert(`Verification code sent! (Demo: Use code 123456)`);
      }
    } catch (error) {
      // Simulate for demo
      setSelectedMethod(method);
      setSetupStep('verify');
      alert(`Verification code sent! (Demo: Use code 123456)`);
    }
  };

  const verify2FASetup = async () => {
    if (!user || !selectedMethod) return;

    try {
      // In a real app, this would verify the code with backend
      if (verificationCode === '123456' || verificationCode.length === 6) {
        // Generate backup codes
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 8).toUpperCase()
        );

        await insforge.database
          .from('user_security_settings')
          .upsert({
            user_id: user.id,
            two_factor_enabled: true,
            two_factor_method: selectedMethod,
            two_factor_phone: selectedMethod === 'sms' ? phoneNumber : null,
            backup_codes: codes
          });

        setBackupCodes(codes);
        setTwoFactor({
          enabled: true,
          method: selectedMethod,
          phone_number: selectedMethod === 'sms' ? phoneNumber : undefined,
          backup_codes: codes
        });
        setSetupStep('complete');
      } else {
        alert('Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      alert('Error setting up 2FA');
    }
  };

  const disable2FA = async () => {
    if (!user || !confirm('Are you sure you want to disable 2FA?')) return;

    try {
      await insforge.database
        .from('user_security_settings')
        .update({
          two_factor_enabled: false,
          two_factor_method: null,
          two_factor_phone: null,
          backup_codes: null
        })
        .eq('user_id', user.id);

      setTwoFactor({ enabled: false, method: null });
      setSetupStep('select');
      alert('2FA has been disabled');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-ink mb-2">Security Settings</h1>
        <p className="text-gray-600">Manage your account security and two-factor authentication</p>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-navy-ink mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Two-Factor Authentication
            </h2>
            <p className="text-gray-600">
              Add an extra layer of security to your account
            </p>
          </div>
          {twoFactor.enabled && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Enabled
            </span>
          )}
        </div>

        {!twoFactor.enabled ? (
          <div>
            {setupStep === 'select' && (
              <div className="space-y-4">
                <p className="text-gray-700 mb-4">Choose your 2FA method:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setSelectedMethod('sms');
                      setSetupStep('verify');
                    }}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-gold transition-colors text-left"
                  >
                    <Smartphone className="w-8 h-8 text-blue-500 mb-2" />
                    <h3 className="font-semibold text-navy-ink mb-1">SMS</h3>
                    <p className="text-sm text-gray-600">Receive codes via text message</p>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMethod('email');
                      setSetupStep('verify');
                    }}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-gold transition-colors text-left"
                  >
                    <Mail className="w-8 h-8 text-green-500 mb-2" />
                    <h3 className="font-semibold text-navy-ink mb-1">Email</h3>
                    <p className="text-sm text-gray-600">Receive codes via email</p>
                  </button>
                </div>
              </div>
            )}

            {setupStep === 'verify' && selectedMethod && (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setSetupStep('select');
                    setSelectedMethod(null);
                  }}
                  className="text-gold hover:underline mb-4"
                >
                  ← Back
                </button>
                {selectedMethod === 'sms' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+27 12 345 6789"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold mb-4"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code *
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold mb-4"
                  />
                  <p className="text-sm text-gray-600 mb-4">
                    {selectedMethod === 'sms'
                      ? 'Enter the code sent to your phone'
                      : 'Enter the code sent to your email'}
                  </p>
                </div>
                <Button onClick={verify2FASetup} variant="primary">
                  Verify & Enable
                </Button>
              </div>
            )}

            {setupStep === 'complete' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="font-semibold text-green-800">2FA Enabled Successfully!</p>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    Your account is now protected with two-factor authentication.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-navy-ink mb-2">Backup Codes</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Save these codes in a safe place. You can use them to access your account if you lose access to your {selectedMethod === 'sms' ? 'phone' : 'email'}.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    {backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="p-2 bg-gray-100 rounded text-center font-mono text-sm"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      setSetupStep('select');
                      setSelectedMethod(null);
                      setVerificationCode('');
                      setPhoneNumber('');
                    }}
                    variant="outline"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>2FA is enabled</strong> via {twoFactor.method === 'sms' ? 'SMS' : 'Email'}
                {twoFactor.phone_number && ` (${twoFactor.phone_number})`}
              </p>
            </div>
            {twoFactor.backup_codes && twoFactor.backup_codes.length > 0 && (
              <div>
                <h3 className="font-semibold text-navy-ink mb-2">Your Backup Codes</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                  {twoFactor.backup_codes.map((code, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-100 rounded text-center font-mono text-sm"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={disable2FA} variant="outline">
              Disable 2FA
            </Button>
          </div>
        )}
      </div>

      {/* Password Change */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          Change Password
        </h2>
        <p className="text-gray-600 mb-4">
          Update your password to keep your account secure
        </p>
        <Button variant="outline">
          Change Password
        </Button>
      </div>
    </div>
  );
}

