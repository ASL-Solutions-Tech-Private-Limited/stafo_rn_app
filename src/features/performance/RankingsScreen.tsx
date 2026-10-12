import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {Crown, Pencil, Trophy} from 'lucide-react-native';
import {employeePhotoUrl} from '../../api/endpoints/people';
import {Avatar, Button, Card, EmptyState, PressableScale, Skeleton, Text} from '../../components/ui';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useStaffById} from '../expenses/queries';
import {SetupScreen} from '../setup/parts';
import {MonthStepper, ScoreSheet} from './parts';
import {monthLabel, rankRows, thisMonth, type Month, type Ranked} from './performanceLogic';
import {useRankings, useScores} from './queries';

/** Everyone scored in a month, highest total first. */
export function RankingsScreen({navigation}: AppScreenProps<'Rankings'>) {
  const {spacing} = useTheme();
  const [month, setMonth] = useState<Month>(thisMonth());
  const rankings = useRankings(month);
  const staff = useStaffById();
  const ranked = useMemo(() => rankRows(rankings.data ?? []), [rankings.data]);
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const open = (r: Ranked) =>
    navigation.navigate('RankDetail', {
      employeeId: r.employeeId,
      name: r.name,
      month: month.month,
      year: month.year,
      rank: r.rank,
      of: ranked.length,
    });
  const photo = (id: number) => {
    const e = staff.get(id);
    return e ? employeePhotoUrl(e) : null;
  };

  return (
    <SetupScreen title="Rankings" subtitle="By total points" query={rankings}>
      <View style={{gap: spacing.md}}>
        <MonthStepper value={month} onChange={setMonth} />
        {rankings.isPending ? (
          <Skeleton height={200} radius={20} />
        ) : !ranked.length ? (
          <Card>
            <EmptyState
              compact
              icon={Trophy}
              title={`No scores for ${monthLabel(month)}`}
              message="Score your team for this month and they’ll be ranked here."
              action={
                <Button
                  title="Score this month"
                  size="sm"
                  fullWidth={false}
                  onPress={() => navigation.navigate('Performance', {month})}
                />
              }
            />
          </Card>
        ) : (
          <>
            <Podium top={top} photo={photo} onOpen={open} />
            {rest.length ? (
              <Card padded={false}>
                {rest.map((r, i) => (
                  <RankRow
                    key={r.employeeId}
                    r={r}
                    first={i === 0}
                    photo={photo(r.employeeId)}
                    onPress={() => open(r)}
                  />
                ))}
              </Card>
            ) : null}
          </>
        )}
      </View>
    </SetupScreen>
  );
}

function Podium({
  top,
  photo,
  onOpen,
}: {
  top: Ranked[];
  photo: (id: number) => string | null;
  onOpen: (r: Ranked) => void;
}) {
  const {colors, spacing, radius} = useTheme();
  // Second, first, third, so the winner stands in the middle.
  const order = [top[1], top[0], top[2]];
  const heights = [44, 64, 30];
  return (
    <Card style={{backgroundColor: colors.heroFrom, borderColor: 'transparent', paddingBottom: 0}}>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm}}>
        {order.map((r, i) =>
          r ? (
            <PressableScale
              key={r.employeeId}
              onPress={() => onOpen(r)}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${r.rank}, ${r.name}, ${r.total} points`}
              style={{flex: i === 1 ? 1.2 : 1, alignItems: 'center'}}>
              {r.rank === 1 ? <Crown size={18} color="#FDB022" /> : null}
              <View style={{borderRadius: 30, borderWidth: 2, borderColor: '#FFFFFF', marginTop: 2}}>
                <Avatar name={r.name} uri={photo(r.employeeId)} size={i === 1 ? 52 : 42} />
              </View>
              <Text
                variant="label"
                color="#FFFFFF"
                numberOfLines={1}
                style={{marginTop: 4, fontFamily: 'PlusJakartaSans-Bold'}}>
                {r.name}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.85)">
                {r.total} pts
              </Text>
              <View
                style={{
                  alignSelf: 'stretch',
                  height: heights[i],
                  marginTop: 6,
                  borderTopLeftRadius: radius.md,
                  borderTopRightRadius: radius.md,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  alignItems: 'center',
                  paddingTop: 4,
                }}>
                <Text variant="h3" color="#FFFFFF">
                  {r.rank}
                </Text>
              </View>
            </PressableScale>
          ) : (
            <View key={`empty-${i}`} style={{flex: i === 1 ? 1.2 : 1}} />
          ),
        )}
      </View>
    </Card>
  );
}

function RankRow({
  r,
  first,
  photo,
  onPress,
}: {
  r: Ranked;
  first: boolean;
  photo: string | null;
  onPress: () => void;
}) {
  const {colors, spacing} = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${r.rank}, ${r.name}, ${r.total} points`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}>
      <Text variant="title" tone="muted" style={{width: 28, textAlign: 'center'}}>
        {r.rank}
      </Text>
      <Avatar name={r.name} uri={photo} size={36} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title" numberOfLines={1}>
          {r.name}
        </Text>
        {r.empId ? (
          <Text variant="caption" tone="muted">
            {r.empId}
          </Text>
        ) : null}
      </View>
      <Text variant="title">{r.total} pts</Text>
    </PressableScale>
  );
}

/** One person's month: total, rank, and points per scoring type. */
export function RankDetailScreen({route}: AppScreenProps<'RankDetail'>) {
  const {employeeId, name, month: m, year, rank, of} = route.params;
  const month = {month: m, year};
  const {colors, spacing} = useTheme();
  const scores = useScores(employeeId, month);
  const [editing, setEditing] = useState(false);
  const rows = [...(scores.data ?? [])]
    .map(s => ({
      id: s.id,
      name: s.performancetype?.name?.trim() ?? 'Scoring type',
      marks: Number(s.marks) || 0,
    }))
    .sort((a, b) => b.marks - a.marks);
  const total = rows.reduce((s, r) => s + r.marks, 0);
  const best = Math.max(1, ...rows.map(r => r.marks));

  return (
    <SetupScreen
      title={name}
      subtitle={`${monthLabel(month)}${rank ? ` · rank ${rank} of ${of}` : ''}`}
      query={scores}>
      <View style={{gap: spacing.md}}>
        <Card style={{alignItems: 'center', paddingVertical: spacing.xl}}>
          <Trophy size={26} color={rank === 1 ? colors.warning : colors.textMuted} />
          <Text variant="display">{total} pts</Text>
          <Text variant="caption" tone="muted">
            {rank === 1
              ? `Top of ${monthLabel(month).split(' ')[0]}`
              : rank
              ? `Rank ${rank} of ${of}`
              : 'Not ranked'}
          </Text>
        </Card>
        {rows.length ? (
          <Card style={{gap: spacing.lg}}>
            <Text variant="overline" tone="muted">
              WHERE THE POINTS CAME FROM
            </Text>
            {rows.map(r => (
              <View key={r.id} style={{gap: 6}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text variant="label">{r.name}</Text>
                  <Text variant="title">{r.marks}</Text>
                </View>
                <View
                  style={{height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden'}}>
                  <View
                    style={{
                      width: `${(r.marks / best) * 100}%`,
                      height: '100%',
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState compact icon={Trophy} title="No scores this month" />
          </Card>
        )}
        <Button title="Change scores" icon={Pencil} variant="ghost" onPress={() => setEditing(true)} />
      </View>
      <ScoreSheet
        person={editing ? {id: employeeId, name} : null}
        month={month}
        onClose={() => setEditing(false)}
      />
    </SetupScreen>
  );
}
