import React, {useMemo} from 'react';
import {Linking, View} from 'react-native';
import {Check, Crown, FileDown, Mail, Phone, Sparkles} from 'lucide-react-native';
import {Badge, Button, Card, Gradient, Skeleton, Text, toast} from '../../components/ui';
import {formatDay, parseServerDate} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {useStaffById} from '../expenses/queries';
import {usePlans, useSubscription} from '../performance/queries';
import {SetupScreen} from '../setup/parts';
import {formatRupees} from '../trips/tripLogic';
import {durationLabel, employeeLimit, featureLines, planProgress, planState} from './subscriptionLogic';

/** From stafo.in: who to talk to about plans. */
export const SALES = {phone: '+918389039361', phoneLabel: '+91 83890 39361', email: 'sales@stafo.in'};

export const openUrl = (url: string, what: string) =>
  Linking.openURL(url).catch(() => toast.error(`Couldn’t open ${what}.`));

const dayWithYear = (v?: string | null) => {
  const d = parseServerDate(v);
  return d ? `${formatDay(d)} ${d.getFullYear()}` : '—';
};

/** The company's plan at a glance: days left, usage, what's included, and renewing. */
export function SubscriptionScreen({navigation}: AppScreenProps<'Subscription'>) {
  const {colors, spacing, radius} = useTheme();
  const companyName = useSession(s => s.company?.company_name);
  const sub = useSubscription();
  const plans = usePlans();
  const staff = useStaffById();
  const current = sub.data?.subscription ?? null;
  const plan = plans.data?.find(p => p.id === current?.package_id) ?? null;
  const name = current?.package?.package_name ?? plan?.package_name ?? 'Your plan';
  const state = planState(current);
  const progress = planProgress(current);
  const limit = employeeLimit(plan);
  const people = [...staff.values()].filter(e => (e.status ?? '1') === '1').length;
  const included = useMemo(() => featureLines(plan?.features).filter(f => f.included), [plan]);

  const tone =
    state.kind === 'expired' ? colors.danger : state.kind === 'ending' ? colors.warning : '#32D583';
  const heading =
    state.kind === 'none'
      ? 'No plan yet'
      : state.kind === 'expired'
      ? 'Plan ended'
      : `${progress?.daysLeft ?? 0} ${progress?.daysLeft === 1 ? 'day' : 'days'}`;
  const sub2 =
    state.kind === 'none'
      ? 'Pick a plan to start.'
      : state.kind === 'expired'
      ? `Ended on ${dayWithYear(current?.subscription_end)}`
      : `left · ends on ${dayWithYear(current?.subscription_end)}`;

  return (
    <SetupScreen title="Subscription" subtitle={current?.company_name ?? companyName ?? null} query={sub}>
      <View style={{gap: spacing.md}}>
        <Gradient
          from="#1E2433"
          to={state.kind === 'expired' ? '#4A1D1D' : state.kind === 'ending' ? '#4B3A12' : '#3A3420'}
          decorated
          style={{borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Crown size={16} color="#FDB022" />
              <Text variant="overline" color="rgba(255,255,255,0.9)">
                {state.kind === 'none' ? 'STAFO' : name.toUpperCase()}
              </Text>
            </View>
            {state.kind !== 'none' ? (
              <View style={{backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill}}>
                <Badge
                  label={
                    state.kind === 'expired' ? 'Expired' : state.kind === 'ending' ? 'Ending soon' : 'Active'
                  }
                  tone={state.kind === 'expired' ? 'danger' : state.kind === 'ending' ? 'warning' : 'success'}
                  dot
                />
              </View>
            ) : null}
          </View>
          <View>
            <Text variant="display" color="#FFFFFF">
              {heading}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.8)">
              {sub2}
            </Text>
          </View>
          {progress && state.kind !== 'expired' ? (
            <View
              style={{
                height: 7,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.18)',
                overflow: 'hidden',
              }}>
              <View
                style={{width: `${Math.round(progress.used * 100)}%`, height: '100%', backgroundColor: tone}}
              />
            </View>
          ) : null}
          {current ? (
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text variant="caption" color="rgba(255,255,255,0.75)">
                Started {dayWithYear(current.subscription_start)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.75)">
                {[
                  plan ? durationLabel(plan.days) : null,
                  current.package_price != null ? formatRupees(Number(current.package_price)) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ) : null}
        </Gradient>

        <View style={{flexDirection: 'row', gap: spacing.sm}}>
          <Card style={{flex: 1, paddingVertical: 12}}>
            <Text variant="h2" color={limit != null && people > limit ? colors.danger : colors.text}>
              {staff.size ? people : '–'}
              {limit != null ? (
                <Text variant="title" tone="muted">
                  /{limit}
                </Text>
              ) : null}
            </Text>
            <Text variant="caption" tone="muted">
              Employees
            </Text>
          </Card>
          <Card style={{flex: 1, paddingVertical: 12}}>
            <Text variant="h2" color={colors.success}>
              {plan ? included.length : '–'}
            </Text>
            <Text variant="caption" tone="muted">
              Features on
            </Text>
          </Card>
        </View>

        {included.length ? (
          <Card style={{gap: spacing.sm}}>
            <Text variant="title">Included in your plan</Text>
            {included.map(f => (
              <View key={f.name} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Check size={15} color={colors.success} />
                <Text variant="body">{f.name}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Button
          title={state.kind === 'active' ? 'Renew or upgrade' : 'Renew now'}
          icon={Sparkles}
          onPress={() => navigation.navigate('ChoosePlan')}
        />
        {sub.data?.invoiceUrl ? (
          <Button
            title="Download last invoice"
            icon={FileDown}
            variant="ghost"
            onPress={() => openUrl(sub.data!.invoiceUrl!, 'the invoice')}
          />
        ) : null}

        <Card style={{gap: spacing.sm}}>
          <Text variant="label">Questions about your plan?</Text>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Button
              title="Call sales"
              icon={Phone}
              variant="secondary"
              size="sm"
              style={{flex: 1}}
              onPress={() => openUrl(`tel:${SALES.phone}`, 'the dialer')}
            />
            <Button
              title="Email"
              icon={Mail}
              variant="secondary"
              size="sm"
              style={{flex: 1}}
              onPress={() => openUrl(`mailto:${SALES.email}`, 'email')}
            />
          </View>
          <Text variant="caption" tone="subtle" selectable>
            {SALES.email} · {SALES.phoneLabel}
          </Text>
        </Card>
        {plans.isPending ? <Skeleton height={60} radius={16} /> : null}
      </View>
    </SetupScreen>
  );
}
