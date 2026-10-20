import React, {useEffect, useMemo, useState} from 'react';
import {Linking, Pressable, View} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import Animated, {
  ReduceMotion,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {ArrowLeft, ArrowRight, Check, ChevronDown, Search} from 'lucide-react-native';
import {getCompanyDetails} from '../../../api/endpoints/account';
import {
  getBusinessTypes,
  getCompanyTypes,
  registerCompany,
  type Option,
} from '../../../api/endpoints/register';
import {BottomSheet, Button, Card, IconButton, Screen, Text, TextField, toast} from '../../../components/ui';
import {haptics} from '../../../lib/haptics';
import type {AuthScreenProps} from '../../../navigation/types';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {businessErrors, detailsErrors} from '../registerLogic';

const PRIVACY_URL = 'https://stafo.in/privacy-policy';

/** Company sign-up in two short steps; the owner is signed in at the end, as in the old app. */
export function RegisterScreen({navigation, route}: AuthScreenProps<'Register'>) {
  const {colors, spacing} = useTheme();
  const [step, setStep] = useState<1 | 2>(1);
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const [f, setF] = useState({
    companyName: '',
    companyTypeId: null as number | null,
    businessTypeId: null as number | null,
    email: '',
    ownerName: '',
    mobile: route.params?.mobile ?? '',
    referralCode: '',
  });
  const [picker, setPicker] = useState<'company' | 'business' | null>(null);
  const companyTypes = useQuery({queryKey: ['company-types'], queryFn: getCompanyTypes, staleTime: Infinity});
  const businessTypes = useQuery({
    queryKey: ['business-types'],
    queryFn: getBusinessTypes,
    staleTime: Infinity,
  });

  const step1 = businessErrors(f);
  const step2 = detailsErrors(f);
  const err = (n: number, errors: Record<string, string>, k: string) => (tried[n] ? errors[k] ?? null : null);
  const set = (k: keyof typeof f) => (v: string) => setF(p => ({...p, [k]: v}));

  // The bar fills to the current step.
  const progress = useSharedValue(0.5);
  useEffect(() => {
    progress.value = withTiming(step / 2, {duration: 350, reduceMotion: ReduceMotion.System});
  }, [step, progress]);
  const barStyle = useAnimatedStyle(() => ({width: `${progress.value * 100}%`}));

  const register = useMutation({
    mutationFn: registerCompany,
    onSuccess: async ({token, company}) => {
      haptics.success();
      useSession.getState().signInCompany(token, company, {welcome: true});
      // Some responses leave out the company id, which most screens need.
      if (company.id == null) {
        try {
          const p = await getCompanyDetails();
          useSession.setState(s => ({
            company: s.company ? {...s.company, id: p.company.id} : s.company,
            companyId: String(p.company.id),
          }));
        } catch {
          // The dashboard fills it in on its first load.
        }
      }
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });

  const next = () => {
    setTried(t => ({...t, 1: true}));
    if (Object.keys(step1).length) {
      haptics.error();
      return;
    }
    haptics.tap();
    setStep(2);
  };

  const submit = () => {
    setTried(t => ({...t, 2: true}));
    if (Object.keys(step2).length) {
      haptics.error();
      return;
    }
    register.mutate({
      companyName: f.companyName,
      companyTypeId: f.companyTypeId!,
      businessTypeId: f.businessTypeId!,
      email: f.email,
      ownerName: f.ownerName,
      mobile: f.mobile,
      referralCode: f.referralCode,
    });
  };

  const back = () => (step === 2 ? setStep(1) : navigation.goBack());
  const nameOf = (list: Option[] | undefined, id: number | null) => list?.find(o => o.id === id)?.name;

  return (
    <Screen keyboard scroll contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm}}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={back} />
        <View style={{flex: 1}}>
          <Text variant="h2">Register your company</Text>
          <Text variant="caption" tone="muted">
            Step {step} of 2 · {step === 1 ? 'Your business' : 'Your details'}
          </Text>
        </View>
      </View>
      <View
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.border,
          marginTop: spacing.lg,
          overflow: 'hidden',
        }}>
        <Animated.View style={[{height: 5, borderRadius: 3, backgroundColor: colors.primary}, barStyle]} />
      </View>

      {step === 1 ? (
        <Animated.View
          key="step1"
          entering={SlideInLeft.duration(280).reduceMotion(ReduceMotion.System)}
          style={{marginTop: spacing.xl, gap: spacing.lg}}>
          <Card style={{gap: spacing.lg}}>
            <TextField
              label="Company name"
              value={f.companyName}
              onChangeText={set('companyName')}
              placeholder="e.g. Sharma Textiles"
              autoCapitalize="words"
              error={err(1, step1, 'companyName')}
            />
            <SelectField
              label="Company type"
              value={nameOf(companyTypes.data, f.companyTypeId)}
              loading={companyTypes.isPending}
              error={err(1, step1, 'companyTypeId')}
              onPress={() => setPicker('company')}
            />
            <SelectField
              label="Business type"
              value={nameOf(businessTypes.data, f.businessTypeId)}
              loading={businessTypes.isPending}
              error={err(1, step1, 'businessTypeId')}
              onPress={() => setPicker('business')}
            />
            <TextField
              label="Company email"
              value={f.email}
              onChangeText={set('email')}
              placeholder="accounts@yourcompany.in"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              hint="Invoices and receipts go here."
              error={err(1, step1, 'email')}
            />
          </Card>
          <Button title="Continue" iconRight={ArrowRight} onPress={next} />
        </Animated.View>
      ) : (
        <Animated.View
          key="step2"
          entering={SlideInRight.duration(280).reduceMotion(ReduceMotion.System)}
          style={{marginTop: spacing.xl, gap: spacing.lg}}>
          <Card style={{gap: spacing.lg}}>
            <TextField
              label="Your name"
              value={f.ownerName}
              onChangeText={set('ownerName')}
              placeholder="e.g. Rakesh Sharma"
              autoCapitalize="words"
              autoComplete="name"
              error={err(2, step2, 'ownerName')}
            />
            <TextField
              label="Mobile number"
              prefix="+91"
              value={f.mobile}
              onChangeText={t => set('mobile')(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
              hint="You’ll sign in with this number."
              error={err(2, step2, 'mobile')}
            />
            <TextField
              label="Referral code (optional)"
              value={f.referralCode}
              onChangeText={set('referralCode')}
              placeholder="If someone invited you"
              autoCapitalize="characters"
            />
          </Card>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} accessibilityRole="link">
            <Text variant="caption" tone="muted" align="center">
              By registering you agree to STAFO’s{' '}
              <Text variant="caption" tone="primary">
                privacy policy
              </Text>
              .
            </Text>
          </Pressable>
          <Button title="Create company account" icon={Check} loading={register.isPending} onPress={submit} />
        </Animated.View>
      )}

      <OptionSheet
        title={picker === 'business' ? 'Business type' : 'Company type'}
        visible={picker != null}
        options={(picker === 'business' ? businessTypes.data : companyTypes.data) ?? []}
        selected={picker === 'business' ? f.businessTypeId : f.companyTypeId}
        onClose={() => setPicker(null)}
        onSelect={id => {
          haptics.select();
          setF(p => (picker === 'business' ? {...p, businessTypeId: id} : {...p, companyTypeId: id}));
          setPicker(null);
        }}
      />
    </Screen>
  );
}

