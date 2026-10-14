import React, {useEffect, useMemo, useRef, useState} from 'react';
import {PermissionsAndroid, Platform, View} from 'react-native';
import MapView, {Circle, type Region} from 'react-native-maps';
import {Hand, LocateFixed, MapPin, Trash2} from 'lucide-react-native';
import {Button, ConfirmDialog, PressableScale, Text, TextField, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {toDateKey} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {usePeopleOnDate} from '../people/queries';
import {useBranches, useDeleteBranch, useSaveBranch} from './queries';
import {SetupScreen} from './parts';
import {
  fenceStatus,
  formatRadius,
  MAX_SENSIBLE_RADIUS_M,
  RADIUS_CHOICES_M,
  radiusError,
  type FenceStatus,
} from './setupLogic';

/** Where a branch with no fence opens: West Bengal, zoomed to a city. */
const FALLBACK = {latitude: 22.5726, longitude: 88.3639};

async function askLocation() {
  if (Platform.OS !== 'android') {
    return true; // iOS asks when the map first shows the user's location.
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

export function BranchEditScreen({navigation, route}: AppScreenProps<'SetupBranchEdit'>) {
  const id = route.params?.id;
  const {colors, spacing, radius} = useTheme();
  const branches = useBranches();
  const branch = branches.data?.find(b => b.id === id);
  const people = usePeopleOnDate(toDateKey());
  const peopleHere = branch
    ? people.people.filter(p => p.employee.branch_name === branch.branch_name).length
    : 0;
  const save = useSaveBranch();
  const remove = useDeleteBranch();

  const fence = useMemo<FenceStatus>(() => (branch ? fenceStatus(branch) : {kind: 'none'}), [branch]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [center, setCenter] = useState<{latitude: number; longitude: number} | null>(null);
  const [radiusM, setRadiusM] = useState(150);
  // Typed radius in metres; used instead of the chips while `typing`.
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMe, setShowMe] = useState(false);
  // A branch without a fence opens on a default city; make them place the pin themselves.
  const [placed, setPlaced] = useState(false);
  const loaded = useRef(false);
  const map = useRef<MapView>(null);
  const userLoc = useRef<{latitude: number; longitude: number} | null>(null);
  const wantHere = useRef(false);

  // Fill the form once the branch arrives (or straight away for a new one).
  useEffect(() => {
    if (loaded.current || (id && !branch)) {
      return;
    }
    loaded.current = true;
    if (branch) {
      setName(branch.branch_name);
      setAddress(branch.branch_address ?? '');
      if (fence.kind !== 'none') {
        setCenter({latitude: fence.latitude, longitude: fence.longitude});
        setPlaced(true);
        // Keep what's saved, even an unusual radius; it shows as typed.
        setRadiusM(fence.radiusM);
        if (!RADIUS_CHOICES_M.includes(fence.radiusM)) {
          setTyping(true);
          setTyped(String(Math.round(fence.radiusM)));
        }
      }
    }
  }, [id, branch, fence]);

  const start = center ?? (fence.kind !== 'none' ? fence : FALLBACK);
  const initialRegion: Region = {
    latitude: start.latitude,
    longitude: start.longitude,
    latitudeDelta: center ? 0.008 : 0.08,
    longitudeDelta: center ? 0.008 : 0.08,
  };

  const goHere = async () => {
    haptics.select();
    setPlaced(true);
    if (!(await askLocation())) {
      toast.error('Location access is off. Turn it on for STAFO in Settings.');
      return;
    }
    if (userLoc.current) {
      map.current?.animateToRegion({...userLoc.current, latitudeDelta: 0.006, longitudeDelta: 0.006}, 400);
    } else {
      wantHere.current = true;
      setShowMe(true);
    }
  };

  const typedError = typing ? radiusError(typed) : null;
  const effectiveRadius = typing ? (typedError ? null : Number(typed.trim())) : radiusM;
  const canSave = !!name.trim() && !!center && placed && effectiveRadius != null;

  return (
    <SetupScreen
      title={branch?.branch_name ?? (id ? 'Branch' : 'New branch')}
      subtitle={id ? 'Edit branch' : 'Add a branch'}>
      <View style={{height: 300, borderRadius: radius.lg, overflow: 'hidden'}}>
        <MapView
          ref={map}
          style={{flex: 1}}
          initialRegion={initialRegion}
          showsUserLocation={showMe}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onUserLocationChange={e => {
            const c = e.nativeEvent.coordinate;
            if (!c) {
              return;
            }
            userLoc.current = {latitude: c.latitude, longitude: c.longitude};
            if (wantHere.current) {
              wantHere.current = false;
              map.current?.animateToRegion(
                {...userLoc.current, latitudeDelta: 0.006, longitudeDelta: 0.006},
                400,
              );
            }
          }}
          onPanDrag={() => setPlaced(true)}
          onRegionChangeComplete={r => setCenter({latitude: r.latitude, longitude: r.longitude})}>
          {center && placed ? (
            <Circle
              center={center}
              radius={effectiveRadius ?? radiusM}
              strokeColor={colors.primary}
              strokeWidth={2}
              fillColor="rgba(47,84,235,0.14)"
            />
          ) : null}
        </MapView>
        {/* The pin is fixed at the centre; the map moves under it. */}
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
          <View style={{marginTop: -32}}>
            <MapPin size={32} color={colors.primary} fill={colors.surface} strokeWidth={2.4} />
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            left: spacing.md,
            right: spacing.md,
            bottom: spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              height: 34,
              paddingHorizontal: 12,
              borderRadius: 17,
              backgroundColor: colors.surface,
            }}>
            <Hand size={14} color={colors.textMuted} />
            <Text variant="caption" style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
              {placed ? 'Drag the map to move the pin' : 'Drag the map to place the pin'}
            </Text>
          </View>
          <PressableScale
            onPress={goHere}
            accessibilityRole="button"
            accessibilityLabel="Use my location"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              height: 34,
              paddingHorizontal: 12,
              borderRadius: 17,
              backgroundColor: colors.surface,
            }}>
            <LocateFixed size={14} color={colors.primary} />
            <Text variant="caption" tone="primary" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
              Here
            </Text>
          </PressableScale>
        </View>
      </View>

      <View>
        <Text variant="label">Punch-in radius</Text>
        <Text variant="caption" tone="muted">
          Geo attendance only works inside this circle.
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm}}>
          {[
            ...RADIUS_CHOICES_M.map(m => ({key: String(m), label: formatRadius(m), m})),
            {key: 'custom', label: 'Custom', m: null},
          ].map(c => {
            const on = c.m == null ? typing : !typing && c.m === radiusM;
            return (
              <PressableScale
                key={c.key}
                onPress={() => {
                  haptics.select();
                  if (c.m == null) {
                    setTyping(true);
                    setTyped(t => t || String(Math.round(radiusM)));
                  } else {
                    setTyping(false);
                    setRadiusM(c.m);
                  }
                }}
                accessibilityRole="radio"
                accessibilityState={{checked: on}}
                style={{
                  height: 36,
                  minWidth: 56,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primarySoft : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text variant="label" color={on ? colors.primary : colors.textMuted}>
                  {c.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        {typing ? (
          <View style={{marginTop: spacing.sm}}>
            <TextField
              label="Radius in metres"
              value={typed}
              onChangeText={t => setTyped(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="e.g. 200"
              error={typed ? typedError : null}
              hint={
                !typedError && effectiveRadius != null
                  ? effectiveRadius > MAX_SENSIBLE_RADIUS_M
                    ? `${formatRadius(
                        effectiveRadius,
                      )} lets people punch in from far away. Most offices use 50–300 m.`
                    : formatRadius(effectiveRadius)
                  : undefined
              }
            />
          </View>
        ) : null}
      </View>

      <TextField
        label="Branch name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Salt Lake office"
      />
      <TextField
        label="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="Street, area, city"
        multiline
      />

      <Button
        title={id ? 'Save branch' : 'Add branch'}
        disabled={!canSave}
        loading={save.isPending}
        onPress={() =>
          center &&
          save.mutate(
            {
              id,
              input: {
                branch_name: name,
                branch_address: address,
                latitude: Number(center.latitude.toFixed(7)),
                longitude: Number(center.longitude.toFixed(7)),
                radar: effectiveRadius!,
              },
            },
            {onSuccess: () => navigation.goBack()},
          )
        }
      />
      {id ? (
        <Button title="Remove branch" icon={Trash2} variant="ghost" onPress={() => setConfirmDelete(true)} />
      ) : null}

      <ConfirmDialog
        visible={confirmDelete}
        icon={Trash2}
        destructive
        title={`Remove ${branch?.branch_name ?? 'this branch'}?`}
        message={
          peopleHere
            ? `${peopleHere} ${
                peopleHere === 1 ? 'person is' : 'people are'
              } assigned here. Move them to another branch first, or their geo attendance stops working.`
            : 'This can’t be undone.'
        }
        confirmLabel="Remove"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          id &&
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmDelete(false);
              navigation.goBack();
            },
          })
        }
      />
    </SetupScreen>
  );
}
