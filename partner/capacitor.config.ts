import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.urbansteam.partner',
  appName: 'Urban Steam Captain',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'localhost'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    // Off for release. Left on, anyone who can plug the phone into a computer
    // can attach Chrome DevTools to the captain's app and read or change
    // everything in it -- the stored token, the partner id, every API call.
    // The customer app has always had this off.
    webContentsDebuggingEnabled: false,
    overrideUserAgent: 'CapacitorApp',
    appendUserAgent: 'CapacitorApp'
  },
  ios: {
    contentInset: 'always'
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#452D9B',
      overlaysWebView: false
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#452D9B',
      sound: 'default',
      channelId: 'partner-orders',
      channelName: 'Order Updates',
      channelDescription: 'Notifications for new orders and delivery updates',
      channelImportance: 4,
      visibility: 1
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '514222866895-c11vn2eb5u15hi6d5ib0eb4d10cdo3oq.apps.googleusercontent.com',
      androidClientId: '514222866895-13bj0clqdvkihfpockb9bmkn9ufbvinf.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
      iosClientId: '514222866895-djikt4rtlktpb3brq7oen1jsr8no3to9.apps.googleusercontent.com'
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
