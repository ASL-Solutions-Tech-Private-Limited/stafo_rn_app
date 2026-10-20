import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import Animated, {FadeInDown, ReduceMotion} from 'react-native-reanimated';
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  IndianRupee,
  ReceiptIndianRupee,
  Search,
  ShieldCheck,
} from 'lucide-react-native';
import {
  fetchBill,
  getBillCategories,
  getBillerDetail,
  getBillers,
  type BillCategory,
  type FetchedBill,
} from '../../api/endpoints/bbps';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  PressableScale,
  Reveal,
  Screen,
  Text,
  TextField,
  toast,
} from '../../components/ui';
import {formatDay, formatTime} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {SetupScreen} from '../setup/parts';
import {canPayInApp} from '../subscription/pay';
import {SALES} from '../subscription/SubscriptionScreen';
import {
  amountError,
  amountRule,
  fieldError,
  fieldsOf,
  formatAmount,
  needsOneOf,
  POPULAR,
  rupeesFromPaise,
  shortBillerName,
} from './bbpsLogic';
import {OptionSheet, SelectField} from '../auth/screens/RegisterScreen';
import {categoryIcon, categoryTint} from './categoryIcons';
import {usePayBill} from './payBill';

/**
 * Live has categories and billers; fetching and paying wait for the backend,
 * which answers the missing routes with a generic 500.
 */
function friendly(e: Error) {
  return /not supported|could not be found|404|unexpected error/i.test(e.message)
    ? 'Couldn’t reach the bill service. Bill payments may not be switched on yet; please try again later.'
    : e.message;
}

function CategoryIcon({category, size = 26}: {category: BillCategory; size?: number}) {
  const {colors, radius} = useTheme();
  const Icon = categoryIcon(category.name);
  const tint = categoryTint(category.name, colors.accents);
  const box = size * 2;
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: size > 22 ? radius.lg : radius.md,
        backgroundColor: tint.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={size} color={tint.fg} />
    </View>
  );
}

/** Bill categories: the popular eight first, then the rest A–Z. */
export function BillsScreen({navigation}: AppScreenProps<'Bills'>) {
  const {colors, spacing} = useTheme();
  const cats = useQuery({queryKey: ['bbps-categories'], queryFn: getBillCategories, staleTime: 3600_000});
  const [q, setQ] = useState('');
  const all = useMemo(() => cats.data ?? [], [cats.data]);
  const popular = POPULAR.map(n => all.find(c => c.name === n)).filter((c): c is BillCategory => !!c);
  const rest = all.filter(c => !POPULAR.includes(c.name)).sort((a, b) => a.name.localeCompare(b.name));
  const term = q.trim().toLowerCase();
  const matches = term ? all.filter(c => c.name.toLowerCase().includes(term)) : null;
  const open = (c: BillCategory) => {
    haptics.tap();
    navigation.navigate('Billers', {category: c.name});
  };

  return (
    <SetupScreen title="Pay bills" subtitle="Recharges and bills through Bharat BillPay" query={cats}>
      <TextField icon={Search} placeholder="Search electricity, DTH, FASTag…" value={q} onChangeText={setQ} />
      {matches ? (
        <CategoryList items={matches} onOpen={open} empty={`No category matches “${q}”.`} />
      ) : (
        <>
          <Card style={{flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm}}>
            {popular.map((c, i) => (
              <Animated.View
                key={c.id}
                entering={FadeInDown.delay(i * 40)
                  .duration(320)
                  .reduceMotion(ReduceMotion.System)}
                style={{width: '25%'}}>
                <PressableScale
                  onPress={() => open(c)}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  style={{alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md}}>
                  <CategoryIcon category={c} />
                  <Text variant="caption" align="center" numberOfLines={2}>
                    {c.name}
                  </Text>
                </PressableScale>
              </Animated.View>
            ))}
          </Card>
          <Text variant="overline" tone="muted" style={{marginTop: spacing.sm}}>
            ALL CATEGORIES
          </Text>
          <CategoryList items={rest} onOpen={open} />
        </>
      )}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm}}>
        <ShieldCheck size={14} color={colors.success} />
        <Text variant="caption" tone="muted" style={{flex: 1}}>
          Payments go through Bharat BillPay (NPCI) and PayU. You get a BBPS reference for every bill.
        </Text>
      </View>
    </SetupScreen>
  );
}