export function SelectField({
  label,
  value,
  loading,
  error,
  onPress,
}: {
  label: string;
  value?: string;
  loading?: boolean;
  error?: string | null;
  onPress: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  return (
    <View>
      <Text variant="label" style={{marginBottom: spacing.sm}}>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? 'not chosen'}`}
        style={{
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.borderStrong,
          backgroundColor: colors.surface,
        }}>
        <Text variant="bodyRegular" tone={value ? undefined : 'subtle'} style={{flex: 1}} numberOfLines={1}>
          {loading ? 'Loading…' : value ?? 'Choose one'}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger" style={{marginTop: spacing.xs}}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Searchable single-choice list in a bottom sheet. */
export function OptionSheet({
  title,
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  visible: boolean;
  options: Option[];
  selected: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const {colors, spacing} = useTheme();
  const [q, setQ] = useState('');
  useEffect(() => {
    if (visible) {
      setQ('');
    }
  }, [visible]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter(o => o.name.toLowerCase().includes(t)) : options;
  }, [options, q]);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={{gap: spacing.sm}}>
        {options.length > 8 ? (
          <TextField icon={Search} placeholder="Search" value={q} onChangeText={setQ} />
        ) : null}
        <View>
          {shown.map((o, i) => {
            const on = o.id === selected;
            return (
              <Pressable
                key={o.id}
                onPress={() => onSelect(o.id)}
                accessibilityRole="radio"
                accessibilityState={{checked: on}}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <Text variant="title" tone={on ? 'primary' : undefined} style={{flex: 1}}>
                  {o.name}
                </Text>
                {on ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
          {!shown.length ? (
            <Text variant="body" tone="muted" style={{paddingVertical: spacing.lg}}>
              Nothing matches “{q}”.
            </Text>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}
