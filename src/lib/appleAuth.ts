import { SignInWithApple, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { supabase } from './supabase';

// The iOS app's bundle identifier. This must also be listed under the Apple
// provider's "Authorized Client IDs" in the Supabase dashboard so that the
// identity token's audience validates.
export const IOS_BUNDLE_ID = 'com.worshipnyapps.app';

// Generate a cryptographically-random nonce. Apple embeds the SHA-256 of this
// value in the identity token; Supabase re-hashes the raw nonce we hand it and
// checks the two match, which is what prevents token replay.
function randomNonce(length = 32): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  const random = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  random.forEach((n) => { result += charset[n % charset.length]; });
  return result;
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Runs Apple's NATIVE sign-in sheet (no browser) and exchanges the returned
// identity token for a Supabase session. Throws on failure; the caller shows a
// toast. A user cancelling the sheet throws too — callers should treat a
// cancel as a silent no-op (we detect it by message/code below).
export async function signInWithAppleNative(): Promise<void> {
  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const result: SignInWithAppleResponse = await SignInWithApple.authorize({
    clientId: IOS_BUNDLE_ID,
    // Not used on the native iOS path but required by the plugin's types.
    redirectURI: `${import.meta.env.VITE_SUPABASE_URL ?? ''}/auth/v1/callback`,
    scopes: 'email name',
    nonce: hashedNonce,
  });

  const idToken = result.response?.identityToken;
  if (!idToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
    nonce: rawNonce,
  });
  if (error) throw error;
}

// Best-effort check for "user tapped Cancel on the Apple sheet" so callers can
// swallow it instead of showing an error toast.
export function isAppleCancel(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return msg.includes('cancel') || msg.includes('1001') || msg.includes('popup_closed');
}
