// Sends an APNs push for a single row in public.notifications.
//
// Called by the DB trigger trg_dispatch_push (via pg_net) right after a
// notification row is inserted. The trigger passes { notification_id }.
// We look up every iOS device token for that user in user_devices, sign an
// APNs ES256 JWT once per cold start, and POST to api.push.apple.com.
//
// Required secrets (set via `supabase secrets set ...`):
//   APNS_KEY_ID       — the 10-char Key ID from the Apple Developer portal
//   APNS_TEAM_ID      — your 10-char Apple Developer Team ID
//   APNS_BUNDLE_ID    — e.g. com.worshipnyapps.app
//   APNS_AUTH_KEY     — full contents of the .p8 file (PEM, multiline)
//   APNS_HOST         — optional; defaults to production. Use
//                       https://api.sandbox.push.apple.com for dev builds.
//
// Tokens that come back 410 Unregistered are deleted from user_devices so we
// stop trying to deliver to them.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID');
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID');
const APNS_BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID');
const APNS_AUTH_KEY = Deno.env.get('APNS_AUTH_KEY');
const APNS_HOST = Deno.env.get('APNS_HOST') ?? 'https://api.push.apple.com';

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

let cryptoKeyPromise: Promise<CryptoKey> | null = null;
async function getSigningKey(): Promise<CryptoKey> {
  if (cryptoKeyPromise) return cryptoKeyPromise;
  if (!APNS_AUTH_KEY) throw new Error('APNS_AUTH_KEY secret is not set');

  const pem = APNS_AUTH_KEY
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  cryptoKeyPromise = crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  return cryptoKeyPromise;
}

let cachedJwt: { token: string; createdAt: number } | null = null;
async function getApnsJwt(): Promise<string> {
  if (!APNS_KEY_ID || !APNS_TEAM_ID) {
    throw new Error('APNS_KEY_ID / APNS_TEAM_ID secrets are not set');
  }
  const now = Math.floor(Date.now() / 1000);
  // APNs accepts JWTs valid up to 60 minutes; reuse one until ~50 min.
  if (cachedJwt && now - cachedJwt.createdAt < 50 * 60) {
    return cachedJwt.token;
  }
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }));
  const signingInput = `${header}.${claims}`;
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  const token = `${signingInput}.${b64url(sig)}`;
  cachedJwt = { token, createdAt: now };
  return token;
}

interface ApnsResult { status: number; body: string }

async function sendOne(token: string, payload: unknown): Promise<ApnsResult> {
  if (!APNS_BUNDLE_ID) throw new Error('APNS_BUNDLE_ID secret is not set');
  const jwt = await getApnsJwt();
  const res = await fetch(`${APNS_HOST}/3/device/${token}`, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwt}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.text() };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    const body = await req.json().catch(() => ({}));
    const notificationId: string | undefined = body?.notification_id ?? body?.record?.id;
    if (!notificationId) {
      return new Response('notification_id required', { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: notification, error: nErr } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, payload')
      .eq('id', notificationId)
      .maybeSingle();
    if (nErr) throw nErr;
    if (!notification) {
      return new Response(JSON.stringify({ sent: 0, reason: 'not_found' }), { status: 200 });
    }

    const { data: devices, error: dErr } = await supabase
      .from('user_devices')
      .select('token')
      .eq('user_id', notification.user_id)
      .eq('platform', 'ios')
      .eq('notifications_enabled', true);
    if (dErr) throw dErr;

    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_devices' }), { status: 200 });
    }

    const apnsPayload = {
      aps: {
        alert: {
          title: notification.title || 'Worship N Yaps',
          body: notification.body || '',
        },
        sound: 'default',
        'mutable-content': 1,
      },
      n_id: notification.id,
      type: notification.type,
      payload: notification.payload,
    };

    let sent = 0;
    const expired: string[] = [];
    for (const d of devices) {
      const r = await sendOne(d.token, apnsPayload);
      if (r.status >= 200 && r.status < 300) {
        sent++;
      } else if (r.status === 410) {
        expired.push(d.token);
      } else {
        console.warn(`APNs ${r.status} for ${d.token.slice(0, 8)}…: ${r.body}`);
      }
    }

    if (expired.length > 0) {
      await supabase.from('user_devices').delete().in('token', expired);
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('send-push fatal:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
