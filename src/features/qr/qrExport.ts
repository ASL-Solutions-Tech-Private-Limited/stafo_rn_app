import {Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {Images} from 'react-native-nitro-image';
import Share from 'react-native-share';
import type Svg from 'react-native-svg';
import {base64ToArrayBuffer} from '../../lib/base64';
import {CARD_H, CARD_W} from './qrCard';

/** Export at 2× so the printed code stays sharp. */
const SCALE = 2;

/** Renders the printable card to a PNG file and returns its file:// URI. */
export async function exportCardPng(svg: Svg): Promise<string> {
  const width = CARD_W * SCALE;
  const height = CARD_H * SCALE;
  const base64 = await new Promise<string>(resolve => svg.toDataURL(resolve, {width, height}));
  const image = await Images.loadFromEncodedImageDataAsync({
    buffer: base64ToArrayBuffer(base64),
    width,
    height,
    imageFormat: 'png',
  });
  const path = await image.saveToTemporaryFileAsync('png');
  return path.startsWith('file://') ? path : `file://${path}`;
}

export async function shareCard(uri: string, title: string) {
  await Share.open({
    url: uri,
    type: 'image/png',
    filename: `STAFO QR ${title}`.replace(/[^\w ·-]+/g, ''),
    title: `Attendance QR · ${title}`,
    failOnCancel: false,
  });
}

/** Saves to Photos (iOS) / Pictures (Android). */
export async function saveCard(uri: string) {
  await CameraRoll.saveAsset(uri, {type: 'photo', ...(Platform.OS === 'android' ? {album: 'STAFO'} : {})});
}
