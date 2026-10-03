import React from 'react';
import {Share, View} from 'react-native';
import {Check, CircleAlert, CircleCheck, ScanFace, Share2} from 'lucide-react-native';
import {Button, Card, Screen, Text} from '../../components/ui';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {formatPhone} from './employeeForm';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.stafo.app';

export function EmployeeAddedScreen({navigation, route}: AppScreenProps<'EmployeeAdded'>) {
  const p = route.params;
  const {colors, spacing} = useTheme();
  const company = useSession(s => s.company);
  const first = p.name.split(' ')[0];

  const failed = [
    p.steps.branch === 'failed' ? 'branch' : null,
    p.steps.department === 'failed' ? 'department' : null,
    p.steps.mode === 'failed' ? 'attendance mode' : null,
    p.steps.position === 'failed' ? 'position' : null,
  ].filter(Boolean) as string[];
  const setUp = [
    p.branch,
    p.department,
    p.shift,
    p.mode === 'qr code' ? 'QR' : p.mode === 'geo' ? 'Geo' : 'Selfie',
  ]
    .filter(Boolean)
    .join(' · ');

  const share = () =>
    Share.share({
      message:
        `Hi ${first}, you've been added to ${company?.company_name ?? 'your company'} on STAFO.\n\n` +
        `1. Install STAFO: ${PLAY_STORE}\n` +
        `2. Sign in with your mobile number ${formatPhone(p.phone)} (you'll get an OTP).`,
    });

  return (
    <Screen scroll contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}>
      <View style={{alignItems: 'center', marginTop: spacing.huge}}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.successSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <CircleCheck size={40} color={colors.success} />
        </View>
        <Text variant="h1" align="center" style={{marginTop: spacing.lg}} accessibilityRole="header">
          {p.name} is added
        </Text>
        <Text variant="body" tone="muted" align="center">
          {[p.empId, p.branch].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <Card style={{marginTop: spacing.xl}}>
        <Text variant="overline" tone="muted">
          Next steps
        </Text>
        <Step
          first
          n={1}
          title={failed.length ? 'Mostly set up' : 'Branch, department, shift and mode set'}
          sub={failed.length ? `Couldn't set the ${failed.join(', ')}. Set it from their profile.` : setUp}
          state={failed.length ? 'failed' : 'done'}
        />
        {p.mode === 'selfie' ? (
          <Step
            n={2}
            title="Add a reference selfie"
            sub="Needed before they can punch in with a selfie"
            state="todo"
          />
        ) : null}
        <Step
          n={p.mode === 'selfie' ? 3 : 2}
          title="Tell them to sign in"
          sub={`With ${formatPhone(p.phone)} on the STAFO app`}
          state="todo"
        />
      </Card>

      <View style={{gap: spacing.sm, marginTop: spacing.xl}}>
        <Button title="Share sign-in details" icon={Share2} onPress={share} />
        {p.mode === 'selfie' ? (
          <Button
            title="Add reference selfie"
            icon={ScanFace}
            variant="ghost"
            onPress={() => navigation.replace('EmployeeDetail', {id: p.id, name: p.name, open: 'selfie'})}
          />
        ) : null}
        <View style={{flexDirection: 'row', gap: spacing.sm}}>
          <Button
            title="Add another"
            variant="ghost"
            size="md"
            style={{flex: 1}}
            onPress={() => navigation.replace('AddEmployee')}
          />
          <Button
            title="View profile"
            variant="ghost"
            size="md"
            style={{flex: 1}}
            onPress={() => navigation.replace('EmployeeDetail', {id: p.id, name: p.name})}
          />
        </View>
      </View>
    </Screen>
  );
}

function Step({
  n,
  title,
  sub,
  state,
  first,
}: {
  n: number;
  title: string;
  sub: string;
  state: 'done' | 'todo' | 'failed';
  first?: boolean;
}) {
  const {colors, spacing} = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor:
            state === 'done' ? colors.success : state === 'failed' ? colors.warningSoft : colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {state === 'done' ? (
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        ) : state === 'failed' ? (
          <CircleAlert size={16} color={colors.warning} />
        ) : (
          <Text variant="caption" tone="muted" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
            {n}
          </Text>
        )}
      </View>
      <View style={{flex: 1}}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" tone={state === 'failed' ? 'warning' : 'muted'}>
          {sub}
        </Text>
      </View>
    </View>
  );
}
