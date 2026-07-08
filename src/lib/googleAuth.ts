import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';

// Custom URL scheme Supabase redirects back to after Google auth. Must be
// registered in ios Info.plist (CFBundleURLTypes) AND added to Supabase's
// Authentication → URL Configuration → Redirect URLs allowlist.
export const OAUTH_CALLBACK_URL = 'com.worshipnyapps.app://auth-callback';

// Google sign-in for the native app using an in-app SFSafariViewController
// (via @capacitor/browser) instead of the system browser. Apple Guideline 4
// explicitly permits the Safari View Controller for auth. The redirect back
// is caught by the appUrlOpen listener (see useOAuthDeepLink), which exchanges
// the PKCE code for a session.
export async function signInWithGoogleInApp(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_CALLBACK_URL,
      // Don't let supabase-js navigate the WebView itself — we open the URL in
      // the in-app browser sheet instead.
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start Google sign-in.');

  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}
