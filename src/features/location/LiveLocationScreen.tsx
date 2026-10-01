import React, {useEffect, useMemo, useRef} from 'react';
import {Pressable, ScrollView, StatusBar, View} from 'react-native';
import MapView from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, ChevronRight, LocateFixed, MapPinned} from 'lucide-react-native';
import {employeePhotoUrl} from '../../api/endpoints/people';
import {Avatar, Button, IconButton, LiveDot, Skeleton, Text} from '../../components/ui';
import {formatDuration, formatTime} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import {useNow} from '../../lib/useNow';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {DEFAULT_REGION, EDGE_PADDING, formatDistance, lastSeenLabel, PersonMarker} from './mapParts';
import {useRequestLocation, useTrackedPeople, type TrackedPerson} from './queries';
import {isLive} from './track';

export function LiveLocationScreen({navigation}: AppScreenProps<'LiveLocation'>) {
  const {colors, spacing, radius, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(true, 30_000);
  const tracked = useTrackedPeople();
  const request = useRequestLocation();
  const map = useRef<MapView>(null);

  const sharing = tracked.rows.filter(r => r.sharing === 'sharing');
  const notSharing = tracked.rows.filter(r => r.sharing !== 'sharing');
  const onMap = sharing.filter(r => r.summary?.last);
  const liveCount = onMap.filter(r => isLive(r.summary!.last, now)).length;

  const coords = useMemo(() => onMap.map(r => r.summary!.last!), [onMap]);
  const fit = (animated = true) => {
    if (coords.length === 1) {
      map.current?.animateToRegion(
        {...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02},
        animated ? 400 : 0,
      );
    } else if (coords.length > 1) {
      map.current?.fitToCoordinates(coords, {edgePadding: EDGE_PADDING, animated});
    }
  };
  // Frame everyone once their positions first arrive.
  const framed = useRef(false);
  useEffect(() => {
    if (!framed.current && coords.length) {
      framed.current = true;
      setTimeout(() => fit(false), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.length]);

  const openRoute = (r: TrackedPerson) => {
    haptics.tap();
    navigation.navigate('EmployeeRoute', {id: r.employee.id, name: r.employee.name});
  };

  const pillText = tracked.isPending
    ? 'Loading…'
    : liveCount
    ? `${liveCount} sharing now`
    : sharing.length
    ? 'No one live right now'
    : 'Nobody is sharing';

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <MapView
        ref={map}
        style={{flex: 1}}
        initialRegion={DEFAULT_REGION}
        showsCompass={false}
        toolbarEnabled={false}
        onMapReady={() => fit(false)}>
        {onMap.map(r => (
          <PersonMarker
            key={r.employee.id}
            point={r.summary!.last!}
            name={r.employee.name}
            photo={employeePhotoUrl(r.employee)}
            live={isLive(r.summary!.last, now)}
            onPress={() => openRoute(r)}
          />
        ))}
      </MapView>

      {/* Floating header */}
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
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View
          style={{
            flex: 1,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          {liveCount ? <LiveDot color={colors.success} /> : null}
          <Text variant="label">{pillText}</Text>
        </View>
        <IconButton
          icon={LocateFixed}
          accessibilityLabel="Show everyone"
          onPress={() => {
            haptics.select();
            fit();
          }}
        />
      </View>

      {/* People panel */}
      <View
        style={{
          maxHeight: '48%',
          backgroundColor: colors.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -28,
          paddingTop: spacing.md,
        }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.borderStrong,
            alignSelf: 'center',
            marginBottom: spacing.md,
          }}
        />
        <ScrollView
          contentContainerStyle={{paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.xl}}>
          <View style={{flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between'}}>
            <Text variant="h3">Live location</Text>
            {tracked.updatedAt ? (
              <Text variant="caption" tone="muted">
                Updated {formatTime(new Date(tracked.updatedAt))}
              </Text>
            ) : null}
          </View>

          {tracked.isPending ? (
            <View style={{gap: spacing.sm, marginTop: spacing.lg}}>
              <Skeleton height={56} radius={radius.md} />
              <Skeleton height={56} radius={radius.md} />
            </View>
          ) : (
            <>
              {!sharing.length ? (
                <View style={{alignItems: 'center', paddingVertical: spacing.lg}}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: colors.infoSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MapPinned size={26} color={colors.info} />
                  </View>
                  <Text variant="title" align="center" style={{marginTop: spacing.md}}>
                    No one is sharing location right now
                  </Text>
                  <Text variant="caption" tone="muted" align="center" style={{marginTop: 4}}>
                    Send a request: tracking starts only if they accept, and only during their shift.
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="overline" tone="muted" style={{marginTop: spacing.lg}}>
                    Sharing now
                  </Text>
                  {sharing.map((r, i) => {
                    const live = isLive(r.summary?.last, now);
                    const bits = [
                      r.summary?.distanceM ? `${formatDistance(r.summary.distanceM)} today` : null,
                      r.summary?.stoppedSince && live
                        ? `Stopped ${formatDuration(now.getTime() - r.summary.stoppedSince.getTime())}`
                        : null,
                      r.summary?.last?.battery != null ? `${r.summary.last.battery}% battery` : null,
                    ].filter(Boolean);
                    return (
                      <Row key={r.employee.id} index={i} person={r} onPress={() => openRoute(r)}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                          {live ? <LiveDot color={colors.success} /> : null}
                          <Text
                            variant="caption"
                            color={
                              live ? colors.success : r.summary?.last ? colors.warning : colors.textMuted
                            }
                            style={{fontFamily: 'PlusJakartaSans-Bold'}}>
                            {r.loading ? 'Loading…' : lastSeenLabel(r.summary?.last?.at, live, now)}
                          </Text>
                          {bits.length ? (
                            <Text variant="caption" tone="muted">
                              · {bits.join(' · ')}
                            </Text>
                          ) : null}
                        </View>
                      </Row>
                    );
                  })}
                </>
              )}

              {notSharing.length ? (
                <Text variant="overline" tone="muted" style={{marginTop: spacing.lg}}>
                  Not sharing
                </Text>
              ) : null}
              {notSharing.map((r, i) => (
                <Row
                  key={r.employee.id}
                  index={i}
                  person={r}
                  right={
                    r.sharing === 'off' ? (
                      <Button
                        title="Request"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        loading={request.isPending && request.variables === r.employee.id}
                        onPress={() => request.mutate(r.employee.id)}
                      />
                    ) : undefined
                  }>
                  <Text variant="caption" tone="muted">
                    {r.sharing === 'requested'
                      ? 'Request sent · waiting'
                      : [r.employee.attendance_type === 'geo' ? 'Geo attendance' : null, r.employee.position]
                          .filter(Boolean)
                          .join(' · ') || 'Off'}
                  </Text>
                </Row>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function Row({
  person,
  index,
  onPress,
  right,
  children,
}: {
  person: TrackedPerson;
  index: number;
  onPress?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const {colors, spacing} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({pressed}) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: index ? 1 : 0,
        borderTopColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Avatar name={person.employee.name} uri={employeePhotoUrl(person.employee)} size={40} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title" numberOfLines={1}>
          {person.employee.name}
        </Text>
        {children}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.textSubtle} /> : null)}
    </Pressable>
  );
}
