/**
 * Adds the values that come from the environment (EAS secrets or a local .env)
 * to app.json: the iOS Google sign-in callback. Maps are free OpenFreeMap maps and need no key.
 */
module.exports = ({ config }) => {
  const iosClient = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
  // Google's iOS sign-in returns to the app on the reversed client ID scheme.
  const reversed = iosClient ? iosClient.split('.').reverse().join('.') : null;
  return {
    ...config,
    scheme: reversed ? [config.scheme, reversed] : config.scheme,
    ios: { ...config.ios, usesAppleSignIn: true },
  };
};
