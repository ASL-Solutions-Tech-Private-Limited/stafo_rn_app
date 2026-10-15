import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {ReduceMotion, ZoomIn} from 'react-native-reanimated';
import {Check, ChevronRight, MapPin, ShieldCheck, UserPlus, type LucideIcon} from 'lucide-react-native';
import {Button, Card, PressableScale, Reveal, Screen, Text} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps, AppStackParamList} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {IconWell} from '../setup/parts';

type Step = {
  icon: LucideIcon;
  title: string;
  hint: string;
  to: keyof AppStackParamList;
  tint: 'warning' | 'primary' | 'success';
};

const STEPS: Step[] = [
  {
    icon: ShieldCheck,
    title: 'Verify your company',
    hint: 'PAN, GSTIN and Aadhaar',
    to: 'VerifyCompany',
    tint: 'warning',
  },
  {
    icon: MapPin,
    title: 'Add your office',
    hint: 'Where your team punches in',
    to: 'SetupBranches',
    tint: 'primary',
  },
  {
    icon: UserPlus,
    title: 'Add your first employee',
    hint: 'They sign in with their mobile',
    to: 'AddEmployee',
    tint: 'success',
  },
];

/** Shown once, right after a company registers. */
export function WelcomeScreen({navigation}: AppScreenProps<'Welcome'>) {
  const {colors, spacing} = useTheme();
  const name = useSession(s => s.company?.company_name);

  useEffect(() => {
    haptics.success();
    useSession.getState().dismissWelcome();
  }, []);

  // Home always sits underneath, so Back from any step lands on the dashboard.
  const open = (to?: keyof AppStackParamList) =>
    navigation.reset({
      index: to ? 1 : 0,
      routes: to ? [{name: 'CompanyTabs'}, {name: to as never}] : [{name: 'CompanyTabs'}],
    });

  return (
    <Screen
      scroll
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, justifyContent: 'center'}}>
      <View style={{alignItems: 'center', marginTop: spacing.xxxl}}>
        <Animated.View
          entering={ZoomIn.springify().damping(11).reduceMotion(ReduceMotion.System)}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.successSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Check size={34} color="#FFFFFF" strokeWidth={3} />
          </View>
        </Animated.View>
        <Reveal index={2} style={{alignItems: 'center'}}>
          <Text variant="h1" align="center" style={{marginTop: spacing.xl}}>
            {name ? `${name} is on STAFO` : 'You’re on STAFO'}
          </Text>
          <Text variant="body" tone="muted" align="center" style={{marginTop: spacing.sm}}>
            Three things to do next. You can do them any time from Home.
          </Text>
        </Reveal>
      </View>

      <Card padded={false} style={{marginTop: spacing.xxl}}>
        {STEPS.map((s, i) => {
          const tint = {
            warning: {fg: colors.warning, bg: colors.warningSoft},
            primary: {fg: colors.primary, bg: colors.primarySoft},
            success: {fg: colors.success, bg: colors.successSoft},
          }[s.tint];
          return (
            <Reveal key={s.to} index={3 + i}>
              <PressableScale
                onPress={() => {
                  haptics.tap();
                  open(s.to);
                }}
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
                <IconWell icon={s.icon} fg={tint.fg} bg={tint.bg} />
                <View style={{flex: 1}}>
                  <Text variant="title">{s.title}</Text>
                  <Text variant="caption" tone="muted">
                    {s.hint}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textSubtle} />
              </PressableScale>
            </Reveal>
          );
        })}
      </Card>

      <Reveal index={6}>
        <Button title="Go to dashboard" style={{marginTop: spacing.xl}} onPress={() => open()} />
      </Reveal>
    </Screen>
  );
}
