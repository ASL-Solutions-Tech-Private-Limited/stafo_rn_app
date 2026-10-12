import React, {useState} from 'react';
import {Image, Linking, View} from 'react-native';
import {Check, FileText, Pencil, Trash2, X} from 'lucide-react-native';
import {claimFileUrl, type ClaimAttachment} from '../../api/endpoints/expenses';
import {employeePhotoUrl} from '../../api/endpoints/people';
import {Avatar, Badge, Button, Card, ConfirmDialog, PressableScale, Text, toast} from '../../components/ui';
import {formatTime, parseServerDate} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {SetupScreen} from '../setup/parts';
import {formatRupees} from '../trips/tripLogic';
import {whenLabel} from '../trips/TripsScreen';
import {CLAIM_TONE, claimDay} from './ExpensesScreen';
import {activeFields, amountOf, CLAIM_LABEL, claimPhase} from './expenseLogic';
import {useCategories, useClaim, useDecideClaim, useDeleteClaim, useStaffById} from './queries';

const isImage = (name: string) => /\.(jpe?g|png|webp|heic|gif)$/i.test(name);

/** One claim: amount, who, the category's fields, bills, and the next step. */
export function ClaimScreen({navigation, route}: AppScreenProps<'Claim'>) {
  const {id} = route.params;
  const {spacing} = useTheme();
  const isCompany = useSession(s => s.role === 'company');
  const me = useSession(s => s.employee?.id);
  const claim = useClaim(id);
  const c = claim.data;
  const categories = useCategories();
  const category = categories.data?.find(x => x.id === c?.expensetype_id);
  const staff = useStaffById();
  const person = c ? staff.get(c.employee_id) : undefined;
  const decide = useDecideClaim();
  const remove = useDeleteClaim();
  const [confirm, setConfirm] = useState<'Approved' | 'Rejected' | 'delete' | null>(null);

  const phase = claimPhase(c?.status);
  const waiting = phase === 'waiting';
  const mine = !isCompany && c?.employee_id === me;
  // Field names come with the detail; fall back to the category for older rows.
  const names = new Map(activeFields(category).map(f => [f.id, f.field_name]));
  const details = (c?.expense_details ?? []).map(d => ({
    id: d.id,
    // Editing a category replaces its fields, so older values can lose their name.
    name: d.expense_form_details?.field_name ?? names.get(d.expenseform_id) ?? 'Removed field',
    value: d.expense_value?.trim() || '—',
  }));
  const submitted = parseServerDate(c?.created_at);
  const decided = parseServerDate(c?.updated_at);

  return (
    <SetupScreen
      title="Claim"
      subtitle={c ? [c.expense_type?.name ?? category?.name, claimDay(c)].filter(Boolean).join(' · ') : null}
      query={claim}>
      {c ? (
        <View style={{gap: spacing.md}}>
          <Card style={{alignItems: 'center', paddingVertical: spacing.xl}}>
            <Text variant="caption" tone="muted">
              Amount
            </Text>
            <Text variant="display">{formatRupees(amountOf(c))}</Text>
            <Badge
              label={CLAIM_LABEL[phase]}
              tone={CLAIM_TONE[phase]}
              dot
              style={{alignSelf: 'center', marginTop: 6}}
            />
          </Card>

          {isCompany ? (
            <Card
              onPress={() => navigation.navigate('EmployeeDetail', {id: c.employee_id, name: person?.name})}
              style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
              <Avatar
                name={person?.name ?? 'Employee'}
                uri={person ? employeePhotoUrl(person) : null}
                size={40}
              />
              <View style={{flex: 1}}>
                <Text variant="title">{person?.name ?? `Employee #${c.employee_id}`}</Text>
                <Text variant="caption" tone="muted">
                  {[person?.emp_id, person?.department_name].filter(Boolean).join(' · ') || 'Open profile'}
                </Text>
              </View>
            </Card>
          ) : null}

          {details.length ? (
            <Card style={{gap: spacing.md}}>
              <Text variant="overline" tone="muted">
                DETAILS
              </Text>
              {details.map(d => (
                <View key={d.id} style={{flexDirection: 'row', gap: spacing.md}}>
                  <Text variant="body" tone="muted" style={{flex: 1}}>
                    {d.name}
                  </Text>
                  <Text variant="title" style={{flex: 1.4, textAlign: 'right'}}>
                    {d.value}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {c.attachments?.length ? (
            <Card style={{gap: spacing.md}}>
              <Text variant="overline" tone="muted">
                {c.attachments.length === 1 ? 'BILL' : 'BILLS'}
              </Text>
              {c.attachments.map(a => (
                <Bill key={a.id} file={a} />
              ))}
            </Card>
          ) : null}

          <Text variant="caption" tone="muted" style={{textAlign: 'center'}}>
            {[
              submitted ? `Sent ${whenLabel(c.created_at)}` : null,
              !waiting && decided
                ? `${CLAIM_LABEL[phase]} ${formatTime(decided)}, ${claimDay({created_at: c.updated_at})}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>

          {isCompany && waiting ? (
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <Button
                title="Reject"
                icon={X}
                variant="danger"
                style={{flex: 1}}
                onPress={() => setConfirm('Rejected')}
              />
              <Button title="Approve" icon={Check} style={{flex: 1}} onPress={() => setConfirm('Approved')} />
            </View>
          ) : null}
          {mine && waiting ? (
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <Button
                title="Edit"
                icon={Pencil}
                variant="ghost"
                style={{flex: 1}}
                onPress={() => navigation.navigate('ClaimForm', {id})}
              />
              <Button
                title="Delete"
                icon={Trash2}
                variant="danger"
                style={{flex: 1}}
                onPress={() => setConfirm('delete')}
              />
            </View>
          ) : null}
          {mine && !waiting ? (
            <Text variant="caption" tone="muted" style={{textAlign: 'center'}}>
              A claim can’t be changed once it’s {CLAIM_LABEL[phase].toLowerCase()}.
            </Text>
          ) : null}
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirm != null}
        icon={confirm === 'Approved' ? Check : confirm === 'Rejected' ? X : Trash2}
        destructive={confirm !== 'Approved'}
        title={
          confirm === 'delete'
            ? 'Delete this claim?'
            : `${confirm === 'Approved' ? 'Approve' : 'Reject'} ${formatRupees(c ? amountOf(c) : 0)}${
                person?.name ? ` for ${person.name}` : ''
              }?`
        }
        message={
          confirm === 'delete' ? 'This can’t be undone.' : `They’ll see it as ${confirm?.toLowerCase()}.`
        }
        confirmLabel={confirm === 'delete' ? 'Delete' : confirm === 'Approved' ? 'Approve' : 'Reject'}
        loading={decide.isPending || remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'delete') {
            remove.mutate(id, {
              onSuccess: () => {
                setConfirm(null);
                navigation.goBack();
              },
            });
          } else if (confirm) {
            decide.mutate({id, status: confirm}, {onSettled: () => setConfirm(null)});
          }
        }}
      />
    </SetupScreen>
  );
}

function Bill({file}: {file: ClaimAttachment}) {
  const {colors, spacing, radius} = useTheme();
  const url = claimFileUrl(file.filename);
  const open = () => Linking.openURL(url).catch(() => toast.error('Couldn’t open the bill.'));
  return (
    <PressableScale
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Open ${file.filename}`}
      style={{borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted}}>
      {isImage(file.filename) ? (
        <Image
          source={{uri: url}}
          style={{width: '100%', height: 180}}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg}}>
          <FileText size={18} color={colors.primary} />
          <Text variant="label" tone="primary" numberOfLines={1} style={{flex: 1}}>
            {file.filename}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
