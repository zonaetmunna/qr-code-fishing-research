// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Feed NativeWind's compiled CSS through Metro. The input lives in src/ to
// match this template's `src/`-rooted layout.
module.exports = withNativeWind(config, { input: './src/global.css' });
