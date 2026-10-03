import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  createFollowUp,
  createLead,
  getFollowUps,
  getLeads,
  updateLead,
  type Lead,
  type LeadInput,
} from '../../api/endpoints/crm';
import {toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useSession} from '../../store/session';
import {leadInput} from './crmLogic';

export const crmKeys = {
  leads: (companyId: string | null, employeeId?: number) =>
    ['leads', companyId, employeeId ?? 'all'] as const,
  followUps: (leadId: number) => ['lead-follow-ups', leadId] as const,
};

/** The company's leads, or only the signed-in employee's. */
export function useLeads() {
  const companyId = useSession(s => s.companyId);
  const isCompany = useSession(s => s.role === 'company');
  const employeeId = useSession(s => s.employee?.id);
  const scope = isCompany ? undefined : employeeId;
  return useQuery({
    queryKey: crmKeys.leads(companyId, scope),
    queryFn: () => getLeads(companyId!, scope),
    enabled: !!companyId && (isCompany || !!employeeId),
    // The employee filter is the server's; make sure.
    select: list => (scope ? list.filter(l => (l.employee_id ?? l.employee?.id) === scope) : list),
  });
}

export function useFollowUps(leadId: number) {
  return useQuery({
    queryKey: crmKeys.followUps(leadId),
    queryFn: () => getFollowUps(leadId),
    select: list => [...list].sort((a, b) => b.id - a.id),
  });
}

function useCrmMutation<A>(fn: (a: A) => Promise<unknown>, done?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      haptics.success();
      if (done) {
        toast.success(done);
      }
      queryClient.invalidateQueries({queryKey: ['leads']});
      queryClient.invalidateQueries({queryKey: ['lead-follow-ups']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

export function useSaveLead() {
  const companyId = useSession(s => s.companyId);
  return useCrmMutation((p: {id?: number; input: LeadInput}) =>
    p.id ? updateLead(p.id, companyId!, p.input) : createLead(companyId!, p.input),
  );
}

/** Moves a lead to another stage (the update API needs the whole lead). */
export function useSetStage() {
  const companyId = useSession(s => s.companyId);
  return useCrmMutation((p: {lead: Lead; stage: string}) =>
    updateLead(p.lead.id, companyId!, {...leadInput(p.lead), status: p.stage}),
  );
}

/** Logs a follow-up, then moves the lead to that stage and next date. */
export function useLogFollowUp() {
  const companyId = useSession(s => s.companyId);
  const me = useSession(s => s.employee?.id);
  const isCompany = useSession(s => s.role === 'company');
  return useCrmMutation(
    async (p: {lead: Lead; type: string; stage: string; remarks: string; nextDate: string}) => {
      const owner = isCompany ? p.lead.employee_id ?? p.lead.employee?.id ?? 0 : me ?? 0;
      await createFollowUp({
        companyId: companyId!,
        employeeId: owner,
        leadId: p.lead.id,
        type: p.type,
        nextDate: p.nextDate,
        status: p.stage,
        remarks: p.remarks,
      });
      const current = leadInput(p.lead);
      if (current.status !== p.stage || current.next_date !== p.nextDate) {
        await updateLead(p.lead.id, companyId!, {...current, status: p.stage, next_date: p.nextDate});
      }
    },
    'Follow-up saved',
  );
}
