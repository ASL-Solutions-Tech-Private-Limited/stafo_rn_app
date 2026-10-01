import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Marker} from 'react-native-maps';
import {Play, Square} from 'lucide-react-native';
import {Avatar, Text} from '../../components/ui';
import {formatDuration, formatTime} from '../../lib/date';
import {useTheme} from '../../theme/ThemeProvider';
import type {GeoPoint} from './track';

/** Where the map opens when there's nothing to show yet (India). */
export const DEFAULT_REGION = {latitude: 22.5, longitude: 80.5, latitudeDelta: 22, longitudeDelta: 22};

export const EDGE_PADDING = {top: 140, right: 60, bottom: 60, left: 60};

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** "Live", "Last seen 48 min ago", "Last seen 3:10 PM". */
export function lastSeenLabel(at: Date | undefined, live: boolean, now = new Date()) {
  if (!at) {
    return 'No location yet';
  }
  if (live) {
    return 'Live';
  }
  const ms = now.getTime() - at.getTime();
  return ms < 60 * 60_000
    ? `Last seen ${formatDuration(Math.max(ms, 60_000))} ago`
    : `Last seen ${formatTime(at)}`;
}

/**
 * Custom marker views must stop tracking changes to stay smooth, but only after the
 * photo has had time to load, or Android draws an empty pin.
 */
function useSettled() {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return settled;
}

export function PersonMarker({
  point,
  name,
  photo,
  live,
  onPress,
}: {
  point: GeoPoint;
  name: string;
  photo?: string | null;
  live: boolean;
  onPress?: () => void;
}) {
  const {colors} = useTheme();
  const settled = useSettled();
  const ring = live ? colors.success : colors.textSubtle;
  return (
    <Marker
      coordinate={point}
      anchor={{x: 0.5, y: 1}}
      tracksViewChanges={!settled}
      onPress={onPress}
      accessibilityLabel={`${name}, ${live ? 'live' : 'last known position'}`}>
      <View style={{alignItems: 'center'}}>
        <View style={{padding: 3, borderRadius: 26, backgroundColor: ring}}>
          <Avatar name={name} uri={photo} size={40} ring="#FFFFFF" />
        </View>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderTopWidth: 9,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: ring,
            marginTop: -1,
          }}
        />
      </View>
    </Marker>
  );
}

/** Round badge marker: start, numbered stop, or end of a route. */
export function BadgeMarker({
  point,
  kind,
  label,
  title,
}: {
  point: {latitude: number; longitude: number};
  kind: 'start' | 'stop' | 'end';
  label?: string;
  title: string;
}) {
  const {colors} = useTheme();
  const settled = useSettled();
  const bg = kind === 'start' ? colors.success : kind === 'stop' ? colors.warning : colors.danger;
  const size = kind === 'stop' ? 26 : 30;
  return (
    <Marker
      coordinate={point}
      anchor={{x: 0.5, y: 0.5}}
      tracksViewChanges={!settled}
      title={title}
      accessibilityLabel={title}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 3,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {kind === 'start' ? (
          <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
        ) : kind === 'end' ? (
          <Square size={10} color="#FFFFFF" fill="#FFFFFF" />
        ) : (
          <Text variant="caption" color="#FFFFFF" style={{fontFamily: 'PlusJakartaSans-Bold', fontSize: 11}}>
            {label}
          </Text>
        )}
      </View>
    </Marker>
  );
}

/** Pulsing-style "where they are now" dot. */
export function NowMarker({point}: {point: GeoPoint}) {
  const {colors} = useTheme();
  const settled = useSettled();
  return (
    <Marker coordinate={point} anchor={{x: 0.5, y: 0.5}} tracksViewChanges={!settled} title="Now">
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: 'rgba(47,84,235,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.primary,
            borderWidth: 3,
            borderColor: '#FFFFFF',
          }}
        />
      </View>
    </Marker>
  );
}
