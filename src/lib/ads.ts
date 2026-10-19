import { Capacitor } from '@capacitor/core';

// Single source of truth for AdMob configuration.
//
// iOS uses the real AdMob app/ad-unit IDs. Android is still on Google's TEST
// ad unit until an Android AdMob app is created — create it, then replace the
// Android banner ID below and the APPLICATION_ID in AndroidManifest.xml.
//
// Policy: never serve real ads on your own test/dev builds. So dev builds
// request test ads even on the real iOS unit (see usingTestAds); production
// builds serve real ads. Ads only run inside the native apps (no-op on web).

const IOS = {
  // ios/App/App/Info.plist → GADApplicationIdentifier must match this app ID.
  appId: 'ca-app-pub-2186861379596825~7473094000',
  banner: 'ca-app-pub-2186861379596825/4974089025',
};

// TODO: replace with the real Android AdMob app + banner IDs once created.
const ANDROID_TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
};

export const adsEnabled = (): boolean => Capacitor.isNativePlatform();

export const bannerAdUnitId = (): string =>
  Capacitor.getPlatform() === 'ios' ? IOS.banner : ANDROID_TEST.banner;

// Whether this platform/build should request *test* ads.
// - Android: always (still on Google's test unit).
// - iOS: only in dev builds; production serves real ads on the real unit.
export const usingTestAds = (): boolean => {
  if (Capacitor.getPlatform() !== 'ios') return true;
  return !import.meta.env.PROD;
};
