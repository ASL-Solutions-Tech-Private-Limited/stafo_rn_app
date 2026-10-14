// ML Kit ships no arm64 iOS-simulator slice (and Xcode 27 has no Rosetta
// simulators), so iOS simulator builds leave the face detector out:
//   npm run pods:sim   → simulator (face check skipped, dev only)
//   npm run ios        → also sets it, since run-ios may re-run pod install
//   npm run pods       → real iPhone
// The ML Kit barcode scanner is Android-only on every build: iOS scans QR codes
// with VisionCamera's own (Apple) object output instead.
const iosSimulator = process.env.STAFO_IOS_SIM === '1';

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts'],
  dependencies: {
    'react-native-vision-camera-barcode-scanner': {platforms: {ios: null}},
    ...(iosSimulator ? {'react-native-vision-camera-face-detector': {platforms: {ios: null}}} : {}),
  },
};
