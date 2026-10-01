import React from 'react';
import {Pressable, View} from 'react-native';
import {Building2, ChevronRight, CircleCheck, MapPin, TriangleAlert, Users} from 'lucide-react-native';
import {Card, EmptyState, Text} from '../../components/ui';
import {toDateKey} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {usePeopleOnDate} from '../people/queries';
import {useBranches} from './queries';
import {IconWell, SetupScreen, Tag} from './parts';
import {fenceStatus, formatRadius} from './setupLogic';

export function BranchesScreen({navigation}: AppScreenProps<'SetupBranches'>) {
  const {colors, spacing, radius} = useTheme();
  const branches = useBranches();
  const people = usePeopleOnDate(toDateKey());
  const peopleIn = (name: string) => people.people.filter(p => p.employee.branch_name === name).length;
  const list = branches.data ?? [];

  return (
    <SetupScreen
      title="Branches"
      subtitle={branches.data ? `${list.length} ${list.length === 1 ? 'branch' : 'branches'}` : null}
      onAdd={() => navigation.navigate('SetupBranchEdit', {})}
      query={branches}>
      {!list.length ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          message="Add a branch to set where people can punch in."
        />
      ) : (
        list.map(b => {
          const fence = fenceStatus(b);
          const n = peopleIn(b.branch_name);
          return (
            <Card key={b.id} onPress={() => navigation.navigate('SetupBranchEdit', {id: b.id})}>
              <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md}}>
                <IconWell icon={Building2} fg={colors.primary} bg={colors.primarySoft} />
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="title">{b.branch_name}</Text>
                  {b.branch_address ? (
                    <Text variant="caption" tone="muted" numberOfLines={2}>
                      {b.branch_address}
                    </Text>
                  ) : null}
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm}}>
                    {fence.kind === 'none' ? (
                      <Tag
                        label="No geofence"
                        fg={colors.warning}
                        bg={colors.warningSoft}
                        icon={TriangleAlert}
                      />
                    ) : fence.kind === 'wide' ? (
                      <Tag
                        label={`Radius ${formatRadius(fence.radiusM)} · too wide`}
                        fg={colors.warning}
                        bg={colors.warningSoft}
                        icon={TriangleAlert}
                      />
                    ) : (
                      <Tag
                        label={`Geofence ${formatRadius(fence.radiusM)}`}
                        fg={colors.success}
                        bg={colors.successSoft}
                        icon={CircleCheck}
                      />
                    )}
                    <Tag
                      label={`${n} ${n === 1 ? 'person' : 'people'}`}
                      fg={colors.textMuted}
                      bg={colors.surfaceMuted}
                      icon={Users}
                    />
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textSubtle} />
              </View>
              {fence.kind !== 'ok' ? (
                <Pressable
                  onPress={() => navigation.navigate('SetupBranchEdit', {id: b.id})}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    height: 40,
                    marginTop: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: colors.primarySoft,
                  }}>
                  <MapPin size={16} color={colors.primary} />
                  <Text variant="label" tone="primary">
                    {fence.kind === 'none' ? 'Set geofence' : 'Tighten radius'}
                  </Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })
      )}
    </SetupScreen>
  );
}
