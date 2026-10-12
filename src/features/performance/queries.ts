import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  deleteScoringType,
  getRankings,
  getScores,
  getScoringTypes,
  saveScores,
  saveScoringType,
} from '../../api/endpoints/performance';
import {getPlans, getSubscription} from '../../api/endpoints/subscription';
import {toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useSession} from '../../store/session';
import {scoresMatch, type Month} from './performanceLogic';

export const performanceKeys = {
  types: (companyId: string | null) => ['scoring-types', companyId] as const,
  rankings: (m: Month) => ['performance', 'rankings', m.year, m.month] as const,
  scores: (employeeId: number, m: Month) => ['performance', 'scores', employeeId, m.year, m.month] as const,
};

export function useScoringTypes() {
  const companyId = useSession(s => s.companyId);
  return useQuery({
    queryKey: performanceKeys.types(companyId),
    queryFn: () => getScoringTypes(companyId!),
    enabled: !!companyId,
    select: list => list.filter(t => String(t.status ?? '1') === '1').sort((a, b) => a.id - b.id),
  });
}

export function useRankings(m: Month) {
  return useQuery({queryKey: performanceKeys.rankings(m), queryFn: () => getRankings(m.month, m.year)});
}

export function useScores(employeeId: number | null, m: Month) {
  return useQuery({
    queryKey: performanceKeys.scores(employeeId ?? 0, m),
    queryFn: () => getScores(employeeId!, m.month, m.year),
    enabled: employeeId != null,
  });
}

function usePerformanceMutation<A>(fn: (a: A) => Promise<unknown>, done: string | ((a: A) => string)) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_, a) => {
      haptics.success();
      toast.success(typeof done === 'function' ? done(a) : done);
      queryClient.invalidateQueries({queryKey: ['performance']});
      queryClient.invalidateQueries({queryKey: ['scoring-types']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

export const useSaveScores = () =>
  usePerformanceMutation(
    async (p: {employeeId: number; name: string; month: Month; points: Record<number, number>}) => {
      await saveScores(p.employeeId, p.month.month, p.month.year, p.points);
      // The server answers "saved" even when it keeps a month's earlier scores, so check.
      const now = await getScores(p.employeeId, p.month.month, p.month.year);
      if (!scoresMatch(now, p.points)) {
        throw new Error(
          'The server kept the earlier scores for this month. Changing scores already given isn’t supported yet.',
        );
      }
    },
    p => `Scores saved for ${p.name}`,
  );

export const useSaveScoringType = () =>
  usePerformanceMutation(
    (p: {id?: number; name: string; description: string}) => saveScoringType(p.id, p),
    p => (p.id ? 'Scoring type saved' : 'Scoring type added'),
  );

export const useDeleteScoringType = () =>
  usePerformanceMutation((id: number) => deleteScoringType(id), 'Scoring type removed');

export function usePlans() {
  return useQuery({queryKey: ['plans'], queryFn: getPlans, staleTime: 10 * 60_000});
}

export function useSubscription() {
  return useQuery({queryKey: ['subscription'], queryFn: getSubscription});
}
