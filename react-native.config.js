// ML Kit ships no arm64 iOS-simulator slice (and Xcode 27 has no Rosetta
// simulators), so iOS simulator builds leave the face detector out:
//   npm run pods:sim   → simulator (face check skipped, dev only)
//   npm run ios        → also sets it, since run-ios may re-run pod install
//   npm run pods       → real iPhone
const iosSimulator = process.env.STAFO_IOS_SIM === '1';

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts'],
  dependencies: iosSimulator
    ? {'react-native-vision-camera-face-detector': {platforms: {ios: null}}}
    : {},
};
