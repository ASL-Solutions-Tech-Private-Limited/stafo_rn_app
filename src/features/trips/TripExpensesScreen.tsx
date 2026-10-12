import React, {useState} from 'react';
import {Image, View} from 'react-native';
import {
  BedDouble,
  Camera,
  Check,
  CircleParking,
  Fuel,
  Receipt,
  RotateCcw,
  Ticket,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import type {UploadFile} from '../../api/endpoints/tasks';
import type {TripExpense} from '../../api/endpoints/trips';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  PressableScale,
  Skeleton,
  Text,
  TextField,
} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, IconWell, SetupScreen} from '../setup/parts';
import {whenLabel} from './TripsScreen';
import {takePhoto, useAddTripExpense, useTripExpenses} from './queries';
import {amountError, EXPENSE_TYPES, formatRupees, toNumber} from './tripLogic';

const ICON: Record<string, LucideIcon> = {
  parking: CircleParking,
  food: UtensilsCrossed,
  repair: Wrench,
  fuel: Fuel,
  toll: Ticket,
  accommodation: BedDouble,
};

/** A trip's bills. New ones can be added only while the trip is on. */
export function TripExpensesScreen({route}: AppScreenProps<'TripExpenses'>) {
  const {id, title, open} = route.params;
  const {spacing} = useTheme();
  const expenses = useTripExpenses(id);
  const list = [...(expenses.data ?? [])].sort((a, b) => b.id - a.id);
  const total = list.reduce((s, e) => s + (toNumber(e.amount) ?? 0), 0);
  const [adding, setAdding] = useState(false);

  return (
    <SetupScreen
      title="Trip expenses"
      subtitle={title}
      onAdd={open ? () => setAdding(true) : undefined}
      addLabel="Expense"
      query={expenses}>
      {expenses.isPending ? (
        <Skeleton height={120} radius={20} />
      ) : (
        <View style={{gap: spacing.md}}>
          <Card style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <View>
              <Text variant="caption" tone="muted">
                Total
              </Text>
              <Text variant="h1">{formatRupees(total)}</Text>
            </View>
            <Text variant="caption" tone="muted">
              {list.length} {list.length === 1 ? 'bill' : 'bills'}
            </Text>
          </Card>
          {list.length ? (
            <Card padded={false}>
              {list.map((e, i) => (
                <ExpenseRow key={e.id} expense={e} first={i === 0} />
              ))}
            </Card>
          ) : (
            <Card>
              <EmptyState
                compact
                icon={Receipt}
                title="No expenses"
                message={
                  open
                    ? 'Add fuel, tolls, parking and other bills as they come.'
                    : 'Nothing was spent on this trip.'
                }
              />
            </Card>
          )}
          {!open ? (
            <Text variant="caption" tone="muted" style={{textAlign: 'center'}}>
              This trip has ended, so expenses can’t be added.
            </Text>
          ) : null}
        </View>
      )}
      <AddExpenseSheet tripId={id} visible={adding} onClose={() => setAdding(false)} />
    </SetupScreen>
  );
}

function ExpenseRow({expense, first}: {expense: TripExpense; first: boolean}) {
  const {colors, spacing} = useTheme();
  const type = expense.expense_type?.trim() || 'Others';
  const accent =
    colors.accents[
      Math.max(
        0,
        EXPENSE_TYPES.findIndex(t => t.toLowerCase() === type.toLowerCase()),
      ) % colors.accents.length
    ];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}>
      <IconWell icon={ICON[type.toLowerCase()] ?? Receipt} fg={accent.fg} bg={accent.bg} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title">{type}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {[whenLabel(expense.created_at), expense.note?.trim()].filter(Boolean).join(' · ') || '—'}
        </Text>
      </View>
      <Text variant="h3">{formatRupees(toNumber(expense.amount) ?? 0)}</Text>
    </View>
  );
}

function AddExpenseSheet({
  tripId,
  visible,
  onClose,
}: {
  tripId: number;
  visible: boolean;
  onClose: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const add = useAddTripExpense();
  const [type, setType] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<UploadFile | null>(null);
  const [tried, setTried] = useState(false);

  const reset = () => {
    setType(null);
    setAmount('');
    setNote('');
    setReceipt(null);
    setTried(false);
  };

  const errors = {
    type: type ? null : 'Pick what it was for.',
    amount: amountError(amount),
    receipt: receipt ? null : 'Take a photo of the bill.',
  };
  const hasError = Object.values(errors).some(Boolean);

  const submit = () => {
    setTried(true);
    if (hasError || add.isPending) {
      haptics.error();
      return;
    }
    add.mutate(
      {tripId, type: type!, amount: amount.trim(), note, receipt: receipt!},
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={reset} title="Add expense">
      <View style={{gap: spacing.lg}}>
        <View style={{gap: 6}}>
          <ChoiceChips
            label="For"
            items={EXPENSE_TYPES.map(t => ({value: t as string, label: t === 'Accommodation' ? 'Stay' : t}))}
            value={type}
            onChange={setType}
          />
          {tried && errors.type ? (
            <Text variant="caption" tone="danger">
              {errors.type}
            </Text>
          ) : null}
        </View>
        <TextField
          label="Amount"
          prefix="₹"
          placeholder="e.g. 250"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          maxLength={9}
          error={tried ? errors.amount : null}
        />
        <View>
          <Text variant="label">Bill photo</Text>
          <PressableScale
            onPress={async () => {
              haptics.tap();
              const p = await takePhoto(`bill-${tripId}`);
              if (p) {
                setReceipt(p);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={receipt ? 'Retake the bill photo' : 'Take a photo of the bill'}
            style={{
              marginTop: 6,
              height: 96,
              borderRadius: radius.lg,
              borderWidth: receipt ? 0 : 1.5,
              borderStyle: 'dashed',
              borderColor: tried && errors.receipt ? colors.danger : colors.borderStrong,
              backgroundColor: colors.surfaceMuted,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {receipt ? (
              <>
                <Image
                  source={{uri: receipt.uri}}
                  style={{position: 'absolute', width: '100%', height: '100%'}}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                  }}>
                  <RotateCcw size={14} color="#FFFFFF" />
                  <Text variant="caption" color="#FFFFFF" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
                    Retake
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Camera size={22} color={colors.primary} />
                <Text variant="label" tone="primary" style={{marginTop: 4}}>
                  Take photo
                </Text>
              </>
            )}
          </PressableScale>
          {tried && errors.receipt ? (
            <Text variant="caption" tone="danger" style={{marginTop: 4}}>
              {errors.receipt}
            </Text>
          ) : null}
        </View>
        <TextField label="Note" placeholder="Optional" value={note} onChangeText={setNote} maxLength={250} />
        <Button title="Add expense" icon={Check} loading={add.isPending} onPress={submit} />
      </View>
    </BottomSheet>
  );
}
