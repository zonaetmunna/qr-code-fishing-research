/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan the src/ tree (screens, components) for className usage.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // NativeWind follows the system color scheme by default ("media"),
  // matching app.json > userInterfaceStyle: "automatic" and useColorScheme().
  theme: {
    extend: {
      colors: {
        // Brand blue, taken from the splash screen background.
        brand: {
          DEFAULT: '#208AEF',
          fg: '#ffffff',
        },
        // Risk tiers — map to the API's classification enum
        // (safe / risky / dangerous). See lib/classification-styles.ts.
        safe: { DEFAULT: '#16a34a', soft: '#dcfce7', softDark: '#052e16' },
        risky: { DEFAULT: '#d97706', soft: '#fef3c7', softDark: '#451a03' },
        dangerous: { DEFAULT: '#dc2626', soft: '#fee2e2', softDark: '#450a0a' },
      },
    },
  },
  plugins: [],
};
