import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  type BannerAdOptions,
} from '@capacitor-community/admob';
import { adsEnabled, bannerAdUnitId, USING_TEST_ADS } from '../../lib/ads';

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
    // iOS: ask for tracking permission first (needs NSUserTrackingUsageDescription
    // in Info.plist). Declining just yields non-personalized ads.
    if (Capacitor.getPlatform() === 'ios') {
      try { await AdMob.requestTrackingAuthorization(); } catch { /* user dismissed */ }
    }
    await AdMob.initialize({ initializeForTesting: USING_TEST_ADS });
    // TODO(before launch): add the UMP consent flow (requestConsentInfo /
    // showConsentForm) for GDPR regions, and gate ads for child-directed users.
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
          isTesting: USING_TEST_ADS,
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
