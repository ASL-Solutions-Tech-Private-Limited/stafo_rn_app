import React, {useState} from 'react';
import {Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown, LinearTransition, ReduceMotion} from 'react-native-reanimated';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  FlaskConical,
  Lock,
  MapPinned,
  Plus,
  Receipt,
  Smartphone,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  PressableScale,
  Reveal,
  Screen,
  SectionHeader,
  Text,
  toast,
} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, IconWell, SetupScreen} from '../setup/parts';
import {
  countByStatus,
  ROLE_LABEL,
  type DayStatus,
  type Member,
  type RequestKind,
  type StaffRole,
  type TeamRequest,
} from './roleLogic';
import {useDemoRoles, useStaffRole} from './useStaffRole';

const KIND: Record<
  RequestKind,
  {label: string; icon: LucideIcon; tint: 'info' | 'warning' | 'success' | 'primary'}
> = {
  leave: {label: 'Leave requests', icon: CalendarDays, tint: 'info'},
  punch: {label: 'Punch fixes', icon: Clock3, tint: 'warning'},
  claim: {label: 'Expense claims', icon: Receipt, tint: 'success'},
  device: {label: 'New phone sign-ins', icon: Smartphone, tint: 'primary'},
};

function useTint(t: 'info' | 'warning' | 'success' | 'primary' | 'danger') {
  const {colors} = useTheme();
  return {
    info: {fg: colors.info, bg: colors.infoSoft},
    warning: {fg: colors.warning, bg: colors.warningSoft},
    success: {fg: colors.success, bg: colors.successSoft},
    primary: {fg: colors.primary, bg: colors.primarySoft},
    danger: {fg: colors.danger, bg: colors.dangerSoft},
  }[t];
}

const STATUS: Record<DayStatus, {label: string; tone: 'success' | 'warning' | 'info' | 'danger'}> = {
  in: {label: 'In', tone: 'success'},
  late: {label: 'Late', tone: 'warning'},
  leave: {label: 'Leave', tone: 'info'},
  absent: {label: 'Absent', tone: 'danger'},
};

/** "Demo" marker so nobody mistakes sample data for real. */
export function DemoTag() {
  return <Badge label="Demo" tone="warning" />;
}

