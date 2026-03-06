import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worshipandyapps.app',
  appName: 'Worship and Yapps',
  webDir: 'dist',
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
