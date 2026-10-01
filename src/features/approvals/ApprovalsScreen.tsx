import React, {useMemo, useState} from 'react';
import {RefreshControl, ScrollView, View} from 'react-native';
import {ArrowLeft, CircleAlert, CircleCheck, Smartphone, X} from 'lucide-react-native';
import {employeePhotoUrl} from '../../api/endpoints/people';
import {
  BottomSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PressableScale,
  Reveal,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '../../components/ui';
import {toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useSetMissedPunchStatus} from '../people/employee/queries';
import {usePeopleOnDate} from '../people/queries';
import {ApprovalCard, type Decision} from './ApprovalCard';
import {askedToday, leaveContext, type ApprovalItem, type ApprovalKind} from './approvalItems';
import {useApprovals, useDecideDevice, useDecideLeave} from './queries';

export type ApprovalFilter = 'all' | ApprovalKind;

const FILTERS: {key: ApprovalFilter; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'leave', label: 'Leave'},
  {key: 'punch', label: 'Punch fixes'},
  {key: 'device', label: 'New phones'},
];

const EMPTY_TITLE: Record<ApprovalFilter, string> = {
  all: 'All caught up',
  leave: 'No leave requests waiting',
  punch: 'No punch fixes waiting',
  device: 'No new phones waiting',
};

const REJECT_REASONS = ["Times don't match records", 'Too late to change', 'Talk to me first'];

