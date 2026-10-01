type FaceDetectorModule = typeof import('react-native-vision-camera-face-detector');

/**
 * ML Kit face detection, or null when the native module isn't in this build.
 * iOS simulator builds leave it out (see react-native.config.js); every
 * device build, Android or iPhone, has it.
 */
export const faceDetection: FaceDetectorModule | null = (() => {
  try {
    return require('react-native-vision-camera-face-detector') as FaceDetectorModule;
  } catch {
    return null;
  }
})();
