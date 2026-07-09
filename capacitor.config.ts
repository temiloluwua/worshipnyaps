import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

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
      // 'native' shrinks the whole webview when the keyboard opens so that
      // fixed-position bottom bars (chat input, compose box) sit right above
      // the keyboard instead of being covered by it. 'body' only resizes the
      // document body, which fixed elements ignore.
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
  },
  ios: {
    preferredContentMode: 'mobile',
    deploymentTarget: '14.0',
  }
};

export default config;
