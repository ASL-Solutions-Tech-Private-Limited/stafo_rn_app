import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, AppState, Linking, Platform, Pressable, StatusBar, StyleSheet, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Camera,
  type CameraDevice,
  type CameraOutput,
  useCameraDevice,
  useCameraPermission,
  VisionCamera,
} from 'react-native-vision-camera';
import {CameraOff, Flashlight, FlashlightOff, X, type LucideIcon} from 'lucide-react-native';
import {punchWithQr} from '../../api/endpoints/punch';
import {Button, Text, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {queryKeys, useEmployeeDashboard} from '../home/queries';
import {punchedOutcome, punchTitle, usePunchResult} from './punchFlow';

type BarcodeModule = typeof import('react-native-vision-camera-barcode-scanner');

/** ML Kit's barcode scanner (Android). iOS reads QR codes with VisionCamera's own object output. */
const barcodeScanner: BarcodeModule | null = (() => {
  if (Platform.OS !== 'android') {
    return null;
  }
  try {
    return require('react-native-vision-camera-barcode-scanner') as BarcodeModule;
  } catch {
    return null;
  }
})();

const BOX = 240;
/** After a code the server rejects, wait before reading again. */
const RETRY_AFTER_MS = 2500;

export function QrPunchScreen({navigation, route}: AppScreenProps<'QrPunch'>) {
  const {direction} = route.params;
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const queryClient = useQueryClient();
  const info = useEmployeeDashboard().data?.employee_info;
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const permission = useCameraPermission();
  useEffect(() => {
    if (!permission.hasPermission && permission.canRequestPermission) {
      permission.requestPermission();
    }
  }, [permission]);
  const back = useCameraDevice('back');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const device = useMemo(() => back, [back?.id]);
  const [torch, setTorch] = useState(false);
  const [sending, setSending] = useState(false);

  // One code at a time: the scanner reports the same code many times a second.
  const busy = useRef(false);
  const onCode = useRef<(value: string) => void>(() => {});
  onCode.current = async (value: string) => {
    if (busy.current || !info) {
      return;
    }
    busy.current = true;
    haptics.select();
    setSending(true);
    try {
      await punchWithQr(info.id, value);
      haptics.success();
      queryClient.invalidateQueries({queryKey: queryKeys.employeeDashboard});
      usePunchResult.getState().show(punchedOutcome(direction, 'qr', info));
      navigation.goBack();
    } catch (e) {
      haptics.error();
      toast.error((e as Error).message);
      setSending(false);
      setTimeout(() => {
        busy.current = false;
      }, RETRY_AFTER_MS);
    }
  };

  // Built once, not with the library hooks: a new output on each render makes
  // VisionCamera rebuild the session.
  const output = useMemo<CameraOutput | null>(() => {
    if (barcodeScanner) {
      return barcodeScanner.createBarcodeScannerOutput({
        barcodeFormats: ['qr-code'],
        outputResolution: 'preview',
        onBarcodeScanned: codes => {
          const value = codes.find(c => c.rawValue)?.rawValue;
          if (value) {
            onCode.current(value);
          }
        },
        onError: e => console.warn('[QrPunch] scanner error:', e.message),
      });
    }
    if (Platform.OS === 'ios') {
      const objects = VisionCamera.createObjectOutput({enabledObjectTypes: ['qr']});
      objects.setOnObjectsScannedCallback(found => {
        const value = (found as {value?: string}[]).find(o => o.value)?.value;
        if (value) {
          onCode.current(value);
        }
      });
      return objects;
    }
    return null;
  }, []);
  const outputs = useMemo(() => (output ? [output] : []), [output]);

  const blocked = !permission.hasPermission || !device || !output;

  return (
    <View style={{flex: 1, backgroundColor: '#0B0E14'}}>
      <StatusBar barStyle="light-content" />
      {!blocked ? (
        <StableCamera
          device={device}
          isActive={focused && appActive && !sending}
          outputs={outputs}
          torch={torch && !!device.hasTorch}
        />
      ) : null}

      {/* The window: dim everything around the box. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center'}]}>
        <View
          style={{
            width: BOX,
            height: BOX,
            borderRadius: 18,
            borderWidth: 1000,
            borderColor: 'rgba(8,10,16,0.6)',
            boxSizing: 'content-box',
            position: 'absolute',
          }}
        />
        <Corners />
      </View>

      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
        <RoundButton icon={X} label="Close" onPress={() => navigation.goBack()} />
        <View style={{flex: 1, alignItems: 'center'}}>
          <Text variant="title" color="#FFFFFF">
            {punchTitle(direction)}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.72)">
            QR attendance
          </Text>
        </View>
        {device?.hasTorch ? (
          <RoundButton
            icon={torch ? FlashlightOff : Flashlight}
            label={torch ? 'Turn torch off' : 'Turn torch on'}
            onPress={() => setTorch(t => !t)}
          />
        ) : (
          <View style={{width: 40}} />
        )}
      </View>

      <View
        accessibilityLiveRegion="polite"
        style={{position: 'absolute', left: 32, right: 32, top: '50%', marginTop: BOX / 2 + 32, alignItems: 'center', gap: 6}}>
        {blocked ? (
          <>
            <CameraOff size={32} color="#FFFFFF" />
            <Text variant="title" color="#FFFFFF" align="center">
              {!permission.hasPermission ? 'Camera access is off' : 'Can’t scan on this device'}
            </Text>
            {!permission.hasPermission ? (
              <Button
                title={permission.canRequestPermission ? 'Allow camera' : 'Open Settings'}
                size="md"
                fullWidth={false}
                onPress={() =>
                  permission.canRequestPermission ? permission.requestPermission() : Linking.openSettings()
                }
              />
            ) : null}
          </>
        ) : sending ? (
          <>
            <ActivityIndicator color="#FFFFFF" />
            <Text variant="title" color="#FFFFFF">
              Checking the code…
            </Text>
          </>
        ) : (
          <>
            <Text variant="title" color="#FFFFFF" align="center">
              Point at the QR code at your branch
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.72)" align="center">
              It punches you {direction} as soon as it reads the code.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/** Kept out of this screen's renders: each <Camera> render rebinds the camera. */
const StableCamera = React.memo(function StableCameraView({
  device,
  isActive,
  outputs,
  torch,
}: {
  device: CameraDevice;
  isActive: boolean;
  outputs: CameraOutput[];
  torch: boolean;
}) {
  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      resizeMode="cover"
      outputs={outputs}
      torchMode={torch ? 'on' : 'off'}
      onError={e => console.error('[QrPunch] camera error:', e.message)}
    />
  );
});

function Corners() {
  const arm = 44;
  const w = 5;
  const corner = (v: 'top' | 'bottom', h: 'left' | 'right') => (
    <View
      key={v + h}
      style={{
        position: 'absolute',
        [v]: 0,
        [h]: 0,
        width: arm,
        height: arm,
        borderColor: '#FFFFFF',
        [`border${v === 'top' ? 'Top' : 'Bottom'}Width`]: w,
        [`border${h === 'left' ? 'Left' : 'Right'}Width`]: w,
        [`border${v === 'top' ? 'Top' : 'Bottom'}${h === 'left' ? 'Left' : 'Right'}Radius`]: 18,
      }}
    />
  );
  return (
    <View style={{width: BOX, height: BOX}}>
      {corner('top', 'left')}
      {corner('top', 'right')}
      {corner('bottom', 'left')}
      {corner('bottom', 'right')}
    </View>
  );
}

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
