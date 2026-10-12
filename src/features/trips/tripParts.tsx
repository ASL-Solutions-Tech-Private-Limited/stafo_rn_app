import React, {useEffect, useRef, useState} from 'react';
import {Modal, Platform, StatusBar, View} from 'react-native';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import MapView, {type Region} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as StafoLocation from 'stafo-location';
import {ArrowLeft, Check, ChevronRight, Hand, LocateFixed, MapPin} from 'lucide-react-native';
import type {Place} from '../../api/endpoints/trips';
import {Button, IconButton, PressableScale, Text, TextField, toast} from '../../components/ui';
import {formatDay, formatTime, toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';

/** Kolkata, where the picker opens when there's nothing better. */
const FALLBACK = {latitude: 22.5726, longitude: 88.3639};

/** "Today, 10:30 AM", "Tomorrow, 9:00 AM", "Thu 16 Oct, 2:00 PM". */
export function dateTimeLabel(d: Date, now = new Date()) {
  const day = toDateKey(d);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const name =
    day === toDateKey(now)
      ? 'Today'
      : day === toDateKey(tomorrow)
      ? 'Tomorrow'
      : `${formatDay(d)}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
  return `${name}, ${formatTime(d)}`;
}

/** Date then time; Android shows its two dialogs, iOS an inline picker. */
export function DateTimeField({
  label,
  value,
  onChange,
  min,
  error,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  min?: Date;
  error?: string | null;
}) {
  const {colors, spacing, radius} = useTheme();
  const [open, setOpen] = useState(false);
  const base = value ?? min ?? new Date();
  const press = () => {
    haptics.select();
    if (Platform.OS !== 'android') {
      setOpen(o => !o);
      return;
    }
    DateTimePickerAndroid.open({
      value: base,
      mode: 'date',
      minimumDate: min,
      onChange: (e, day) => {
        if (e.type !== 'set' || !day) {
          return;
        }
        DateTimePickerAndroid.open({
          value: base,
          mode: 'time',
          is24Hour: false,
          onChange: (e2, t) => {
            if (e2.type === 'set' && t) {
              const d = new Date(day);
              d.setHours(t.getHours(), t.getMinutes(), 0, 0);
              onChange(d);
            }
          },
        });
      },
    });
  };
  return (
    <View style={{flex: 1}}>
      <Text variant="label">{label}</Text>
      <PressableScale
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? dateTimeLabel(value) : 'not set'}`}
        style={{
          marginTop: 6,
          height: 50,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          borderWidth: open || error ? 1.5 : 1,
          borderColor: error ? colors.danger : open ? colors.primary : colors.borderStrong,
          justifyContent: 'center',
        }}>
        <Text variant="body" numberOfLines={1} color={value ? colors.text : colors.textSubtle}>
          {value ? dateTimeLabel(value) : 'Pick a time'}
        </Text>
      </PressableScale>
      {error ? (
        <Text variant="caption" tone="danger" style={{marginTop: 4}}>
          {error}
        </Text>
      ) : null}
      {open ? (
        <View style={{marginTop: spacing.sm}}>
          <DateTimePicker
            value={base}
            mode="datetime"
            display="inline"
            minimumDate={min}
            onChange={(_, d) => d && onChange(d)}
          />
        </View>
      ) : null}
    </View>
  );
}

