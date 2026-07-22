import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../../lib/supabase';
import { executeRecaptcha } from '../../lib/captcha';
import { Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { PhoneVerificationModal } from './PhoneVerificationModal';
import { signInWithAppleNative, isAppleCancel } from '../../lib/appleAuth';
import { signInWithGoogleInApp } from '../../lib/googleAuth';
import { AppleLogo, GoogleLogo } from './BrandLogos';

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
  mode?: 'login' | 'signup';
  // Runs before any social/phone auth begins. Return false to abort — used at
  // signup to require the Terms/EULA agreement checkbox before an account is
  // created on any path.
  beforeAuth?: () => boolean;
}

export function SocialAuthButtons({ onSuccess, mode = 'login', beforeAuth }: SocialAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  // Inside the native iOS app we must NOT open the system browser for auth
  // (App Store Guideline 4). Apple uses its native sheet; Google uses an
  // in-app SFSafariViewController (Apple explicitly allows the Safari View
  // Controller for sign-in). On the web we use the normal redirect flow.
  const isNative = Capacitor.isNativePlatform();

  // Web OAuth (Google + Apple) — used only in the browser build.
  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    if (beforeAuth && !beforeAuth()) return;
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

  // Native Google sign-in via in-app Safari sheet (iOS app only). The redirect
  // back into the app is handled by useOAuthDeepLink in App.tsx.
  const handleNativeGoogle = async () => {
    if (beforeAuth && !beforeAuth()) return;
    setIsLoading(true);
    try {
      await signInWithGoogleInApp();
      // Session completes asynchronously via the deep-link handler; no
      // onSuccess() here. The auth state change closes the modal.
    } catch (error: any) {
      console.error('In-app Google sign in error:', error);
      toast.error(error?.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Native Apple sign-in sheet (iOS app only) — no browser.
  const handleNativeApple = async () => {
    if (beforeAuth && !beforeAuth()) return;
    setIsLoading(true);
    try {
      await signInWithAppleNative();
      onSuccess?.();
    } catch (error: any) {
      if (!isAppleCancel(error)) {
        console.error('Native Apple sign in error:', error);
        toast.error(error?.message || 'Failed to sign in with Apple');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (beforeAuth && !beforeAuth()) return;

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

      {/* Sign in with Apple — styled per Apple's Human Interface Guidelines:
          black button, official Apple logo mark, "Sign in with Apple" label,
          system font, 44pt+ height, 8px corner radius. */}
      <button
        type="button"
        onClick={() => (isNative ? handleNativeApple() : handleOAuthSignIn('apple'))}
        disabled={isLoading || showPhoneInput}
        aria-label="Sign in with Apple"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        className="w-full flex items-center justify-center gap-2.5 h-[50px] rounded-lg text-[17px] font-medium text-white bg-black hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
      >
        <AppleLogo className="w-[18px] h-[18px]" />
        <span>{isLoading ? 'Signing in…' : 'Sign in with Apple'}</span>
      </button>

      {/* Google: in-app Safari sheet on native (Guideline-4 compliant),
          normal redirect on the web. Uses the official Google "G" logo. */}
      <button
        type="button"
        onClick={() => (isNative ? handleNativeGoogle() : handleOAuthSignIn('google'))}
        disabled={isLoading || showPhoneInput}
        aria-label="Sign in with Google"
        style={{ fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        className="w-full flex items-center justify-center gap-2.5 h-[50px] rounded-lg border border-gray-300 dark:border-gray-600 text-[17px] font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
      >
        <GoogleLogo className="w-[18px] h-[18px]" />
        <span>{isLoading ? 'Signing in…' : 'Sign in with Google'}</span>
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
