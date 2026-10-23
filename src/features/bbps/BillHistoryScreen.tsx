import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Animated, {FadeInDown, ReduceMotion} from 'react-native-reanimated';
import {ReceiptIndianRupee, RefreshCw, Search} from 'lucide-react-native';
import {getBillReport, recheckBillPayment, type BillTxn} from '../../api/endpoints/bbps';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  PressableScale,
  Text,
  TextField,
  toast,
} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, SetupScreen} from '../setup/parts';
import {categoryOfTxn} from './bbpsLogic';
import {categoryIcon, categoryTint} from './categoryIcons';
import {usePayer} from './payBill';

const STATUS: Record<string, {label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'}> = {
  success: {label: 'Paid', tone: 'success'},
  pending: {label: 'Confirming', tone: 'warning'},
  failed: {label: 'Failed', tone: 'danger'},
};
const statusOf = (s: string) => STATUS[s] ?? {label: s, tone: 'neutral' as const};

/** Every bill paid from this account, from api/bbpsReport. */
export function BillHistoryScreen(_: AppScreenProps<'BillHistory'>) {
  const {colors, spacing} = useTheme();
  const role = useSession(s => s.role);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<BillTxn | null>(null);
  const term = search.trim();

  const report = useInfiniteQuery({
    queryKey: ['bbps-report', role, status, term],
    queryFn: ({pageParam}) =>
      getBillReport({
        userType: role === 'company' ? 'company' : 'employee',
        status,
        search: term,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: last => (last.page < last.lastPage ? last.page + 1 : undefined),
  });
  const queryClient = useQueryClient();
  const payer = usePayer();
  const recheck = useMutation({
    mutationFn: (txnid: string) => {
      if (!payer) {
        throw new Error('Sign in again to check payments.');
      }
      return recheckBillPayment({txnid, payer});
    },
    onSuccess: r => {
      haptics.success();
      const st = r.status ? statusOf(r.status).label : null;
      toast.success(st ? `Status: ${st}` : r.message ?? 'Status updated');
      queryClient.invalidateQueries({queryKey: ['bbps-report']});
      setOpen(null);
    },
    onError: (e: Error) => {
      haptics.error();
      // The server still wants the PayU result here; a bare transaction ID fails with "Undefined array key".
      toast.error(
        /undefined array key|unexpected error/i.test(e.message)
          ? 'Status check isn’t available on the server yet. Try again later.'
          : e.message,
      );
    },
  });
  const pages = report.data?.pages;
  const summary = pages?.[0]?.summary;
  const rows = useMemo(() => (pages ?? []).flatMap(p => p.transactions), [pages]);

  return (
    <SetupScreen title="Payment history" subtitle="Bills paid through Bharat BillPay" query={report}>
      {summary ? (
        <Card style={{flexDirection: 'row'}}>
          {(
            [
              ['Total', summary.total, colors.text],
              ['Paid', summary.success, colors.success],
              ['Confirming', summary.pending, colors.warning],
              ['Failed', summary.failed, colors.danger],
            ] as const
          ).map(([label, v, color]) => (
            <View key={label} style={{flex: 1, alignItems: 'center', gap: 2}}>
              <Text variant="title" color={color}>
                {v.count}
              </Text>
              <Text variant="caption" tone="muted">
                {label}
              </Text>
              <Text variant="caption" style={{fontFamily: 'PlusJakartaSans-Bold'}} numberOfLines={1}>
                {v.amount}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <ChoiceChips
        items={[
          {value: '', label: 'All'},
          {value: 'success', label: 'Paid'},
          {value: 'pending', label: 'Confirming'},
          {value: 'failed', label: 'Failed'},
        ]}
        value={status}
        onChange={v => {
          haptics.select();
          setStatus(v);
        }}
      />
      <TextField
        icon={Search}
        placeholder="Search by transaction ID"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      {rows.length ? (
        <Card padded={false}>
          {rows.map((t, i) => {
            const cat = categoryOfTxn(t.productInfo);
            const Icon = categoryIcon(cat);
            const tint = categoryTint(cat, colors.accents);
            const st = statusOf(t.status);
            return (
              <Animated.View
                key={t.id}
                entering={FadeInDown.delay(Math.min(i, 8) * 30)
                  .duration(260)
                  .reduceMotion(ReduceMotion.System)}>
                <PressableScale
                  onPress={() => {
                    haptics.tap();
                    setOpen(t);
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
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: tint.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon size={19} color={tint.fg} />
                  </View>
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text variant="title" numberOfLines={1}>
                      {cat} · {t.formattedAmount}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {[t.date, t.time].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {t.status === 'pending' ? (
                    <Button
                      title="Check status"
                      icon={RefreshCw}
                      size="sm"
                      variant="ghost"
                      fullWidth={false}
                      loading={recheck.isPending && recheck.variables === t.txnid}
                      disabled={recheck.isPending}
                      onPress={() => {
                        haptics.tap();
                        recheck.mutate(t.txnid);
                      }}
                    />
                  ) : (
                    <Badge label={st.label} tone={st.tone} dot />
                  )}
                </PressableScale>
              </Animated.View>
            );
          })}
        </Card>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={ReceiptIndianRupee}
            title={term || status ? 'Nothing matches' : 'No bill payments yet'}
            message={term || status ? 'Try another filter.' : 'Bills you pay from Pay bills show here.'}
          />
        </Card>
      )}

      {report.hasNextPage ? (
        <Button
          title="Load more"
          variant="ghost"
          loading={report.isFetchingNextPage}
          onPress={() => report.fetchNextPage()}
        />
      ) : null}

      <BottomSheet
        visible={!!open}
        onClose={() => setOpen(null)}
        title={open ? categoryOfTxn(open.productInfo) : ''}>
        {open ? (
          <View style={{gap: spacing.md}}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <Text variant="h1">{open.formattedAmount}</Text>
              <Badge label={statusOf(open.status).label} tone={statusOf(open.status).tone} dot />
            </View>
            {(
              [
                ['For', open.productInfo],
                ['Paid by', open.payerName],
                ['Transaction ID', open.txnid],
                ['PayU payment ID', open.payuPaymentId],
                ['When', [open.date, open.time].filter(Boolean).join(', ')],
              ] as const
            )
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
            {open.status === 'pending' ? (
              <Text variant="caption" tone="muted">
                Still being confirmed by the bank or the biller. If it doesn’t go through, the money is
                refunded automatically; don’t pay again.
              </Text>
            ) : null}
            {open.status === 'pending' ? (
              <Button
                title="Check status"
                icon={RefreshCw}
                loading={recheck.isPending}
                onPress={() => recheck.mutate(open.txnid)}
              />
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </SetupScreen>
  );
}
