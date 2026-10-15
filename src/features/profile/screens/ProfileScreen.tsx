import React, {useEffect, useState} from 'react';
import {StatusBar, View, type LayoutChangeEvent} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DeviceInfo from 'react-native-device-info';
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  Crown,
  FileText,
  Gift,
  Hash,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Moon,
  Pencil,
  Phone,
  Sun,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  Gradient,
  PressableScale,
  Reveal,
  Text,
  TextField,
} from '../../../components/ui';
import {APP_ENV} from '../../../config/env';
import {formatDay, parseServerDate} from '../../../lib/date';
import {haptics} from '../../../lib/haptics';
import type {AppStackParamList} from '../../../navigation/types';
import {signOut, useSession} from '../../../store/session';
import {useTheme, useThemePreference, type ThemePreference} from '../../../theme/ThemeProvider';
import {useCompanyProfile, useEmployeeDetails} from '../../home/queries';
import {IconWell} from '../../setup/parts';
import {confirmsName} from '../accountLogic';
import {useDeleteCompany} from '../accountQueries';

type Row = {icon: LucideIcon; label: string; value?: string | null};
type Tint = 'primary' | 'info' | 'success' | 'warning' | 'danger';
type Link = {icon: LucideIcon; label: string; hint: string; tint: Tint; to: keyof AppStackParamList};

const HERO_OVERLAP = 44;
/** Scroll distance over which the compact header fades in. */
const COLLAPSE_START = 150;
const COLLAPSE_END = 210;

export function ProfileScreen() {
  const {colors, spacing, dark} = useTheme();
  const role = useSession(s => s.role);
  const [confirmOut, setConfirmOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });
  const isCompany = role === 'company';
  const insets = useSafeAreaInsets();
  // Once the hero has scrolled away, a solid header takes over and the status bar turns dark.
  const [collapsed, setCollapsed] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > (COLLAPSE_START + COLLAPSE_END) / 2,
    (now, before) => {
      if (now !== before) {
        scheduleOnRN(setCollapsed, now);
      }
    },
  );
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [0, 1], Extrapolation.CLAMP),
    transform: [
      {translateY: interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [-12, 0], Extrapolation.CLAMP)},
    ],
  }));

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={collapsed && !dark ? 'dark-content' : 'light-content'} animated />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: spacing.xxxl}}>
        {isCompany ? <CompanyProfile scrollY={scrollY} /> : <EmployeeProfile scrollY={scrollY} />}

        <View style={{paddingHorizontal: spacing.lg}}>
          <Reveal index={2}>
            {isCompany ? (
              <LinkSection
                title="Company"
                links={[
                  {
                    icon: Building2,
                    label: 'Company profile',
                    hint: 'Name, GST, address and bank',
                    tint: 'primary',
                    to: 'CompanyProfileEdit',
                  },
                  {
                    icon: FileText,
                    label: 'Company documents',
                    hint: 'Registration, GST, PAN and more',
                    tint: 'info',
                    to: 'CompanyDocuments',
                  },
                  {
                    icon: Crown,
                    label: 'Plan & billing',
                    hint: 'Your subscription and renewals',
                    tint: 'warning',
                    to: 'Subscription',
                  },
                ]}
              />
            ) : (
              <LinkSection
                title="Documents"
                links={[
                  {
                    icon: FileText,
                    label: 'My documents',
                    hint: 'Offer letter, ID and more',
                    tint: 'info',
                    to: 'MyDocuments',
                  },
                ]}
              />
            )}
          </Reveal>

          <Reveal index={3}>
            <LinkSection
              title="Support"
              links={[
                {
                  icon: LifeBuoy,
                  label: 'Help & support',
                  hint: 'FAQs, call or email us',
                  tint: 'primary',
                  to: 'HelpSupport',
                },
                {
                  icon: MessageSquare,
                  label: 'Send feedback',
                  hint: 'Tell us what to improve',
                  tint: 'success',
                  to: 'Feedback',
                },
                {
                  icon: Gift,
                  label: 'Refer STAFO',
                  hint: 'Invite another business',
                  tint: 'warning',
                  to: 'Refer',
                },
              ]}
            />
          </Reveal>

          <Reveal index={4}>
            <SectionTitle>Appearance</SectionTitle>
            <AppearancePicker />
          </Reveal>

          <Reveal index={5}>
            <SectionTitle>Account</SectionTitle>
            <Card padded={false}>
              <MenuRow
                icon={LogOut}
                tint="danger"
                label="Sign out"
                danger
                onPress={() => setConfirmOut(true)}
              />
              {isCompany ? (
                <MenuRow
                  icon={Trash2}
                  tint="danger"
                  label="Delete company account"
                  hint="Removes all company data"
                  danger
                  divider
                  onPress={() => setDeleting(true)}
                />
              ) : null}
            </Card>
          </Reveal>

          <Text variant="caption" tone="subtle" align="center" style={{marginTop: spacing.xl}}>
            STAFO {DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()})
            {APP_ENV === 'staging' ? ' · staging' : ''}
          </Text>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerStyle,
        ]}>
        <View style={{height: 52, justifyContent: 'center', paddingHorizontal: spacing.lg}}>
          <Text variant="h3">Profile</Text>
        </View>
      </Animated.View>

      <ConfirmDialog
        visible={confirmOut}
        icon={LogOut}
        destructive
        title="Sign out?"
        message="You'll need your mobile number and a new OTP to sign back in."
        confirmLabel="Sign out"
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => {
          setConfirmOut(false);
          signOut();
        }}
      />
      {isCompany ? <DeleteCompanySheet visible={deleting} onClose={() => setDeleting(false)} /> : null}
    </View>
  );
}

