import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {Check, List, Paperclip, Wallet, X} from 'lucide-react-native';
import type {Claim, ExpenseCategory} from '../../api/endpoints/expenses';
import {employeePhotoUrl} from '../../api/endpoints/people';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Skeleton,
  Text,
  type BadgeTone,
} from '../../components/ui';
import {formatDay, parseServerDate} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, IconWell, SetupScreen} from '../setup/parts';
import {formatRupees} from '../trips/tripLogic';
import {
  amountOf,
  CLAIM_LABEL,
  claimPhase,
  claimSummary,
  claimTotals,
  filterClaims,
  type ClaimFilter,
  type ClaimPhase,
} from './expenseLogic';
import {useCategories, useClaims, useDecideClaim, useStaffById} from './queries';

export const CLAIM_TONE: Record<ClaimPhase, BadgeTone> = {
  waiting: 'warning',
  approved: 'success',
  rejected: 'danger',
};

/** "26 Jun 2025", without the year when it's this year. */
export function claimDay(claim: Pick<Claim, 'created_at'>, now = new Date()) {
  const d = parseServerDate(claim.created_at);
  if (!d) {
    return null;
  }
  return `${formatDay(d)}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
}

/** The same accent for a category everywhere. */
export function useCategoryAccent() {
  const {colors} = useTheme();
  return (categoryId: number) => colors.accents[categoryId % colors.accents.length];
}

/** Claims to approve for the company; their own claims for an employee. */
export function ExpensesScreen({navigation}: AppScreenProps<'Expenses'>) {
  const {colors, spacing} = useTheme();
  const isCompany = useSession(s => s.role === 'company');
  const claims = useClaims();
  const categories = useCategories();
  const personById = useStaffById();
  const list = useMemo(() => claims.data ?? [], [claims.data]);
  const totals = claimTotals(list);
  const [filter, setFilter] = useState<ClaimFilter>(isCompany && totals.waiting ? 'waiting' : 'all');
  const shown = filterClaims(list, filter);
  const catById = useMemo(() => new Map((categories.data ?? []).map(c => [c.id, c])), [categories.data]);
  const decide = useDecideClaim();
  const [deciding, setDeciding] = useState<string | null>(null);
  // Approving is one tap; rejecting asks first, as in Approvals.
  const [rejecting, setRejecting] = useState<Claim | null>(null);
  const run = (c: Claim, status: 'Approved' | 'Rejected') => {
    setDeciding(`${c.id}-${status}`);
    decide.mutate({id: c.id, status}, {onSettled: () => setDeciding(null)});
  };
  const rejectingName = rejecting ? personById.get(rejecting.employee_id)?.name : undefined;

  const chip = (p: ClaimPhase) => ({
    value: p as ClaimFilter,
    label: totals[p]
      ? `${isCompany && p === 'waiting' ? 'To review' : CLAIM_LABEL[p]} · ${totals[p]}`
      : CLAIM_LABEL[p],
  });
  const waitingCards = isCompany ? shown.filter(c => claimPhase(c.status) === 'waiting') : [];
  const rows = isCompany ? shown.filter(c => claimPhase(c.status) !== 'waiting') : shown;

  return (
    <SetupScreen
      title={isCompany ? 'Expenses' : 'My expenses'}
      subtitle={
        claims.data
          ? isCompany
            ? `${list.length} ${list.length === 1 ? 'claim' : 'claims'}${
                categories.data ? ` · ${categories.data.length} categories` : ''
              }`
            : 'Claims you’ve made'
          : null
      }
      action={
        isCompany ? (
          <IconButton
            icon={List}
            accessibilityLabel="Categories"
            onPress={() => navigation.navigate('ExpenseCategories')}
          />
        ) : undefined
      }
      onAdd={isCompany ? undefined : () => navigation.navigate('ClaimForm', {})}
      addLabel="Claim"
      query={claims}>
      {claims.isPending ? (
        <View style={{gap: spacing.md}}>
          <Skeleton height={76} radius={16} />
          <Skeleton height={150} radius={20} />
        </View>
      ) : !list.length ? (
        <Card>
          <EmptyState
            compact
            icon={Wallet}
            title="No claims yet"
            message={
              isCompany
                ? 'When your team claims money they spent for work, it shows here for you to approve.'
                : 'Spent money for work? Add a claim and your company will approve it.'
            }
            action={
              isCompany ? (
                <Button
                  title="Set up categories"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => navigation.navigate('ExpenseCategories')}
                />
              ) : undefined
            }
          />
        </Card>
      ) : (
        <View style={{gap: spacing.md}}>
          {isCompany ? (
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <Tile
                n={String(totals.waiting)}
                label="To review"
                color={totals.waiting ? colors.warning : colors.textMuted}
              />
              <Tile n={formatRupees(totals.waitingAmount)} label="Waiting" color={colors.text} />
              <Tile n={formatRupees(totals.approvedAmount)} label="Approved" color={colors.success} />
            </View>
          ) : (
            <Card style={{backgroundColor: colors.heroFrom, borderColor: 'transparent'}}>
              <Text variant="overline" color="rgba(255,255,255,0.8)">
                WAITING FOR APPROVAL
              </Text>
              <Text variant="display" color="#FFFFFF">
                {formatRupees(totals.waitingAmount)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.85)">
                {totals.waiting} {totals.waiting === 1 ? 'claim' : 'claims'} ·{' '}
                {formatRupees(totals.approvedAmount)} approved so far
              </Text>
            </Card>
          )}
          <ChoiceChips
            scroll
            items={
              isCompany
                ? [
                    chip('waiting'),
                    chip('approved'),
                    chip('rejected'),
                    {value: 'all' as ClaimFilter, label: 'All'},
                  ]
                : [
                    {value: 'all' as ClaimFilter, label: `All · ${list.length}`},
                    chip('waiting'),
                    chip('approved'),
                    chip('rejected'),
                  ]
            }
            value={filter}
            onChange={setFilter}
          />
          {waitingCards.map(c => (
            <ReviewCard
              key={c.id}
              claim={c}
              category={catById.get(c.expensetype_id)}
              name={personById.get(c.employee_id)?.name ?? `Employee #${c.employee_id}`}
              photo={personById.get(c.employee_id) ? employeePhotoUrl(personById.get(c.employee_id)!) : null}
              busy={
                deciding?.startsWith(`${c.id}-`)
                  ? deciding.endsWith('Approved')
                    ? 'Approved'
                    : 'Rejected'
                  : null
              }
              onOpen={() => navigation.navigate('Claim', {id: c.id})}
              onDecide={status => (status === 'Rejected' ? setRejecting(c) : run(c, status))}
            />
          ))}
          {rows.length ? (
            <>
              {waitingCards.length ? (
                <Text variant="overline" tone="muted" style={{marginTop: spacing.xs}}>
                  EARLIER
                </Text>
              ) : null}
              <Card padded={false}>
                {rows.map((c, i) => (
                  <ClaimRow
                    key={c.id}
                    claim={c}
                    first={i === 0}
                    category={catById.get(c.expensetype_id)}
                    who={isCompany ? personById.get(c.employee_id)?.name : undefined}
                    onPress={() => navigation.navigate('Claim', {id: c.id})}
                  />
                ))}
              </Card>
            </>
          ) : !waitingCards.length ? (
            <Card>
              <EmptyState compact icon={Wallet} title="No claims here" message="Try another filter." />
            </Card>
          ) : null}
        </View>
      )}
      <ConfirmDialog
        visible={rejecting != null}
        icon={X}
        destructive
        title={`Reject ${rejecting ? formatRupees(amountOf(rejecting)) : ''}${
          rejectingName ? ` for ${rejectingName}` : ''
        }?`}
        message="They’ll see it as rejected. This can’t be undone."
        confirmLabel="Reject"
        onCancel={() => setRejecting(null)}
        onConfirm={() => {
          if (rejecting) {
            run(rejecting, 'Rejected');
          }
          setRejecting(null);
        }}
      />
    </SetupScreen>
  );
}

