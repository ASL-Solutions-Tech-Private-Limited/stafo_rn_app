import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {Check, Pencil, SlidersHorizontal, Star, Trash2} from 'lucide-react-native';
import {employeePhotoUrl} from '../../api/endpoints/people';
import type {ScoringType} from '../../api/endpoints/performance';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PressableScale,
  Skeleton,
  Text,
  TextField,
} from '../../components/ui';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useStaffById} from '../expenses/queries';
import {IconWell, SetupScreen} from '../setup/parts';
import {MonthStepper, ScoreSheet} from './parts';
import {rankRows, thisMonth, type Month} from './performanceLogic';
import {useDeleteScoringType, useRankings, useSaveScoringType, useScoringTypes} from './queries';

/** Pick a month, see who still needs scores, and score them. */
export function PerformanceScreen({navigation, route}: AppScreenProps<'Performance'>) {
  const {colors, spacing} = useTheme();
  const [month, setMonth] = useState<Month>(route.params?.month ?? thisMonth());
  const types = useScoringTypes();
  const rankings = useRankings(month);
  const staff = useStaffById();
  const [scoring, setScoring] = useState<{id: number; name: string} | null>(null);

  const scored = useMemo(() => rankRows(rankings.data ?? []), [rankings.data]);
  const scoredIds = new Set(scored.map(r => r.employeeId));
  // Everyone active today who hasn't been scored for the month.
  const waiting = [...staff.values()]
    .filter(e => (e.status ?? '1') === '1' && !scoredIds.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const total = waiting.length + scored.length;

  return (
    <SetupScreen
      title="Performance"
      subtitle={
        types.data ? `${types.data.length} scoring ${types.data.length === 1 ? 'type' : 'types'}` : null
      }
      action={
        <IconButton
          icon={SlidersHorizontal}
          accessibilityLabel="Scoring types"
          onPress={() => navigation.navigate('ScoringTypes')}
        />
      }
      query={rankings}>
      <View style={{gap: spacing.md}}>
        <MonthStepper
          value={month}
          onChange={setMonth}
          caption={total ? `${scored.length} of ${total} scored` : undefined}
        />
        {total ? (
          <View style={{height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden'}}>
            <View
              style={{
                width: `${(scored.length / total) * 100}%`,
                height: '100%',
                backgroundColor: colors.primary,
              }}
            />
          </View>
        ) : null}

        {types.data && !types.data.length ? (
          <Card>
            <EmptyState
              compact
              icon={Star}
              title="Add what you score on"
              message="Set up scoring types, like Punctuality or Sales target, then score your team each month."
              action={
                <Button
                  title="Add scoring types"
                  size="sm"
                  fullWidth={false}
                  onPress={() => navigation.navigate('ScoringTypes')}
                />
              }
            />
          </Card>
        ) : null}

        {waiting.length ? (
          <>
            <Text variant="overline" tone="muted">
              NOT SCORED YET
            </Text>
            <Card padded={false}>
              {waiting.map((e, i) => (
                <PersonRow
                  key={e.id}
                  first={i === 0}
                  name={e.name}
                  photo={employeePhotoUrl(e)}
                  sub={e.position ?? e.department_name ?? null}
                  right={
                    <Text variant="label" tone="primary">
                      Score
                    </Text>
                  }
                  onPress={() => setScoring({id: e.id, name: e.name})}
                />
              ))}
            </Card>
          </>
        ) : staff.size === 0 && !scored.length ? (
          <Skeleton height={120} radius={20} />
        ) : null}

        {scored.length ? (
          <>
            <Text variant="overline" tone="muted">
              SCORED
            </Text>
            <Card padded={false}>
              {scored.map((r, i) => {
                const e = staff.get(r.employeeId);
                return (
                  <PersonRow
                    key={r.employeeId}
                    first={i === 0}
                    name={r.name}
                    photo={e ? employeePhotoUrl(e) : null}
                    sub={`Rank ${r.rank}`}
                    right={<Text variant="title">{r.total} pts</Text>}
                    onPress={() => setScoring({id: r.employeeId, name: r.name})}
                  />
                );
              })}
            </Card>
          </>
        ) : null}
      </View>
      <ScoreSheet person={scoring} month={month} onClose={() => setScoring(null)} />
    </SetupScreen>
  );
}

function PersonRow({
  name,
  photo,
  sub,
  right,
  first,
  onPress,
}: {
  name: string;
  photo?: string | null;
  sub?: string | null;
  right: React.ReactNode;
  first: boolean;
  onPress: () => void;
}) {
  const {colors, spacing} = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}${sub ? `, ${sub}` : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}>
      <Avatar name={name} uri={photo} size={36} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title" numberOfLines={1}>
          {name}
        </Text>
        {sub ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </PressableScale>
  );
}

/** What people are scored on: add, rename, remove. */
export function ScoringTypesScreen(_: AppScreenProps<'ScoringTypes'>) {
  const {colors, spacing} = useTheme();
  const types = useScoringTypes();
  const [editing, setEditing] = useState<ScoringType | 'new' | null>(null);
  const list = types.data ?? [];
  const accents = colors.accents;
  return (
    <SetupScreen
      title="Scoring types"
      subtitle="What you score people on"
      onAdd={() => setEditing('new')}
      addLabel="Type"
      query={types}>
      {list.length ? (
        <Card padded={false}>
          {list.map((t, i) => (
            <PressableScale
              key={t.id}
              onPress={() => setEditing(t)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${t.name}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}>
              <IconWell
                icon={Star}
                fg={accents[t.id % accents.length].fg}
                bg={accents[t.id % accents.length].bg}
              />
              <View style={{flex: 1, minWidth: 0}}>
                <Text variant="title">{t.name.trim()}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {t.description?.trim() || 'No description'}
                </Text>
              </View>
              <Pencil size={16} color={colors.textSubtle} />
            </PressableScale>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={Star}
            title="No scoring types yet"
            message="Examples: Punctuality, Sales target, Customer feedback, Teamwork."
          />
        </Card>
      )}
      <TypeSheet editing={editing} onClose={() => setEditing(null)} />
    </SetupScreen>
  );
}

function TypeSheet({editing, onClose}: {editing: ScoringType | 'new' | null; onClose: () => void}) {
  const {spacing} = useTheme();
  const save = useSaveScoringType();
  const remove = useDeleteScoringType();
  const existing = editing && editing !== 'new' ? editing : null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tried, setTried] = useState(false);
  // The confirm opens once the sheet has gone (iOS can't show both at once).
  const [askDelete, setAskDelete] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [shownFor, setShownFor] = useState<typeof editing>(null);

  if (editing !== shownFor && editing) {
    setShownFor(editing);
    setName(existing?.name.trim() ?? '');
    setDescription(existing?.description?.trim() ?? '');
    setTried(false);
  }

  const error = !name.trim() ? 'Give it a name.' : null;
  return (
    <>
      <BottomSheet
        visible={!!editing && !askDelete}
        onClose={onClose}
        onClosed={() => askDelete && setConfirm(true)}
        title={existing ? 'Edit scoring type' : 'New scoring type'}>
        <View style={{gap: spacing.lg}}>
          <TextField
            label="Name"
            placeholder="e.g. Punctuality"
            value={name}
            onChangeText={setName}
            maxLength={60}
            error={tried ? error : null}
          />
          <TextField
            label="Description"
            placeholder="Optional: what a high score means"
            value={description}
            onChangeText={setDescription}
            maxLength={200}
          />
          <Button
            title={existing ? 'Save' : 'Add'}
            icon={Check}
            loading={save.isPending}
            onPress={() => {
              setTried(true);
              if (error) {
                return;
              }
              save.mutate({id: existing?.id, name, description}, {onSuccess: onClose});
            }}
          />
          {existing ? (
            <Button title="Remove" icon={Trash2} variant="ghost" onPress={() => setAskDelete(true)} />
          ) : null}
        </View>
      </BottomSheet>
      <ConfirmDialog
        visible={confirm}
        icon={Trash2}
        destructive
        title={`Remove ${existing?.name.trim() ?? 'this type'}?`}
        message="People won’t be scored on it any more. This can’t be undone."
        confirmLabel="Remove"
        loading={remove.isPending}
        onCancel={() => {
          setConfirm(false);
          setAskDelete(false);
        }}
        onConfirm={() =>
          existing &&
          remove.mutate(existing.id, {
            onSuccess: () => {
              setConfirm(false);
              setAskDelete(false);
              onClose();
            },
          })
        }
      />
    </>
  );
}
