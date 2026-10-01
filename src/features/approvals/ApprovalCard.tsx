import React from 'react';
import {Pressable, View} from 'react-native';
import {
  ArrowRight,
  CalendarCheck,
  CalendarOff,
  Check,
  CircleAlert,
  Clock3,
  Info,
  Quote,
  Smartphone,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import {Avatar, Button, Card, Text} from '../../components/ui';
import {formatClock, formatDay, formatRange, parseServerDate} from '../../lib/date';
import {useTheme} from '../../theme/ThemeProvider';
import {askedAgo, isPastDue, type ApprovalItem, type ApprovalKind, type LeaveContext} from './approvalItems';

export type Decision = 'approve' | 'reject';

type Props = {
  item: ApprovalItem;
  /** "Department · Branch", when known. */
  subtitle?: string | null;
  photo?: string | null;
  leave?: LeaveContext;
  /** Which button is waiting on the server, if any. */
  busy?: Decision | null;
  onDecide: (decision: Decision) => void;
  onOpenEmployee: () => void;
};

export function useKindStyle() {
  const {colors} = useTheme();
  const kinds: Record<ApprovalKind, {label: string; icon: LucideIcon; fg: string; bg: string}> = {
    leave: {label: 'Leave', icon: CalendarOff, fg: colors.warning, bg: colors.warningSoft},
    punch: {label: 'Punch fix', icon: Clock3, fg: colors.info, bg: colors.infoSoft},
    device: {label: 'New phone', icon: Smartphone, fg: colors.accents[1].fg, bg: colors.accents[1].bg},
  };
  return kinds;
}

export function ApprovalCard({item, subtitle, photo, leave, busy, onDecide, onOpenEmployee}: Props) {
  const {spacing} = useTheme();
  const kind = useKindStyle()[item.kind];
  const pastDue = isPastDue(item);

  return (
    <Card style={{padding: spacing.lg}}>
      <Pressable
        onPress={onOpenEmployee}
        accessibilityRole="button"
        accessibilityHint="Opens the employee's details"
        style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
        <Avatar name={item.name} uri={photo} size={40} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="title" numberOfLines={1}>
            {item.name}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={{alignItems: 'flex-end', gap: 4}}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              height: 24,
              paddingHorizontal: 9,
              borderRadius: 12,
              backgroundColor: kind.bg,
            }}>
            <kind.icon size={13} color={kind.fg} />
            <Text variant="caption" color={kind.fg} style={{fontFamily: 'PlusJakartaSans-Bold'}}>
              {kind.label}
            </Text>
          </View>
          <Text variant="caption" tone={pastDue ? 'danger' : 'subtle'}>
            {askedAgo(item.askedAt)}
          </Text>
        </View>
      </Pressable>

      <View style={{marginTop: spacing.md}}>
        {item.kind === 'leave' ? (
          <LeaveBody item={item} context={leave} pastDue={pastDue} />
        ) : item.kind === 'punch' ? (
          <PunchBody item={item} />
        ) : (
          <DeviceBody item={item} />
        )}
      </View>

      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg}}>
        <Button
          title="Reject"
          icon={X}
          variant="ghost"
          size="md"
          style={{flex: 1}}
          disabled={!!busy}
          loading={busy === 'reject'}
          onPress={() => onDecide('reject')}
        />
        <Button
          title={item.kind === 'device' ? 'Allow' : 'Approve'}
          icon={Check}
          size="md"
          style={{flex: 1}}
          disabled={!!busy}
          loading={busy === 'approve'}
          onPress={() => onDecide('approve')}
        />
      </View>
    </Card>
  );
}

function TimeRow({label, from, to}: {label: string; from: string; to: string}) {
  const {colors, spacing} = useTheme();
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8}}>
      <Text variant="label" tone="muted" style={{width: 40}}>
        {label}
      </Text>
      <Text
        variant="body"
        tone="subtle"
        style={{width: 72, textDecorationLine: from === '—' ? 'none' : 'line-through'}}>
        {from}
      </Text>
      <ArrowRight size={14} color={colors.textSubtle} />
      <Text variant="title">{to}</Text>
    </View>
  );
}

