import React, {useMemo, useState} from 'react';
import {Image, Modal, Pressable, View} from 'react-native';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  ListChecks,
  LogIn,
  LogOut,
  SquarePen,
  Timer,
  X,
} from 'lucide-react-native';
import type {MissedPunchRequest, ShiftWithDays} from '../../../../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Skeleton,
  Text,
  type BadgeTone,
} from '../../../../components/ui';
import {formatClock, formatDuration, parseServerDate, weekdayShort, formatDay} from '../../../../lib/date';
import {haptics} from '../../../../lib/haptics';
import {useTheme} from '../../../../theme/ThemeProvider';
import {dayWorkedMs, type CalendarDay, type CalendarDayKind} from '../../employeeInsights';
import {RejectPunchSheet} from '../../../approvals/RejectPunchSheet';
import {FEATURES} from '../../../../config/features';
import {DayPunchesSheet} from '../DayPunchesSheet';
import {EditDaySheet} from '../EditDaySheet';
import {useSetMissedPunchStatus, useUpdateAttendance} from '../queries';
import {SectionLabel} from '../parts';

/** A seventh of the row, rounded down: `${100 / 7}%` rounds up on some widths and wraps the 7th day. */
const DAY_CELL = '14.28%';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const KIND_LABEL: Record<CalendarDayKind, {label: string; tone: BadgeTone}> = {
  present: {label: 'Present', tone: 'success'},
  late: {label: 'Late', tone: 'warning'},
  'half-day': {label: 'Half day', tone: 'warning'},
  absent: {label: 'Absent', tone: 'danger'},
  leave: {label: 'On leave', tone: 'info'},
  off: {label: 'Week off', tone: 'neutral'},
  future: {label: 'Upcoming', tone: 'neutral'},
  none: {label: 'No record yet', tone: 'neutral'},
};

type Props = {
  month: string;
  onMonth: (month: string) => void;
  canGoNext: boolean;
  days: CalendarDay[];
  loading: boolean;
  requests: MissedPunchRequest[];
  requestsLoading: boolean;
  employeeId: number;
  name: string;
  shift?: ShiftWithDays | null;
  /** The employee looking at their own attendance (no approve / reject). */
  self?: boolean;
  /** Extra action under the selected day, e.g. "Ask for punch-out". */
  renderDayAction?: (day: CalendarDay) => React.ReactNode;
};