function SectionTitle({children}: {children: string}) {
  const {spacing} = useTheme();
  return (
    <Text variant="overline" tone="muted" style={{marginTop: spacing.xxl, marginBottom: spacing.md}}>
      {children}
    </Text>
  );
}

/** Gradient header: avatar pops in, zooms a little on pull-down, and fades as the page scrolls. */
function ProfileHero({
  name,
  role,
  badge,
  uri,
  onEdit,
  scrollY,
}: {
  name?: string | null;
  role?: string | null;
  badge?: string | null;
  uri?: string | null;
  onEdit?: () => void;
  scrollY: SharedValue<number>;
}) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{scale: interpolate(scrollY.value, [-140, 0], [1.18, 1], Extrapolation.CLAMP)}],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 160], [1, 0.2], Extrapolation.CLAMP),
    transform: [{translateY: interpolate(scrollY.value, [0, 160], [0, 40], Extrapolation.CLAMP)}],
  }));

  return (
    <Gradient
      from={colors.heroFrom}
      to={colors.heroTo}
      decorated
      style={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.xl,
        paddingBottom: HERO_OVERLAP + spacing.xl,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', minHeight: 40}}>
        <Text variant="h2" tone="inverse" style={{flex: 1}}>
          Profile
        </Text>
        {onEdit ? (
          <PressableScale
            onPress={() => {
              haptics.tap();
              onEdit();
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit company details"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.24)',
            }}>
            <Pencil size={15} color="#FFFFFF" />
            <Text variant="label" tone="inverse">
              Edit
            </Text>
          </PressableScale>
        ) : null}
      </View>

      <Animated.View style={[{alignItems: 'center', marginTop: spacing.lg}, contentStyle]}>
        <Animated.View
          entering={ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System)}
          style={avatarStyle}>
          <View style={{padding: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)'}}>
            <Avatar name={name} uri={uri} size={88} ring="rgba(255,255,255,0.85)" />
          </View>
        </Animated.View>
        <Reveal index={1} style={{alignItems: 'center'}}>
          <Text variant="h2" tone="inverse" align="center" numberOfLines={2} style={{marginTop: spacing.md}}>
            {name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: spacing.sm,
              marginTop: spacing.sm,
            }}>
            {[role, badge].filter(Boolean).map(t => (
              <View
                key={t}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}>
                <Text variant="caption" color="rgba(255,255,255,0.92)" numberOfLines={1}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        </Reveal>
      </Animated.View>
    </Gradient>
  );
}

function EmployeeProfile({scrollY}: {scrollY: SharedValue<number>}) {
  const employee = useSession(s => s.employee);
  const details = useEmployeeDetails();
  const d = details.data?.data;
  const joined = parseServerDate(d?.date_of_joining);

  const rows: Row[] = [
    {icon: Hash, label: 'Employee ID', value: d?.emp_id ?? employee?.emp_id},
    {icon: Phone, label: 'Mobile', value: d?.phone ?? employee?.phone},
    {icon: Mail, label: 'Email', value: d?.email ?? employee?.email},
    {icon: Building2, label: 'Branch', value: d?.branch_name},
    {icon: Briefcase, label: 'Department', value: d?.department_name},
    {
      icon: CalendarDays,
      label: 'Joined',
      value: joined ? `${formatDay(joined)} ${joined.getFullYear()}` : null,
    },
  ];

  return (
    <>
      <ProfileHero
        name={d?.name ?? employee?.name}
        role={d?.position ?? employee?.position}
        badge={details.data?.company_name}
        uri={details.data?.image_url}
        scrollY={scrollY}
      />
      <InfoCard rows={rows} />
    </>
  );
}

function CompanyProfile({scrollY}: {scrollY: SharedValue<number>}) {
  const navigation = useNavigation();
  const company = useSession(s => s.company);
  const profile = useCompanyProfile();
  // The login payload stores type, city and state as database ids ("2", "617");
  // only show values that are actual names.
  const named = (v?: string | null) => (v && !/^\d+$/.test(v.trim()) ? v : null);
  const location = [named(company?.city), named(company?.state)].filter(Boolean).join(', ');

  const rows: Row[] = [
    {icon: Phone, label: 'Mobile', value: company?.mobile_no},
    {icon: Mail, label: 'Email', value: company?.email},
    {icon: Briefcase, label: 'Company type', value: named(company?.company_type)},
    {icon: MapPin, label: 'Location', value: location || null},
    {icon: Hash, label: 'GSTIN', value: company?.gst_number},
  ];

  return (
    <>
      <ProfileHero
        name={company?.company_name}
        role="Company admin"
        uri={profile.data?.data?.company_logo}
        onEdit={() => navigation.navigate('CompanyProfileEdit')}
        scrollY={scrollY}
      />
      <InfoCard rows={rows} />
    </>
  );
}

/** Contact details, lifted over the bottom of the hero. */
function InfoCard({rows}: {rows: Row[]}) {
  const {colors, spacing} = useTheme();
  const visible = rows.filter(r => r.value);
  if (!visible.length) {
    return <View style={{height: spacing.md}} />;
  }
  return (
    <Reveal index={1} style={{marginTop: -HERO_OVERLAP, paddingHorizontal: spacing.lg}}>
      <Card padded={false}>
        {visible.map((row, i) => (
          <View
            key={row.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <IconWell icon={row.icon} fg={colors.primary} bg={colors.primarySoft} size={36} />
            <View style={{flex: 1, minWidth: 0}}>
              <Text variant="caption" tone="muted">
                {row.label}
              </Text>
              <Text variant="title" numberOfLines={1} selectable>
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Reveal>
  );
}

function useTint(tint: Tint) {
  const {colors} = useTheme();
  return {
    primary: {fg: colors.primary, bg: colors.primarySoft},
    info: {fg: colors.info, bg: colors.infoSoft},
    success: {fg: colors.success, bg: colors.successSoft},
    warning: {fg: colors.warning, bg: colors.warningSoft},
    danger: {fg: colors.danger, bg: colors.dangerSoft},
  }[tint];
}

function MenuRow({
  icon,
  tint,
  label,
  hint,
  danger,
  divider,
  onPress,
}: {
  icon: LucideIcon;
  tint: Tint;
  label: string;
  hint?: string;
  danger?: boolean;
  divider?: boolean;
  onPress: () => void;
}) {
  const {colors, spacing} = useTheme();
  const t = useTint(tint);
  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityHint={hint}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.border,
      }}>
      <IconWell icon={icon} fg={t.fg} bg={t.bg} size={38} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title" tone={danger ? 'danger' : undefined}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      {danger ? null : <ChevronRight size={18} color={colors.textSubtle} />}
    </PressableScale>
  );
}

function LinkSection({title, links}: {title: string; links: Link[]}) {
  const navigation = useNavigation();
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <Card padded={false}>
        {links.map((l, i) => (
          <MenuRow
            key={l.to}
            icon={l.icon}
            tint={l.tint}
            label={l.label}
            hint={l.hint}
            divider={i > 0}
            onPress={() => navigation.navigate(l.to as never)}
          />
        ))}
      </Card>
    </>
  );
}

/** Segmented control whose highlight slides to the chosen option. */
function AppearancePicker() {
  const {colors, spacing, radius} = useTheme();
  const {preference, setPreference} = useThemePreference();
  const options: {value: ThemePreference; label: string; icon: LucideIcon}[] = [
    {value: 'system', label: 'System', icon: Monitor},
    {value: 'light', label: 'Light', icon: Sun},
    {value: 'dark', label: 'Dark', icon: Moon},
  ];
  const index = Math.max(
    0,
    options.findIndex(o => o.value === preference),
  );
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const segment = width / options.length;

  useEffect(() => {
    x.value = withSpring(index * segment, {damping: 18, stiffness: 180, reduceMotion: ReduceMotion.System});
  }, [index, segment, x]);

  const pill = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 10)}
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      accessibilityRole="radiogroup">
      {width ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 4,
              width: segment,
              borderRadius: radius.md,
              backgroundColor: colors.primarySoft,
            },
            pill,
          ]}
        />
      ) : null}
      {options.map(o => {
        const active = preference === o.value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => {
              haptics.select();
              setPreference(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{checked: active}}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: spacing.md,
            }}>
            <o.icon size={16} color={active ? colors.primary : colors.textMuted} />
            <Text variant="label" tone={active ? 'primary' : 'muted'}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const LOSES = [
  'All employees are signed out and can no longer use STAFO for your company',
  'Attendance, leave, payroll and expense records are removed',
  'Your subscription ends with no refund for the remaining days',
];

/** Deleting can't be undone, so they type the company name to confirm. */
function DeleteCompanySheet({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const {spacing} = useTheme();
  const name = useSession(s => s.company?.company_name ?? '');
  const del = useDeleteCompany();
  const [typed, setTyped] = useState('');
  const ok = confirmsName(typed, name);
  useEffect(() => {
    if (visible) {
      setTyped('');
    }
  }, [visible]);
  return (
    <BottomSheet
      visible={visible}
      onClose={() => !del.isPending && onClose()}
      title="Delete company account?">
      <View style={{gap: spacing.md}}>
        <Text variant="body" tone="muted">
          This can’t be undone.
        </Text>
        {LOSES.map(l => (
          <View key={l} style={{flexDirection: 'row', gap: spacing.sm}}>
            <Text variant="body" tone="danger">
              •
            </Text>
            <Text variant="body" style={{flex: 1}}>
              {l}
            </Text>
          </View>
        ))}
        <TextField
          label={`Type “${name}” to confirm`}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          title="Delete permanently"
          icon={Trash2}
          variant="danger"
          disabled={!ok}
          loading={del.isPending}
          onPress={() => del.mutate()}
        />
        <Button title="Keep my account" variant="ghost" disabled={del.isPending} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
