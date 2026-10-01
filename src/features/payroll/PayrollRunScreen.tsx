import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, View} from 'react-native';
import {CircleCheck, Info, Pencil, Wallet} from 'lucide-react-native';
import type {SalaryLine} from '../../api/types';
import {BottomSheet, Button, Card, ConfirmDialog, Gradient, Text, TextField} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {SetupScreen} from '../setup/parts';
import {formatMoney, netPay, sumLines} from './payrollLogic';
import {useSalaryPreview, useSaveSalary} from './queries';

type Editing = {group: 'earning' | 'deduction'; index: number} | {group: 'lop'} | {group: 'expense'} | null;

const monthName = (m: number) =>
  new Date(new Date().getFullYear(), m - 1, 1).toLocaleDateString('en-IN', {month: 'long'});

export function PayrollRunScreen({navigation, route}: AppScreenProps<'PayrollRun'>) {
  const {employeeId, name, month} = route.params;
  const {colors, spacing} = useTheme();
  const preview = useSalaryPreview(employeeId);
  const save = useSaveSalary();
  const [earnings, setEarnings] = useState<SalaryLine[]>([]);
  const [deductions, setDeductions] = useState<SalaryLine[]>([]);
  const [lossOfPay, setLossOfPay] = useState(0);
  const [expense, setExpense] = useState(0);
  const [showZero, setShowZero] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState(false);

  // Start from the server's preview; adjustments only apply to this month's run.
  useEffect(() => {
    const p = preview.data;
    if (p) {
      setEarnings(p.earning.map(l => ({...l, amount: Number(l.amount)})));
      setDeductions(p.deduction.map(l => ({...l, amount: Number(l.amount)})));
      setLossOfPay(Number(p.other_deduction) || 0);
      setExpense(Number(p.expense) || 0);
    }
  }, [preview.data]);

  const basic = Number(preview.data?.basic_salary ?? 0);
  const net = useMemo(
    () => netPay({basic, earnings, deductions, lossOfPay, expense}),
    [basic, earnings, deductions, lossOfPay, expense],
  );
  const first = name.split(' ')[0];
  const label = monthName(month);

  const startEdit = (e: Editing, value: number) => {
    haptics.select();
    setDraft(String(value));
    setEditing(e);
  };
  const applyEdit = () => {
    const v = Math.max(0, Number(draft.replace(/[^0-9.]/g, '')) || 0);
    if (editing?.group === 'earning') {
      setEarnings(ls => ls.map((l, i) => (i === editing.index ? {...l, amount: v} : l)));
    } else if (editing?.group === 'deduction') {
      setDeductions(ls => ls.map((l, i) => (i === editing.index ? {...l, amount: v} : l)));
    } else if (editing?.group === 'lop') {
      setLossOfPay(v);
    } else if (editing?.group === 'expense') {
      setExpense(v);
    }
    setEditing(null);
  };

  const pctNote = (l: SalaryLine) =>
    l.amount_type === 'Percentage' && l.percentage ? `${l.percentage}% of basic` : null;
  const cleanLabel = (s: string) => s.replace(/\s*\(\d+(\.\d+)?%\)\s*$/, '');
  const shownEarnings = earnings.map((l, i) => ({l, i})).filter(x => showZero || x.l.amount > 0);
  const hiddenCount = earnings.filter(l => !(l.amount > 0)).length;

  return (
    <SetupScreen title={name} subtitle={`${label} salary`} query={preview}>
      <Gradient from={colors.heroFrom} to={colors.heroTo} style={{borderRadius: 20, padding: spacing.xl}}>
        <Text variant="overline" color="rgba(255,255,255,0.8)">
          Net pay
        </Text>
        <Text
          variant="h1"
          color="#FFFFFF"
          style={{fontSize: 34, lineHeight: 42}}
          accessibilityLiveRegion="polite">
          {formatMoney(net)}
        </Text>
        {preview.data ? (
          <Text variant="caption" color="rgba(255,255,255,0.85)">
            {preview.data.working_days} working days · {preview.data.absent_days} absent so far
          </Text>
        ) : null}
      </Gradient>

      <Card>
        <Text variant="overline" tone="muted">
          Earnings
        </Text>
        <Line first label="Basic salary" amount={basic} />
        {shownEarnings.map(({l, i}) => (
          <Line
            key={l.id}
            label={cleanLabel(l.label)}
            sub={pctNote(l)}
            amount={l.amount}
            onPress={() => startEdit({group: 'earning', index: i}, l.amount)}
          />
        ))}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: spacing.sm,
          }}>
          {hiddenCount ? (
            <Pressable onPress={() => setShowZero(v => !v)} accessibilityRole="button" hitSlop={8}>
              <Text variant="caption" tone="primary" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
                {showZero ? 'Hide ₹0 lines' : `${hiddenCount} more at ₹0`}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Text variant="label">Total {formatMoney(basic + sumLines(earnings))}</Text>
        </View>
      </Card>

      <Card>
        <Text variant="overline" tone="muted">
          Deductions
        </Text>
        {deductions.map((l, i) => (
          <Line
            key={l.id}
            first={i === 0}
            label={cleanLabel(l.label)}
            sub={pctNote(l)}
            amount={l.amount}
            negative
            onPress={() => startEdit({group: 'deduction', index: i}, l.amount)}
          />
        ))}
        <Line
          first={!deductions.length}
          label="Loss of pay"
          sub={preview.data ? `${preview.data.absent_days} absent days` : null}
          amount={lossOfPay}
          negative
          onPress={() => startEdit({group: 'lop'}, lossOfPay)}
        />
        <View style={{alignItems: 'flex-end', marginTop: spacing.sm}}>
          <Text variant="label">Total −{formatMoney(sumLines(deductions) + lossOfPay)}</Text>
        </View>
      </Card>

      <Card>
        <Line
          first
          label="Expenses to reimburse"
          amount={expense}
          onPress={() => startEdit({group: 'expense'}, expense)}
        />
      </Card>

      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Info size={16} color={colors.textMuted} />
        <Text variant="caption" tone="muted" style={{flex: 1}}>
          Tap any amount to adjust it for {label} only.
        </Text>
      </View>

      <Button
        title={`Pay ${formatMoney(net)} for ${label}`}
        icon={CircleCheck}
        disabled={!preview.data || net < 0}
        loading={save.isPending}
        onPress={() => setConfirm(true)}
      />

      <BottomSheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title="Adjust amount"
        subtitle={`Only for ${first}'s ${label} salary.`}>
        <TextField
          label="Amount (₹)"
          value={draft}
          onChangeText={setDraft}
          keyboardType="decimal-pad"
          autoFocus
        />
        <Button title="Apply" style={{marginTop: spacing.xl}} onPress={applyEdit} />
      </BottomSheet>

      <ConfirmDialog
        visible={confirm}
        icon={Wallet}
        title={`Pay ${formatMoney(net)} to ${first}?`}
        message={`Saves ${first}'s ${label} salary and makes the payslip available to them.`}
        confirmLabel="Pay"
        loading={save.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          preview.data &&
          save.mutate(
            {
              employeeId,
              month,
              basic,
              gross: net,
              lossOfPay,
              absentDays: preview.data.absent_days,
              workingDays: preview.data.working_days,
              expense,
              lines: [...earnings, ...deductions],
            },
            {
              onSuccess: () => {
                setConfirm(false);
                navigation.goBack();
              },
            },
          )
        }
      />
    </SetupScreen>
  );
}

function Line({
  label,
  sub,
  amount,
  negative,
  onPress,
  first,
}: {
  label: string;
  sub?: string | null;
  amount: number;
  negative?: boolean;
  onPress?: () => void;
  first?: boolean;
}) {
  const {colors, spacing} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Adjust this amount' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 10,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}>
      <View style={{flex: 1}}>
        <Text variant="body">{label}</Text>
        {sub ? (
          <Text variant="caption" tone="muted">
            {sub}
          </Text>
        ) : null}
      </View>
      <Text variant="title" color={negative && amount ? colors.danger : colors.text}>
        {negative && amount ? '−' : ''}
        {formatMoney(amount)}
      </Text>
      {onPress ? <Pencil size={14} color={colors.textSubtle} /> : null}
    </Pressable>
  );
}
