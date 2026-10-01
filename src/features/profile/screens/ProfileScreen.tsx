import React, {useState} from 'react';
import {Pressable, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
  Briefcase,
  Building2,
  CalendarDays,
  Hash,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Phone,
  Sun,
  type LucideIcon,
} from 'lucide-react-native';
import {Avatar, Badge, Card, ConfirmDialog, Screen, Text} from '../../../components/ui';
import {APP_ENV} from '../../../config/env';
import {formatDay, parseServerDate} from '../../../lib/date';
import {signOut, useSession} from '../../../store/session';
import {useTheme, useThemePreference, type ThemePreference} from '../../../theme/ThemeProvider';
import {useCompanyProfile, useEmployeeDetails} from '../../home/queries';

type Row = {icon: LucideIcon; label: string; value?: string | null};

export function ProfileScreen() {
  const {colors, spacing} = useTheme();
  const role = useSession(s => s.role);
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <Screen
      scroll
      safeBottom={false}
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}>
      <Text variant="h1" style={{marginTop: spacing.lg, marginBottom: spacing.xl}}>
        Profile
      </Text>

      {role === 'company' ? <CompanyProfile /> : <EmployeeProfile />}

      <Text variant="overline" tone="muted" style={{marginTop: spacing.xxl, marginBottom: spacing.md}}>
        Appearance
      </Text>
      <AppearancePicker />

      <Card padded={false} style={{marginTop: spacing.xxl}}>
        <Pressable
          onPress={() => setConfirmOut(true)}
          accessibilityRole="button"
          style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg}}>
          <LogOut size={20} color={colors.danger} />
          <Text variant="title" tone="danger">
            Sign out
          </Text>
        </Pressable>
      </Card>

      <Text variant="caption" tone="subtle" align="center" style={{marginTop: spacing.xl}}>
        STAFO {DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()})
        {APP_ENV === 'staging' ? ' · staging' : ''}
      </Text>

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
    </Screen>
  );
}

function EmployeeProfile() {
  const {spacing} = useTheme();
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
      <Card style={{alignItems: 'center', paddingVertical: spacing.xxl}}>
        <Avatar name={d?.name ?? employee?.name} uri={details.data?.image_url} size={84} />
        <Text variant="h2" style={{marginTop: spacing.md}}>
          {d?.name ?? employee?.name}
        </Text>
        {d?.position || employee?.position ? (
          <Text variant="body" tone="muted">
            {d?.position ?? employee?.position}
          </Text>
        ) : null}
        {details.data?.company_name ? (
          <Badge
            label={details.data.company_name}
            tone="primary"
            style={{alignSelf: 'center', marginTop: spacing.md}}
          />
        ) : null}
      </Card>
      <InfoList rows={rows} />
    </>
  );
}

function CompanyProfile() {
  const {spacing} = useTheme();
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
    {icon: Hash, label: 'GST', value: company?.gst_number},
  ];

  return (
    <>
      <Card style={{alignItems: 'center', paddingVertical: spacing.xxl}}>
        <Avatar name={company?.company_name} uri={profile.data?.data?.company_logo} size={84} />
        <Text variant="h2" align="center" style={{marginTop: spacing.md}}>
          {company?.company_name}
        </Text>
        <Text variant="body" tone="muted">
          Company admin
        </Text>
      </Card>
      <InfoList rows={rows} />
    </>
  );
}

function InfoList({rows}: {rows: Row[]}) {
  const {colors, spacing} = useTheme();
  const visible = rows.filter(r => r.value);
  if (!visible.length) {
    return null;
  }
  return (
    <Card padded={false} style={{marginTop: spacing.lg}}>
      {visible.map((row, i) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.lg,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: colors.border,
          }}>
          <row.icon size={18} color={colors.textMuted} />
          <Text variant="body" tone="muted" style={{width: 110}}>
            {row.label}
          </Text>
          <Text variant="title" style={{flex: 1, textAlign: 'right'}} numberOfLines={1}>
            {row.value}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function AppearancePicker() {
  const {colors, spacing, radius} = useTheme();
  const {preference, setPreference} = useThemePreference();
  const options: {value: ThemePreference; label: string; icon: LucideIcon}[] = [
    {value: 'system', label: 'System', icon: Monitor},
    {value: 'light', label: 'Light', icon: Sun},
    {value: 'dark', label: 'Dark', icon: Moon},
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      accessibilityRole="radiogroup">
      {options.map(o => {
        const active = preference === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => setPreference(o.value)}
            accessibilityRole="radio"
            accessibilityState={{checked: active}}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              // Surface, not 'transparent', so Android keeps the corner radius when toggled.
              backgroundColor: active ? colors.primarySoft : colors.surface,
            }}>
            <o.icon size={16} color={active ? colors.primary : colors.textMuted} />
            <Text variant="label" tone={active ? 'primary' : 'muted'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