export function AttendanceTab({
  month,
  onMonth,
  canGoNext,
  days,
  loading,
  requests,
  requestsLoading,
  employeeId,
  name,
  shift,
  self = false,
  renderDayAction,
}: Props) {
  const {colors, spacing, radius} = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Day whose full punch list is open (tap a present day again, or "See all punches").
  const [punchesFor, setPunchesFor] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  // The day being edited, fixed when Edit is pressed so a refetch can't swap it.
  const [editing, setEditing] = useState<CalendarDay | null>(null);
  const update = useUpdateAttendance(employeeId);

  const [y, m] = month.split('-').map(Number);
  const shiftMonth = (delta: number) => {
    haptics.select();
    const d = new Date(y, m - 1 + delta, 1);
    onMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedKey(null);
  };

  const look: Record<CalendarDayKind, {bg: string; fg: string; border: string}> = {
    present: {bg: colors.successSoft, fg: colors.success, border: colors.successSoft},
    late: {bg: colors.warningSoft, fg: colors.warning, border: colors.warningSoft},
    'half-day': {bg: colors.warningSoft, fg: colors.warning, border: colors.warningSoft},
    absent: {bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft},
    leave: {bg: colors.accents[1].bg, fg: colors.accents[1].fg, border: colors.accents[1].bg},
    off: {bg: colors.surface, fg: colors.textSubtle, border: colors.border},
    future: {bg: colors.surface, fg: colors.textSubtle, border: colors.surface},
    none: {bg: colors.surface, fg: colors.text, border: colors.border},
  };

  const leading = days.length ? new Date(y, m - 1, 1).getDay() : 0;
  const selected = useMemo(
    () => days.find(d => d.dateKey === selectedKey) ?? days.find(d => d.isToday) ?? null,
    [days, selectedKey],
  );

  return (
    <View style={{gap: spacing.lg}}>
      <Card>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <IconButton
            icon={ChevronLeft}
            size={36}
            accessibilityLabel="Previous month"
            onPress={() => shiftMonth(-1)}
          />
          <Text variant="h3">
            {MONTHS[m - 1]} {y}
          </Text>
          <IconButton
            icon={ChevronRight}
            size={36}
            accessibilityLabel="Next month"
            onPress={canGoNext ? () => shiftMonth(1) : undefined}
            style={canGoNext ? undefined : {opacity: 0.35}}
          />
        </View>

        <View style={{flexDirection: 'row', marginTop: spacing.md}}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} variant="caption" tone="subtle" align="center" style={{flex: 1}}>
              {d}
            </Text>
          ))}
        </View>

        {loading ? (
          <Skeleton height={260} radius={12} style={{marginTop: spacing.sm}} />
        ) : (
          <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs}}>
            {Array.from({length: leading}).map((_, i) => (
              <View key={`pad-${i}`} style={{width: DAY_CELL, aspectRatio: 1}} />
            ))}
            {days.map(d => {
              const l = look[d.kind];
              const isSelected = selected?.dateKey === d.dateKey;
              return (
                <Pressable
                  key={d.dateKey}
                  onPress={() => {
                    haptics.select();
                    // A second tap on the selected day opens every punch of it, as in the native app.
                    if (isSelected && d.record?.in_time) {
                      setPunchesFor(d.dateKey);
                      return;
                    }
                    setSelectedKey(d.dateKey);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{selected: isSelected}}
                  accessibilityLabel={`${d.day} ${MONTHS[m - 1]}, ${KIND_LABEL[d.kind].label}`}
                  style={{width: DAY_CELL, aspectRatio: 1, padding: 3}}>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      backgroundColor: l.bg,
                      borderWidth: isSelected ? 2 : d.isToday ? 1.5 : 1,
                      borderColor: isSelected ? colors.text : d.isToday ? colors.primary : l.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text variant="label" color={d.isToday && d.kind === 'none' ? colors.primary : l.fg}>
                      {d.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md}}>
          {(
            [
              ['Present', colors.success],
              ['Late', colors.warning],
              ['Absent', colors.danger],
              ['Leave', colors.accents[1].fg],
              ['Off', colors.textSubtle],
            ] as const
          ).map(([label, color]) => (
            <View key={label} style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <View style={{width: 8, height: 8, borderRadius: 2, backgroundColor: color}} />
              <Text variant="caption" tone="muted">
                {label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {selected ? (
        <Card style={{gap: spacing.md}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <Text variant="title">
              {(() => {
                const d = parseServerDate(selected.dateKey)!;
                return `${weekdayShort(d)}, ${formatDay(d)}`;
              })()}
            </Text>
            <Badge label={KIND_LABEL[selected.kind].label} tone={KIND_LABEL[selected.kind].tone} dot />
          </View>
          {selected.graceUsed ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
              <Timer size={14} color={colors.warning} />
              <Text variant="caption" tone="muted" style={{flex: 1}}>
                In after the shift start but within the grace time, so not late. Used grace day{' '}
                {days.filter(d => d.graceUsed && d.dateKey <= selected.dateKey).length} this month.
              </Text>
            </View>
          ) : null}
          {selected.record?.in_time ? (
            <>
              <View style={{flexDirection: 'row', gap: spacing.sm}}>
                <PunchCell
                  icon={LogIn}
                  fg={colors.success}
                  bg={colors.successSoft}
                  label="In"
                  value={formatClock(selected.record.in_time)}
                />
                <PunchCell
                  icon={LogOut}
                  fg={colors.danger}
                  bg={colors.dangerSoft}
                  label="Out"
                  value={selected.record.out_time ? formatClock(selected.record.out_time) : '—'}
                />
                <PunchCell
                  icon={Timer}
                  fg={colors.primary}
                  bg={colors.primarySoft}
                  label="Worked"
                  value={dayWorkedMs(selected) ? formatDuration(dayWorkedMs(selected)) : '—'}
                />
              </View>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setPunchesFor(selected.dateKey);
                }}
                accessibilityRole="button"
                hitSlop={6}
                style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
                <ListChecks size={16} color={colors.primary} />
                <Text variant="label" tone="primary" style={{flex: 1}}>
                  See all punches
                </Text>
                <Text variant="caption" tone="subtle">
                  or tap the day again
                </Text>
              </Pressable>
              {selected.record.punchin_image || selected.record.punchout_image ? (
                <View style={{flexDirection: 'row', gap: spacing.sm}}>
                  {selected.record.punchin_image ? (
                    <Button
                      title="Punch-in selfie"
                      icon={Camera}
                      variant="ghost"
                      size="sm"
                      style={{flex: 1}}
                      onPress={() => setPhoto(selected.record!.punchin_image!)}
                    />
                  ) : null}
                  {selected.record.punchout_image ? (
                    <Button
                      title="Punch-out selfie"
                      icon={Camera}
                      variant="ghost"
                      size="sm"
                      style={{flex: 1}}
                      onPress={() => setPhoto(selected.record!.punchout_image!)}
                    />
                  ) : null}
                </View>
              ) : null}
            </>
          ) : selected.leave ? (
            <Text variant="body" tone="muted">
              {selected.leave.leavetype?.name ?? 'Leave'}
              {selected.leave.reason ? ` · "${selected.leave.reason}"` : ''}
            </Text>
          ) : (
            <Text variant="body" tone="muted">
              {selected.kind === 'present' || selected.kind === 'late' || selected.kind === 'half-day'
                ? 'Marked present, but no punch times were recorded (usually a manual entry).'
                : selected.kind === 'off'
                ? `Not a working day in ${self ? 'your' : 'their'} shift.`
                : selected.kind === 'future'
                ? 'This day is still ahead.'
                : selected.kind === 'none'
                ? 'No punch recorded yet today.'
                : 'No punch recorded for this day.'}
            </Text>
          )}
          {FEATURES.editAttendance && selected.record && selected.kind !== 'future' ? (
            <Button
              title="Edit"
              icon={SquarePen}
              variant="secondary"
              size="sm"
              onPress={() => {
                haptics.tap();
                setEditing(selected);
              }}
            />
          ) : FEATURES.editAttendance && (selected.kind === 'absent' || selected.kind === 'none') ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
              <Info size={14} color={colors.textSubtle} />
              <Text variant="caption" tone="subtle" style={{flex: 1}}>
                {selected.kind === 'none'
                  ? 'Nothing to edit yet. Pick a day with a punch to edit it.'
                  : `Only days with a punch can be edited. ${
                      name.split(' ')[0]
                    } can send a punch fix from their app.`}
              </Text>
            </View>
          ) : null}
          {renderDayAction?.(selected)}
        </Card>
      ) : null}

      {FEATURES.editAttendance ? (
        <EditDaySheet
          visible={!!editing}
          onClose={() => setEditing(null)}
          name={name}
          record={editing?.record ?? null}
          dateKey={editing?.dateKey ?? ''}
          shift={shift}
          saving={update.isPending}
          onSave={(fields, note) =>
            editing?.record &&
            update.mutate(
              {recordId: editing.record.id, date: editing.dateKey, fields, reason: note},
              {onSuccess: () => setEditing(null)},
            )
          }
        />
      ) : null}

      <View>
        <SectionLabel>{self ? 'Your punch fixes' : 'Correction requests'}</SectionLabel>
        {requestsLoading ? (
          <Skeleton height={96} radius={20} />
        ) : requests.length ? (
          <View style={{gap: spacing.md}}>
            {requests.slice(0, 5).map(r => (
              <CorrectionCard key={r.id} request={r} readOnly={self} />
            ))}
          </View>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={Clock3}
              title={self ? 'No punch fixes asked for' : 'No correction requests'}
              message={
                self
                  ? 'Forgot to punch out? Pick that day above to ask for it.'
                  : 'Missed punch-out requests appear here.'
              }
            />
          </Card>
        )}
      </View>

      <DayPunchesSheet employeeId={employeeId} dateKey={punchesFor} onClose={() => setPunchesFor(null)} />
      <Modal
        visible={!!photo}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoto(null)}
        statusBarTranslucent>
        <Pressable
          onPress={() => setPhoto(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Close photo">
          {photo ? (
            <Image
              source={{uri: photo}}
              style={{width: '88%', aspectRatio: 3 / 4, borderRadius: radius.xl}}
              resizeMode="cover"
            />
          ) : null}
          <View style={{position: 'absolute', top: 60, right: 20}}>
            <X size={28} color="#FFFFFF" />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function PunchCell({
  icon: Icon,
  fg,
  bg,
  label,
  value,
}: {
  icon: typeof LogIn;
  fg: string;
  bg: string;
  label: string;
  value: string;
}) {
  const {colors, spacing, radius} = useTheme();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: 10,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceMuted,
      }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={16} color={fg} />
      </View>
      <View style={{flex: 1}}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="label" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  );
}

function CorrectionCard({request, readOnly}: {request: MissedPunchRequest; readOnly?: boolean}) {
  const {colors, spacing, radius} = useTheme();
  const action = useSetMissedPunchStatus();
  const [rejecting, setRejecting] = useState(false);
  const date = parseServerDate(request.date);
  const firstName = request.employee?.name.split(' ')[0] ?? 'Employee';
  const pending = request.status.toLowerCase() === 'pending';
  const tone: BadgeTone = pending
    ? 'warning'
    : request.status.toLowerCase() === 'approved'
    ? 'success'
    : 'danger';

  return (
    <Card style={{gap: spacing.md}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: colors.warningSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Clock3 size={18} color={colors.warning} />
        </View>
        <View style={{flex: 1}}>
          <Text variant="title">Missed punch-out · {date ? formatDay(date) : request.date}</Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {request.in_time ? `In ${formatClock(request.in_time)} · ` : ''}
            {request.out_time
              ? `${readOnly ? 'asked for' : 'asked out'} ${formatClock(request.out_time)}`
              : ''}
            {request.reason ? ` · "${request.reason}"` : ''}
          </Text>
        </View>
        <Badge label={request.status} tone={tone} />
      </View>
      {!pending && request.reject_reason ? (
        <Text variant="caption" tone="muted">
          Rejected: {request.reject_reason}
        </Text>
      ) : null}
      {pending && !readOnly ? (
        <View style={{flexDirection: 'row', gap: spacing.sm}}>
          <Button
            title="Reject"
            variant="ghost"
            size="sm"
            style={{flex: 1}}
            onPress={() => setRejecting(true)}
          />
          <Button
            title="Approve"
            icon={Check}
            size="sm"
            style={{flex: 1}}
            loading={action.isPending && action.variables?.status === 'Approved'}
            onPress={() => action.mutate({id: request.id, status: 'Approved'})}
          />
        </View>
      ) : null}

      <RejectPunchSheet
        visible={rejecting && !readOnly}
        onClose={() => setRejecting(false)}
        firstName={firstName}
        dayLabel={date ? formatDay(date) : request.date}
        loading={action.isPending && action.variables?.status === 'Rejected'}
        onReject={(markAs, reason) =>
          action.mutate(
            {id: request.id, status: 'Rejected', reason, markAs},
            {onSuccess: () => setRejecting(false)},
          )
        }
      />
    </Card>
  );
}
