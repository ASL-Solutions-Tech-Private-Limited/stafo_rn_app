import React from 'react';
import {View} from 'react-native';
import {CalendarClock, Clock3, Info, Timer} from 'lucide-react-native';
import {Card, Text} from '../../components/ui';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {IconWell, SetupScreen} from './parts';
import {useGraceSettings} from './useGrace';

/** The company's grace rule for late punch-ins (api/company/grace-settings/list). */
export function GraceSettingsScreen(_: AppScreenProps<'SetupGrace'>) {
  const {colors, spacing} = useTheme();
  const q = useGraceSettings();
  const g = q.data;
  const rows = g
    ? [
        {
          icon: Clock3,
          tint: {fg: colors.warning, bg: colors.warningSoft},
          title: 'Grace time',
          value: `${g.graceMinutes} min`,
          hint: `A punch-in up to ${g.graceMinutes} minutes after the shift starts isn’t late.`,
        },
        {
          icon: CalendarClock,
          tint: {fg: colors.primary, bg: colors.primarySoft},
          title: 'Grace days',
          value: `${g.graceDays} a month`,
          hint: `That grace can be used on ${g.graceDays} day${
            g.graceDays === 1 ? '' : 's'
          } a month; after that, any late punch-in counts as late.`,
        },
        {
          icon: Timer,
          tint: {fg: colors.success, bg: colors.successSoft},
          title: 'Overtime charges',
          value: g.overtimeCharges ?? '—',
          hint: 'Set on the web panel.',
        },
      ]
    : [];
  return (
    <SetupScreen title="Grace & overtime" subtitle="When a punch-in counts as late" query={q}>
      {g ? (
        <Card style={{gap: spacing.sm, backgroundColor: colors.primarySoft, borderColor: 'transparent'}}>
          <Text variant="title">Example</Text>
          <Text variant="body" tone="muted">
            Shift at 10:00 AM: in by {formatAfter(10 * 60 + g.graceMinutes)} on up to {g.graceDays} day
            {g.graceDays === 1 ? '' : 's'} this month is fine. A {ordinal(g.graceDays + 1)} late day, or any
            day after {formatAfter(10 * 60 + g.graceMinutes)}, is marked Late.
          </Text>
        </Card>
      ) : null}
      <Card padded={false}>
        {rows.map((r, i) => (
          <View
            key={r.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <IconWell icon={r.icon} fg={r.tint.fg} bg={r.tint.bg} />
            <View style={{flex: 1}}>
              <Text variant="title">{r.title}</Text>
              <Text variant="caption" tone="muted">
                {r.hint}
              </Text>
            </View>
            <Text variant="title">{r.value}</Text>
          </View>
        ))}
      </Card>
      <View style={{flexDirection: 'row', gap: spacing.sm, alignItems: 'center'}}>
        <Info size={14} color={colors.textMuted} />
        <Text variant="caption" tone="muted" style={{flex: 1}}>
          Change these on the STAFO web panel for now; editing here needs a save API from the backend.
        </Text>
      </View>
    </SetupScreen>
  );
}

function formatAfter(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
