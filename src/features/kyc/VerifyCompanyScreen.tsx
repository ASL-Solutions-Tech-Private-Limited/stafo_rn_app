import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import Animated, {ReduceMotion, useAnimatedProps, useSharedValue, withTiming} from 'react-native-reanimated';
import Svg, {Circle} from 'react-native-svg';
import {Check, FileText, Hash, IdCard, Lock, UserRound, type LucideIcon} from 'lucide-react-native';
import {getKycStatus, verifyDocument, type KycType} from '../../api/endpoints/register';
import {Badge, BottomSheet, Button, Card, OtpInput, Text, TextField, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {cleanKyc, kycError, maskAadhaar} from '../auth/registerLogic';
import {IconWell, SetupScreen} from '../setup/parts';

const DOCS: {type: KycType; title: string; hint: string; icon: LucideIcon; placeholder: string}[] = [
  {type: 'pan', title: 'PAN', hint: 'Company or owner PAN', icon: IdCard, placeholder: 'ABCDE1234F'},
  {
    type: 'gstin',
    title: 'GSTIN',
    hint: '15-character GST number',
    icon: FileText,
    placeholder: '19ABCDE1234F1Z5',
  },
  {
    type: 'company',
    title: 'Registration number',
    hint: 'CIN or LLPIN',
    icon: Hash,
    placeholder: 'U72900WB2020PTC123456',
  },
  {
    type: 'aadhar',
    title: 'Owner’s Aadhaar',
    hint: 'OTP to the linked mobile',
    icon: UserRound,
    placeholder: '1234 5678 9012',
  },
];

const RESEND_SECONDS = 60;

/** Company KYC, as on the old app: each document is checked with the verification service. */
export function VerifyCompanyScreen(_: AppScreenProps<'VerifyCompany'>) {
  const {colors, spacing} = useTheme();
  const status = useQuery({queryKey: ['kyc-status'], queryFn: getKycStatus});
  const [open, setOpen] = useState<KycType | null>(null);
  const done = DOCS.filter(d => status.data?.[d.type]).length;

  return (
    <SetupScreen title="Verify company" subtitle="Needed to add employees and unlock modules" query={status}>
      <Card style={{flexDirection: 'row', alignItems: 'center', gap: spacing.lg}}>
        <ProgressRing value={done / DOCS.length} label={`${done}/${DOCS.length}`} />
        <View style={{flex: 1}}>
          <Text variant="title">
            {done === DOCS.length ? 'All documents verified' : `${done} of ${DOCS.length} verified`}
          </Text>
          <Text variant="caption" tone="muted">
            {status.data?.verified
              ? 'Your company is verified. Add the rest any time.'
              : 'Checked instantly with government records.'}
          </Text>
        </View>
      </Card>

      <Card padded={false}>
        {DOCS.map((d, i) => {
          const ok = !!status.data?.[d.type];
          return (
            <View
              key={d.type}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}>
              <IconWell
                icon={ok ? Check : d.icon}
                fg={ok ? colors.success : colors.primary}
                bg={ok ? colors.successSoft : colors.primarySoft}
              />
              <View style={{flex: 1}}>
                <Text variant="title">{d.title}</Text>
                <Text variant="caption" tone="muted">
                  {d.hint}
                </Text>
              </View>
              {ok ? (
                <Badge label="Verified" tone="success" dot />
              ) : (
                <Button
                  title="Verify"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    haptics.tap();
                    setOpen(d.type);
                  }}
                />
              )}
            </View>
          );
        })}
      </Card>

      <View style={{flexDirection: 'row', gap: spacing.sm, alignItems: 'center'}}>
        <Lock size={14} color={colors.textMuted} />
        <Text variant="caption" tone="muted" style={{flex: 1}}>
          Numbers are sent only to the verification service.
        </Text>
      </View>

      <VerifySheet type={open} onClose={() => setOpen(null)} />
    </SetupScreen>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ProgressRing({value, label}: {value: number; label: string}) {
  const {colors} = useTheme();
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(value, {duration: 700, reduceMotion: ReduceMotion.System});
  }, [value, v]);
  const props = useAnimatedProps(() => ({strokeDashoffset: c * (1 - v.value)}));
  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <Svg width={size} height={size} style={{position: 'absolute', transform: [{rotate: '-90deg'}]}}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.success}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={props}
        />
      </Svg>
      <Text variant="title">{label}</Text>
    </View>
  );
}

