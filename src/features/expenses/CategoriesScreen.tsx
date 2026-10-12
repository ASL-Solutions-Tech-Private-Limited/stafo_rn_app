import React, {useEffect, useState} from 'react';
import {Switch, View} from 'react-native';
import {Check, ChevronRight, Plus, Trash2, Wallet, X} from 'lucide-react-native';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PressableScale,
  Text,
  TextField,
} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {IconWell, SetupScreen} from '../setup/parts';
import {useCategoryAccent} from './ExpensesScreen';
import {
  activeFields,
  FIELD_KINDS,
  fieldKind,
  needsDocument,
  serverType,
  type FieldKind,
} from './expenseLogic';
import {useCategories, useDeleteCategory, useSaveCategory} from './queries';

/** What employees can claim for, and the fields each one asks for. */
export function CategoriesScreen({navigation}: AppScreenProps<'ExpenseCategories'>) {
  const {colors, spacing} = useTheme();
  const categories = useCategories();
  const accent = useCategoryAccent();
  const list = categories.data ?? [];
  return (
    <SetupScreen
      title="Categories"
      subtitle="What people can claim for"
      onAdd={() => navigation.navigate('CategoryForm', {})}
      addLabel="Category"
      query={categories}>
      {list.length ? (
        <Card padded={false}>
          {list.map((c, i) => {
            const fields = activeFields(c);
            const a = accent(c.id);
            const sub = [
              `${fields.length} ${fields.length === 1 ? 'field' : 'fields'}`,
              needsDocument(c) ? 'bill required' : fields.map(f => f.field_name.trim()).join(', '),
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <PressableScale
                key={c.id}
                onPress={() => navigation.navigate('CategoryForm', {id: c.id})}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${sub}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <IconWell icon={Wallet} fg={a.fg} bg={a.bg} />
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="title">{c.name.trim()}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {sub}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textSubtle} />
              </PressableScale>
            );
          })}
        </Card>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={Wallet}
            title="No categories yet"
            message="Add what people can claim for, like Travel or Food, and the details each one needs."
          />
        </Card>
      )}
    </SetupScreen>
  );
}

type DraftField = {key: string; name: string; kind: FieldKind};

let nextKey = 0;
const newField = (name = '', kind: FieldKind = 'text'): DraftField => ({key: `f${nextKey++}`, name, kind});

