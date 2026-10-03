import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';

export type Lead = {
  id: number;
  company_id: number;
  employee_id?: number | null;
  name: string;
  company_name?: string | null;
  company_address?: string | null;
  email?: string | null;
  /** Stored in a numeric column: real mobiles overflow to 2147483647. */
  phone?: string | number | null;
  notes?: string | null;
  status?: string | null;
  lead_from?: string | null;
  next_date?: string | null;
  created_at?: string | null;
  employee?: {id: number; name: string} | null;
};

export type FollowUp = {
  id: number;
  lead_id: number;
  employee_id?: number | null;
  /** "By Visiting" | "By Call" (older rows: "New") */
  type?: string | null;
  next_date?: string | null;
  status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  employee?: {id: number; name: string} | null;
};

type ListBody<T> = BasicResponse & {success?: boolean; data?: T[]};

/** All the company's leads, or one employee's. */
export async function getLeads(companyId: string, employeeId?: number) {
  const {data} = await api.get<ListBody<Lead>>('api/lead/list', {
    params: {company_id: companyId, ...(employeeId ? {employee_id: employeeId} : {})},
  });
  return ensureOk(data).data ?? [];
}

export async function getFollowUps(leadId: number) {
  const {data} = await api.get<ListBody<FollowUp>>('api/lead/followup-list', {params: {lead_id: leadId}});
  return ensureOk(data).data ?? [];
}

export type LeadInput = {
  employee_id: number;
  name: string;
  company_name: string;
  company_address: string;
  email: string;
  phone: string;
  notes: string;
  status: string;
  lead_from: string;
  next_date: string;
};

const leadBody = (companyId: string, l: LeadInput) => ({
  company_id: companyId,
  employee_id: String(l.employee_id),
  name: l.name.trim(),
  company_name: l.company_name.trim(),
  company_address: l.company_address.trim(),
  email: l.email.trim(),
  phone: l.phone,
  notes: l.notes.trim(),
  status: l.status,
  lead_from: l.lead_from,
  next_date: l.next_date,
});

export async function createLead(companyId: string, l: LeadInput) {
  const {data} = await api.post<BasicResponse>('api/lead/create', leadBody(companyId, l));
  return ensureOk(data);
}

/** Replaces the whole lead: send every field. */
export async function updateLead(id: number, companyId: string, l: LeadInput) {
  const {data} = await api.post<BasicResponse>(`api/lead/update/${id}`, leadBody(companyId, l));
  return ensureOk(data);
}

export async function createFollowUp(f: {
  companyId: string;
  employeeId: number;
  leadId: number;
  type: string;
  nextDate: string;
  status: string;
  remarks: string;
}) {
  const {data} = await api.post<BasicResponse>('api/lead/followup-create', {
    company_id: f.companyId,
    employee_id: String(f.employeeId),
    lead_id: String(f.leadId),
    type: f.type,
    next_date: f.nextDate,
    status: f.status,
    remarks: f.remarks.trim(),
  });
  return ensureOk(data);
}
