import React from 'react';
import {View} from 'react-native';
import Animated, {FadeInDown, ReduceMotion} from 'react-native-reanimated';
import {
  CalendarClock,
  CalendarDays,
  Hash,
  Info,
  Package,
  ReceiptIndianRupee,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import type {FetchedBill} from '../../api/endpoints/bbps';
import {Avatar, Card, Gradient, Text} from '../../components/ui';
import {useTheme} from '../../theme/ThemeProvider';
import {billDateLabel, dueStatus, rupeesFromPaise} from './bbpsLogic';

/** Picks an icon for a bill line from its label. */
function iconFor(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (/number|no\.?$|id$|reference/.test(l)) {
    return Hash;
  }
  if (/period|validity/.test(l)) {
    return CalendarClock;
  }
  if (/date/.test(l)) {
    return CalendarDays;
  }
  if (/package|plan/.test(l)) {
    return Package;
  }
  if (/balance|amount|due/.test(l)) {
    return Wallet;
  }
  if (/name|customer/.test(l)) {
    return UserRound;
  }
  return Info;
}

/** The fetched bill: amount and due date up top, then every detail the biller sent. */
export function BillCard({bill, billerName}: {bill: FetchedBill; billerName: string}) {
  const {colors, spacing, radius} = useTheme();
  const due = dueStatus(bill.dueDate);
  const dueColors = due
    ? {
        success: {bg: 'rgba(18,183,106,0.22)', fg: '#D1FADF'},
        warning: {bg: 'rgba(253,176,34,0.28)', fg: '#FEF0C7'},
        danger: {bg: 'rgba(240,68,56,0.32)', fg: '#FEE4E2'},
      }[due.tone]
    : null;

  const rows: {label: string; value: string}[] = [
    {label: 'Bill number', value: bill.billNumber ?? ''},
    {label: 'Bill date', value: billDateLabel(bill.billDate)},
    {label: 'Bill period', value: billDateLabel(bill.billPeriod)},
    ...bill.info.map(i => ({label: i.name, value: billDateLabel(i.value)})),
  ].filter(r => r.value);

  return (
    <Animated.View
      entering={FadeInDown.duration(360).reduceMotion(ReduceMotion.System)}
      style={{gap: spacing.md}}>
      <Gradient
        from={colors.heroFrom}
        to={colors.heroTo}
        decorated
        style={{borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
          <ReceiptIndianRupee size={16} color="rgba(255,255,255,0.85)" />
          <Text variant="label" color="rgba(255,255,255,0.85)" style={{flex: 1}} numberOfLines={1}>
            {billerName}
          </Text>
        </View>
        <View>
          <Text variant="caption" color="rgba(255,255,255,0.75)">
            Amount due
          </Text>
          <Text variant="display" tone="inverse" style={{fontSize: 38, lineHeight: 46}}>
            {rupeesFromPaise(bill.amountPaise)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}>
          {bill.customerName ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1}}>
              <Avatar name={bill.customerName} size={30} ring="rgba(255,255,255,0.6)" />
              <Text variant="title" tone="inverse" numberOfLines={1} style={{flexShrink: 1}}>
                {bill.customerName}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {due && dueColors ? (
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: dueColors.bg,
              }}>
              <Text variant="caption" color={dueColors.fg} style={{fontFamily: 'PlusJakartaSans-Bold'}}>
                {due.label}
              </Text>
            </View>
          ) : null}
        </View>
      </Gradient>

      {rows.length ? (
        <Card padded={false}>
          <Text variant="overline" tone="muted" style={{padding: spacing.lg, paddingBottom: spacing.xs}}>
            BILL DETAILS
          </Text>
          {rows.map((r, i) => {
            const Icon = iconFor(r.label);
            return (
              <View
                key={`${r.label}-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon size={16} color={colors.primary} />
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="caption" tone="muted">
                    {r.label}
                  </Text>
                  <Text variant="title" selectable>
                    {r.value}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </Animated.View>
  );
}
