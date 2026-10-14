import React from 'react';
import {Linking, View} from 'react-native';
import MapView, {Circle, Marker} from 'react-native-maps';
import {Building2, Navigation} from 'lucide-react-native';
import type {Branch} from '../../api/types';
import {Button, Card, EmptyState, Text, toast} from '../../components/ui';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useEmployeeDashboard} from '../home/queries';
import {SetupScreen} from '../setup/parts';
import {fenceStatus, formatRadius} from '../setup/setupLogic';

/** The employee's own office: where it is and the area they can punch in from. */
export function MyBranchScreen(_: AppScreenProps<'MyBranch'>) {
  const {colors, spacing, radius} = useTheme();
  const dashboard = useEmployeeDashboard();
  const branch = dashboard.data?.employee_info?.branch;
  const fence = branch ? fenceStatus(branch as Branch) : {kind: 'none' as const};
  const directions = () => {
    if (fence.kind === 'none') {
      return;
    }
    const q = `${fence.latitude},${fence.longitude}`;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`).catch(() =>
      toast.error('Couldn’t open maps.'),
    );
  };

  return (
    <SetupScreen title="My branch" subtitle={branch?.branch_name} query={dashboard}>
      {!branch ? (
        <Card>
          <EmptyState
            compact
            icon={Building2}
            title="No branch yet"
            message="Your company hasn’t put you in a branch. Ask your admin."
          />
        </Card>
      ) : (
        <View style={{gap: spacing.md}}>
          {fence.kind !== 'none' ? (
            <View style={{height: 260, borderRadius: radius.lg, overflow: 'hidden'}}>
              <MapView
                style={{flex: 1}}
                initialRegion={{
                  latitude: fence.latitude,
                  longitude: fence.longitude,
                  // Fit the punch-in circle with some room around it.
                  latitudeDelta: Math.max(0.004, (fence.radiusM / 111_000) * 3),
                  longitudeDelta: Math.max(0.004, (fence.radiusM / 111_000) * 3),
                }}
                toolbarEnabled={false}>
                <Circle
                  center={fence}
                  radius={fence.radiusM}
                  strokeColor={colors.primary}
                  strokeWidth={2}
                  fillColor="rgba(47,84,235,0.14)"
                />
                <Marker coordinate={fence} title={branch.branch_name} />
              </MapView>
            </View>
          ) : null}
          <Card style={{gap: spacing.sm}}>
            <Text variant="h3">{branch.branch_name}</Text>
            <Text variant="body" tone="muted">
              {branch.branch_address?.trim() || 'No address on file'}
            </Text>
            {fence.kind !== 'none' ? (
              <Text variant="caption" tone="muted">
                Geo punch-in works within {formatRadius(fence.radiusM)} of the office.
              </Text>
            ) : (
              <Text variant="caption" tone="muted">
                The office location isn’t set, so geo punch-in isn’t limited to it.
              </Text>
            )}
            {fence.kind !== 'none' ? (
              <Button
                title="Directions"
                icon={Navigation}
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={directions}
              />
            ) : null}
          </Card>
        </View>
      )}
    </SetupScreen>
  );
}
