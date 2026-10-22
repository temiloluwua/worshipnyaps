import { Capacitor } from '@capacitor/core';

// Single source of truth for AdMob configuration.
//
// Both iOS and Android use real AdMob app/ad-unit IDs (publisher
// pub-2186861379596825). AdMob IDs are per-platform, so each OS has its own
// app ID + banner unit.
//
// Policy: never serve real ads on your own test/dev builds. So dev builds
// request test ads even on the real units (see usingTestAds); production
// builds serve real ads. Ads only run inside the native apps (no-op on web).

const IOS = {
  // ios/App/App/Info.plist → GADApplicationIdentifier must match this app ID.
  appId: 'ca-app-pub-2186861379596825~7473094000',
  banner: 'ca-app-pub-2186861379596825/4974089025',
};

const ANDROID = {
  // android/app/src/main/AndroidManifest.xml → APPLICATION_ID must match this.
  appId: 'ca-app-pub-2186861379596825~2840919702',
  banner: 'ca-app-pub-2186861379596825/9056586065',
};

export const adsEnabled = (): boolean => Capacitor.isNativePlatform();

export const bannerAdUnitId = (): string =>
  Capacitor.getPlatform() === 'ios' ? IOS.banner : ANDROID.banner;

// Whether this platform/build should request *test* ads.
// Both platforms are on real units now: only dev builds request test ads;
// production serves real ads.
export const usingTestAds = (): boolean => !import.meta.env.PROD;
