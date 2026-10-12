import React from 'react';
import {Linking, View} from 'react-native';
import {Banknote, Check, FileDown, Mail, Phone, Wallet} from 'lucide-react-native';
import type {Plan} from '../../api/endpoints/subscription';
import {Badge, Button, Card, EmptyState, Text, toast} from '../../components/ui';
import {formatDay, parseServerDate} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {SetupScreen} from '../setup/parts';
import {formatRupees} from '../trips/tripLogic';
import {activePlans, planFeatures, planPrice, planState} from './performanceLogic';
import {usePlans, useSubscription} from './queries';

/** From stafo.in: who to talk to about plans. */
const SALES = {phone: '+918389039361', email: 'sales@stafo.in'};

const open = (url: string, what: string) =>
  Linking.openURL(url).catch(() => toast.error(`Couldn’t open ${what}.`));

const dayWithYear = (v?: string | null) => {
  const d = parseServerDate(v);
  return d ? `${formatDay(d)} ${d.getFullYear()}` : '—';
};

/** The company's plan, its invoice, and the plans on offer. Renewing is done with sales. */
export function SubscriptionScreen(_: AppScreenProps<'Subscription'>) {
  const {colors, spacing} = useTheme();
  const companyName = useSession(s => s.company?.company_name);
  const sub = useSubscription();
  const plans = usePlans();
  const current = sub.data?.subscription;
  const state = planState(current);
  const list = activePlans(plans.data ?? []);
  const currentName =
    current?.package?.package_name ??
    plans.data?.find(p => p.id === current?.package_id)?.package_name ??
    null;

  const talkToSales = (plan?: Plan) => {
    const subject = encodeURIComponent(
      `${plan ? `${plan.package_name} plan` : 'Renewing our plan'} for ${
        current?.company_name ?? companyName ?? 'our company'
      }`,
    );
    open(`mailto:${SALES.email}?subject=${subject}`, 'email');
  };

  const tone =
    state.kind === 'expired' ? colors.danger : state.kind === 'ending' ? colors.warning : colors.success;
  const soft =
    state.kind === 'expired'
      ? colors.dangerSoft
      : state.kind === 'ending'
      ? colors.warningSoft
      : colors.successSoft;

  return (
    <SetupScreen title="Subscription" subtitle={current?.company_name ?? companyName ?? null} query={sub}>
      <View style={{gap: spacing.md}}>
        {state.kind === 'none' ? (
          <Card>
            <EmptyState
              compact
              icon={Wallet}
              title="No plan yet"
              message="Pick a plan below and our team will set it up."
            />
          </Card>
        ) : (
          <Card style={{backgroundColor: soft, borderColor: tone, gap: 6}}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}>
              <Text variant="h3" style={{flex: 1}}>
                {state.kind === 'expired'
                  ? 'Your plan ended'
                  : state.kind === 'ending'
                  ? state.daysLeft === 0
                    ? 'Your plan ends today'
                    : `Your plan ends in ${state.daysLeft} ${state.daysLeft === 1 ? 'day' : 'days'}`
                  : currentName ?? 'Your plan'}
              </Text>
              <Badge
                label={
                  state.kind === 'expired' ? 'Expired' : state.kind === 'ending' ? 'Ending soon' : 'Active'
                }
                tone={state.kind === 'expired' ? 'danger' : state.kind === 'ending' ? 'warning' : 'success'}
                dot
              />
            </View>
            <Text variant="body">
              {[
                currentName && state.kind !== 'active' ? currentName : null,
                `${dayWithYear(current?.subscription_start)} – ${dayWithYear(current?.subscription_end)}`,
                current?.package_price != null ? formatRupees(Number(current.package_price)) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {sub.data?.invoiceUrl ? (
              <Button
                title="Download invoice"
                icon={FileDown}
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => open(sub.data!.invoiceUrl!, 'the invoice')}
              />
            ) : null}
          </Card>
        )}

        <Card style={{gap: spacing.sm}}>
          <Text variant="label">
            {state.kind === 'active' ? 'Questions about your plan?' : 'Renew with our team'}
          </Text>
          <Text variant="caption" tone="muted">
            Plans are set up by STAFO sales. Call or email and they’ll renew or change it for you.
          </Text>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Button
              title="Call sales"
              icon={Phone}
              size="sm"
              style={{flex: 1}}
              onPress={() => open(`tel:${SALES.phone}`, 'the dialer')}
            />
            <Button
              title="Email"
              icon={Mail}
              variant="secondary"
              size="sm"
              style={{flex: 1}}
              onPress={() => talkToSales()}
            />
          </View>
          <Text variant="caption" tone="subtle" selectable>
            {SALES.email} · +91 83890 39361
          </Text>
        </Card>

        <Text variant="overline" tone="muted" style={{marginTop: spacing.xs}}>
          PLANS
        </Text>
        {list.map(p => (
          <PlanCard
            key={p.id}
            plan={p}
            current={p.id === current?.package_id}
            onChoose={() => talkToSales(p)}
          />
        ))}
      </View>
    </SetupScreen>
  );
}

function PlanCard({plan, current, onChoose}: {plan: Plan; current: boolean; onChoose: () => void}) {
  const {colors, spacing} = useTheme();
  const price = planPrice(plan);
  const features = planFeatures(plan.features);
  return (
    <Card style={{gap: spacing.sm, borderColor: current ? colors.primary : colors.border}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <Text variant="h3">{plan.package_name.trim()}</Text>
        {current ? <Badge label="Your plan" tone="primary" /> : null}
      </View>
      <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap'}}>
        <Text variant="h2">{formatRupees(price.now)}</Text>
        {price.was ? (
          <Text variant="caption" tone="muted" style={{textDecorationLine: 'line-through'}}>
            {formatRupees(price.was)}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          · {plan.days} days
        </Text>
      </View>
      <View style={{gap: 4}}>
        {features.map(f => (
          <View key={f} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Check size={14} color={colors.success} />
            <Text variant="caption">{f}</Text>
          </View>
        ))}
      </View>
      <Button
        title={`Ask about ${plan.package_name.trim()}`}
        icon={Mail}
        variant="secondary"
        size="sm"
        onPress={onChoose}
      />
    </Card>
  );
}

/** Paying salaries from the app isn't connected to a bank yet. Says so, and points to Payroll. */
export function SalaryPayoutsScreen({navigation}: AppScreenProps<'SalaryPayouts'>) {
  return (
    <SetupScreen title="Salary disbursement">
      <Card>
        <EmptyState
          icon={Banknote}
          title="Not available yet"
          message="Paying salaries straight to bank accounts isn’t connected yet. Run payroll to work out salaries and share payslips, then pay from your bank as usual."
          action={
            <Button
              title="Open Payroll"
              size="sm"
              fullWidth={false}
              onPress={() => navigation.navigate('Payroll')}
            />
          }
        />
      </Card>
    </SetupScreen>
  );
}
