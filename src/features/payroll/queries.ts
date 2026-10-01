import {useMutation, useQueries, useQuery} from '@tanstack/react-query';
import {getSalarySlip} from '../../api/endpoints/employee';
import {
  createSalaryComponent,
  deleteSalaryComponent,
  exportReport,
  getReportExports,
  getSalaryComponents,
  previewSalary,
  saveSalary,
  type ReportKind,
  type SalaryComponentInput,
  type SalarySave,
} from '../../api/endpoints/payroll';
import {toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {toDateKey} from '../../lib/date';
import {useSession} from '../../store/session';
import {useAdminAction} from '../people/employee/queries';
import {usePeopleOnDate} from '../people/queries';
import {payStatus} from './payrollLogic';

const companyId = () => useSession.getState().companyId!;

export const payrollKeys = {
  components: ['payroll', 'components'] as const,
  slip: (employeeId: number, month: number, year: number) =>
    ['payroll', 'slip', employeeId, year, month] as const,
  preview: (employeeId: number) => ['payroll', 'preview', employeeId] as const,
  exports: ['reports', 'exports'] as const,
};

export function useSalaryComponents() {
  const id = useSession(s => s.companyId);
  return useQuery({queryKey: payrollKeys.components, queryFn: () => getSalaryComponents(id!), enabled: !!id});
}

export const useCreateSalaryComponent = () =>
  useAdminAction(
    (c: SalaryComponentInput) => createSalaryComponent(companyId(), c),
    () => [payrollKeys.components],
    'Component added',
  );

export const useDeleteSalaryComponent = () =>
  useAdminAction(
    (id: number) => deleteSalaryComponent(companyId(), id),
    () => [payrollKeys.components],
    'Component removed',
  );

/** Everyone with their pay status for a month: paid (payslip exists), ready, or no basic salary. */
export function usePayrollMonth(month: Date) {
  const id = useSession(s => s.companyId);
  const people = usePeopleOnDate(toDateKey());
  const employees = people.people.map(p => p.employee).filter(e => (e.status ?? '1') === '1');
  const m = month.getMonth() + 1;
  const y = month.getFullYear();
  const slips = useQueries({
    queries: employees.map(e => ({
      queryKey: payrollKeys.slip(e.id, m, y),
      queryFn: () => getSalarySlip(id!, e.id, m, y),
      enabled: !!id,
      staleTime: 60_000,
    })),
  });
  const rows = employees.map((e, i) => ({
    employee: e,
    slip: slips[i]?.data ?? null,
    loading: !!slips[i]?.isPending,
    status: payStatus(e.salary, !!slips[i]?.data),
  }));
  return {
    rows,
    isPending: people.query.isPending,
    isError: people.query.isError,
    error: people.query.error,
    isRefetching: people.query.isRefetching || slips.some(s => s.isRefetching),
    refetch: () => Promise.all([people.query.refetch(), ...slips.map(s => s.refetch())]),
  };
}

export function useSalaryPreview(employeeId: number) {
  const id = useSession(s => s.companyId);
  return useQuery({
    queryKey: payrollKeys.preview(employeeId),
    queryFn: () => previewSalary(id!, employeeId),
    enabled: !!id,
    staleTime: 0,
  });
}

export const useSaveSalary = () =>
  useAdminAction(
    (s: SalarySave) => saveSalary(companyId(), s),
    s => [
      payrollKeys.slip(s.employeeId, s.month, new Date().getFullYear()),
      ['employee', s.employeeId, 'payslips'],
    ],
    'Salary saved',
  );

export function useReportExports() {
  const id = useSession(s => s.companyId);
  return useQuery({queryKey: payrollKeys.exports, queryFn: () => getReportExports(id!), enabled: !!id});
}

/** Exports a report; resolves with its download link. Errors show as a toast. */
export function useExportReport() {
  return useMutation({
    mutationFn: (p: {
      kind: ReportKind;
      from: string;
      to: string;
      format: 'pdf' | 'excel';
      branchId: number;
      departmentId: number;
    }) => exportReport(companyId(), p.kind, p),
    onSuccess: () => haptics.success(),
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}
