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
      // The web app calls SplashScreen.hide() the moment React paints its
      // first screen, so on a normal launch the splash hides as soon as the
      // content is ready. launchShowDuration is a hard safety cap: if the web
      // layer never signals ready, the splash still auto-hides so the app can
      // never be stuck on it forever. Keeping the native splash up until paint
      // means there is no white gap during the cold-start window.
      launchShowDuration: 12000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
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
