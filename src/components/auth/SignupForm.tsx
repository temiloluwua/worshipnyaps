import React, { useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import type { HCaptcha as HCaptchaInstance } from '@hcaptcha/react-hcaptcha';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const captchaRef = useRef<HCaptchaInstance | null>(null);
  const { isDark } = useTheme();

  const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
  const isCaptchaEnabled = Boolean(captchaSiteKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCaptchaEnabled && !captchaToken) {
      toast.error('Please complete the captcha verification.');
      setCaptchaError('Please verify that you are human before continuing.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          captchaToken: isCaptchaEnabled ? captchaToken ?? undefined : undefined,
        },
      });

      if (authError) {
        toast.error(authError.message);
        if (authError.message.toLowerCase().includes('captcha')) {
          setCaptchaError('Captcha verification failed. Please try again.');
          if (isCaptchaEnabled) {
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
          }
        }
        return;
      }

      if (authData.user) {
        if (authData.user.identities && authData.user.identities.length === 0) {
          toast.error('An account with this email already exists. Please sign in instead.');
          if (isCaptchaEnabled) {
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
          }
          return;
        }

        if (authData.session) {
          toast.success('Account created successfully!');
          onSuccess?.();
        } else {
          toast.success('Account created! Please check your email to confirm your account before signing in.');
          setTimeout(() => onSuccess?.(), 2000);
        }

        if (isCaptchaEnabled) {
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <UserPlus className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-600 mt-2">Join our community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 6 characters long
            </p>
          </div>

          {isCaptchaEnabled ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Check
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={captchaSiteKey as string}
                  theme={isDark ? 'dark' : 'light'}
                  onVerify={(token) => {
                    setCaptchaToken(token);
                    setCaptchaError(null);
                  }}
                  onError={(event) => {
                    console.error('hCaptcha error:', event);
                    setCaptchaToken(null);
                    setCaptchaError('Captcha failed to load. Please refresh the page and try again.');
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                    captchaRef.current?.resetCaptcha();
                  }}
                />
              </div>
              {captchaError && (
                <p className="mt-2 text-sm text-red-600">
                  {captchaError}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {captchaError ??
                'Captcha is not configured yet. Add VITE_HCAPTCHA_SITE_KEY to enable signups without errors.'}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (isCaptchaEnabled && !captchaToken)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