function Tile({n, label, color}: {n: string; label: string; color: string}) {
  return (
    <Card style={{flex: 1, paddingVertical: 12}}>
      <Text variant="h3" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {n}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function ReviewCard({
  claim,
  category,
  name,
  photo,
  busy,
  onOpen,
  onDecide,
}: {
  claim: Claim;
  category?: ExpenseCategory;
  name: string;
  photo?: string | null;
  busy: 'Approved' | 'Rejected' | null;
  onOpen: () => void;
  onDecide: (status: 'Approved' | 'Rejected') => void;
}) {
  const {colors, spacing} = useTheme();
  const summary = claimSummary(claim, category);
  const files = claim.attachments?.length ?? 0;
  return (
    <Card onPress={onOpen} accessibilityLabel={`${name}, ${formatRupees(amountOf(claim))}, waiting`}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
        <Avatar name={name} uri={photo} size={40} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="title" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {[claim.expense_type?.name ?? category?.name, claimDay(claim)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text variant="h3">{formatRupees(amountOf(claim))}</Text>
      </View>
      {summary || files ? (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm}}>
          {summary ? (
            <Text variant="caption" numberOfLines={1} style={{flex: 1}}>
              {summary}
            </Text>
          ) : (
            <View style={{flex: 1}} />
          )}
          {files ? (
            <>
              <Paperclip size={13} color={colors.textMuted} />
              <Text variant="caption" tone="muted">
                {files} {files === 1 ? 'bill' : 'bills'}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md}}>
        <Button
          title="Reject"
          icon={X}
          variant="danger"
          size="sm"
          style={{flex: 1}}
          loading={busy === 'Rejected'}
          disabled={!!busy}
          onPress={() => onDecide('Rejected')}
        />
        <Button
          title="Approve"
          icon={Check}
          size="sm"
          style={{flex: 1}}
          loading={busy === 'Approved'}
          disabled={!!busy}
          onPress={() => onDecide('Approved')}
        />
      </View>
    </Card>
  );
}

function ClaimRow({
  claim,
  category,
  who,
  first,
  onPress,
}: {
  claim: Claim;
  category?: ExpenseCategory;
  who?: string;
  first: boolean;
  onPress: () => void;
}) {
  const {colors, spacing} = useTheme();
  const accent = useCategoryAccent()(claim.expensetype_id);
  const phase = claimPhase(claim.status);
  const typeName = claim.expense_type?.name ?? category?.name ?? 'Expense';
  const files = claim.attachments?.length ?? 0;
  const detail = [
    claimDay(claim),
    claimSummary(claim, category),
    files ? `${files} ${files === 1 ? 'bill' : 'bills'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      onPress={onPress}
      elevated={false}
      accessibilityLabel={`${typeName}, ${formatRupees(amountOf(claim))}, ${CLAIM_LABEL[phase]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderWidth: 0,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        borderRadius: 0,
        backgroundColor: 'transparent',
      }}>
      <IconWell icon={Wallet} fg={accent.fg} bg={accent.bg} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title" numberOfLines={1}>
          {who ? `${typeName} · ${who}` : typeName}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {detail || '—'}
        </Text>
      </View>
      <View style={{alignItems: 'flex-end', gap: 4}}>
        <Text variant="title">{formatRupees(amountOf(claim))}</Text>
        <Badge label={CLAIM_LABEL[phase]} tone={CLAIM_TONE[phase]} dot />
      </View>
    </Card>
  );
}
