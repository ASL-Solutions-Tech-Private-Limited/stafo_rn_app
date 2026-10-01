import React, {useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import {ArrowLeft, MessageSquareText} from 'lucide-react-native';
import {sendOtp, verifyOtp} from '../../../api/endpoints/auth';
import {Button, IconButton, OtpInput, Screen, Text, toast} from '../../../components/ui';
import {getDeviceIdentity} from '../../../lib/device';
import type {AuthScreenProps} from '../../../navigation/types';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

export function OtpScreen({navigation, route}: AuthScreenProps<'Otp'>) {
  const {mobile} = route.params;
  const {colors, spacing, radius} = useTheme();
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState(route.params.devOtp);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const {signInCompany, signInEmployee, setPendingDevice} = useSession();

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const verify = useMutation({
    mutationFn: async (otp: string) => {
      const device = await getDeviceIdentity();
      return verifyOtp({
        mobile_number: mobile,
        otp,
        device_id: device.deviceId,
        firebase_token: '',
        device_name: device.deviceName,
        android_version: device.osVersion,
      });
    },
    onSuccess: res => {
      const data = res.data;
      if (data?.company) {
        signInCompany(data.token, data.company);
      } else if (data?.employee) {
        if (data.device_change === 'yes') {
          setPendingDevice(data.employee);
        } else {
          signInEmployee(data.token, data.employee);
        }
      } else {
        toast.info('No STAFO account is linked to this number yet.');
        navigation.navigate('Login', {mobile});
      }
    },
    onError: (e: Error) => {
      setError(e.message);
      setCode('');
    },
  });

  const resend = useMutation({
    mutationFn: () => sendOtp(mobile),
    onSuccess: res => {
      setSecondsLeft(RESEND_SECONDS);
      setError(null);
      setCode('');
      if (__DEV__) {
        setDevOtp(res.otp);
      }
      toast.success('A new code is on its way.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (value = code) => {
    if (value.length === OTP_LENGTH && !verify.isPending) {
      setError(null);
      verify.mutate(value);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <Screen keyboard scroll contentStyle={{paddingHorizontal: spacing.xxl}}>
      <View style={{height: 56, justifyContent: 'center'}}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
      </View>

      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.xl,
        }}>
        <MessageSquareText size={26} color={colors.primary} />
      </View>

      <Text variant="h1" style={{marginTop: spacing.xl}}>
        Verify your number
      </Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm}}>
        <Text variant="bodyRegular" tone="muted">
          Enter the 6-digit code sent to{' '}
        </Text>
        <Text variant="title">+91 {mobile.replace(/(\d{5})(\d{5})/, '$1 $2')}</Text>
        <Pressable onPress={() => navigation.navigate('Login', {mobile})} hitSlop={8}>
          <Text variant="title" tone="primary">
            {'  '}Edit
          </Text>
        </Pressable>
      </View>

      <View style={{marginTop: spacing.xxxl}}>
        <OtpInput
          length={OTP_LENGTH}
          value={code}
          onChange={v => {
            setCode(v);
            if (error) {
              setError(null);
            }
          }}
          onComplete={submit}
          error={!!error}
        />
        {error ? (
          <Text variant="caption" tone="danger" style={{marginTop: spacing.sm}}>
            {error}
          </Text>
        ) : null}
      </View>

      {__DEV__ && devOtp ? (
        <Pressable
          onPress={() => setCode(devOtp)}
          style={{
            alignSelf: 'flex-start',
            marginTop: spacing.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.warningSoft,
          }}>
          <Text variant="caption" tone="warning">
            DEV · tap to fill {devOtp}
          </Text>
        </Pressable>
      ) : null}

      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: spacing.xxl}}>
        <Text variant="body" tone="muted">
          Didn't get it?{' '}
        </Text>
        {secondsLeft > 0 ? (
          <Text variant="body" tone="subtle">
            Resend in {mm}:{ss}
          </Text>
        ) : (
          <Pressable onPress={() => resend.mutate()} disabled={resend.isPending} hitSlop={8}>
            <Text variant="title" tone="primary">
              {resend.isPending ? 'Sending…' : 'Resend code'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{flex: 1, minHeight: spacing.xxxl}} />
      <Button
        title="Verify and continue"
        onPress={() => submit()}
        disabled={code.length !== OTP_LENGTH}
        loading={verify.isPending}
        style={{marginBottom: spacing.lg}}
      />
    </Screen>
  );
}
