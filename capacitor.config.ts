/**
 * Capacitor shell config for KinSight native builds (iOS / Android).
 * Install: npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
 * See native/README.md for full setup.
 */
const config = {
  appId: "app.kinsight.mobile",
  appName: "KinSight",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {},
};

export default config;
