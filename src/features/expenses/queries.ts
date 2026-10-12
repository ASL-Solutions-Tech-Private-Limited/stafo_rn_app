import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  createClaim,
  deleteCategory,
  deleteClaim,
  getCategories,
  getClaim,
  getClaims,
  saveCategory,
  setClaimStatus,
  updateClaim,
  type CategoryInput,
  type Claim,
  type ClaimInput,
} from '../../api/endpoints/expenses';
import {getEmployeesForDate} from '../../api/endpoints/people';
import {toast} from '../../components/ui';
import {toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import {useSession} from '../../store/session';
import {peopleKey} from '../people/queries';
import {sortClaims} from './expenseLogic';

/** The company's people by id, for names and photos on claims (company only). */
export function useStaffById() {
  const isCompany = useSession(s => s.role === 'company');
  const today = toDateKey();
  const q = useQuery({
    queryKey: peopleKey(today),
    queryFn: () => getEmployeesForDate(today),
    enabled: isCompany,
  });
  return useMemo(() => new Map((q.data ?? []).map(e => [e.id, e])), [q.data]);
}

export const expenseKeys = {
  categories: (companyId: string | null) => ['expense-categories', companyId] as const,
  claims: (companyId: string | null, employeeId?: number) =>
    ['expenses', companyId, employeeId ?? 'all'] as const,
  claim: (id: number) => ['expenses', 'claim', id] as const,
};

export function useCategories() {
  const companyId = useSession(s => s.companyId);
  return useQuery({
    queryKey: expenseKeys.categories(companyId),
    queryFn: () => getCategories(companyId!),
    enabled: !!companyId,
  });
}

/** Every claim for the company; their own for an employee. */
export function useClaims() {
  const companyId = useSession(s => s.companyId);
  const isCompany = useSession(s => s.role === 'company');
  const employeeId = useSession(s => s.employee?.id);
  const scope = isCompany ? undefined : employeeId;
  return useQuery({
    queryKey: expenseKeys.claims(companyId, scope),
    queryFn: () => getClaims(scope ? {employeeId: scope} : {companyId: companyId!}),
    enabled: !!companyId && (isCompany || !!employeeId),
    select: list => sortClaims(scope ? list.filter(c => c.employee_id === scope) : list),
  });
}

export function useClaim(id: number, enabled = true) {
  return useQuery({queryKey: expenseKeys.claim(id), queryFn: () => getClaim(id), enabled});
}

function useExpenseMutation<A>(fn: (a: A) => Promise<unknown>, done?: string | ((a: A) => string)) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_, a) => {
      haptics.success();
      if (done) {
        toast.success(typeof done === 'function' ? done(a) : done);
      }
      queryClient.invalidateQueries({queryKey: ['expenses']});
      queryClient.invalidateQueries({queryKey: ['expense-categories']});
      queryClient.invalidateQueries({queryKey: ['company-dashboard']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

export function useSaveClaim() {
  const companyId = useSession(s => s.companyId);
  const employeeId = useSession(s => s.employee?.id);
  return useExpenseMutation(
    (p: {existing?: Claim; input: ClaimInput}) =>
      p.existing ? updateClaim(p.existing, p.input) : createClaim(companyId!, employeeId!, p.input),
    p => (p.existing ? 'Claim saved' : 'Claim sent for approval'),
  );
}

export const useDecideClaim = () =>
  useExpenseMutation(
    (p: {id: number; status: 'Approved' | 'Rejected'}) => setClaimStatus(p.id, p.status),
    p => (p.status === 'Approved' ? 'Claim approved' : 'Claim rejected'),
  );

export const useDeleteClaim = () => useExpenseMutation((id: number) => deleteClaim(id), 'Claim deleted');

export function useSaveCategory() {
  const companyId = useSession(s => s.companyId);
  return useExpenseMutation(
    (p: {id?: number; input: CategoryInput}) => saveCategory(companyId!, p.id, p.input),
    p => (p.id ? 'Category saved' : 'Category added'),
  );
}

export const useDeleteCategory = () =>
  useExpenseMutation((id: number) => deleteCategory(id), 'Category removed');
