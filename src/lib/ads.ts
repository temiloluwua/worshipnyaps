import { Capacitor } from '@capacitor/core';

// Single source of truth for AdMob configuration.
//
// These are Google's official TEST ad unit / app IDs — they always serve safe
// test ads and must be swapped for your real AdMob IDs before a production
// release (test ads on a real unit, or real ads on a test build, violate
// AdMob policy). To go live:
//   1. Create an AdMob app + banner ad unit for iOS and for Android.
//   2. Replace the IDs below with your real ones.
//   3. Put the real *app* IDs in the native config:
//      - iOS:     ios/App/App/Info.plist  → GADApplicationIdentifier
//      - Android: android/app/src/main/AndroidManifest.xml → com.google.android.gms.ads.APPLICATION_ID
//
// Ads only run inside the native iOS/Android apps (Capacitor). On the web build
// AdMob isn't available, so everything here no-ops.

export const USING_TEST_ADS = true;

// Google's documented test banner ad units.
const TEST_BANNER = {
  ios: 'ca-app-pub-3940256099942544/2934735716',
  android: 'ca-app-pub-3940256099942544/6300978111',
};

export const adsEnabled = (): boolean => Capacitor.isNativePlatform();

export const bannerAdUnitId = (): string => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return TEST_BANNER.ios;
  return TEST_BANNER.android;
};
