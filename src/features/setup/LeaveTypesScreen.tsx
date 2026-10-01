import React, {useEffect, useState} from 'react';
import {Pressable, Switch, View} from 'react-native';
import {CalendarOff, Minus, Plus, Trash2} from 'lucide-react-native';
import type {LeaveTypeRecord} from '../../api/types';
import {BottomSheet, Button, Card, ConfirmDialog, EmptyState, Text, TextField} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useDeleteLeaveType, useLeaveTypes, useSaveLeaveType} from './queries';
import {IconWell, SetupScreen, Tag} from './parts';

const isPaid = (t: LeaveTypeRecord) => Number(t.is_paid) === 1;

export function LeaveTypesScreen(_: AppScreenProps<'SetupLeaveTypes'>) {
  const {colors, spacing} = useTheme();
  const types = useLeaveTypes();
  const [editing, setEditing] = useState<LeaveTypeRecord | 'new' | null>(null);
  const list = types.data ?? [];

  return (
    <SetupScreen
      title="Leave types"
      subtitle={types.data ? `${list.length} ${list.length === 1 ? 'type' : 'types'}` : null}
      onAdd={() => setEditing('new')}
      query={types}>
      {!list.length ? (
        <EmptyState
          icon={CalendarOff}
          title="No leave types yet"
          message="Add the kinds of leave people can apply for."
        />
      ) : (
        list.map(t => (
          <Card key={t.id} onPress={() => setEditing(t)}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
              <IconWell icon={CalendarOff} fg={colors.info} bg={colors.infoSoft} />
              <View style={{flex: 1, minWidth: 0}}>
                <Text variant="title">{t.name}</Text>
                {t.description ? (
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {t.description}
                  </Text>
                ) : null}
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text variant="h3">{t.no_of_days}</Text>
                <Text variant="caption" tone="muted">
                  days / year
                </Text>
              </View>
            </View>
            <View style={{marginTop: spacing.sm}}>
              {isPaid(t) ? (
                <Tag label="Paid" fg={colors.success} bg={colors.successSoft} />
              ) : (
                <Tag label="Unpaid" fg={colors.textMuted} bg={colors.surfaceMuted} />
              )}
            </View>
          </Card>
        ))
      )}
      <LeaveTypeSheet
        type={editing === 'new' ? null : editing}
        visible={editing !== null}
        onClose={() => setEditing(null)}
      />
    </SetupScreen>
  );
}

function LeaveTypeSheet({
  type,
  visible,
  onClose,
}: {
  type: LeaveTypeRecord | null;
  visible: boolean;
  onClose: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const save = useSaveLeaveType();
  const remove = useDeleteLeaveType();
  const [name, setName] = useState('');
  const [days, setDays] = useState(12);
  const [paid, setPaid] = useState(true);
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(type?.name ?? '');
      setDays(type?.no_of_days ?? 12);
      setPaid(type ? isPaid(type) : true);
      setDescription(type?.description ?? '');
      setConfirmDelete(false);
    }
  }, [visible, type]);

  const step = (d: number) => {
    haptics.select();
    setDays(v => Math.min(365, Math.max(0, v + d)));
  };
  const stepBtn = (icon: typeof Plus, d: number, label: string) => {
    const Icon = icon;
    return (
      <Pressable
        onPress={() => step(d)}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={18} color={colors.text} />
      </Pressable>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={type ? 'Edit leave type' : 'Add leave type'}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Casual Leave" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.borderStrong,
        }}>
        <Text variant="label">Days per year</Text>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
          {stepBtn(Minus, -1, 'One day fewer')}
          <Text variant="h3" style={{minWidth: 32, textAlign: 'center'}} accessibilityLiveRegion="polite">
            {days}
          </Text>
          {stepBtn(Plus, 1, 'One day more')}
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.md,
        }}>
        <View style={{flex: 1}}>
          <Text variant="label">Paid leave</Text>
          <Text variant="caption" tone="muted">
            {paid ? 'Salary isn’t cut for these days.' : 'These days are unpaid.'}
          </Text>
        </View>
        <Switch
          value={paid}
          onValueChange={v => {
            haptics.select();
            setPaid(v);
          }}
          trackColor={{true: colors.primary, false: colors.border}}
          thumbColor="#FFFFFF"
        />
      </View>
      <View style={{marginTop: spacing.md}}>
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Shown when applying"
        />
      </View>
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl}}>
        {type ? (
          <Button
            title="Delete"
            icon={Trash2}
            variant="ghost"
            size="md"
            style={{flex: 1}}
            onPress={() => setConfirmDelete(true)}
          />
        ) : null}
        <Button
          title={type ? 'Save' : 'Add leave type'}
          size="md"
          style={{flex: 1.4}}
          disabled={!name.trim()}
          loading={save.isPending}
          onPress={() =>
            save.mutate(
              {id: type?.id, input: {name, no_of_days: days, description, paid}},
              {onSuccess: onClose},
            )
          }
        />
      </View>
      <ConfirmDialog
        visible={confirmDelete}
        icon={Trash2}
        destructive
        title={`Delete ${type?.name ?? 'this leave type'}?`}
        message="People can no longer apply for it. Leave already taken stays in their history."
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => type && remove.mutate(type.id, {onSuccess: onClose})}
      />
    </BottomSheet>
  );
}