function Fact({icon: Icon, text, color}: {icon: LucideIcon; text: string; color?: string}) {
  const {colors} = useTheme();
  color ??= colors.textMuted;
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
      <Icon size={14} color={color} />
      <Text variant="caption" color={color} style={{flex: 1, fontFamily: 'PlusJakartaSans-SemiBold'}}>
        {text}
      </Text>
    </View>
  );
}

function Reason({text}: {text?: string | null}) {
  const {colors, spacing, radius} = useTheme();
  if (!text?.trim()) {
    return null;
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceMuted,
      }}>
      <Quote size={14} color={colors.textSubtle} />
      <Text variant="body" tone="muted" style={{flex: 1}}>
        {text.trim()}
      </Text>
    </View>
  );
}

function LeaveBody({
  item: l,
  context,
  pastDue: past,
}: {
  item: Extract<ApprovalItem, {kind: 'leave'}>;
  context?: LeaveContext;
  pastDue: boolean;
}) {
  const {colors, spacing} = useTheme();
  const days = context?.days ?? l.leave.days ?? 1;
  return (
    <>
      <Text variant="h3">
        {context?.typeName ?? l.leave.leavetype?.name ?? 'Leave'} ·{' '}
        {formatRange(l.leave.from_date, l.leave.to_date)}
      </Text>
      <Text variant="body" tone="muted">
        {days} {days === 1 ? 'day' : 'days'}
      </Text>
      <Reason text={l.leave.reason} />
      <View style={{gap: 6, marginTop: spacing.sm}}>
        {past ? (
          <Fact
            icon={CircleAlert}
            color={colors.danger}
            text="These dates have passed. Approve to record it, or reject to clear it."
          />
        ) : null}
        {context?.leftAfter != null ? (
          <Fact
            icon={CalendarCheck}
            text={`${context.leftAfter} of ${
              context.allowance
            } ${context.typeName.toLowerCase()} days left after this`}
          />
        ) : null}
        {context?.othersOff.length ? (
          <Fact
            icon={Users}
            color={colors.warning}
            text={`${context.othersOff.slice(0, 2).join(', ')}${
              context.othersOff.length > 2 ? ` and ${context.othersOff.length - 2} more` : ''
            } also off then`}
          />
        ) : null}
      </View>
    </>
  );
}

function PunchBody({item: p}: {item: Extract<ApprovalItem, {kind: 'punch'}>}) {
  const {colors, spacing, radius} = useTheme();
  const date = parseServerDate(p.punch.date);
  return (
    <>
      <Text variant="h3">Fix punch-out for {date ? formatDay(date) : p.punch.date}</Text>
      <View
        style={{
          marginTop: spacing.sm,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        {p.punch.in_time ? (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8}}>
            <Text variant="label" tone="muted" style={{width: 40}}>
              In
            </Text>
            <Text variant="title">{formatClock(p.punch.in_time)}</Text>
            <Text variant="caption" tone="subtle">
              {' '}
              as punched
            </Text>
          </View>
        ) : null}
        {p.punch.in_time ? <View style={{height: 1, backgroundColor: colors.border}} /> : null}
        <TimeRow label="Out" from="—" to={p.punch.out_time ? formatClock(p.punch.out_time) : '—'} />
      </View>
      <Reason text={p.punch.reason} />
    </>
  );
}

function DeviceBody({item: d}: {item: Extract<ApprovalItem, {kind: 'device'}>}) {
  const {spacing} = useTheme();
  return (
    <>
      <Text variant="h3">Wants to sign in on a new phone</Text>
      {d.device.device_name ? (
        <Text variant="body" tone="muted">
          {d.device.device_name}
        </Text>
      ) : null}
      <View style={{marginTop: spacing.sm}}>
        <Fact icon={Info} text="Their current phone is signed out once you allow this." />
      </View>
    </>
  );
}