export function ApprovalsScreen({navigation, route}: AppScreenProps<'Approvals'>) {
  const {colors, spacing} = useTheme();
  const [filter, setFilter] = useState<ApprovalFilter>(route.params?.filter ?? 'all');
  const approvals = useApprovals();
  const people = usePeopleOnDate(toDateKey());
  const byId = useMemo(() => new Map(people.people.map(p => [p.employee.id, p.employee])), [people.people]);

  const decideLeave = useDecideLeave();
  const decidePunch = useSetMissedPunchStatus();
  const decideDevice = useDecideDevice();
  const [busy, setBusy] = useState<{key: string; decision: Decision} | null>(null);
  const [confirm, setConfirm] = useState<{item: ApprovalItem; decision: Decision} | null>(null);
  const [rejecting, setRejecting] = useState<Extract<ApprovalItem, {kind: 'punch'}> | null>(null);
  const [reason, setReason] = useState('');

  const visible = approvals.items.filter(i => filter === 'all' || i.kind === filter);
  const today = visible.filter(i => askedToday(i));
  const earlier = visible.filter(i => !askedToday(i));

  const run = (item: ApprovalItem, decision: Decision, rejectReason?: string) => {
    const done = {onSettled: () => setBusy(null)};
    setBusy({key: item.key, decision});
    if (item.kind === 'leave') {
      decideLeave.mutate(
        {
          leaveId: item.leave.id,
          employeeId: item.employeeId,
          status: decision === 'approve' ? 'approved' : 'rejected',
        },
        done,
      );
    } else if (item.kind === 'punch') {
      decidePunch.mutate(
        {id: item.punch.id, status: decision === 'approve' ? 'Approved' : 'Rejected', reason: rejectReason},
        done,
      );
    } else {
      decideDevice.mutate({employeeId: item.employeeId, deviceId: item.device.device_id, decision}, done);
    }
  };

  const onDecide = (item: ApprovalItem, decision: Decision) => {
    haptics.tap();
    if (item.kind === 'punch' && decision === 'reject') {
      setReason('');
      setRejecting(item);
    } else if (decision === 'reject' || item.kind === 'device') {
      // Rejections, and allowing a phone (it signs the old one out), get a confirm.
      setConfirm({item, decision});
    } else {
      run(item, decision);
    }
  };

  const subtitleFor = (item: ApprovalItem) => {
    if (item.kind === 'punch') {
      return [item.punch.department?.name, item.punch.branch?.branch_name].filter(Boolean).join(' · ');
    }
    const e = byId.get(item.employeeId);
    return e ? [e.department_name, e.branch_name].filter(Boolean).join(' · ') : null;
  };
  const photoFor = (item: ApprovalItem) => {
    const e = byId.get(item.employeeId);
    return e ? employeePhotoUrl(e) : null;
  };

  const renderCard = (item: ApprovalItem, index: number) => (
    <Reveal key={item.key} index={index}>
      <ApprovalCard
        item={item}
        subtitle={subtitleFor(item)}
        photo={photoFor(item)}
        leave={item.kind === 'leave' ? leaveContext(item.leave, approvals.companyLeaves) : undefined}
        busy={busy?.key === item.key ? busy.decision : null}
        onDecide={decision => onDecide(item, decision)}
        onOpenEmployee={() => navigation.navigate('EmployeeDetail', {id: item.employeeId, name: item.name})}
      />
    </Reveal>
  );

  const first = confirm?.item.name.split(' ')[0] ?? '';
  const confirmCopy = !confirm
    ? null
    : confirm.item.kind === 'device'
    ? confirm.decision === 'approve'
      ? {
          title: `Allow ${first}'s new phone?`,
          message: `${first} can sign in on ${
            confirm.item.device.device_name ?? 'the new phone'
          }. Their current phone is signed out.`,
          label: 'Allow',
        }
      : {
          title: `Refuse ${first}'s new phone?`,
          message: `${first} stays signed in on their current phone only.`,
          label: 'Refuse',
        }
    : {
        title: `Reject ${first}'s leave?`,
        message: `${first} sees it as rejected in the app. This can't be undone.`,
        label: 'Reject',
      };

  return (
    <Screen
      scroll
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}
      refreshControl={
        <RefreshControl
          refreshing={approvals.isRefetching}
          onRefresh={approvals.refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm}}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{flex: 1}}>
          <Text variant="h2">Approvals</Text>
          <Text variant="caption" tone="muted">
            {approvals.isPending
              ? 'Loading…'
              : approvals.counts.all
              ? `${approvals.counts.all} waiting`
              : 'Nothing waiting'}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{flexGrow: 0, marginHorizontal: -spacing.lg, marginTop: spacing.lg}}
        contentContainerStyle={{paddingHorizontal: spacing.lg, gap: spacing.sm}}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <PressableScale
              key={f.key}
              onPress={() => {
                haptics.select();
                setFilter(f.key);
              }}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                height: 38,
                borderRadius: 19,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}>
              <Text variant="label" color={active ? colors.textOnPrimary : colors.text}>
                {f.label}
              </Text>
              <View
                style={{
                  minWidth: 20,
                  paddingHorizontal: 5,
                  height: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? 'rgba(255,255,255,0.22)' : colors.surfaceMuted,
                }}>
                <Text variant="caption" color={active ? colors.textOnPrimary : colors.textMuted}>
                  {approvals.counts[f.key]}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      <View style={{gap: spacing.md, marginTop: spacing.xl}}>
        {approvals.isPending ? (
          <>
            <Skeleton height={220} radius={20} />
            <Skeleton height={220} radius={20} />
          </>
        ) : approvals.isError ? (
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load approvals"
            message={approvals.error?.message}
            action={
              <Button title="Try again" size="sm" fullWidth={false} onPress={() => approvals.refetch()} />
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title={EMPTY_TITLE[filter]}
            message="New leave requests, punch fixes and phone sign-ins land here."
            style={{marginTop: spacing.huge}}
          />
        ) : (
          <>
            {today.length ? (
              <Text variant="overline" tone="muted">
                Today
              </Text>
            ) : null}
            {today.map(renderCard)}
            {earlier.length ? (
              <Text variant="overline" tone="muted" style={{marginTop: today.length ? spacing.sm : 0}}>
                Earlier
              </Text>
            ) : null}
            {earlier.map((item, i) => renderCard(item, today.length + i))}
          </>
        )}
      </View>

      <ConfirmDialog
        visible={!!confirm}
        icon={confirm?.item.kind === 'device' ? Smartphone : X}
        title={confirmCopy?.title ?? ''}
        message={confirmCopy?.message}
        confirmLabel={confirmCopy?.label}
        destructive={confirm?.decision === 'reject'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) {
            run(confirm.item, confirm.decision);
          }
          setConfirm(null);
        }}
      />

      <BottomSheet
        visible={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.name.split(' ')[0] ?? ''}'s punch fix?`}
        subtitle="The day stays as it is. They see your reason in the app.">
        <TextField
          label="Reason"
          placeholder="For example: CCTV shows arrival at 11:10 AM"
          value={reason}
          onChangeText={setReason}
          multiline
          style={{minHeight: 24}}
        />
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md}}>
          {REJECT_REASONS.map(r => (
            <PressableScale
              key={r}
              onPress={() => {
                haptics.select();
                setReason(r);
              }}
              accessibilityRole="button"
              style={{
                height: 34,
                paddingHorizontal: 12,
                borderRadius: 17,
                borderWidth: 1,
                borderColor: reason === r ? colors.primary : colors.border,
                backgroundColor: reason === r ? colors.primarySoft : colors.surface,
                justifyContent: 'center',
              }}>
              <Text variant="label" color={reason === r ? colors.primary : colors.text}>
                {r}
              </Text>
            </PressableScale>
          ))}
        </View>
        <Button
          title="Reject"
          variant="danger"
          style={{marginTop: spacing.xl}}
          disabled={!reason.trim()}
          onPress={() => {
            if (rejecting) {
              run(rejecting, 'reject', reason.trim());
            }
            setRejecting(null);
          }}
        />
      </BottomSheet>
    </Screen>
  );
}
