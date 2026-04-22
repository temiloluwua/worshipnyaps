import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { executeRecaptcha } from '../../lib/captcha';
import { Mail, Phone, Apple } from 'lucide-react';
import toast from 'react-hot-toast';
import { PhoneVerificationModal } from './PhoneVerificationModal';

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
  mode?: 'login' | 'signup';
}

export function SocialAuthButtons({ onSuccess, mode = 'login' }: SocialAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error(`${provider} sign in error:`, error);
        toast.error(error.message || `Failed to sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
      }
    } catch (error: any) {
      console.error(`${provider} sign in exception:`, error);
      toast.error(error?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    try {
      let captchaToken: string | undefined;

      try {
        captchaToken = await executeRecaptcha('PHONE_AUTH');
      } catch (error) {
        console.error('reCAPTCHA error:', error);
        toast.error('Security verification failed. Please try again.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: {
          captchaToken,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your phone for a verification code');
        setShowVerification(true);
        setShowPhoneInput(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleOAuthSignIn('google')}
        disabled={isLoading || showPhoneInput}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Mail className="w-4 h-4" />
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </button>

      <button
        type="button"
        onClick={() => handleOAuthSignIn('apple')}
        disabled={isLoading || showPhoneInput}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Apple className="w-4 h-4" />
        {isLoading ? 'Signing in...' : 'Continue with Apple'}
      </button>

      {!showPhoneInput ? (
        <button
          type="button"
          onClick={() => setShowPhoneInput(true)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Phone className="w-4 h-4" />
          Sign in with Phone
        </button>
      ) : (
        <form onSubmit={handlePhoneSignIn} className="space-y-2">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || !phoneNumber.trim()}
              className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send Code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPhoneInput(false);
                setPhoneNumber('');
              }}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>

    <PhoneVerificationModal
      isOpen={showVerification}
      onClose={() => {
        setShowVerification(false);
        setPhoneNumber('');
      }}
      phoneNumber={phoneNumber}
      onSuccess={() => {
        setShowVerification(false);
        setPhoneNumber('');
        onSuccess?.();
      }}
    />
    </>
  );
}
