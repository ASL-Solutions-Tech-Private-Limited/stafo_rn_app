import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  deleteCompanyAccount,
  getCompanyDetails,
  getReferrals,
  sendFeedback,
  updateCompany,
  uploadCompanyDocument,
  uploadCompanyLogo,
  type CompanyEdit,
  type CompanyRecord,
} from '../../api/endpoints/account';
import {getEmployeeDocuments} from '../../api/endpoints/employee';
import type {UploadFile} from '../../api/endpoints/tasks';
import {toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {signOut, useSession} from '../../store/session';

export const useCompanyDetails = () => useQuery({queryKey: ['company-details'], queryFn: getCompanyDetails});

export const useReferrals = () => useQuery({queryKey: ['referrals'], queryFn: getReferrals});

export function useMyDocuments() {
  const employeeId = useSession(s => s.employee?.id);
  return useQuery({
    queryKey: ['my-documents', employeeId],
    queryFn: () => getEmployeeDocuments(employeeId!),
    enabled: !!employeeId,
  });
}

function useAccountMutation<A>(fn: (a: A) => Promise<unknown>, done: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      haptics.success();
      toast.success(done);
      queryClient.invalidateQueries({queryKey: ['company-details']});
      queryClient.invalidateQueries({queryKey: ['company-profile']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

export const useUpdateCompany = () =>
  useAccountMutation(async (p: {current: CompanyRecord; edit: CompanyEdit}) => {
    await updateCompany(p.current, p.edit);
    // Profile and home read the signed-in company, so keep it in step.
    useSession.setState(s =>
      s.company
        ? {
            company: {
              ...s.company,
              company_name: p.edit.company_name.trim(),
              email: p.edit.email.trim(),
              gst_number: p.edit.gst_number.trim().toUpperCase(),
            },
          }
        : {},
    );
  }, 'Company details saved');

export const useUploadLogo = () =>
  useAccountMutation((f: UploadFile) => uploadCompanyLogo(f), 'Logo updated');

export const useUploadCompanyDocument = () =>
  useAccountMutation(
    (p: {typeId: number; file: UploadFile}) => uploadCompanyDocument(p.typeId, p.file),
    'Document uploaded',
  );

export function useSendFeedback() {
  const role = useSession(s => s.role);
  const companyId = useSession(s => s.companyId);
  const employeeId = useSession(s => s.employee?.id);
  return useAccountMutation(
    (message: string) =>
      sendFeedback(
        role === 'company' ? {companyId: companyId ?? ''} : {employeeId: employeeId ?? 0},
        message,
      ),
    'Thanks, your feedback was sent',
  );
}

/** Deletes the company account, then signs out. */
export function useDeleteCompany() {
  return useMutation({
    mutationFn: deleteCompanyAccount,
    onSuccess: async () => {
      haptics.success();
      toast.success('Your company account was deleted');
      await signOut();
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}