/** A tappable From / To row that opens the map picker. */
export function PlaceRow({
  label,
  color,
  place,
  error,
  onPress,
}: {
  label: string;
  color: string;
  place: Place | null;
  error?: string | null;
  onPress: () => void;
}) {
  const {colors, radius} = useTheme();
  return (
    <View>
      <PressableScale
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${place?.address || 'not set'}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          minHeight: 56,
          borderRadius: radius.lg,
          borderWidth: error ? 1.5 : 1,
          borderColor: error ? colors.danger : colors.borderStrong,
          backgroundColor: colors.surface,
        }}>
        <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: color}} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="overline" tone="muted">
            {label.toUpperCase()}
          </Text>
          <Text variant="body" numberOfLines={2} color={place ? colors.text : colors.textSubtle}>
            {place?.address || 'Pick on the map'}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textSubtle} />
      </PressableScale>
      {error ? (
        <Text variant="caption" tone="danger" style={{marginTop: 4}}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type Address = {
  name?: string;
  thoroughfare?: string;
  subLocality?: string;
  locality?: string;
  subAdministrativeArea?: string;
  administrativeArea?: string;
  postalCode?: string;
};

/** "Plot 12, Sector V, Bidhannagar, Kolkata, West Bengal 700091" from the map's reverse geocode. */
export function joinAddress(a: Address) {
  const parts = [a.name, a.thoroughfare, a.subLocality, a.locality ?? a.subAdministrativeArea]
    .map(p => p?.trim())
    .filter((p): p is string => !!p);
  const unique = parts.filter((p, i) => parts.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i);
  const state = [a.administrativeArea, a.postalCode].filter(Boolean).join(' ');
  return [...unique, state].filter(Boolean).join(', ');
}

/** Full-screen map: drag it under a fixed pin; the address fills in and can be edited. */
export function PlacePicker({
  visible,
  title,
  color,
  initial,
  near,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  color: string;
  initial: Place | null;
  /** Where to open when there's no initial place (e.g. the other end of the trip). */
  near?: Place | null;
  onClose: () => void;
  onPick: (p: Place) => void;
}) {
  const {colors, spacing, radius, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const [center, setCenter] = useState(initial ?? near ?? FALLBACK);
  const [address, setAddress] = useState(initial?.address ?? '');
  const [looking, setLooking] = useState(false);
  // Once they type, a map move doesn't overwrite what they wrote.
  const edited = useRef(false);
  const seq = useRef(0);

  useEffect(() => {
    if (visible) {
      const start = initial ?? near ?? FALLBACK;
      setCenter(start);
      setAddress(initial?.address ?? '');
      edited.current = !!initial?.address;
      if (!initial && !near) {
        goHere(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const lookUp = async (c: {latitude: number; longitude: number}) => {
    if (edited.current) {
      return;
    }
    const mine = ++seq.current;
    setLooking(true);
    try {
      const a = (await map.current?.addressForCoordinate(c)) as Address | undefined;
      if (mine === seq.current && a && !edited.current) {
        setAddress(joinAddress(a));
      }
    } catch {
      // No address for this spot; they can type one.
    } finally {
      if (mine === seq.current) {
        setLooking(false);
      }
    }
  };

  async function goHere(loud = true) {
    try {
      let permission = await StafoLocation.getPermissionStatus();
      if (permission === 'undetermined' || permission === 'denied') {
        permission = await StafoLocation.requestPermission();
      }
      if (permission === 'denied' || permission === 'undetermined') {
        if (loud) {
          toast.error('Location access is off. Turn it on for STAFO in Settings.');
        }
        return;
      }
      const p = await StafoLocation.getCurrentPosition(10_000, 60_000);
      edited.current = false;
      map.current?.animateToRegion(
        {latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008},
        400,
      );
    } catch {
      if (loud) {
        toast.error('Couldn’t find your location.');
      }
    }
  }

  const region: Region = {
    ...center,
    latitudeDelta: initial ? 0.008 : 0.08,
    longitudeDelta: initial ? 0.008 : 0.08,
  };
  const canUse = !!address.trim() && !looking;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <View style={{flex: 1, backgroundColor: colors.background}}>
        <View style={{flex: 1}}>
          <MapView
            ref={map}
            style={{flex: 1}}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton={false}
            toolbarEnabled={false}
            onPanDrag={() => {
              edited.current = false;
            }}
            onRegionChangeComplete={r => {
              const c = {latitude: r.latitude, longitude: r.longitude};
              setCenter(c);
              lookUp(c);
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View style={{marginTop: -36}}>
              <MapPin size={36} color={color} fill={colors.surface} strokeWidth={2.4} />
            </View>
          </View>
          <View
            style={{
              position: 'absolute',
              left: spacing.lg,
              right: spacing.lg,
              top: insets.top + spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}>
            <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={onClose} />
            <View
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                justifyContent: 'center',
              }}>
              <Text variant="label">{title}</Text>
            </View>
          </View>
          <PressableScale
            onPress={() => {
              haptics.select();
              goHere();
            }}
            accessibilityRole="button"
            accessibilityLabel="Use my location"
            style={{
              position: 'absolute',
              right: spacing.lg,
              bottom: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              height: 36,
              paddingHorizontal: 12,
              borderRadius: 18,
              backgroundColor: colors.surface,
            }}>
            <LocateFixed size={14} color={colors.primary} />
            <Text variant="caption" tone="primary" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
              Here
            </Text>
          </PressableScale>
        </View>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            marginTop: -radius.xxl,
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.md,
          }}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Hand size={14} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              Drag the map to move the pin
            </Text>
          </View>
          <TextField
            label="Address"
            value={address}
            onChangeText={v => {
              edited.current = true;
              setAddress(v);
            }}
            placeholder={looking ? 'Looking up the address…' : 'Street, area, city'}
            multiline
            hint="Filled in from the map. You can edit it."
          />
          <Button
            title="Use this place"
            icon={Check}
            disabled={!canUse}
            onPress={() =>
              onPick({address: address.trim(), latitude: center.latitude, longitude: center.longitude})
            }
          />
        </View>
      </View>
    </Modal>
  );
}
