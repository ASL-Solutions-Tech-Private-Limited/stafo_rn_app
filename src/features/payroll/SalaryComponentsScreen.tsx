import React, {useState} from 'react';
import {Pressable, View} from 'react-native';
import {Trash2, Wallet} from 'lucide-react-native';
import type {SalaryComponentDef} from '../../api/types';
import {
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PressableScale,
  Text,
  TextField,
} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {SetupScreen, Tag} from '../setup/parts';
import {formatMoney} from './payrollLogic';
import {useCreateSalaryComponent, useDeleteSalaryComponent, useSalaryComponents} from './queries';

type Kind = 'Earning' | 'Deduction';

export function SalaryComponentsScreen(_: AppScreenProps<'SalaryComponents'>) {
  const {colors, spacing, radius} = useTheme();
  const components = useSalaryComponents();
  const remove = useDeleteSalaryComponent();
  const [kind, setKind] = useState<Kind>('Earning');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<SalaryComponentDef | null>(null);
  const all = components.data ?? [];
  const count = (k: Kind) => all.filter(c => c.payment_type === k).length;
  const list = all.filter(c => c.payment_type === kind);

  const value = (c: SalaryComponentDef) => {
    const n = Number(c.amount);
    if (c.amount_type === 'Percentage') {
      return <Tag label={`${n}% of basic`} fg={colors.accents[1].fg} bg={colors.accents[1].bg} />;
    }
    return n ? (
      <Tag label={formatMoney(n)} fg={colors.text} bg={colors.surfaceMuted} />
    ) : (
      <Tag label="Set per person" fg={colors.textMuted} bg={colors.surfaceMuted} />
    );
  };

  return (
    <SetupScreen
      title="Salary components"
      subtitle={components.data ? `${all.length} components` : null}
      onAdd={() => setAdding(true)}
      query={components}>
      <View
        style={{
          flexDirection: 'row',
          padding: 4,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceMuted,
        }}
        accessibilityRole="tablist">
        {(['Earning', 'Deduction'] as Kind[]).map(k => {
          const on = k === kind;
          return (
            <Pressable
              key={k}
              onPress={() => {
                haptics.select();
                setKind(k);
              }}
              accessibilityRole="tab"
              accessibilityState={{selected: on}}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? colors.surface : 'transparent',
              }}>
              <Text variant="label" color={on ? colors.text : colors.textMuted}>
                {k}s · {count(k)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!list.length ? (
        <EmptyState
          icon={Wallet}
          title={`No ${kind.toLowerCase()}s yet`}
          message="Add one to include it in every salary run."
        />
      ) : (
        <Card style={{padding: 0}}>
          {list.map((c, i) => (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}>
              <Text variant="title" style={{flex: 1}} numberOfLines={2}>
                {c.salary_type}
              </Text>
              {value(c)}
              <Pressable
                onPress={() => setRemoving(c)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${c.salary_type}`}>
                <Trash2 size={18} color={colors.textSubtle} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
      <Text variant="caption" tone="subtle">
        Components apply to every salary run. Amounts can still be adjusted per person when you run salary.
      </Text>

      <AddComponentSheet visible={adding} initialKind={kind} onClose={() => setAdding(false)} />
      <ConfirmDialog
        visible={!!removing}
        icon={Trash2}
        destructive
        title={`Remove ${removing?.salary_type ?? 'component'}?`}
        message="It won't appear in future salary runs. Salaries already paid don't change."
        confirmLabel="Remove"
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id, {onSuccess: () => setRemoving(null)})}
      />
    </SetupScreen>
  );
}

function Choice({label, on, onPress}: {label: string; on: boolean; onPress: () => void}) {
  const {colors} = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{checked: on}}
      style={{
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: on ? colors.primary : colors.border,
        backgroundColor: on ? colors.primarySoft : colors.surface,
        justifyContent: 'center',
      }}>
      <Text variant="label" color={on ? colors.primary : colors.textMuted}>
        {label}
      </Text>
    </PressableScale>
  );
}

function AddComponentSheet({
  visible,
  initialKind,
  onClose,
}: {
  visible: boolean;
  initialKind: Kind;
  onClose: () => void;
}) {
  const {spacing} = useTheme();
  const create = useCreateSalaryComponent();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [name, setName] = useState('');
  const [type, setType] = useState<'Flat' | 'Percentage'>('Flat');
  const [amount, setAmount] = useState('');
  const n = Number(amount.replace(/[^0-9.]/g, ''));
  const valid = !!name.trim() && Number.isFinite(n) && n >= 0 && (type === 'Flat' || n <= 100);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Add component"
      subtitle="It's added to every salary run from now on.">
      <View style={{flexDirection: 'row', gap: spacing.sm}}>
        <Choice label="Earning" on={kind === 'Earning'} onPress={() => setKind('Earning')} />
        <Choice label="Deduction" on={kind === 'Deduction'} onPress={() => setKind('Deduction')} />
      </View>
      <View style={{marginTop: spacing.md}}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder={kind === 'Earning' ? 'e.g. Night Shift Allowance' : 'e.g. Canteen'}
        />
      </View>
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md}}>
        <Choice label="₹ Flat amount" on={type === 'Flat'} onPress={() => setType('Flat')} />
        <Choice label="% of basic" on={type === 'Percentage'} onPress={() => setType('Percentage')} />
      </View>
      <View style={{marginTop: spacing.md}}>
        <TextField
          label={type === 'Flat' ? 'Amount (₹)' : 'Percent of basic'}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={type === 'Flat' ? '0 to set it per person' : 'e.g. 10'}
        />
      </View>
      <Button
        title="Add component"
        style={{marginTop: spacing.xl}}
        disabled={!valid}
        loading={create.isPending}
        onPress={() =>
          create.mutate(
            {kind, name, amount: n || 0, amountType: type},
            {
              onSuccess: () => {
                setName('');
                setAmount('');
                onClose();
              },
            },
          )
        }
      />
    </BottomSheet>
  );
}