/** Add a category, or change one: name, whether a bill is required, and its fields. */
export function CategoryFormScreen({navigation, route}: AppScreenProps<'CategoryForm'>) {
  const editId = route.params?.id;
  const {colors, spacing, radius} = useTheme();
  const categories = useCategories();
  const existing = editId ? categories.data?.find(c => c.id === editId) : undefined;
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [name, setName] = useState('');
  const [docRequired, setDocRequired] = useState(false);
  const [fields, setFields] = useState<DraftField[]>(
    editId ? [] : [newField('Date', 'date'), newField('Reason', 'notes')],
  );
  const [tried, setTried] = useState(false);
  const [loaded, setLoaded] = useState(!editId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name.trim());
      setDocRequired(needsDocument(existing));
      setFields(activeFields(existing).map(f => newField(f.field_name.trim(), fieldKind(f.field_type))));
      setLoaded(true);
    }
  }, [existing, loaded]);

  const nameError = !name.trim() ? 'Give the category a name.' : null;
  const fieldErrors = fields.map(f =>
    !f.name.trim()
      ? 'Name this field, or remove it.'
      : fields.some(g => g !== f && g.name.trim().toLowerCase() === f.name.trim().toLowerCase())
      ? 'Two fields have this name.'
      : null,
  );
  const hasError = !!nameError || fieldErrors.some(Boolean);

  const update = (key: string, patch: Partial<DraftField>) =>
    setFields(list => list.map(f => (f.key === key ? {...f, ...patch} : f)));
  const cycle = (k: FieldKind) =>
    FIELD_KINDS[(FIELD_KINDS.findIndex(x => x.kind === k) + 1) % FIELD_KINDS.length].kind;

  const submit = () => {
    setTried(true);
    if (hasError || save.isPending) {
      haptics.error();
      return;
    }
    save.mutate(
      {
        id: editId,
        input: {
          name,
          documentRequired: docRequired,
          fields: fields.map(f => ({name: f.name, type: serverType(f.kind)})),
        },
      },
      {onSuccess: () => navigation.goBack()},
    );
  };

  return (
    <SetupScreen
      title={editId ? 'Edit category' : 'New category'}
      subtitle={existing?.name.trim()}
      query={editId ? categories : undefined}>
      <View style={{gap: spacing.lg}}>
        <TextField
          label="Name"
          placeholder="e.g. Travel"
          value={name}
          onChangeText={setName}
          maxLength={60}
          error={tried ? nameError : null}
        />
        <Card style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
          <View style={{flex: 1}}>
            <Text variant="label">Bill required</Text>
            <Text variant="caption" tone="muted">
              {docRequired ? 'People must attach a photo or file.' : 'A bill is optional.'}
            </Text>
          </View>
          <Switch
            value={docRequired}
            onValueChange={v => {
              haptics.select();
              setDocRequired(v);
            }}
            trackColor={{true: colors.primary, false: colors.border}}
            thumbColor="#FFFFFF"
          />
        </Card>

        <View style={{gap: spacing.sm}}>
          <Text variant="label">Fields people fill in</Text>
          <Text variant="caption" tone="muted">
            Amount is always asked. Tap a type to change it.
          </Text>
          {fields.map((f, i) => (
            <View key={f.key} style={{gap: 4}}>
              <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm}}>
                <TextField
                  placeholder={`Field ${i + 1}`}
                  value={f.name}
                  onChangeText={v => update(f.key, {name: v})}
                  maxLength={40}
                  containerStyle={{flex: 1}}
                  error={tried && fieldErrors[i] ? ' ' : null}
                />
                <PressableScale
                  onPress={() => {
                    haptics.select();
                    update(f.key, {kind: cycle(f.kind)});
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Type: ${
                    FIELD_KINDS.find(k => k.kind === f.kind)!.label
                  }. Tap to change.`}
                  style={{
                    height: 52,
                    minWidth: 76,
                    paddingHorizontal: 12,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text variant="label" tone="primary">
                    {FIELD_KINDS.find(k => k.kind === f.kind)!.label}
                  </Text>
                </PressableScale>
                <IconButton
                  icon={X}
                  variant="plain"
                  size={52}
                  accessibilityLabel={`Remove ${f.name || `field ${i + 1}`}`}
                  onPress={() => setFields(list => list.filter(g => g.key !== f.key))}
                />
              </View>
              {tried && fieldErrors[i] ? (
                <Text variant="caption" tone="danger">
                  {fieldErrors[i]}
                </Text>
              ) : null}
            </View>
          ))}
          <Button
            title="Add field"
            icon={Plus}
            variant="ghost"
            onPress={() => setFields(list => [...list, newField()])}
          />
        </View>

        <Button
          title={editId ? 'Save category' : 'Add category'}
          icon={Check}
          loading={save.isPending}
          disabled={save.isPending || !loaded}
          onPress={submit}
        />
        {editId ? (
          <Button
            title="Remove category"
            icon={Trash2}
            variant="ghost"
            onPress={() => setConfirmDelete(true)}
          />
        ) : null}
      </View>
      <ConfirmDialog
        visible={confirmDelete}
        icon={Trash2}
        destructive
        title={`Remove ${existing?.name.trim() ?? 'this category'}?`}
        message="People won’t be able to claim for it any more. This can’t be undone."
        confirmLabel="Remove"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          editId &&
          remove.mutate(editId, {
            onSuccess: () => {
              setConfirmDelete(false);
              navigation.goBack();
            },
          })
        }
      />
    </SetupScreen>
  );
}
