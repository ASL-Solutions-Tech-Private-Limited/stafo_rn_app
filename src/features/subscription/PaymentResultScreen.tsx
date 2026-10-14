import React from 'react';
import {View} from 'react-native';
import {CircleAlert, CircleCheck, Clock3, FileDown} from 'lucide-react-native';
import {Button, Card, Screen, Text} from '../../components/ui';
import {formatDay, formatTime} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useSubscription} from '../performance/queries';
import {formatRupees} from '../trips/tripLogic';
import {openUrl, SALES} from './SubscriptionScreen';

const COPY = {
  success: {title: 'Payment successful', icon: CircleCheck},
  failed: {title: 'Payment failed', icon: CircleAlert},
  pending: {title: 'Payment being confirmed', icon: Clock3},
} as const;

/** How a payment ended, with the details support needs. */
export function PaymentResultScreen({navigation, route}: AppScreenProps<'PaymentResult'>) {
  const {status, txnid, amount, mode, plan} = route.params;
  const {colors, spacing} = useTheme();
  const sub = useSubscription();
  const copy = COPY[status];
  const tone = status === 'success' ? colors.success : status === 'failed' ? colors.danger : colors.warning;
  const soft =
    status === 'success' ? colors.successSoft : status === 'failed' ? colors.dangerSoft : colors.warningSoft;
  const now = new Date();
  const message =
    status === 'success'
      ? `${plan} is being activated. It shows on Subscription once STAFO has confirmed the payment with PayU.`
      : status === 'failed'
      ? 'No money was taken. You can try again, or use another payment method.'
      : 'Your bank is still confirming the payment. The plan updates by itself once it does; you don’t need to pay again.';

  return (
    <Screen
      scroll
      contentStyle={{padding: spacing.xl, gap: spacing.lg, justifyContent: 'center', flexGrow: 1}}>
      <View style={{alignItems: 'center', gap: spacing.sm}}>
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
        <Text variant="h2" style={{textAlign: 'center'}}>
          {copy.title}
        </Text>
        <Text variant="body" tone="muted" style={{textAlign: 'center'}}>
          {message}
        </Text>
      </View>
      <Card style={{gap: spacing.sm}}>
        <Detail label="Plan" value={plan} />
        <Detail label="Amount" value={formatRupees(Number(amount) || 0)} />
        {mode ? <Detail label="Paid with" value={mode} /> : null}
        <Detail label="Transaction ID" value={txnid} selectable />
        <Detail label="Date" value={`${formatDay(now)} ${now.getFullYear()}, ${formatTime(now)}`} />
      </Card>
      {status === 'success' && sub.data?.invoiceUrl ? (
        <Button
          title="Download invoice"
          icon={FileDown}
          variant="ghost"
          onPress={() => openUrl(sub.data!.invoiceUrl!, 'the invoice')}
        />
      ) : null}
      {status === 'failed' ? (
        <Button title="Try again" onPress={() => navigation.goBack()} />
      ) : (
        <Button title="Done" onPress={() => navigation.navigate('Subscription')} />
      )}
      <Text variant="caption" tone="subtle" style={{textAlign: 'center'}}>
        Need help? {SALES.email} · {SALES.phoneLabel}, with the transaction ID.
      </Text>
    </Screen>
  );
}

function Detail({label, value, selectable}: {label: string; value: string; selectable?: boolean}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 12}}>
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <Text variant="title" selectable={selectable} style={{flexShrink: 1, textAlign: 'right'}}>
        {value}
      </Text>
    </View>
  );
}