function TodayStats({members}: {members: Member[]}) {
  const {colors, spacing} = useTheme();
  const c = countByStatus(members);
  const items: [string, number, string][] = [
    ['In', c.in, colors.success],
    ['Late', c.late, colors.warning],
    ['On leave', c.leave, colors.info],
    ['Absent', c.absent, colors.danger],
  ];
  return (
    <View style={{flexDirection: 'row', marginTop: spacing.md}}>
      {items.map(([label, n, color]) => (
        <View key={label} style={{flex: 1, alignItems: 'center'}}>
          <Text variant="h2" color={color}>
            {n}
          </Text>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Extra cards on an employee's home when they're a Manager or HR. */
export function RoleHomeSection() {
  const {spacing} = useTheme();
  const navigation = useNavigation();
  const {role, group, members} = useStaffRole();
  // Select the stored object, not a new [] per render (that loops forever).
  const allRequests = useDemoRoles(s => s.requests);
  const requests = role === 'employee' ? [] : allRequests[role];
  if (role === 'employee') {
    return null;
  }
  const pending = requests.filter(r => r.status === 'pending');
  const tab = role === 'hr' ? 'People' : 'Team';
  return (
    <>
      <Reveal index={1} style={{paddingHorizontal: spacing.lg, marginTop: spacing.lg}}>
        <Card onPress={() => navigation.navigate('EmployeeTabs', {screen: tab})}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
            <Text variant="title" style={{flex: 1}}>
              {role === 'hr' ? 'My employees today' : 'My team today'}
            </Text>
            <Text variant="label" tone="primary">
              {group} · {members.length}
            </Text>
            <ChevronRight size={16} color="#97A0B3" />
          </View>
          <TodayStats members={members} />
        </Card>
      </Reveal>
      <Reveal index={1} style={{paddingHorizontal: spacing.lg, marginTop: spacing.lg}}>
        <RequestsCard role={role} requests={pending} />
      </Reveal>
      {role === 'hr' ? (
        <Reveal index={2} style={{paddingHorizontal: spacing.lg, marginTop: spacing.xxl}}>
          <SectionHeader title="HR shortcuts" />
          <HrShortcuts />
        </Reveal>
      ) : null}
    </>
  );
}

function RequestsCard({role, requests}: {role: 'manager' | 'hr'; requests: TeamRequest[]}) {
  const {colors, spacing} = useTheme();
  const navigation = useNavigation();
  const kinds = (Object.keys(KIND) as RequestKind[]).filter(k => requests.some(r => r.kind === k));
  return (
    <Card padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
        <Text variant="title" style={{flex: 1}}>
          {role === 'hr' ? 'Final approvals' : 'Waiting for you'}
        </Text>
        <DemoTag />
        {requests.length ? <Badge label={String(requests.length)} tone="danger" /> : null}
      </View>
      {kinds.length ? (
        kinds.map(k => (
          <KindRow
            key={k}
            kind={k}
            count={requests.filter(r => r.kind === k).length}
            label={role === 'hr' && k === 'leave' ? 'Leave (manager-approved)' : KIND[k].label}
            onPress={() => navigation.navigate('TeamRequests', {role, kind: k})}
          />
        ))
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.lg,
            paddingTop: spacing.sm,
          }}>
          <Check size={16} color={colors.success} />
          <Text variant="body" tone="muted">
            All caught up.
          </Text>
        </View>
      )}
    </Card>
  );
}

function KindRow({
  kind,
  count,
  label,
  onPress,
}: {
  kind: RequestKind;
  count: number;
  label: string;
  onPress: () => void;
}) {
  const {colors, spacing} = useTheme();
  const t = useTint(KIND[kind].tint);
  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      scaleTo={0.98}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
      <IconWell icon={KIND[kind].icon} fg={t.fg} bg={t.bg} size={34} />
      <Text variant="title" style={{flex: 1}}>
        {label}
      </Text>
      <Text variant="title">{count}</Text>
      <ChevronRight size={16} color={colors.textSubtle} />
    </PressableScale>
  );
}

function HrShortcuts() {
  const {spacing} = useTheme();
  const navigation = useNavigation();
  const items: {
    label: string;
    icon: LucideIcon;
    tint: 'primary' | 'danger' | 'warning';
    onPress: () => void;
  }[] = [
    {label: 'Add employee', icon: Plus, tint: 'primary', onPress: () => demoOnly('Adding employees')},
    {
      label: 'Run payroll',
      icon: Wallet,
      tint: 'danger',
      onPress: () => demoOnly('Payroll for your employees'),
    },
    {
      label: 'Holidays',
      icon: CalendarDays,
      tint: 'warning',
      onPress: () => navigation.navigate('MyHolidays'),
    },
  ];
  return (
    <View style={{flexDirection: 'row', gap: spacing.sm}}>
      {items.map(it => (
        <Shortcut key={it.label} {...it} />
      ))}
    </View>
  );
}

function Shortcut({
  label,
  icon,
  tint,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  tint: 'primary' | 'danger' | 'warning';
  onPress: () => void;
}) {
  const {spacing} = useTheme();
  const t = useTint(tint);
  return (
    <Card
      onPress={onPress}
      style={{flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg}}>
      <IconWell icon={icon} fg={t.fg} bg={t.bg} />
      <Text variant="label" align="center">
        {label}
      </Text>
    </Card>
  );
}

function demoOnly(what: string) {
  haptics.tap();
  toast.info(`${what} opens here once the backend gives HR access. Demo only.`);
}

/** The Team tab (Manager) or People tab (HR): who's in today. */
export function TeamTabScreen() {
  const {colors, spacing} = useTheme();
  const {role, group, members} = useStaffRole();
  const [filter, setFilter] = useState<'all' | DayStatus | 'away'>('all');
  const [open, setOpen] = useState<Member | null>(null);
  const c = countByStatus(members);
  const shown = members.filter(m =>
    filter === 'all'
      ? true
      : filter === 'away'
      ? m.status === 'leave' || m.status === 'absent'
      : m.status === filter,
  );
  return (
    <Screen
      scroll
      safeBottom={false}
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm}}>
        <Text variant="h1" style={{flex: 1}}>
          {role === 'hr' ? 'My employees' : 'My team'}
        </Text>
        <DemoTag />
      </View>
      <Text variant="bodyRegular" tone="muted" style={{marginTop: 2}}>
        {group} · {members.length} people · Today
      </Text>
      <View style={{marginTop: spacing.lg}}>
        <ChoiceChips
          items={[
            {value: 'all', label: `All ${members.length}`},
            {value: 'in', label: `In ${c.in}`},
            {value: 'late', label: `Late ${c.late}`},
            {value: 'away', label: `Away ${c.leave + c.absent}`},
          ]}
          value={filter}
          onChange={v => setFilter(v as typeof filter)}
        />
      </View>
      <Card padded={false} style={{marginTop: spacing.lg}}>
        {shown.map((m, i) => (
          <Animated.View
            key={m.id}
            layout={LinearTransition.reduceMotion(ReduceMotion.System)}
            entering={FadeInDown.delay(i * 30)
              .duration(260)
              .reduceMotion(ReduceMotion.System)}>
            <PressableScale
              onPress={() => {
                haptics.tap();
                setOpen(m);
              }}
              scaleTo={0.98}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}>
              <Avatar name={m.name} size={38} />
              <View style={{flex: 1}}>
                <Text variant="title">{m.name}</Text>
                <Text variant="caption" tone="muted">
                  {m.note}
                </Text>
              </View>
              <Badge label={STATUS[m.status].label} tone={STATUS[m.status].tone} dot />
            </PressableScale>
          </Animated.View>
        ))}
        {!shown.length ? (
          <EmptyState compact icon={Users} title="Nobody here" message="Try another filter." />
        ) : null}
      </Card>
      {role === 'manager' ? (
        <Button
          title="Assign a task to the team"
          icon={ClipboardList}
          style={{marginTop: spacing.lg}}
          onPress={() => demoOnly('Assigning tasks to your team')}
        />
      ) : (
        <Button
          title="Add employee"
          icon={Plus}
          style={{marginTop: spacing.lg}}
          onPress={() => demoOnly('Adding employees')}
        />
      )}
      <MemberSheet member={open} role={role} onClose={() => setOpen(null)} />
    </Screen>
  );
}

