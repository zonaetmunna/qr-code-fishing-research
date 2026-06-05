module.exports = function (api) {
  api.cache(true);
  return {
    // `babel-preset-expo` also wires up React Compiler (enabled via
    // app.json > experiments.reactCompiler); `jsxImportSource: 'nativewind'`
    // lets NativeWind apply `className` to React Native components.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
