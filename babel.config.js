module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Must stay last: compiles Reanimated worklets.
  plugins: ['react-native-worklets/plugin'],
};