function MemberSheet({member, role, onClose}: {member: Member | null; role: StaffRole; onClose: () => void}) {
  const {spacing} = useTheme();
  return (
    <BottomSheet visible={!!member} onClose={onClose} title={member?.name ?? ''} subtitle={member?.position}>
      {member ? (
        <View style={{gap: spacing.md}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
            <Avatar name={member.name} size={48} />
            <View style={{flex: 1}}>
              <Badge label={STATUS[member.status].label} tone={STATUS[member.status].tone} dot />
              <Text variant="body" tone="muted" style={{marginTop: spacing.xs}}>
                {member.note}
              </Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            {[
              ['This month', '18 / 20 days'],
              ['Late', '2'],
              ['Leave left', '7'],
            ].map(([k, v]) => (
              <Card key={k} style={{flex: 1, alignItems: 'center', paddingVertical: spacing.md}}>
                <Text variant="title">{v}</Text>
                <Text variant="caption" tone="muted">
                  {k}
                </Text>
              </Card>
            ))}
          </View>
          <Button
            title="Assign a task"
            icon={ClipboardList}
            onPress={() => {
              onClose();
              demoOnly(`Assigning a task to ${member.name.split(' ')[0]}`);
            }}
          />
          {role === 'manager' ? (
            <Button
              title="See on the map"
              icon={MapPinned}
              variant="ghost"
              onPress={() => {
                onClose();
                demoOnly('Team live location');
              }}
            />
          ) : (
            <Button
              title="Documents & salary"
              icon={Wallet}
              variant="ghost"
              onPress={() => {
                onClose();
                demoOnly('Employee records');
              }}
            />
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}

/** Pending requests of one kind. */
export function TeamRequestsScreen({navigation, route}: AppScreenProps<'TeamRequests'>) {
  const {role, kind} = route.params;
  const {colors, spacing} = useTheme();
  const all = useDemoRoles(s => s.requests[role]);
  const list = all.filter(r => !kind || r.kind === kind);
  return (
    <SetupScreen
      title={kind ? (role === 'hr' && kind === 'leave' ? 'Leave to approve' : KIND[kind].label) : 'Requests'}
      subtitle={`${ROLE_LABEL[role]} · demo data`}>
      <Card padded={false}>
        {list.map((r, i) => (
          <PressableScale
            key={r.id}
            onPress={() => navigation.navigate('TeamRequest', {role, id: r.id})}
            scaleTo={0.98}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <Avatar name={r.person} size={38} />
            <View style={{flex: 1}}>
              <Text variant="title">{r.person}</Text>
              <Text variant="caption" tone="muted">
                {r.title} · {r.detail}
              </Text>
            </View>
            <StatusBadge status={r.status} />
          </PressableScale>
        ))}
      </Card>
    </SetupScreen>
  );
}

function StatusBadge({status}: {status: TeamRequest['status']}) {
  return status === 'pending' ? (
    <Badge label="Pending" tone="warning" dot />
  ) : status === 'forwarded' ? (
    <Badge label="Sent to HR" tone="info" dot />
  ) : status === 'approved' ? (
    <Badge label="Approved" tone="success" dot />
  ) : (
    <Badge label="Rejected" tone="danger" dot />
  );
}

/** One request with its approval chain. */
export function TeamRequestScreen({navigation, route}: AppScreenProps<'TeamRequest'>) {
  const {role, id} = route.params;
  const {spacing} = useTheme();
  const r = useDemoRoles(s => s.requests[role].find(x => x.id === id));
  const decideReq = useDemoRoles(s => s.decide);
  if (!r) {
    return <SetupScreen title="Request">{null}</SetupScreen>;
  }
  const act = (approve: boolean) => {
    const status = decideReq(role, r.id, approve);
    haptics.success();
    toast.success(
      status === 'forwarded'
        ? `Approved. ${r.person.split(' ')[0]}'s leave goes to HR next.`
        : status === 'approved'
        ? 'Approved.'
        : 'Rejected.',
    );
    navigation.goBack();
  };
  return (
    <SetupScreen title={KIND[r.kind].label.replace(/s$/, '')} subtitle={`${ROLE_LABEL[role]} · demo data`}>
      <Card style={{gap: spacing.md}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
          <Avatar name={r.person} size={44} />
          <View style={{flex: 1}}>
            <Text variant="title">{r.person}</Text>
            <Text variant="caption" tone="muted">
              {r.position}
            </Text>
          </View>
          <StatusBadge status={r.status} />
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md}}>
          <Text variant="body" tone="muted">
            {r.title}
          </Text>
          <Text variant="title" style={{flexShrink: 1, textAlign: 'right'}}>
            {r.detail}
          </Text>
        </View>
        <Text variant="body">“{r.reason}”</Text>
      </Card>
      {r.kind === 'leave' ? <Chain r={r} role={role} /> : null}
      {r.status === 'pending' ? (
        <View style={{flexDirection: 'row', gap: spacing.md}}>
          <Button title="Reject" icon={X} variant="ghost" style={{flex: 1}} onPress={() => act(false)} />
          <Button title="Approve" icon={Check} style={{flex: 1}} onPress={() => act(true)} />
        </View>
      ) : null}
      <View style={{flexDirection: 'row', gap: spacing.sm, alignItems: 'center'}}>
        <FlaskConical size={14} color="#DC8A06" />
        <Text variant="caption" tone="muted" style={{flex: 1}}>
          Demo: approving or rejecting here doesn’t change anything on the server.
        </Text>
      </View>
    </SetupScreen>
  );
}

function Chain({r, role}: {r: TeamRequest; role: 'manager' | 'hr'}) {
  const {spacing} = useTheme();
  const first = r.person.split(' ')[0];
  const steps: {label: string; state: 'done' | 'now' | 'next'}[] =
    role === 'manager'
      ? [
          {label: `${first} asked`, state: 'done'},
          {label: 'You (Manager)', state: r.status === 'pending' ? 'now' : 'done'},
          {label: 'HR', state: r.status === 'forwarded' ? 'now' : 'next'},
        ]
      : [
          {label: `${first} asked`, state: 'done'},
          {label: `${r.managerApproved ?? 'Manager'} ✓`, state: 'done'},
          {label: 'You (HR)', state: r.status === 'pending' ? 'now' : 'done'},
        ];
  return (
    <Card style={{gap: spacing.sm}}>
      <Text variant="overline" tone="muted">
        APPROVAL
      </Text>
      <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs}}>
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            {i ? <ArrowRight size={14} color="#97A0B3" /> : null}
            <Badge
              label={s.label}
              tone={s.state === 'done' ? 'success' : s.state === 'now' ? 'warning' : 'neutral'}
            />
          </React.Fragment>
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {role === 'manager'
          ? 'Your OK sends it to HR for the final decision.'
          : 'The manager has approved; yours is the final decision.'}
      </Text>
    </Card>
  );
}

/** Role tools at the top of Apps, with owner-only items shown locked (demo). */
export function RoleAppsSection() {
  const {colors, spacing} = useTheme();
  const navigation = useNavigation();
  const {role} = useStaffRole();
  if (role === 'employee') {
    return null;
  }
  const mine: {label: string; hint: string; icon: LucideIcon; onPress: () => void}[] =
    role === 'manager'
      ? [
          {
            label: 'My team',
            hint: 'Today’s attendance',
            icon: Users,
            onPress: () => navigation.navigate('EmployeeTabs', {screen: 'Team'}),
          },
          {
            label: 'Approvals',
            hint: 'Leave, punch fixes, claims',
            icon: Check,
            onPress: () => navigation.navigate('TeamRequests', {role}),
          },
          {
            label: 'Team live location',
            hint: 'Field staff on the map',
            icon: MapPinned,
            onPress: () => demoOnly('Team live location'),
          },
        ]
      : [
          {
            label: 'My employees',
            hint: 'Directory and today',
            icon: Users,
            onPress: () => navigation.navigate('EmployeeTabs', {screen: 'People'}),
          },
          {
            label: 'Final approvals',
            hint: 'Leave, new phones, claims',
            icon: Check,
            onPress: () => navigation.navigate('TeamRequests', {role}),
          },
          {
            label: 'Payroll & reports',
            hint: 'For your employees',
            icon: Wallet,
            onPress: () => demoOnly('Payroll for your employees'),
          },
        ];
  return (
    <View style={{marginTop: spacing.xxl}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md}}>
        <Text variant="overline" tone="muted" style={{flex: 1}}>
          {ROLE_LABEL[role].toUpperCase()} TOOLS
        </Text>
        <DemoTag />
      </View>
      <Card padded={false}>
        {mine.map((m, i) => (
          <PressableScale
            key={m.label}
            onPress={() => {
              haptics.tap();
              m.onPress();
            }}
            scaleTo={0.99}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <IconWell icon={m.icon} fg={colors.primary} bg={colors.primarySoft} size={44} />
            <View style={{flex: 1}}>
              <Text variant="title">{m.label}</Text>
              <Text variant="caption" tone="muted">
                {m.hint}
              </Text>
            </View>
          </PressableScale>
        ))}
      </Card>
      <Text variant="overline" tone="muted" style={{marginTop: spacing.xxl, marginBottom: spacing.md}}>
        OWNER ONLY
      </Text>
      <Card style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: 0.6}}>
        <IconWell icon={Lock} fg={colors.textMuted} bg={colors.surfaceMuted} />
        <View style={{flex: 1}}>
          <Text variant="title">Subscription · Branches · KYC</Text>
          <Text variant="caption" tone="muted">
            Only the company owner can open these
          </Text>
        </View>
      </Card>
    </View>
  );
}

