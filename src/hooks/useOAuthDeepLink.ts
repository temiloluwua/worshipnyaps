import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Handles the OAuth redirect back into the native app. When the in-app Safari
// sheet finishes Google sign-in, Supabase redirects to our custom scheme
// (com.worshipnyapps.app://auth-callback?code=...). Capacitor delivers that to
// the appUrlOpen listener; we pull the PKCE code, exchange it for a session,
// and dismiss the browser sheet.
export function useOAuthDeepLink() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | undefined;

    CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.includes('auth-callback')) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        const errorDescription = parsed.searchParams.get('error_description');
        if (errorDescription) {
          toast.error(errorDescription);
          return;
        }
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
      } catch (err: any) {
        console.error('OAuth deep-link exchange failed:', err);
        toast.error(err?.message || 'Sign-in could not be completed.');
      } finally {
        // Close the in-app Safari sheet regardless of outcome.
        try { await Browser.close(); } catch { /* already closed */ }
      }
    }).then((h) => { handle = h; });

    return () => { handle?.remove(); };
  }, []);
}
