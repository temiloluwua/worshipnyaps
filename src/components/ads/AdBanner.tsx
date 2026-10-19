import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPosition,
  BannerAdSize,
  type BannerAdOptions,
} from '@capacitor-community/admob';
import { adsEnabled, bannerAdUnitId, usingTestAds } from '../../lib/ads';

// Renders a native AdMob banner pinned above the bottom tab bar. It draws no
// DOM — the banner is a native view the plugin overlays on the webview — so
// this component returns null and just drives show/hide via effects.
//
// Mount it only where a banner is wanted (main app views, adult users). On the
// web build adsEnabled() is false, so it does nothing.

// AdMob.initialize() must run exactly once per app session.
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // 1. UMP consent (GDPR/EEA). Harmless elsewhere — status comes back
    //    NOT_REQUIRED and no form shows. Failures are non-fatal: fall through
    //    to non-personalized ads rather than blocking the app.
    try {
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
    } catch { /* consent unavailable — continue with limited ads */ }

    // 2. iOS App Tracking Transparency prompt (needs NSUserTrackingUsageDescription
    //    in Info.plist). Declining just yields non-personalized ads.
    if (Capacitor.getPlatform() === 'ios') {
      try { await AdMob.requestTrackingAuthorization(); } catch { /* user dismissed */ }
    }

    // 3. Initialize the SDK.
    await AdMob.initialize({ initializeForTesting: usingTestAds() });
  })();
  return initPromise;
}

export function AdBanner() {
  useEffect(() => {
    if (!adsEnabled()) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureInitialized();
        if (cancelled) return;
        const options: BannerAdOptions = {
          adId: bannerAdUnitId(),
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          // Clear the ~56px bottom tab bar so the banner sits just above it.
          margin: 56,
          isTesting: usingTestAds(),
        };
        await AdMob.showBanner(options);
      } catch (e) {
        console.error('[ads] failed to show banner', e);
      }
    })();

    return () => {
      cancelled = true;
      if (adsEnabled()) {
        AdMob.removeBanner().catch(() => { /* already gone */ });
      }
    };
  }, []);

  return null;
}
