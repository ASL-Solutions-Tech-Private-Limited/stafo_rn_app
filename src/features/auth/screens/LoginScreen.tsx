import React, {useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowRight, Building2, Phone, ShieldCheck, UserRoundSearch} from 'lucide-react-native';
import {sendOtp} from '../../../api/endpoints/auth';
import {BottomSheet, Button, Gradient, Screen, Text, TextField, toast} from '../../../components/ui';
import {askPushPermission} from '../../../lib/push';
import type {AuthScreenProps} from '../../../navigation/types';
import {useTheme} from '../../../theme/ThemeProvider';

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function LoginScreen({navigation, route}: AuthScreenProps<'Login'>) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const [mobile, setMobile] = useState(route.params?.mobile ?? '');
  const [touched, setTouched] = useState(false);
  const [noAccountSheet, setNoAccountSheet] = useState(false);

  const valid = MOBILE_PATTERN.test(mobile);

  // Ask for notifications here, once: the push token is sent when they sign in.
  useEffect(() => {
    askPushPermission().catch(() => {});
  }, []);

  const otp = useMutation({
    mutationFn: sendOtp,
    onSuccess: res => {
      navigation.navigate('Otp', {mobile, devOtp: __DEV__ ? res.otp : undefined});
    },
    onError: (error: Error) => {
      if (/not found/i.test(error.message)) {
        setNoAccountSheet(true);
      } else {
        toast.error(error.message);
      }
    },
  });

  const submit = () => {
    setTouched(true);
    if (valid && !otp.isPending) {
      otp.mutate(mobile);
    }
  };

  return (
    <Screen keyboard scroll safeTop={false} statusBar="light">
      <Gradient
        from={colors.heroFrom}
        to={colors.heroTo}
        decorated
        style={{
          paddingTop: insets.top + spacing.xxl,
          paddingHorizontal: spacing.xxl,
          paddingBottom: spacing.huge + spacing.xxl,
        }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="h2" tone="inverse">
            S
          </Text>
        </View>
        <Text variant="display" tone="inverse" style={{marginTop: spacing.xxl}}>
          Welcome to STAFO
        </Text>
        <Text
          variant="bodyRegular"
          color="rgba(255,255,255,0.8)"
          style={{marginTop: spacing.sm, fontSize: 15}}>
          Sign in with the mobile number registered with your company.
        </Text>
      </Gradient>

      <View
        style={{
          flex: 1,
          marginTop: -spacing.xxl,
          backgroundColor: colors.background,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          paddingHorizontal: spacing.xxl,
          paddingTop: spacing.xxxl,
        }}>
        <TextField
          label="Mobile number"
          prefix="+91"
          value={mobile}
          onChangeText={t => setMobile(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="98765 43210"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={submit}
          error={touched && mobile.length > 0 && !valid ? 'Enter a valid 10-digit mobile number' : null}
        />

        <Button
          title="Send OTP"
          iconRight={ArrowRight}
          onPress={submit}
          disabled={!valid}
          loading={otp.isPending}
          style={{marginTop: spacing.xl}}
        />

        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl}}>
          <ShieldCheck size={16} color={colors.success} />
          <Text variant="caption" tone="muted" style={{flex: 1}}>
            We'll text you a 6-digit code. Your account is tied to this phone for security.
          </Text>
        </View>

        <View style={{flex: 1, minHeight: spacing.huge}} />

        <Pressable
          onPress={() => navigation.navigate('Register', valid ? {mobile} : undefined)}
          accessibilityRole="button"
          style={{flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.xl}}>
          <Text variant="body" tone="muted">
            New to STAFO?{' '}
          </Text>
          <Text variant="body" tone="primary" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
            Register your company
          </Text>
        </Pressable>
      </View>

      <BottomSheet
        visible={noAccountSheet}
        onClose={() => setNoAccountSheet(false)}
        title="No account found"
        subtitle={`+91 ${mobile} isn't registered with any company on STAFO yet.`}>
        <View style={{gap: spacing.md}}>
          <InfoRow
            icon={UserRoundSearch}
            title="Are you an employee?"
            body="Ask your HR or admin to add this number to your company's STAFO account, then try again."
          />
          <InfoRow
            icon={Building2}
            title="Own a business?"
            body="Register it with this number to manage attendance, leave and payroll."
          />
          <Button
            title="Register my company"
            icon={Building2}
            onPress={() => {
              setNoAccountSheet(false);
              navigation.navigate('Register', {mobile});
            }}
            style={{marginTop: spacing.sm}}
          />
          <Button
            title="Try a different number"
            variant="secondary"
            icon={Phone}
            onPress={() => setNoAccountSheet(false)}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function InfoRow({icon: Icon, title, body}: {icon: typeof Phone; title: string; body: string}) {
  const {colors, spacing, radius} = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      <Icon size={20} color={colors.primary} />
      <View style={{flex: 1}}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" tone="muted" style={{marginTop: 2}}>
          {body}
        </Text>
      </View>
    </View>
  );
}
