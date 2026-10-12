import React, {useEffect, useState} from 'react';
import {Image, View} from 'react-native';
import * as StafoLocation from 'stafo-location';
import {Camera, Flag, Gauge, MapPin, Pause, Play, RotateCcw} from 'lucide-react-native';
import type {UploadFile} from '../../api/endpoints/tasks';
import type {Trip, TripAction} from '../../api/endpoints/trips';
import {BottomSheet, Button, PressableScale, Text, TextField} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {takePhoto, useTripAction} from './queries';
import {ACTION_LABEL, formatKm, odometerError} from './tripLogic';

type Fix =
  | {state: 'finding'}
  | {state: 'found'; latitude: number; longitude: number; accuracy: number}
  | {state: 'none'; why: string};

const SUBTITLE: Record<TripAction, string> = {
  start: 'Note the odometer before you set off. Your route is shared until you pause or end the trip.',
  pause: 'Stopping for a while? Route sharing pauses until you resume.',
  resume: 'Back on the road. Route sharing starts again.',
  end: 'Note the final odometer reading. Route sharing stops.',
};

async function findMe(): Promise<Fix> {
  try {
    let permission = await StafoLocation.getPermissionStatus();
    if (permission === 'undetermined' || permission === 'denied') {
      permission = await StafoLocation.requestPermission();
    }
    if (permission === 'denied' || permission === 'undetermined') {
      return {state: 'none', why: 'Location is off for STAFO. The step is saved without where you were.'};
    }
    const p = await StafoLocation.getCurrentPosition(15_000, 30_000);
    return {state: 'found', latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy};
  } catch {
    return {state: 'none', why: 'Couldn’t find your location. The step is saved without it.'};
  }
}

/** Start, pause, resume or end: odometer reading, a fresh photo of it, and where they are. */
export function TripActionSheet({
  trip,
  action,
  lastOdometer,
  startOdometer,
  onClose,
}: {
  trip: Trip;
  action: TripAction | null;
  lastOdometer: number | null;
  startOdometer: number | null;
  onClose: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const send = useTripAction();
  const [shown, setShown] = useState<TripAction>('start');
  const [odometer, setOdometer] = useState('');
  const [photo, setPhoto] = useState<UploadFile | null>(null);
  const [fix, setFix] = useState<Fix>({state: 'finding'});
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!action) {
      return;
    }
    setShown(action);
    setOdometer('');
    setPhoto(null);
    setTried(false);
    setFix({state: 'finding'});
    let alive = true;
    findMe().then(f => alive && setFix(f));
    return () => {
      alive = false;
    };
  }, [action]);

  const odoError = odometerError(odometer, lastOdometer);
  const photoError = photo ? null : 'Take a photo of the odometer.';
  const typed = Number(odometer);
  const hint =
    startOdometer != null && shown !== 'start' && !odoError
      ? `Started at ${formatKm(startOdometer)} · ${formatKm(typed - startOdometer)} on this trip`
      : lastOdometer != null
      ? `Last reading ${formatKm(lastOdometer)}`
      : undefined;

  const snap = async () => {
    haptics.tap();
    const p = await takePhoto(`odometer-${trip.id}-${shown}`);
    if (p) {
      setPhoto(p);
    }
  };

  const submit = () => {
    setTried(true);
    if (odoError || photoError || send.isPending) {
      haptics.error();
      return;
    }
    send.mutate(
      {
        trip,
        type: shown,
        odometer: odometer.trim(),
        latitude: fix.state === 'found' ? fix.latitude : null,
        longitude: fix.state === 'found' ? fix.longitude : null,
        photo: photo!,
      },
      {onSuccess: onClose},
    );
  };

  const Icon = shown === 'pause' ? Pause : shown === 'end' ? Flag : Play;

  return (
    <BottomSheet visible={!!action} onClose={onClose} title={ACTION_LABEL[shown]} subtitle={SUBTITLE[shown]}>
      <View style={{gap: spacing.lg}}>
        <TextField
          label="Odometer now"
          icon={Gauge}
          placeholder={lastOdometer != null ? String(lastOdometer) : 'e.g. 12450'}
          keyboardType="decimal-pad"
          value={odometer}
          onChangeText={setOdometer}
          maxLength={9}
          error={tried ? odoError : null}
          hint={hint}
        />
        <View>
          <Text variant="label">Odometer photo</Text>
          <PressableScale
            onPress={snap}
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Retake the odometer photo' : 'Take a photo of the odometer'}
            style={{
              marginTop: 6,
              height: 120,
              borderRadius: radius.lg,
              borderWidth: photo ? 0 : 1.5,
              borderStyle: 'dashed',
              borderColor: tried && photoError ? colors.danger : colors.borderStrong,
              backgroundColor: colors.surfaceMuted,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {photo ? (
              <>
                <Image
                  source={{uri: photo.uri}}
                  style={{position: 'absolute', width: '100%', height: '100%'}}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                  }}>
                  <RotateCcw size={14} color="#FFFFFF" />
                  <Text variant="caption" color="#FFFFFF" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
                    Retake
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Camera size={24} color={colors.primary} />
                <Text variant="label" tone="primary" style={{marginTop: 6}}>
                  Take photo
                </Text>
              </>
            )}
          </PressableScale>
          {tried && photoError ? (
            <Text variant="caption" tone="danger" style={{marginTop: 4}}>
              {photoError}
            </Text>
          ) : null}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <MapPin
            size={14}
            color={
              fix.state === 'found'
                ? colors.success
                : fix.state === 'none'
                ? colors.warning
                : colors.textMuted
            }
          />
          <Text
            variant="caption"
            style={{flex: 1}}
            color={
              fix.state === 'found'
                ? colors.success
                : fix.state === 'none'
                ? colors.warning
                : colors.textMuted
            }>
            {fix.state === 'finding'
              ? 'Finding your location…'
              : fix.state === 'found'
              ? `Location found, accurate to ${Math.max(1, Math.round(fix.accuracy))} m`
              : fix.why}
          </Text>
        </View>
        <Button
          title={ACTION_LABEL[shown]}
          icon={Icon}
          loading={send.isPending}
          disabled={send.isPending || fix.state === 'finding'}
          onPress={submit}
        />
      </View>
    </BottomSheet>
  );
}
