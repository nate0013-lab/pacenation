/**
 * Adds the values that come from the environment (EAS secrets or a local .env)
 * to app.json: the Android Google Maps key and the iOS Google sign-in callback.
 */
module.exports = ({ config }) => {
  const iosClient = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
  // Google's iOS sign-in returns to the app on the reversed client ID scheme.
  const reversed = iosClient ? iosClient.split('.').reverse().join('.') : null;
  return {
    ...config,
    scheme: reversed ? [config.scheme, reversed] : config.scheme,
    ios: { ...config.ios, usesAppleSignIn: true },
    android: {
      ...config.android,
      config: { ...(config.android && config.android.config), googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY || '' } },
    },
  };
};
