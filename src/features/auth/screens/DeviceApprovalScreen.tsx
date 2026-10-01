import React, {useState} from 'react';
import {View} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import {CircleCheck, Clock3, LogIn, Send, Smartphone} from 'lucide-react-native';
import {requestDeviceChange} from '../../../api/endpoints/auth';
import {Button, Card, Screen, Text, toast} from '../../../components/ui';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';

/**
 * Shown when an employee verifies their OTP on a phone that isn't the one
 * registered to them. Their company admin must approve the new device.
 */
export function DeviceApprovalScreen() {
  const {colors, spacing, radius} = useTheme();
  const employee = useSession(s => s.pendingDeviceEmployee);
  const clear = useSession(s => s.clear);
  const [requested, setRequested] = useState(false);

  const request = useMutation({
    mutationFn: () => requestDeviceChange(employee!.id),
    onSuccess: res => {
      setRequested(true);
      toast.success(res.message || 'Request sent to your admin.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const steps = [
    {
      icon: Send,
      title: 'Send a request',
      body: 'We notify your company admin that you want to use this phone.',
      done: requested,
    },
    {
      icon: Clock3,
      title: 'Admin approves',
      body: 'Your admin approves it from Device requests in STAFO.',
      done: false,
    },
    {
      icon: LogIn,
      title: 'Sign in again',
      body: 'Once approved, sign in with your mobile number as usual.',
      done: false,
    },
  ];

  return (
    <Screen scroll contentStyle={{paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl}}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.xl,
          backgroundColor: requested ? colors.successSoft : colors.warningSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {requested ? (
          <CircleCheck size={34} color={colors.success} />
        ) : (
          <Smartphone size={34} color={colors.warning} />
        )}
      </View>

      <Text variant="h1" style={{marginTop: spacing.xl}}>
        {requested ? 'Request sent' : 'New device detected'}
      </Text>
      <Text variant="bodyRegular" tone="muted" style={{marginTop: spacing.sm, fontSize: 15, lineHeight: 23}}>
        {requested
          ? 'Your admin has been asked to approve this phone. Sign in again once they approve it.'
          : `Hi ${
              employee?.name?.split(' ')[0] ?? 'there'
            }, your STAFO account is linked to a different phone. To keep attendance secure, your admin needs to approve this one.`}
      </Text>

      <Card style={{marginTop: spacing.xxl, gap: spacing.lg}}>
        {steps.map((step, i) => (
          <View key={step.title} style={{flexDirection: 'row', gap: spacing.md}}>
            <View style={{alignItems: 'center'}}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: step.done ? colors.successSoft : colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {step.done ? (
                  <CircleCheck size={16} color={colors.success} />
                ) : (
                  <step.icon size={16} color={colors.primary} />
                )}
              </View>
              {i < steps.length - 1 && (
                <View
                  style={{width: 2, flex: 1, minHeight: 16, backgroundColor: colors.border, marginTop: 4}}
                />
              )}
            </View>
            <View style={{flex: 1, paddingBottom: i < steps.length - 1 ? spacing.sm : 0}}>
              <Text variant="title">{step.title}</Text>
              <Text variant="caption" tone="muted" style={{marginTop: 2}}>
                {step.body}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{flex: 1, minHeight: spacing.xxxl}} />
      <View style={{gap: spacing.md, paddingBottom: spacing.lg}}>
        {!requested && (
          <Button
            title="Request approval"
            icon={Send}
            loading={request.isPending}
            onPress={() => request.mutate()}
          />
        )}
        <Button
          title={requested ? 'Back to sign in' : 'Use a different account'}
          variant="ghost"
          onPress={clear}
        />
      </View>
    </Screen>
  );
}
