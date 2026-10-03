import React, {useCallback} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {CircleAlert} from 'lucide-react-native';
import {Button, Card, EmptyState, Reveal, SectionHeader} from '../../../components/ui';
import type {EmployeeTabProps} from '../../../navigation/types';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {HOME_SHORTCUTS} from '../../modules/catalog';
import {BannerCarousel} from '../components/BannerCarousel';
import {HomeLayout} from '../components/HomeLayout';
import {buildCelebrations, CelebrationsStrip, OnLeaveStrip} from '../components/PeopleStrips';
import {PunchCard} from '../components/PunchCard';
import {ShortcutGrid} from '../components/ShortcutGrid';
import {PunchResultSheet} from '../../punch/PunchResultSheet';
import {usePunchFlow} from '../../punch/usePunchFlow';
import {LocationSharingCard} from '../../tracking/LocationSharingCard';
import {useTrackingSync} from '../../tracking/useTrackingSync';
import {queryKeys, useBanners, useEmployeeDashboard, useEmployeeDetails} from '../queries';

export function EmployeeHomeScreen({navigation}: EmployeeTabProps<'Home'>) {
  const {spacing} = useTheme();
  const queryClient = useQueryClient();
  const sessionEmployee = useSession(s => s.employee);

  const dashboard = useEmployeeDashboard();
  const details = useEmployeeDetails();
  const banners = useBanners();

  const info = dashboard.data?.employee_info;
  const name = info?.name ?? sessionEmployee?.name ?? 'there';
  const avatar = details.data?.image_url ?? info?.image ?? null;
  const subtitle = details.data?.data?.branch_name ?? info?.branch?.branch_name ?? null;
  const companyName = details.data?.company_name;
  const punch = usePunchFlow(info);
  useTrackingSync(info, companyName);

  const refreshing = dashboard.isRefetching || details.isRefetching;
  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({queryKey: queryKeys.employeeDashboard});
    queryClient.invalidateQueries({queryKey: ['employee-details']});
    queryClient.invalidateQueries({queryKey: queryKeys.banners});
  }, [queryClient]);

  const section = {paddingHorizontal: spacing.lg, marginTop: spacing.xxl};

  return (
    <HomeLayout
      name={name}
      subtitle={subtitle}
      avatarUri={avatar}
      onAvatarPress={() => navigation.navigate('Profile')}
      refreshing={refreshing}
      onRefresh={onRefresh}
      heroCard={
        <Reveal>
          {dashboard.isError ? (
            <Card>
              <EmptyState
                compact
                icon={CircleAlert}
                title="Couldn't load your day"
                message={dashboard.error.message}
                action={
                  <Button title="Try again" size="sm" fullWidth={false} onPress={() => dashboard.refetch()} />
                }
              />
            </Card>
          ) : (
            <PunchCard
              info={info}
              loading={dashboard.isPending}
              onPunch={punch.start}
              punching={punch.checking}
            />
          )}
        </Reveal>
      }>
      {info && (info.geo_status === '1' || info.geo_status === '2') ? (
        <Reveal index={1} style={{paddingHorizontal: spacing.lg, marginTop: spacing.lg}}>
          <LocationSharingCard info={info} companyName={companyName} />
        </Reveal>
      ) : null}

      <Reveal index={1} style={section}>
        <SectionHeader
          title="Quick actions"
          actionLabel="All apps"
          onAction={() => navigation.navigate('Apps')}
        />
        <ShortcutGrid ids={HOME_SHORTCUTS.employee} />
      </Reveal>

      {banners.data?.length ? (
        <Reveal index={2} style={{marginTop: spacing.xxl}}>
          <BannerCarousel banners={banners.data} />
        </Reveal>
      ) : null}

      <Reveal index={3} style={section}>
        <SectionHeader title="On leave" subtitle="Teammates who are away" />
        <OnLeaveStrip entries={dashboard.data?.employeesOnLeave ?? []} />
      </Reveal>

      <Reveal index={4} style={section}>
        <SectionHeader title="Celebrations" subtitle="Birthdays and work anniversaries" />
        <CelebrationsStrip items={buildCelebrations(dashboard.data?.birthday, dashboard.data?.annyversary)} />
      </Reveal>
      <PunchResultSheet onRetry={punch.start} />
    </HomeLayout>
  );
}
