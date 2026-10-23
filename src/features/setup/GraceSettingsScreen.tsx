import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {CalendarClock, Check, Clock3, IndianRupee} from 'lucide-react-native';
import {updateGraceSettings} from '../../api/endpoints/setup';
import {Button, Card, Text, TextField, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {SetupScreen} from './parts';
import {graceErrors} from './setupLogic';
import {graceKey, useGraceSettings} from './useGrace';

/** The company's grace rule for late punch-ins, and the overtime charge. */
export function GraceSettingsScreen({navigation}: AppScreenProps<'SetupGrace'>) {
  const {colors, spacing} = useTheme();
  const companyId = useSession(s => s.companyId);
  const queryClient = useQueryClient();
  const q = useGraceSettings();
  const [f, setF] = useState({minutes: '', days: '', overtime: ''});
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (q.data && !loaded) {
      setF({
        minutes: String(q.data.graceMinutes),
        days: String(q.data.graceDays),
        overtime: q.data.overtimeCharges ?? '',
      });
      setLoaded(true);
    }
  }, [q.data, loaded]);

  const errors = graceErrors(f);
  const err = (k: keyof typeof errors) => (tried ? errors[k] ?? null : null);
  const minutes = Number(f.minutes) || 0;
  const days = Number(f.days) || 0;

  const save = useMutation({
    mutationFn: () =>
      updateGraceSettings(companyId ?? '', {
        graceMinutes: minutes,
        graceDays: days,
        overtimeCharges: f.overtime,
      }),
    onSuccess: () => {
      haptics.success();
      toast.success('Grace settings saved');
      queryClient.invalidateQueries({queryKey: graceKey});
      navigation.goBack();
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });

  return (
    <SetupScreen title="Grace & overtime" subtitle="When a punch-in counts as late" query={q}>
      <Card style={{gap: spacing.lg}}>
        <TextField
          label="Grace time (minutes)"
          icon={Clock3}
          value={f.minutes}
          onChangeText={t => setF(p => ({...p, minutes: t.replace(/\D/g, '').slice(0, 3)}))}
          keyboardType="number-pad"
          hint="How long after the shift starts a punch-in still isn’t late."
          error={err('minutes')}
        />
        <TextField
          label="Grace days (per month)"
          icon={CalendarClock}
          value={f.days}
          onChangeText={t => setF(p => ({...p, days: t.replace(/\D/g, '').slice(0, 2)}))}
          keyboardType="number-pad"
          hint="On how many days a month that grace can be used."
          error={err('days')}
        />
        <TextField
          label="Overtime charges"
          icon={IndianRupee}
          value={f.overtime}
          onChangeText={t => setF(p => ({...p, overtime: t.replace(/[^\d.]/g, '')}))}
          keyboardType="decimal-pad"
          placeholder="e.g. 300"
          error={err('overtime')}
        />
      </Card>

      {!errors.minutes && !errors.days ? (
        <Card style={{gap: spacing.sm, backgroundColor: colors.primarySoft, borderColor: 'transparent'}}>
          <Text variant="title">How it works</Text>
          <Text variant="body" tone="muted">
            {minutes === 0
              ? 'No grace: any punch-in after the shift starts is late.'
              : days === 0
              ? `No grace days: any punch-in after the shift starts is late.`
              : `Shift at 10:00 AM: in by ${clock(10 * 60 + minutes)} on up to ${days} day${
                  days === 1 ? '' : 's'
                } a month is fine. The ${ordinal(days + 1)} such day, or any day after ${clock(
                  10 * 60 + minutes,
                )}, is marked Late.`}
          </Text>
        </Card>
      ) : null}

      <View style={{gap: spacing.sm}}>
        <Button
          title="Save"
          icon={Check}
          loading={save.isPending}
          disabled={!loaded}
          onPress={() => {
            setTried(true);
            if (Object.keys(errors).length) {
              haptics.error();
              return;
            }
            save.mutate();
          }}
        />
        <Text variant="caption" tone="muted" align="center">
          Applies to every employee’s attendance from now on.
        </Text>
      </View>
    </SetupScreen>
  );
}

function clock(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
