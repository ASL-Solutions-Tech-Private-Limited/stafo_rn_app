import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getGraceSettings} from '../../api/endpoints/setup';
import {DEFAULT_GRACE, type GraceRule} from '../people/employeeInsights';

export const graceKey = ['grace-settings'] as const;

export const useGraceSettings = () =>
  useQuery({queryKey: graceKey, queryFn: getGraceSettings, staleTime: 10 * 60_000, retry: false});

/**
 * The rule the calendars use. Until the settings load (or if the server has
 * none yet) it's the old fixed 10 minutes, every day.
 */
export function useGraceRule(): GraceRule {
  const q = useGraceSettings();
  const minutes = q.data?.graceMinutes ?? 0;
  const days = q.data?.graceDays ?? 0;
  // Stable between renders, so calendars built from it don't rebuild for nothing.
  return useMemo(() => (minutes > 0 ? {minutes, days} : DEFAULT_GRACE), [minutes, days]);
}
