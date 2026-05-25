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
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1f2937',
      overlaysWebView: true,
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
