import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle} from 'react-native-svg';
import {
  Camera,
  type CameraDevice,
  type CameraOutput,
  type CameraRef,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  CommonResolutions,
} from 'react-native-vision-camera';
import type {Face} from 'react-native-vision-camera-face-detector';
import {
  CameraOff,
  CircleAlert,
  CircleCheck,
  Circle as CircleIcon,
  ImageIcon,
  ScanFace,
  SwitchCamera,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import {Button, Text, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {settleFaceCapture, type FaceCaptureOutcome} from './captureFace';
import {faceDetection} from './faceDetection';
import {cropAroundFace} from './faceImage';

const GREEN = '#22C55E';
const RED = '#F05252';
const DIM = 'rgba(8,10,16,0.66)';
/** How long one good face must stay put before the photo is taken. */
const HOLD_MS = 1500;
/** With no face at all for this long, say so instead of just guiding. */
const NO_FACE_AFTER_MS = 2500;

type Phase = 'search' | 'adjust' | 'hold' | 'none' | 'many';
type Reading = {phase: Phase; one: boolean; centred: boolean; close: boolean; hint: string};

export function FaceCaptureScreen({navigation, route}: AppScreenProps<'FaceCapture'>) {
  const {title, personName} = route.params;
  const firstName = personName.split(' ')[0];
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const [position, setPosition] = useState<'front' | 'back'>('front');
  const preferred = useCameraDevice(position);
  const other = useCameraDevice(position === 'front' ? 'back' : 'front');
  // Some devices (and emulators) have only one camera: use whichever exists.
  // Keyed by id: a new device object, even for the same camera, makes
  // VisionCamera reconfigure the whole session.
  const pickedDevice = preferred ?? other;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const device = useMemo(() => pickedDevice, [pickedDevice?.id]);
  const permission = useCameraPermission();
  const photoOutput = usePhotoOutput({targetResolution: CommonResolutions.FHD_4_3, quality: 0.92});

  // Guide circle geometry, in screen points (the camera fills the screen).
  // Large enough that a face at arm's length fills it comfortably.
  const D = Math.min(width * 0.88, 420);
  const cx = width / 2;
  const cy = Math.max(insets.top + 96 + D / 2, height * 0.4);

  const searchText = `Fit ${firstName}'s face in the circle`;
  const [reading, setReading] = useState<Reading>({
    phase: 'search',
    one: false,
    centred: false,
    close: false,
    hint: searchText,
  });
  const readingKey = useRef('');
  const lastFaceAt = useRef(Date.now());
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Whatever happens, tell the caller once this screen is gone.
  const outcome = useRef<FaceCaptureOutcome>({type: 'cancel'});
  useEffect(() => () => settleFaceCapture(outcome.current), []);
  const finish = (next: FaceCaptureOutcome) => {
    outcome.current = next;
    navigation.goBack();
  };

  useEffect(() => {
    if (permission.canRequestPermission) {
      permission.requestPermission();
    }
    // Only ask once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    haptics.tap();
    let step = 'capture';
    try {
      const photo = await photoOutput.capturePhoto({enableShutterSound: true}, {});
      step = 'convert';
      const image = await photo.toImageAsync();
      photo.dispose();
      step = 'save';
      const path = await image.saveToTemporaryFileAsync('jpg', 92);
      step = 'face check';
      const result = await cropAroundFace(path);
      if (result.status === 'ok') {
        haptics.success();
        finish({type: 'photo', image: result.image});
        return;
      }
      haptics.error();
      toast.error(
        result.status === 'many'
          ? 'More than one face in the photo. Try again.'
          : "Couldn't see the face clearly in the photo. Try again.",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[FaceCapture] ${step} failed:`, message);
      haptics.error();
      // In dev builds, show where it broke; users just get the friendly line.
      toast.error(__DEV__ ? `Photo failed at ${step}: ${message}` : "Couldn't take the photo. Try again.");
    }
    busyRef.current = false;
    setBusy(false);
    // finish/navigation are stable for this screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoOutput]);

  const update = (next: Reading) => {
    const key = `${next.phase}|${next.one}|${next.centred}|${next.close}|${next.hint}`;
    if (key === readingKey.current) {
      return;
    }
    if (next.phase === 'hold' && !readingKey.current.startsWith('hold')) {
      haptics.select();
    }
    readingKey.current = key;
    setReading(next);
  };

  // Fill the ring while one good face holds still, then take the photo.
  // The camera is memoised, so these re-renders don't touch it.
  const [holdProgress, setHoldProgress] = useState(0);
  const holding = reading.phase === 'hold' && !busy;
  useEffect(() => {
    if (!holding) {
      setHoldProgress(0);
      return;
    }
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / HOLD_MS);
      setHoldProgress(p);
      if (p >= 1) {
        capture();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [holding, capture]);

  // Built by hand rather than with the library's <Camera>/useFaceDetectorOutput:
  // those create a new output on every render, and each new output makes
  // VisionCamera rebuild the session, cancelling any photo being taken.
  const cameraRef = useRef<CameraRef>(null);
  const onFacesRef = useRef<(faces: Face[]) => void>(() => {});
  const lensFacing = device?.position === 'back' ? 'back' : 'front';
  const faceOutput = useMemo(() => {
    if (!faceDetection) {
      return null;
    }
    const lib = faceDetection;
    return lib.createFaceDetectorOutput({
      cameraFacing: lensFacing,
      autoMode: true,
      performanceMode: 'fast',
      runClassifications: true,
      minFaceSize: 0.15,
      outputResolution: 'preview',
      onFacesDetected: faces => {
        const camera = cameraRef.current;
        if (faces.length === 0) {
          onFacesRef.current(faces);
        } else if (camera?.preview != null) {
          // autoMode gives camera coordinates; map them onto the on-screen preview.
          onFacesRef.current(lib.transformFacesToPreviewCoordinates(faces, camera));
        }
      },
      onError: () => {},
    });
  }, [lensFacing]);
  const outputs = useMemo(
    () => (faceOutput ? [faceOutput, photoOutput] : [photoOutput]),
    [faceOutput, photoOutput],
  );

  const onFaces = (faces: Face[]) => {
    if (busyRef.current) {
      return;
    }
    const now = Date.now();
    if (faces.length === 0) {
      const lost = now - lastFaceAt.current > NO_FACE_AFTER_MS;
      update({
        phase: lost ? 'none' : 'search',
        one: false,
        centred: false,
        close: false,
        hint: lost ? 'No face found' : searchText,
      });
      return;
    }
    lastFaceAt.current = now;
    if (faces.length > 1) {
      update({phase: 'many', one: false, centred: false, close: false, hint: 'Only one face, please'});
      return;
    }
    const b = faces[0].bounds;
    const fx = b.x + b.width / 2;
    const fy = b.y + b.height / 2;
    const offset = Math.hypot(fx - cx, fy - cy);
    const face = faces[0];
    const facing = Math.abs(face.yawAngle) < 20 && Math.abs(face.rollAngle) < 20;
    const centred = offset < D * 0.2 && facing;
    // ML Kit's box spans brow to chin, roughly 60% of the circle when the head fills it.
    const tooFar = b.width < D * 0.32;
    const tooNear = b.width > D * 0.95;
    const close = !tooFar && !tooNear;
    // A blink makes a poor reference for face matching.
    const eyesOpen = (face.leftEyeOpenProbability ?? 1) > 0.4 && (face.rightEyeOpenProbability ?? 1) > 0.4;
    if (centred && close && eyesOpen) {
      update({phase: 'hold', one: true, centred, close, hint: 'Face found · hold still'});
      return;
    }
    update({
      phase: 'adjust',
      one: true,
      centred,
      close,
      hint: tooFar
        ? 'Move a little closer'
        : tooNear
        ? 'Move back a little'
        : !facing
        ? 'Look straight at the camera'
        : centred && close && !eyesOpen
        ? 'Keep both eyes open'
        : searchText,
    });
  };

  const ready = reading.phase === 'hold' && !busy;
  const ringColor = reading.phase === 'none' || reading.phase === 'many' ? RED : null;
  const pill: {icon: LucideIcon; fg: string; bg: string} =
    reading.phase === 'hold'
      ? {icon: CircleCheck, fg: '#0B0E14', bg: GREEN}
      : reading.phase === 'none'
      ? {icon: CircleAlert, fg: '#FFFFFF', bg: RED}
      : reading.phase === 'many'
      ? {icon: Users, fg: '#FFFFFF', bg: RED}
      : {icon: ScanFace, fg: '#FFFFFF', bg: 'rgba(255,255,255,0.16)'};
  const footHint =
    reading.phase === 'hold'
      ? 'Takes the photo by itself in a second, or tap the shutter'
      : reading.phase === 'none'
      ? 'Only a real face can be saved as the reference'
      : reading.phase === 'many'
      ? 'Ask others to step out of the frame'
      : 'The shutter turns on once a face is found';

  onFacesRef.current = onFaces;
  const blocked = !permission.hasPermission || !device || !faceOutput;
  const R = D / 2;
  const B = Math.max(width, height); // dim border thickness around the clear circle

  return (
    <View style={{flex: 1, backgroundColor: '#0B0E14'}}>
      <StatusBar barStyle="light-content" />
      {!blocked ? (
        <StableCamera
          cameraRef={cameraRef}
          device={device}
          isActive={focused && appActive}
          outputs={outputs}
        />
      ) : null}

      {/* Dim everything except the guide circle. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx - R - B,
          top: cy - R - B,
          width: D + 2 * B,
          height: D + 2 * B,
          borderRadius: R + B,
          borderWidth: B,
          borderColor: DIM,
        }}
      />
      <Svg
        pointerEvents="none"
        width={D + 12}
        height={D + 12}
        style={{position: 'absolute', left: cx - R - 6, top: cy - R - 6}}>
        {ringColor ? (
          <Circle cx={R + 6} cy={R + 6} r={R} stroke={ringColor} strokeWidth={4} fill="none" />
        ) : reading.phase === 'hold' ? (
          <>
            <Circle cx={R + 6} cy={R + 6} r={R} stroke="rgba(255,255,255,0.25)" strokeWidth={5} fill="none" />
            <Circle
              cx={R + 6}
              cy={R + 6}
              r={R}
              stroke={GREEN}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${Math.PI * D} ${Math.PI * D}`}
              strokeDashoffset={Math.PI * D * (1 - holdProgress)}
              transform={`rotate(-90 ${R + 6} ${R + 6})`}
            />
          </>
        ) : (
          <Circle
            cx={R + 6}
            cy={R + 6}
            r={R}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={3}
            strokeDasharray="10 9"
            fill="none"
          />
        )}
      </Svg>

      {/* Top bar */}
      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: insets.top + 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
        <RoundButton icon={X} label="Close" onPress={() => navigation.goBack()} />
        <View style={{flex: 1, alignItems: 'center'}}>
          <Text variant="title" color="#FFFFFF">
            {title}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.72)" numberOfLines={1}>
            {personName}
          </Text>
        </View>
        <RoundButton
          icon={SwitchCamera}
          label="Switch camera"
          onPress={() => setPosition(p => (p === 'front' ? 'back' : 'front'))}
        />
      </View>

      {blocked ? (
        <View
          style={{
            position: 'absolute',
            left: 32,
            right: 32,
            top: cy - 90,
            alignItems: 'center',
            gap: 12,
          }}>
          <CameraOff size={36} color="#FFFFFF" />
          <Text variant="title" color="#FFFFFF" align="center">
            {!permission.hasPermission
              ? 'Camera access is off'
              : !faceOutput
              ? "Face check isn't in this build"
              : 'No camera on this device'}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.72)" align="center">
            {!permission.hasPermission
              ? 'Turn on camera access for STAFO to take a reference selfie.'
              : 'Choose a photo from the gallery instead.'}
          </Text>
          {!permission.hasPermission ? (
            <Button
              title={permission.canRequestPermission ? 'Allow camera' : 'Open Settings'}
              size="md"
              onPress={() =>
                permission.canRequestPermission ? permission.requestPermission() : Linking.openSettings()
              }
            />
          ) : null}
        </View>
      ) : (
        <>
          <View
            accessibilityLiveRegion="polite"
            style={{position: 'absolute', left: 0, right: 0, top: cy + R + 24, alignItems: 'center'}}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: pill.bg,
              }}>
              {busy ? (
                <ActivityIndicator size="small" color={pill.fg} />
              ) : (
                <pill.icon size={18} color={pill.fg} />
              )}
              <Text variant="label" color={pill.fg} style={{fontFamily: 'PlusJakartaSans-Bold'}}>
                {busy ? 'Checking photo…' : reading.hint}
              </Text>
            </View>
          </View>
          <View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: cy + R + 80,
              flexDirection: 'row',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}>
            <Chip ok={reading.one} label="One face" />
            <Chip ok={reading.centred} label="Centred" />
            <Chip ok={reading.close} label="Close enough" />
          </View>
        </>
      )}

      {/* Bottom controls */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: insets.bottom + 24,
          paddingTop: 16,
          backgroundColor: 'rgba(8,10,16,0.6)',
        }}>
        <Text
          variant="caption"
          color="rgba(255,255,255,0.72)"
          align="center"
          style={{marginBottom: 16, paddingHorizontal: 16}}>
          {blocked ? ' ' : footHint}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 40,
          }}>
          <Pressable
            onPress={() => finish({type: 'gallery'})}
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
            hitSlop={8}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ImageIcon size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={capture}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            accessibilityState={{disabled: !ready}}
            style={{
              width: 78,
              height: 78,
              borderRadius: 39,
              borderWidth: 4,
              borderColor: ready ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,
                backgroundColor: ready ? '#FFFFFF' : 'rgba(255,255,255,0.22)',
              }}
            />
          </Pressable>
          <View style={{width: 48}} />
        </View>
      </View>
    </View>
  );
}

