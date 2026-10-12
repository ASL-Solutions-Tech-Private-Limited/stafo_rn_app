import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {Camera, Check, FileText, Paperclip, X} from 'lucide-react-native';
import type {UploadFile} from '../../api/endpoints/tasks';
import {Button, Card, IconButton, Text, TextField} from '../../components/ui';
import {toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, DateButton, SetupScreen} from '../setup/parts';
import {pickFiles} from '../tasks/pickFiles';
import {takePhoto} from '../trips/queries';
import {
  activeFields,
  claimErrors,
  fieldKind,
  fromClaimDate,
  needsDocument,
  toClaimDate,
} from './expenseLogic';
import {useCategories, useClaim, useSaveClaim} from './queries';

/** A new claim, or changes to one that's still waiting. The fields come from the category. */
export function ClaimFormScreen({navigation, route}: AppScreenProps<'ClaimForm'>) {
  const editId = route.params?.id;
  const {colors, spacing} = useTheme();
  const categories = useCategories();
  const existing = useClaim(editId ?? 0, !!editId);
  const claim = editId ? existing.data : undefined;
  const save = useSaveClaim();

  const active = useMemo(
    () => (categories.data ?? []).filter(c => (c.status ?? 'Active').toLowerCase() === 'active'),
    [categories.data],
  );
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [values, setValues] = useState<Record<number, string>>({});
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [tried, setTried] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (claim && !loaded) {
      setCategoryId(claim.expensetype_id);
      setAmount(String(Number(claim.amount) || ''));
      setValues(
        Object.fromEntries((claim.expense_details ?? []).map(d => [d.expenseform_id, d.expense_value ?? ''])),
      );
      setLoaded(true);
    }
  }, [claim, loaded]);

  const category = (categories.data ?? []).find(c => c.id === categoryId) ?? null;
  const fields = activeFields(category);
  const errors = claimErrors(category, amount, values, files.length, !!editId);
  const hasError = Object.keys(errors).length > 0;
  const err = (k: string | number) => (tried ? errors[k] ?? null : null);
  const setValue = (id: number, v: string) => setValues(prev => ({...prev, [id]: v}));

  const addPhoto = async () => {
    const p = await takePhoto('bill');
    if (p) {
      setFiles(f => [...f, p]);
    }
  };
  const addFiles = async () => {
    const picked = await pickFiles();
    if (picked.length) {
      setFiles(f => [...f, ...picked]);
    }
  };

  const submit = () => {
    setTried(true);
    if (hasError || save.isPending) {
      if (hasError) {
        haptics.error();
      }
      return;
    }
    // Only the current category's fields are sent.
    const own = Object.fromEntries(fields.map(f => [f.id, values[f.id] ?? '']));
    save.mutate(
      {existing: claim, input: {categoryId: categoryId!, amount: amount.trim(), values: own, files}},
      {onSuccess: () => navigation.goBack()},
    );
  };

  return (
    <SetupScreen
      title={editId ? 'Edit claim' : 'New claim'}
      subtitle={claim?.expense_type?.name}
      query={editId ? existing : categories}>
      <View style={{gap: spacing.lg}}>
        {editId ? null : !active.length ? (
          <Card>
            <Text variant="title">No categories yet</Text>
            <Text variant="caption" tone="muted">
              Your company hasn’t set up what can be claimed. Ask your admin to add expense categories.
            </Text>
          </Card>
        ) : (
          <View style={{gap: 6}}>
            <ChoiceChips
              label="Category"
              items={active.map(c => ({value: c.id, label: c.name.trim()}))}
              value={categoryId}
              onChange={setCategoryId}
            />
            {err('category') ? (
              <Text variant="caption" tone="danger">
                {err('category')}
              </Text>
            ) : null}
          </View>
        )}

        {category ? (
          <>
            <TextField
              label="Amount"
              prefix="₹"
              placeholder="e.g. 450"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              maxLength={10}
              error={err('amount')}
            />
            {fields.length ? (
              <Card style={{gap: spacing.md}}>
                <Text variant="overline" tone="muted">
                  {category.name.trim().toUpperCase()} DETAILS
                </Text>
                {fields.map(f => {
                  const kind = fieldKind(f.field_type);
                  const value = values[f.id] ?? '';
                  if (kind === 'date') {
                    const d = fromClaimDate(value);
                    return (
                      <View key={f.id} style={{flexDirection: 'row'}}>
                        <View style={{flex: 1}}>
                          <DateButton
                            label={f.field_name.trim()}
                            value={d ? toDateKey(d) : ''}
                            max={toDateKey()}
                            onChange={k => setValue(f.id, toClaimDate(new Date(`${k}T00:00:00`)))}
                          />
                          {err(f.id) ? (
                            <Text variant="caption" tone="danger" style={{marginTop: 4}}>
                              {err(f.id)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  }
                  return (
                    <TextField
                      key={f.id}
                      label={f.field_name.trim()}
                      value={value}
                      onChangeText={v => setValue(f.id, v)}
                      keyboardType={kind === 'number' ? 'decimal-pad' : 'default'}
                      multiline={kind === 'notes'}
                      maxLength={kind === 'notes' ? 500 : 120}
                      error={err(f.id)}
                    />
                  );
                })}
              </Card>
            ) : null}

            {editId ? (
              <Text variant="caption" tone="muted">
                Bills can’t be changed after sending. Delete the claim and send it again to change them.
              </Text>
            ) : (
              <View style={{gap: spacing.sm}}>
                <Text variant="label">
                  Bill
                  <Text variant="caption" tone="muted">
                    {needsDocument(category) ? ' · required' : ` · optional for ${category.name.trim()}`}
                  </Text>
                </Text>
                {files.map((f, i) => (
                  <View
                    key={`${f.uri}-${i}`}
                    style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
                    <Paperclip size={16} color={colors.textMuted} />
                    <Text variant="body" numberOfLines={1} style={{flex: 1}}>
                      {f.name}
                    </Text>
                    <IconButton
                      icon={X}
                      variant="plain"
                      size={32}
                      accessibilityLabel={`Remove ${f.name}`}
                      onPress={() => setFiles(list => list.filter((_, j) => j !== i))}
                    />
                  </View>
                ))}
                <View style={{flexDirection: 'row', gap: spacing.sm}}>
                  <Button
                    title="Photo"
                    icon={Camera}
                    variant="ghost"
                    size="sm"
                    style={{flex: 1}}
                    onPress={addPhoto}
                  />
                  <Button
                    title="File"
                    icon={FileText}
                    variant="ghost"
                    size="sm"
                    style={{flex: 1}}
                    onPress={addFiles}
                  />
                </View>
                {err('files') ? (
                  <Text variant="caption" tone="danger">
                    {err('files')}
                  </Text>
                ) : null}
              </View>
            )}

            <Button
              title={editId ? 'Save changes' : 'Send for approval'}
              icon={Check}
              loading={save.isPending}
              disabled={save.isPending || !loaded}
              onPress={submit}
            />
          </>
        ) : null}
      </View>
    </SetupScreen>
  );
}
