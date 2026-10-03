import React from 'react';
import {View} from 'react-native';
import {Camera, Clock3, LogIn, LogOut, MapPin, QrCode} from 'lucide-react-native';
import type {EmployeeInfo} from '../../../api/types';
import {Badge, Button, Card, Skeleton, Text} from '../../../components/ui';
import {haptics} from '../../../lib/haptics';
import {formatClock, formatDuration, formatStopwatch, formatTime} from '../../../lib/date';
import {useNow} from '../../../lib/useNow';
import {useTheme} from '../../../theme/ThemeProvider';
import {attendanceModeLabel, getAllowedMode, getTodayAttendance} from '../../attendance/attendanceState';

const MODE_ICON = {geo: MapPin, selfie: Camera, qr: QrCode};

type Props = {
  info?: EmployeeInfo;
  loading?: boolean;
  onPunch: () => void;
  /** A punch is under way (finding their location). */
  punching?: boolean;
};

export function PunchCard({info, loading, onPunch, punching}: Props) {
  const {colors, spacing, radius, shadows, dark} = useTheme();
  const today = getTodayAttendance(info?.punches);
  const isIn = today.state === 'punched-in';
  const now = useNow(isIn);

  if (loading || !info) {
    return (
      <Card style={[{gap: spacing.md}, !dark && shadows.raised]}>
        <Skeleton width={120} height={22} radius={11} />
        <Skeleton width={180} height={34} />
        <Skeleton height={14} />
        <Skeleton height={54} radius={16} />
      </Card>
    );
  }

  const workedMs =
    today.state === 'punched-in'
      ? today.workedMs + (now.getTime() - today.since.getTime())
      : today.state === 'punched-out'
      ? today.workedMs
      : 0;

  const shift = info.shifts?.[0];
  const mode = getAllowedMode(info);
  const ModeIcon = MODE_ICON[mode];

  const status =
    today.state === 'punched-in'
      ? {tone: 'success' as const, label: `Working since ${formatTime(today.since)}`}
      : today.state === 'punched-out'
      ? {tone: 'primary' as const, label: `Punched out at ${formatTime(today.at)}`}
      : {tone: 'neutral' as const, label: 'Not punched in yet'};

  return (
    <Card style={!dark && shadows.raised}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Badge label={status.label} tone={status.tone} dot live={isIn} />
        {today.state !== 'not-started' && today.sessions > 1 ? (
          <Text variant="caption" tone="muted">
            {today.sessions} sessions
          </Text>
        ) : null}
      </View>

      <View style={{marginTop: spacing.lg}}>
        <Text variant="overline" tone="muted">
          Worked today
        </Text>
        <Text
          variant="display"
          style={{fontVariant: ['tabular-nums'], marginTop: 2}}
          accessibilityLabel={`Worked ${formatDuration(workedMs)} today`}>
          {formatStopwatch(workedMs)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <InfoCell
          icon={Clock3}
          label="Shift"
          flex={1.6}
          value={shift ? `${formatClock(shift.start_time)} – ${formatClock(shift.end_time)}` : 'Not assigned'}
        />
        <View style={{width: 1, backgroundColor: colors.border, marginVertical: spacing.md}} />
        <InfoCell
          icon={ModeIcon}
          label="Mode"
          flex={1}
          value={attendanceModeLabel[mode].replace(' attendance', '')}
        />
      </View>

      <Button
        title={isIn ? 'Punch out' : 'Punch in'}
        icon={isIn ? LogOut : LogIn}
        variant={isIn ? 'danger' : 'primary'}
        loading={punching}
        onPress={() => {
          haptics.tap();
          onPunch();
        }}
        style={{marginTop: spacing.lg}}
      />
    </Card>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  flex,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  flex: number;
}) {
  const {colors, spacing} = useTheme();
  return (
    <View style={{flex, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md}}>
      <Icon size={18} color={colors.primary} />
      <View style={{flex: 1}}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="label" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {value}
        </Text>
      </View>
    </View>
  );
}
