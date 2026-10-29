import React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock3,
  EllipsisVertical,
  Fingerprint,
  MapPinned,
  MessageCircle,
  Phone,
  type LucideIcon,
} from 'lucide-react-native';
import {Avatar, IconButton, LiveDot, PressableScale, Text} from '../../../components/ui';
import {formatDuration, formatTime} from '../../../lib/date';
import {haptics} from '../../../lib/haptics';
import {useTheme} from '../../../theme/ThemeProvider';
import type {DayStatus} from '../dayStatus';

export const EMPLOYEE_TABS = ['Overview', 'Attendance', 'Leave', 'Documents', 'Salary'] as const;
export type EmployeeTab = (typeof EMPLOYEE_TABS)[number];

export type HeaderAction = 'call' | 'whatsapp' | 'mode' | 'shift' | 'location';

type Props = {
  name: string;
  subtitle: string;
  photo?: string | null;
  status?: DayStatus;
  inactive?: boolean;
  modeLabel: string;
  shiftLabel: string;
  tab: EmployeeTab;
  onTab: (tab: EmployeeTab) => void;
  onAction: (action: HeaderAction) => void;
  onBack?: () => void;
  onMore: () => void;
};

const STATUS_TEXT: Record<string, string> = {
  working: 'Working now',
  present: 'Present today',
  'half-day': 'Half day today',
  'not-in': 'Not in yet',
  upcoming: 'Not in yet',
  absent: 'Absent today',
  leave: 'On leave today',
  'week-off': 'Week off today',
  holiday: 'Holiday today',
};

/** Pinned top of the employee screen: identity, today's status, actions, tabs. */
export function EmployeeHeader(props: Props) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const {status} = props;

  const tone =
    status?.kind === 'working' || status?.kind === 'present'
      ? {fg: colors.success, bg: colors.successSoft}
      : status?.kind === 'absent'
      ? {fg: colors.danger, bg: colors.dangerSoft}
      : status?.kind === 'leave' || status?.kind === 'half-day'
      ? {fg: colors.warning, bg: colors.warningSoft}
      : {fg: colors.textMuted, bg: colors.surfaceMuted};

  let statusDetail = '';
  if (status?.inAt) {
    statusDetail = `In ${formatTime(status.inAt)}`;
    if (status.outAt) {
      statusDetail += ` – ${formatTime(status.outAt)}`;
    }
    if (status.workedMs) {
      statusDetail += ` · ${formatDuration(status.workedMs)}`;
    }
  }

  const actions: {
    key: HeaderAction;
    icon: LucideIcon;
    label: string;
    value?: string;
    fg: string;
    bg: string;
  }[] = [
    {key: 'call', icon: Phone, label: 'Call', fg: colors.primary, bg: colors.primarySoft},
    {key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', fg: colors.success, bg: colors.successSoft},
    {
      key: 'mode',
      icon: Fingerprint,
      label: 'Mode',
      value: props.modeLabel,
      fg: colors.accents[1].fg,
      bg: colors.accents[1].bg,
    },
    {
      key: 'shift',
      icon: Clock3,
      label: 'Shift',
      value: props.shiftLabel,
      fg: colors.warning,
      bg: colors.warningSoft,
    },
    {key: 'location', icon: MapPinned, label: 'Location', fg: colors.info, bg: colors.infoSoft},
  ];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop: insets.top + spacing.sm,
      }}>
      <View
        style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg}}>
        {props.onBack ? (
          <IconButton icon={ArrowLeft} size={40} accessibilityLabel="Back" onPress={props.onBack} />
        ) : null}
        <Avatar name={props.name} uri={props.photo} size={44} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="h3" numberOfLines={1}>
            {props.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {props.subtitle}
          </Text>
        </View>
        <IconButton
          icon={EllipsisVertical}
          size={40}
          accessibilityLabel="More actions"
          onPress={props.onMore}
        />
      </View>

      {props.inactive ? (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.dangerSoft,
          }}>
          <Text variant="label" tone="danger">
            Deactivated · can't sign in
          </Text>
        </View>
      ) : status ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 10,
            borderRadius: radius.md,
            backgroundColor: tone.bg,
          }}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
            {status.kind === 'working' ? (
              <LiveDot color={tone.fg} />
            ) : (
              <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: tone.fg}} />
            )}
            <Text variant="label" color={tone.fg}>
              {STATUS_TEXT[status.kind]}
            </Text>
          </View>
          {statusDetail ? (
            <Text variant="caption" color={tone.fg} style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
              {statusDetail}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md}}>
        {actions.map(a => (
          <PressableScale
            key={a.key}
            onPress={() => {
              haptics.tap();
              props.onAction(a.key);
            }}
            accessibilityRole="button"
            accessibilityLabel={a.value ? `${a.label}: ${a.value}` : a.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              height: 40,
              paddingLeft: 6,
              paddingRight: 14,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: a.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <a.icon size={15} color={a.fg} />
            </View>
            <Text variant="label">{a.label}</Text>
            {a.value ? (
              <Text variant="caption" tone="muted">
                {a.value}
              </Text>
            ) : null}
          </PressableScale>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: spacing.lg, gap: spacing.xl, paddingTop: spacing.sm}}
        accessibilityRole="tablist">
        {EMPLOYEE_TABS.map(t => {
          const active = t === props.tab;
          return (
            <Pressable
              key={t}
              onPress={() => {
                if (!active) {
                  haptics.select();
                  props.onTab(t);
                }
              }}
              accessibilityRole="tab"
              accessibilityState={{selected: active}}
              style={{paddingTop: spacing.md, paddingBottom: 10}}>
              <Text
                variant="label"
                tone={active ? 'primary' : 'muted'}
                style={active ? {fontFamily: 'PlusJakartaSans-Bold'} : null}>
                {t}
              </Text>
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 2.5,
                  borderRadius: 2,
                  backgroundColor: active ? colors.primary : colors.surface,
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
