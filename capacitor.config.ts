import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8c93341d450544efbafffd69af4eef71',
  appName: 'Track My Life',
  webDir: 'dist',
  server: {
    url: 'https://8c93341d-4505-44ef-baff-fd69af4eef71.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Geolocation: {
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
  },
  ios: {
    scheme: 'Track My Life',
    backgroundColor: '#000000',
    contentInset: 'automatic',
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    presentationStyle: 'fullscreen',
    statusBarStyle: 'default',
    webContentsDebuggingEnabled: true,
    backgroundMode: 'background-processing',
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
    automaticallyHideHomeIndicator: false,
    hideHomeIndicator: false,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
    backgroundColor: '#000000',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    appendUserAgent: undefined,
    overrideUserAgent: undefined,
    backgroundMode: 'background-processing',
    handleActivityResult: true,
    deepLinks: [],
  },
};

export default config;