function CategoryList({
  items,
  onOpen,
  empty,
}: {
  items: BillCategory[];
  onOpen: (c: BillCategory) => void;
  empty?: string;
}) {
  const {colors, spacing} = useTheme();
  if (!items.length) {
    return (
      <Text variant="body" tone="muted" style={{paddingVertical: spacing.lg}}>
        {empty}
      </Text>
    );
  }
  return (
    <Card padded={false}>
      {items.map((c, i) => (
        <PressableScale
          key={c.id}
          onPress={() => onOpen(c)}
          scaleTo={0.98}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: colors.border,
          }}>
          <CategoryIcon category={c} size={19} />
          <Text variant="title" style={{flex: 1}}>
            {c.name}
          </Text>
          <ChevronRight size={18} color={colors.textSubtle} />
        </PressableScale>
      ))}
    </Card>
  );
}

/** Billers in one category, searchable (Electricity has hundreds). */
export function BillersScreen({navigation, route}: AppScreenProps<'Billers'>) {
  const {category} = route.params;
  const {colors, spacing} = useTheme();
  const billers = useQuery({
    queryKey: ['bbps-billers', category],
    queryFn: () => getBillers(category),
    staleTime: 3600_000,
  });
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const list = (billers.data ?? []).filter(b => !term || b.name.toLowerCase().includes(term));
  const shown = list.slice(0, 80);

  return (
    <SetupScreen
      title={category}
      subtitle={billers.data ? `${billers.data.length} billers` : null}
      query={billers}>
      <TextField
        icon={Search}
        placeholder="Search your biller"
        value={q}
        onChangeText={setQ}
        autoFocus={false}
      />
      {shown.length ? (
        <Card padded={false}>
          {shown.map((b, i) => (
            <PressableScale
              key={b.id}
              onPress={() => {
                haptics.tap();
                navigation.navigate('PayBill', {category, operatorCode: b.operatorCode, name: b.name});
              }}
              scaleTo={0.98}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}>
              <Avatar name={shortBillerName(b.name)} size={38} />
              <Text variant="title" style={{flex: 1}} numberOfLines={2}>
                {b.name}
              </Text>
              <ChevronRight size={18} color={colors.textSubtle} />
            </PressableScale>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={Search}
            title="No billers found"
            message={term ? `Nothing matches “${q}”.` : 'No billers in this category yet.'}
          />
        </Card>
      )}
      {list.length > shown.length ? (
        <Text variant="caption" tone="muted" align="center">
          Showing {shown.length} of {list.length}. Search to find yours.
        </Text>
      ) : null}
    </SetupScreen>
  );
}

/** The biller's fields, then the fetched bill and Pay. */
export function PayBillScreen({navigation, route}: AppScreenProps<'PayBill'>) {
  const {category, operatorCode, name} = route.params;
  const {colors, spacing} = useTheme();
  const detail = useQuery({
    queryKey: ['bbps-biller', operatorCode],
    queryFn: () => getBillerDetail(operatorCode),
  });
  const fields = useMemo(() => fieldsOf(detail.data?.params), [detail.data?.params]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const [bill, setBill] = useState<FetchedBill | null>(null);
  const [amount, setAmount] = useState('');
  const [triedPay, setTriedPay] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const mustFetch = (detail.data?.fetchRequirement ?? 'MANDATORY').toUpperCase() === 'MANDATORY';
  const rule = amountRule(category, detail.data?.paymentExactness ?? '', bill?.amountPaise ?? 0);
  const fieldErrors = Object.fromEntries(fields.map(f => [f.name, fieldError(f, values[f.name] ?? '')]));
  const oneOf = needsOneOf(fields, values);
  const hasFieldError = Object.values(fieldErrors).some(Boolean) || !!oneOf;
  const ready = !mustFetch || !!bill;
  // Some billers ask for the amount as one of their own fields.
  const amountField = fields.find(f => f.isAmount);
  const payAmount = amountField ? (values[amountField.name] ?? '').trim() : amount;
  const amtError = amountError(payAmount, amountField ? {min: 1} : rule);
  const pay = usePayBill();
  const inApp = canPayInApp();

  const fetch = useMutation({
    mutationFn: () =>
      fetchBill({
        operatorCode,
        category,
        inputs: Object.fromEntries(fields.map(f => [f.name, (values[f.name] ?? '').trim()])),
      }),
    onSuccess: b => {
      haptics.success();
      setBill(b);
      setAmount((b.amountPaise / 100).toFixed(2));
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(friendly(e));
    },
  });

  const submitFetch = () => {
    setTried(true);
    if (hasFieldError) {
      haptics.error();
      return;
    }
    fetch.mutate();
  };

  const submitPay = () => {
    setTried(true);
    setTriedPay(true);
    if (hasFieldError || amtError) {
      haptics.error();
      return;
    }
    pay.mutate(
      {operatorCode, category, amount: Number(payAmount).toFixed(2), bill},
      {
        onSuccess: r => {
          if (r.status === 'cancelled') {
            toast.info('Payment cancelled');
          } else if (r.status === 'error') {
            toast.error(r.message);
          } else {
            if (r.status !== 'failed') {
              // Paid (or settling): going back must not offer the same bill again.
              setBill(null);
              setAmount('');
              setTriedPay(false);
            }
            navigation.navigate('BillResult', {
              status: r.status,
              txnid: r.txnid,
              amount: r.amount,
              biller: name,
              category,
            });
          }
        },
        onError: (e: Error) => {
          haptics.error();
          toast.error(friendly(e));
        },
      },
    );
  };

  return (
    <SetupScreen
      title={shortBillerName(name)}
      subtitle={category}
      query={detail.isError ? undefined : detail}>
      {detail.isError ? (
        <Card>
          <EmptyState
            icon={CircleAlert}
            title="Biller unavailable"
            message="Bharat BillPay didn’t return this biller’s details. Try again in a while, or pick another biller."
            action={
              <View style={{flexDirection: 'row', gap: spacing.sm}}>
                <Button
                  title="Try again"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => detail.refetch()}
                />
                <Button
                  title="Choose another"
                  size="sm"
                  fullWidth={false}
                  onPress={() => navigation.goBack()}
                />
              </View>
            }
          />
        </Card>
      ) : null}
      {detail.data ? (
        <Card style={{gap: spacing.lg}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
            <Avatar name={shortBillerName(name)} size={44} />
            <View style={{flex: 1}}>
              <Text variant="title" numberOfLines={2}>
                {name}
              </Text>
              {detail.data?.coverage ? (
                <Text variant="caption" tone="muted">
                  {detail.data.coverage.replace(/^IND-?/, 'India · ').replace(/^India · $/, 'All India')}
                </Text>
              ) : null}
            </View>
          </View>
          {fields.map(f =>
            f.choices ? (
              <SelectField
                key={f.name}
                label={f.optional ? `${f.name} (optional)` : f.name}
                value={values[f.name] || undefined}
                error={tried ? fieldErrors[f.name] : null}
                onPress={() => setPicking(f.name)}
              />
            ) : (
              <TextField
                key={f.name}
                label={f.optional ? `${f.name} (optional)` : f.name}
                value={values[f.name] ?? ''}
                onChangeText={t => {
                  setValues(v => ({...v, [f.name]: f.numeric ? t.replace(/\D/g, '') : t}));
                  // A changed number means a different bill.
                  setBill(null);
                }}
                keyboardType={f.numeric ? 'number-pad' : 'default'}
                maxLength={f.max || undefined}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!pay.isPending}
                error={tried ? fieldErrors[f.name] : null}
              />
            ),
          )}
          {tried && oneOf ? (
            <Text variant="caption" tone="danger">
              {oneOf}
            </Text>
          ) : null}
          {mustFetch && !bill ? (
            <Button
              title="Fetch bill"
              icon={ReceiptIndianRupee}
              loading={fetch.isPending}
              onPress={submitFetch}
            />
          ) : null}
        </Card>
      ) : null}

      {bill ? (
        <Reveal>
          <Card style={{gap: spacing.sm}}>
            <Text variant="overline" tone="muted">
              YOUR BILL
            </Text>
            <Text variant="display">{rupeesFromPaise(bill.amountPaise)}</Text>
            {bill.dueDate ? (
              <Text variant="caption" tone="warning">
                Due {bill.dueDate}
              </Text>
            ) : null}
            <View style={{height: 1, backgroundColor: colors.border, marginVertical: spacing.xs}} />
            {[
              ['Customer', bill.customerName],
              ['Bill number', bill.billNumber],
              ['Bill date', bill.billDate],
              ['Period', bill.billPeriod],
              ...bill.info.map(i => [i.name, i.value] as const),
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <View
                  key={k}
                  style={{flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md}}>
                  <Text variant="body" tone="muted">
                    {k}
                  </Text>
                  <Text variant="body" style={{flexShrink: 1, textAlign: 'right'}} selectable>
                    {v}
                  </Text>
                </View>
              ))}
          </Card>
        </Reveal>
      ) : null}

      {ready ? (
        <Reveal index={1} style={{gap: spacing.md}}>
          {!amountField && (rule.editable || !bill) ? (
            <TextField
              label="Amount"
              icon={IndianRupee}
              value={amount}
              onChangeText={t => setAmount(t.replace(/[^\d.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              hint={bill && rule.min > 1 ? `At least ${formatAmount(rule.min)}` : undefined}
              error={triedPay ? amtError : null}
            />
          ) : null}
          <Button
            title={amtError ? 'Pay' : `Pay ${formatAmount(Number(payAmount))}`}
            loading={pay.isPending}
            disabled={!inApp}
            onPress={submitPay}
          />
          {!inApp ? (
            <Text variant="caption" tone="muted" align="center">
              Payments aren’t available in this build.
            </Text>
          ) : null}
        </Reveal>
      ) : null}
      <OptionSheet
        title={picking ?? ''}
        visible={picking != null}
        options={(fields.find(f => f.name === picking)?.choices ?? []).map((n, i) => ({id: i, name: n}))}
        selected={(() => {
          const f = fields.find(x => x.name === picking);
          const i = f?.choices?.indexOf(values[f.name] ?? '') ?? -1;
          return i >= 0 ? i : null;
        })()}
        onClose={() => setPicking(null)}
        onSelect={i => {
          const f = fields.find(x => x.name === picking);
          if (f?.choices) {
            haptics.select();
            setValues(v => ({...v, [f.name]: f.choices![i]}));
            setBill(null);
          }
          setPicking(null);
        }}
      />
    </SetupScreen>
  );
}

const RESULT = {
  success: {title: 'Bill paid', icon: CircleCheck},
  failed: {title: 'Payment failed', icon: CircleAlert},
  pending: {title: 'Payment being confirmed', icon: Clock3},
} as const;

export function BillResultScreen({navigation, route}: AppScreenProps<'BillResult'>) {
  const {status, txnid, amount, biller, category} = route.params;
  const {colors, spacing} = useTheme();
  const copy = RESULT[status];
  const tone = status === 'success' ? colors.success : status === 'failed' ? colors.danger : colors.warning;
  const soft =
    status === 'success' ? colors.successSoft : status === 'failed' ? colors.dangerSoft : colors.warningSoft;
  const now = new Date();
  const message =
    status === 'success'
      ? `${biller} has been paid. It can take up to 2 working days to show on your account with them.`
      : status === 'failed'
      ? 'No money was taken. You can try again, or use another payment method.'
      : 'Your bank or the biller is still confirming. If it doesn’t go through, the money is refunded automatically; don’t pay again.';

  return (
    <Screen
      scroll
      contentStyle={{padding: spacing.xl, gap: spacing.lg, justifyContent: 'center', flexGrow: 1}}>
      <Animated.View
        entering={FadeInDown.duration(400).reduceMotion(ReduceMotion.System)}
        style={{alignItems: 'center', gap: spacing.sm}}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <copy.icon size={38} color={tone} />
        </View>
        <Text variant="h2" align="center">
          {copy.title}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {message}
        </Text>
      </Animated.View>
      <Card style={{gap: spacing.sm}}>
        {[
          ['Biller', biller],
          ['Category', category],
          ['Amount', formatAmount(Number(amount) || 0)],
          ['Transaction ID', txnid],
          ['Date', `${formatDay(now)} ${now.getFullYear()}, ${formatTime(now)}`],
        ].map(([k, v]) => (
          <View key={k} style={{flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md}}>
            <Text variant="body" tone="muted">
              {k}
            </Text>
            <Text variant="body" style={{flexShrink: 1, textAlign: 'right'}} selectable>
              {v}
            </Text>
          </View>
        ))}
      </Card>
      {status === 'failed' ? (
        <Button title="Try again" onPress={() => navigation.goBack()} />
      ) : (
        <Button title="Done" onPress={() => navigation.navigate('Bills')} />
      )}
      <Text variant="caption" tone="subtle" align="center">
        Need help? {SALES.email} · {SALES.phoneLabel}, with the transaction ID.
      </Text>
    </Screen>
  );
}
