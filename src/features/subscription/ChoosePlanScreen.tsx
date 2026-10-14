import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {Check, Mail, Phone, ShieldCheck, X} from 'lucide-react-native';
import type {Plan} from '../../api/endpoints/subscription';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Gradient,
  PressableScale,
  Text,
  toast,
} from '../../components/ui';
import {formatDay} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {usePlans, useSubscription} from '../performance/queries';
import {SetupScreen} from '../setup/parts';
import {formatRupees} from '../trips/tripLogic';
import {canPayInApp, usePayForPlan} from './pay';
import {openUrl, SALES} from './SubscriptionScreen';
import {
  activePlans,
  defaultPlan,
  durationLabel,
  featureLines,
  perDay,
  planLengths,
  planPrice,
  savePercent,
} from './subscriptionLogic';

/** Plans grouped by length, the chosen one in full, then review and pay. */
export function ChoosePlanScreen({navigation}: AppScreenProps<'ChoosePlan'>) {
  const {colors, spacing} = useTheme();
  const plans = usePlans();
  const sub = useSubscription();
  const list = useMemo(() => activePlans(plans.data ?? []), [plans.data]);
  const lengths = planLengths(list);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const chosen = list.find(p => p.id === chosenId) ?? defaultPlan(list, sub.data?.subscription?.package_id);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (chosen && chosenId == null) {
      setChosenId(chosen.id);
    }
  }, [chosen, chosenId]);

  const others = list.filter(p => p.id !== chosen?.id);

  return (
    <SetupScreen title="Choose a plan" subtitle="Prices as charged by STAFO" query={plans}>
      {!chosen ? (
        <Card>
          <EmptyState compact icon={ShieldCheck} title="No plans on sale" message="Contact STAFO sales." />
        </Card>
      ) : (
        <View style={{gap: spacing.md}}>
          {lengths.length > 1 ? (
            <View
              accessibilityRole="tablist"
              style={{
                flexDirection: 'row',
                gap: 3,
                padding: 3,
                borderRadius: 12,
                backgroundColor: colors.surfaceMuted,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              {lengths.map(d => {
                const on = chosen.days === d;
                return (
                  <PressableScale
                    key={d}
                    accessibilityRole="tab"
                    accessibilityState={{selected: on}}
                    onPress={() => {
                      haptics.select();
                      const first = list.find(p => p.days === d);
                      if (first) {
                        setChosenId(first.id);
                      }
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 9,
                      alignItems: 'center',
                      backgroundColor: on ? colors.surface : 'transparent',
                    }}>
                    <Text variant="label" color={on ? colors.text : colors.textMuted}>
                      {durationLabel(d)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}

          <PlanHero plan={chosen} />

          {others.length ? (
            <>
              <Text variant="overline" tone="muted">
                OTHER PLANS
              </Text>
              {others.map(p => (
                <Card
                  key={p.id}
                  onPress={() => setChosenId(p.id)}
                  accessibilityLabel={`${p.package_name}, ${formatRupees(planPrice(p).now)}`}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
                    <View style={{flex: 1, minWidth: 0}}>
                      <Text variant="title">
                        {p.package_name.trim()} · {durationLabel(p.days)}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {featureLines(p.features)
                          .filter(f => f.included)
                          .slice(0, 3)
                          .map(f => f.name)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                      <Text variant="h3">{formatRupees(planPrice(p).now)}</Text>
                      {perDay(p) != null ? (
                        <Text variant="caption" color={colors.success}>
                          ₹{perDay(p)}/day
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          <Button
            title={`Continue with ${chosen.package_name.trim()} · ${formatRupees(planPrice(chosen).now)}`}
            onPress={() => setReviewing(true)}
          />
        </View>
      )}
      {chosen ? (
        <ReviewSheet
          plan={chosen}
          visible={reviewing}
          onClose={() => setReviewing(false)}
          onPaid={outcome => {
            setReviewing(false);
            navigation.navigate('PaymentResult', {...outcome, plan: chosen.package_name.trim()});
          }}
        />
      ) : null}
    </SetupScreen>
  );
}

function PlanHero({plan}: {plan: Plan}) {
  const {colors, spacing, radius} = useTheme();
  const price = planPrice(plan);
  const save = savePercent(plan);
  const lines = featureLines(plan.features);
  return (
    <Gradient
      from={colors.heroFrom}
      to={colors.heroTo}
      decorated
      style={{borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <Text variant="h3" color="#FFFFFF">
          {plan.package_name.trim()}
        </Text>
        {plan.days === 90 ? (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}>
            <Text variant="caption" color="#FFFFFF" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
              Most popular
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap'}}>
        <Text variant="display" color="#FFFFFF">
          {formatRupees(price.now)}
        </Text>
        {price.was ? (
          <Text variant="body" color="rgba(255,255,255,0.7)" style={{textDecorationLine: 'line-through'}}>
            {formatRupees(price.was)}
          </Text>
        ) : null}
        {save ? <Badge label={`Save ${save}%`} tone="success" /> : null}
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.85)">
        {perDay(plan) != null ? `₹${perDay(plan)} a day · ` : ''}
        {durationLabel(plan.days)}
      </Text>
      <View style={{height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4}} />
      {lines.map(f => (
        <View
          key={f.name}
          style={{flexDirection: 'row', alignItems: 'center', gap: 8, opacity: f.included ? 1 : 0.55}}>
          {f.included ? <Check size={15} color="#FFFFFF" /> : <X size={15} color="#FFFFFF" />}
          <Text
            variant="body"
            color="#FFFFFF"
            style={f.included ? undefined : {textDecorationLine: 'line-through'}}>
            {f.name}
          </Text>
        </View>
      ))}
    </Gradient>
  );
}

function ReviewSheet({
  plan,
  visible,
  onClose,
  onPaid,
}: {
  plan: Plan;
  visible: boolean;
  onClose: () => void;
  onPaid: (o: {
    status: 'success' | 'failed' | 'pending';
    txnid: string;
    amount: string;
    mode?: string;
  }) => void;
}) {
  const {colors, spacing} = useTheme();
  const pay = usePayForPlan();
  const price = planPrice(plan);
  const inApp = canPayInApp();
  const ends = new Date();
  ends.setDate(ends.getDate() + plan.days - 1);

  const start = () => {
    haptics.tap();
    pay.mutate(plan, {
      onSuccess: o => {
        if (o.status === 'cancelled') {
          toast.info('Payment cancelled. No money was taken.');
        } else if (o.status === 'error') {
          toast.error(o.message);
        } else {
          onPaid(o);
        }
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Review & pay"
      subtitle={`${plan.package_name.trim()} · ${durationLabel(plan.days)}`}>
      <View style={{gap: spacing.lg}}>
        <Card style={{gap: spacing.sm}}>
          <Row
            label={`${plan.package_name.trim()} · ${durationLabel(plan.days)}`}
            value={formatRupees(price.was ?? price.now)}
            strike={!!price.was}
          />
          {price.was ? (
            <Row label="Offer" value={`− ${formatRupees(price.was - price.now)}`} color={colors.success} />
          ) : null}
          <View style={{height: 1, backgroundColor: colors.border}} />
          <Row label="Total" value={formatRupees(price.now)} bold />
          <Text variant="caption" tone="muted">
            If you pay today, it runs until {formatDay(ends)} {ends.getFullYear()}.
          </Text>
        </Card>
        {inApp ? (
          <>
            <Button
              title={`Pay ${formatRupees(price.now)} securely`}
              icon={ShieldCheck}
              loading={pay.isPending}
              onPress={start}
            />
            <Text variant="caption" tone="muted" style={{textAlign: 'center'}}>
              UPI, cards, net banking and wallets, by PayU. STAFO never sees your card or UPI PIN.
            </Text>
          </>
        ) : (
          <>
            <Text variant="body" tone="muted">
              Paying in the app is coming soon. Our sales team will set this plan up for you.
            </Text>
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <Button
                title="Call sales"
                icon={Phone}
                style={{flex: 1}}
                onPress={() => openUrl(`tel:${SALES.phone}`, 'the dialer')}
              />
              <Button
                title="Email"
                icon={Mail}
                variant="secondary"
                style={{flex: 1}}
                onPress={() =>
                  openUrl(
                    `mailto:${SALES.email}?subject=${encodeURIComponent(
                      `${plan.package_name.trim()} plan (${durationLabel(plan.days)})`,
                    )}`,
                    'email',
                  )
                }
              />
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

function Row({
  label,
  value,
  strike,
  bold,
  color,
}: {
  label: string;
  value: string;
  strike?: boolean;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
      <Text variant={bold ? 'title' : 'body'} color={color} style={{flex: 1}}>
        {label}
      </Text>
      <Text
        variant={bold ? 'h3' : 'body'}
        color={color}
        style={strike ? {textDecorationLine: 'line-through'} : undefined}>
        {value}
      </Text>
    </View>
  );
}