function VerifySheet({type, onClose}: {type: KycType | null; onClose: () => void}) {
  const {spacing} = useTheme();
  const queryClient = useQueryClient();
  const companyId = useSession(s => s.companyId ?? (s.company?.id != null ? String(s.company.id) : ''));
  const [number, setNumber] = useState('');
  const [tried, setTried] = useState(false);
  // Aadhaar only: set once the OTP has been sent.
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [left, setLeft] = useState(0);
  const doc = DOCS.find(d => d.type === type);

  useEffect(() => {
    if (type) {
      setNumber('');
      setTried(false);
      setRequestId(null);
      setOtp('');
    }
  }, [type]);

  useEffect(() => {
    if (left <= 0) {
      return;
    }
    const t = setTimeout(() => setLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verified = () => {
    haptics.success();
    toast.success(`${doc?.title ?? 'Document'} verified`);
    queryClient.invalidateQueries({queryKey: ['kyc-status']});
    queryClient.invalidateQueries({queryKey: ['company-dashboard']});
    onClose();
  };
  const failed = (e: Error) => {
    haptics.error();
    toast.error(e.message);
  };

  const send = useMutation({
    mutationFn: () => verifyDocument({companyId, type: type!, number: cleanKyc(type!, number)}),
    onSuccess: r => {
      if (type === 'aadhar') {
        if (!r.requestId) {
          failed(new Error('Couldn’t send the Aadhaar OTP. Please try again.'));
          return;
        }
        haptics.success();
        toast.success('OTP sent to the mobile linked with Aadhaar');
        setRequestId(r.requestId);
        setLeft(RESEND_SECONDS);
      } else {
        verified();
      }
    },
    onError: failed,
  });

  const confirm = useMutation({
    mutationFn: (code: string) =>
      verifyDocument({
        companyId,
        type: 'aadhar-otp',
        number: cleanKyc('aadhar', number),
        otp: code,
        requestId: requestId ?? undefined,
      }),
    onSuccess: verified,
    onError: failed,
  });

  const error = type ? kycError(type, number) : null;
  const busy = send.isPending || confirm.isPending;

  return (
    <BottomSheet
      visible={type != null}
      onClose={() => !busy && onClose()}
      title={doc ? `Verify ${doc.title === 'Owner’s Aadhaar' ? 'owner’s Aadhaar' : doc.title}` : ''}>
      {doc ? (
        <View style={{gap: spacing.lg}}>
          {requestId ? (
            <>
              <View>
                <Text variant="label">Aadhaar number</Text>
                <Text variant="title" style={{marginTop: spacing.xs}}>
                  {maskAadhaar(number)}
                </Text>
              </View>
              <View style={{gap: spacing.sm}}>
                <Text variant="label">OTP from UIDAI</Text>
                <OtpInput value={otp} onChange={setOtp} onComplete={code => confirm.mutate(code)} autoFocus />
              </View>
              <Button
                title={left > 0 ? `Resend in 0:${String(left).padStart(2, '0')}` : 'Resend OTP'}
                variant="ghost"
                size="sm"
                disabled={left > 0 || busy}
                onPress={() => send.mutate()}
              />
              <Button
                title="Verify"
                icon={Check}
                loading={confirm.isPending}
                disabled={otp.length < 6}
                onPress={() => confirm.mutate(otp)}
              />
            </>
          ) : (
            <>
              <TextField
                label={doc.type === 'aadhar' ? 'Aadhaar number' : `${doc.title}`}
                value={number}
                onChangeText={t =>
                  setNumber(doc.type === 'aadhar' ? t.replace(/\D/g, '').slice(0, 12) : t.toUpperCase())
                }
                placeholder={doc.placeholder}
                keyboardType={doc.type === 'aadhar' ? 'number-pad' : 'default'}
                autoCapitalize="characters"
                autoCorrect={false}
                error={tried ? error : null}
              />
              <Button
                title={doc.type === 'aadhar' ? 'Send OTP' : 'Verify'}
                icon={Check}
                loading={send.isPending}
                onPress={() => {
                  setTried(true);
                  if (error) {
                    haptics.error();
                    return;
                  }
                  send.mutate();
                }}
              />
            </>
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}