/** Profile card: flip between the three views on one phone. */
export function DemoRoleSwitch() {
  const {colors, spacing, radius} = useTheme();
  const {role, real} = useStaffRole();
  const setOverride = useDemoRoles(s => s.setOverride);
  const options: StaffRole[] = ['employee', 'manager', 'hr'];
  return (
    <Card
      style={{
        gap: spacing.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.warning,
        marginTop: spacing.lg,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
        <Text variant="title" style={{flex: 1}}>
          Demo · view as
        </Text>
        <DemoTag />
      </View>
      <View
        style={{
          flexDirection: 'row',
          padding: 3,
          gap: 3,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        accessibilityRole="radiogroup">
        {options.map(o => {
          const on = role === o;
          return (
            <Pressable
              key={o}
              onPress={() => {
                haptics.select();
                setOverride(o === real ? null : o);
              }}
              accessibilityRole="radio"
              accessibilityState={{checked: on}}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: on ? colors.primarySoft : 'transparent',
              }}>
              <Text variant="label" tone={on ? 'primary' : 'muted'}>
                {ROLE_LABEL[o]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" tone="muted">
        Your real role is <Text variant="caption">{ROLE_LABEL[real]}</Text> (from your position). Manager and
        HR screens use sample people and requests; nothing is sent to the server.
      </Text>
    </Card>
  );
}
