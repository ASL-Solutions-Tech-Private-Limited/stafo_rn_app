import React, {useCallback} from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {ChevronRight, CircleAlert, ShieldAlert} from 'lucide-react-native';
import {Button, Card, Columns, EmptyState, Reveal, SectionHeader, Text} from '../../../components/ui';
import type {CompanyTabProps} from '../../../navigation/types';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {HOME_SHORTCUTS} from '../../modules/catalog';
import {usePeopleOnDate} from '../../people/queries';
import {toDateKey} from '../../../lib/date';
import {useApprovals} from '../../approvals/queries';
import {WaitingCard} from '../../approvals/WaitingCard';
import {AttendanceSummaryCard} from '../components/AttendanceSummaryCard';
import {BannerCarousel} from '../components/BannerCarousel';
import {HomeLayout} from '../components/HomeLayout';
import {buildCelebrations, CelebrationsStrip, OnLeaveStrip} from '../components/PeopleStrips';
import {ShortcutGrid} from '../components/ShortcutGrid';
import {queryKeys, useBanners, useCompanyDashboard, useCompanyProfile} from '../queries';

export function CompanyHomeScreen({navigation}: CompanyTabProps<'Home'>) {
  const {colors, spacing, radius} = useTheme();
  const queryClient = useQueryClient();
  const company = useSession(s => s.company);

  const dashboard = useCompanyDashboard();
  const profile = useCompanyProfile();
  const banners = useBanners();

  const data = dashboard.data;
  const name = data?.companyInfo?.company_name ?? company?.company_name ?? 'Your company';
  const verified = data?.companyInfo?.is_verified === 'Yes';
  const onLeave = data?.employeesOnLeave ?? [];
  const team = usePeopleOnDate(toDateKey());
  const approvals = useApprovals();
  // Approvals lives on the root stack, outside the tabs.
  const rootNavigation = useNavigation();

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({queryKey: queryKeys.companyDashboard});
    queryClient.invalidateQueries({queryKey: queryKeys.companyProfile});
    queryClient.invalidateQueries({queryKey: queryKeys.banners});
    queryClient.invalidateQueries({queryKey: ['people']});
    approvals.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const section = {paddingHorizontal: spacing.lg, marginTop: spacing.xxl};

  return (
    <HomeLayout
      name={name}
      subtitle={data?.companyInfo?.company_code ? `Code ${data.companyInfo.company_code}` : null}
      avatarUri={profile.data?.data?.company_logo}
      onAvatarPress={() => navigation.navigate('Profile')}
      refreshing={dashboard.isRefetching}
      onRefresh={onRefresh}
      heroCard={
        <Reveal>
          {dashboard.isError ? (
            <Card>
              <EmptyState
                compact
                icon={CircleAlert}
                title="Couldn't load today's summary"
                message={dashboard.error.message}
                action={
                  <Button title="Try again" size="sm" fullWidth={false} onPress={() => dashboard.refetch()} />
                }
              />
            </Card>
          ) : (
            <AttendanceSummaryCard
              loading={team.query.isPending}
              total={team.counts.all}
              present={team.counts.in}
              notIn={team.counts['not-in']}
              absent={team.counts.absent}
              onLeave={team.counts.leave}
              onPress={() => navigation.navigate('People')}
            />
          )}
        </Reveal>
      }>
      {/* Side by side on a wide tablet: what needs doing on the left, who's away on the right. */}
      <Columns
        main={
          <>
            {data && !verified ? (
              <Reveal index={1} style={{paddingHorizontal: spacing.lg, marginTop: spacing.lg}}>
                <Card
                  onPress={() => rootNavigation.navigate('VerifyCompany')}
                  elevated={false}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    backgroundColor: colors.warningSoft,
                    borderColor: colors.warningSoft,
                    borderRadius: radius.lg,
                  }}>
                  <ShieldAlert size={22} color={colors.warning} />
                  <View style={{flex: 1}}>
                    <Text variant="title">Verify your company</Text>
                    <Text variant="caption" tone="muted">
                      Complete KYC to add employees and unlock every module.
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.warning} />
                </Card>
              </Reveal>
            ) : null}

            {approvals.counts.all ? (
              <Reveal index={1} style={{paddingHorizontal: spacing.lg, marginTop: spacing.lg}}>
                <WaitingCard
                  counts={approvals.counts}
                  onOpen={kind => rootNavigation.navigate('Approvals', kind ? {filter: kind} : undefined)}
                />
              </Reveal>
            ) : null}

            <Reveal index={2} style={section}>
              <SectionHeader
                title="Manage"
                actionLabel="All apps"
                onAction={() => navigation.navigate('Apps')}
              />
              <ShortcutGrid ids={HOME_SHORTCUTS.company} />
            </Reveal>

            {banners.data?.length ? (
              <Reveal index={3} style={{marginTop: spacing.xxl}}>
                <BannerCarousel banners={banners.data} />
              </Reveal>
            ) : null}
          </>
        }
        side={
          <>
            <Reveal index={4} style={section}>
              <SectionHeader
                title="On leave today"
                subtitle={onLeave.length ? `${onLeave.length} away` : undefined}
                actionLabel="View all"
                onAction={() => rootNavigation.navigate('OnLeave')}
              />
              <OnLeaveStrip entries={onLeave} />
            </Reveal>

            <Reveal index={5} style={section}>
              <SectionHeader
                title="Celebrations"
                subtitle="Birthdays and work anniversaries"
                actionLabel="View all"
                onAction={() => rootNavigation.navigate('Celebrations')}
              />
              <CelebrationsStrip
                items={buildCelebrations(data?.birthday, data?.annyversary ?? data?.anniversary)}
              />
            </Reveal>
          </>
        }
      />
    </HomeLayout>
  );
}
