import type { CapacitorConfig } from '@capacitor/cli';

// Live-reload from the local Vite dev server.
// Only active when CAP_LIVE_RELOAD_URL is set, so this can never ship to the App Store.
const liveReloadUrl = process.env.CAP_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.worshipnyapps.app',
  appName: 'Worship and Yapps',
  webDir: 'dist',
  ...(liveReloadUrl && {
    server: {
      url: liveReloadUrl,
      cleartext: true,
    },
  }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: '#2650eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#2650eb',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    preferredContentMode: 'mobile',
    deploymentTarget: '14.0',
  }
};

export default config;
