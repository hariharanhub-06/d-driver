import type { CapacitorConfig } from '@capacitor/cli';

// Native shell that loads the live Onlive web app (same login + full UI inside
// an installed app). Swap server.url to a staging URL when testing.
const config: CapacitorConfig = {
  appId: 'com.onlive.app',
  appName: 'Onlive',
  webDir: 'www',
  server: {
    url: 'https://d-driver.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a0f1e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    Geolocation: {},
  },
};

export default config;
