import {Images, type Image} from 'react-native-nitro-image';
import type {ImageFaceDetector} from 'react-native-vision-camera-face-detector';
import type {LocalImage} from '../../api/endpoints/employee';
import {faceDetection} from './faceDetection';

export type FaceCrop = {status: 'ok'; image: LocalImage} | {status: 'none' | 'many'};

/** Final reference selfie size (square, px). */
const OUTPUT_SIZE = 1080;
/** Crop side as a multiple of the face box, so hair, chin and a little shoulder fit. */
const FACE_PADDING = 2;

let cachedDetector: ImageFaceDetector | null = null;
function getDetector() {
  if (!faceDetection) {
    return null;
  }
  cachedDetector ??= faceDetection.createImageFaceDetector({performanceMode: 'accurate', minFaceSize: 0.1});
  return cachedDetector;
}

const toFileUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);
const toPath = (uri: string) => uri.replace(/^file:\/\//, '');
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Checks a photo for exactly one face and returns a square JPEG cropped around it.
 * The input must be upright (no EXIF rotation): camera photos come from
 * `Photo.toImage()` and gallery photos are re-encoded by the picker.
 */
export async function cropAroundFace(file: string): Promise<FaceCrop> {
  const image = await Images.loadFromFileAsync(toPath(file));
  const detector = getDetector();
  if (!detector) {
    // iOS simulator dev builds only: no ML Kit, so take a centre square.
    if (!__DEV__) {
      throw new Error('Face detection is not available in this build');
    }
    const side = Math.min(image.width, image.height);
    return save(
      await image.cropAsync(
        (image.width - side) / 2,
        (image.height - side) / 2,
        (image.width + side) / 2,
        (image.height + side) / 2,
      ),
      side,
    );
  }
  const faces = detector.detectFaces(toFileUri(file));
  if (faces.length === 0) {
    return {status: 'none'};
  }
  if (faces.length > 1) {
    return {status: 'many'};
  }

  const face = faces[0];
  // Bounds are in the detector's pixel space; scale in case it decoded at another size.
  const scale = face.frameWidth > 0 ? image.width / face.frameWidth : 1;
  const b = {
    x: face.bounds.x * scale,
    y: face.bounds.y * scale,
    width: face.bounds.width * scale,
    height: face.bounds.height * scale,
  };

  const side = Math.min(Math.max(b.width, b.height) * FACE_PADDING, image.width, image.height);
  // Nudge up a little: the face box starts at the brow, so leave room for hair.
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2 - b.height * 0.08;
  const x0 = clamp(cx - side / 2, 0, image.width - side);
  const y0 = clamp(cy - side / 2, 0, image.height - side);

  return save(await image.cropAsync(x0, y0, x0 + side, y0 + side), side);
}

async function save(square: Image, side: number): Promise<FaceCrop> {
  const out = side > OUTPUT_SIZE ? await square.resizeAsync(OUTPUT_SIZE, OUTPUT_SIZE) : square;
  const saved = await out.saveToTemporaryFileAsync('jpg', 85);
  return {
    status: 'ok',
    image: {uri: toFileUri(saved), mime: 'image/jpeg', name: `selfie_${Date.now()}.jpg`},
  };
}