/**
 * VisionCamera re-applies output orientation, which rebinds the camera, every
 * time <Camera> renders. The guide re-renders on every face reading, so keep
 * the camera itself out of those renders; otherwise a photo being taken is
 * cancelled.
 */
const StableCamera = React.memo(function StableCameraView({
  cameraRef,
  device,
  isActive,
  outputs,
}: {
  cameraRef: React.RefObject<CameraRef | null>;
  device: CameraDevice;
  isActive: boolean;
  outputs: CameraOutput[];
}) {
  return (
    <Camera
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      resizeMode="cover"
      outputs={outputs}
      onError={e => console.error('[FaceCapture] camera error:', e.message)}
    />
  );
});

function RoundButton({icon: Icon, label, onPress}: {icon: LucideIcon; label: string; onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={20} color="#FFFFFF" />
    </Pressable>
  );
}

function Chip({ok, label}: {ok: boolean; label: string}) {
  const Icon = ok ? CircleCheck : CircleIcon;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 30,
        paddingHorizontal: 10,
        borderRadius: 15,
        backgroundColor: ok ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.10)',
      }}>
      <Icon size={14} color={ok ? GREEN : 'rgba(255,255,255,0.6)'} />
      <Text
        variant="caption"
        color={ok ? '#BBF7D0' : 'rgba(255,255,255,0.75)'}
        style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
        {label}
      </Text>
    </View>
  );
}
