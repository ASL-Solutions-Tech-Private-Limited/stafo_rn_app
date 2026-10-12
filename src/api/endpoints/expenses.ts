import {API_BASE_URL} from '../../config/env';
import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';
import type {UploadFile} from './tasks';

/** A field the company asks for in a category: "text", "textarea", "number" or "date" (any case). */
export type CategoryField = {
  id: number;
  type_id: number;
  field_name: string;
  field_type: string;
  description?: string | null;
  status?: string | null;
};

export type ExpenseCategory = {
  id: number;
  company_id: number;
  name: string;
  description?: string | null;
  /** "Yes" | "No" */
  is_document_req?: string | null;
  status?: string | null;
  expense_forms?: CategoryField[] | null;
};

export type ClaimValue = {
  id: number;
  expense_id: number;
  expenseform_id: number;
  expense_value: string | null;
  /** Only on the detail call. */
  expense_form_details?: {id: number; field_name: string} | null;
};

export type ClaimAttachment = {id: number; expense_id: number; filename: string};

/** An expense an employee claims. Status: "Pending" | "Approved" | "Rejected". */
export type Claim = {
  id: number;
  company_id: number;
  employee_id: number;
  expensetype_id: number;
  amount: string | number;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  expense_type?: {id: number; name: string} | null;
  expense_details?: ClaimValue[] | null;
  attachments?: ClaimAttachment[] | null;
};

/** Where claim attachments are served from (the API returns bare file names). */
export const claimFileUrl = (filename: string) =>
  `${API_BASE_URL.replace(/\/$/, '')}/public/uploads/expense_attachments/${encodeURIComponent(filename)}`;

export async function getCategories(companyId: string) {
  const {data} = await api.get<BasicResponse & {data?: ExpenseCategory[]}>('api/expenseform/list', {
    params: {company_id: companyId},
  });
  return ensureOk(data).data ?? [];
}

export type CategoryInput = {
  name: string;
  documentRequired: boolean;
  fields: {name: string; type: string}[];
};

function categoryBody(companyId: string, c: CategoryInput) {
  return {
    company_id: companyId,
    type_name: c.name.trim(),
    description: '',
    isDocumentReq: c.documentRequired ? 'Yes' : 'No',
    fields: c.fields.map(f => ({fieldName: f.name.trim(), fieldType: f.type, description: ''})),
  };
}

export async function saveCategory(companyId: string, id: number | undefined, c: CategoryInput) {
  const {data} = await api.post<BasicResponse>(
    id ? `api/expenseform/update/${id}` : 'api/expenseform/create',
    categoryBody(companyId, c),
  );
  return ensureOk(data);
}

export async function deleteCategory(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/expenseform/delete/${id}`);
  return ensureOk(data);
}

/** The company's claims, or one employee's. */
export async function getClaims(scope: {companyId: string} | {employeeId: number}) {
  const {data} = await api.get<BasicResponse & {success?: boolean; data?: Claim[]}>('api/expense/list', {
    params: 'companyId' in scope ? {company_id: scope.companyId} : {employee_id: scope.employeeId},
  });
  return ensureOk(data).data ?? [];
}

/** One claim, with field names and attachments. */
export async function getClaim(id: number) {
  const {data} = await api.get<BasicResponse & {success?: boolean; data?: Claim}>('api/expense/details', {
    params: {expense_id: id},
  });
  const claim = ensureOk(data).data;
  if (!claim) {
    throw new Error('This claim no longer exists.');
  }
  return claim;
}

export type ClaimInput = {
  categoryId: number;
  amount: string;
  /** expenseform_id → value */
  values: Record<number, string>;
  files: UploadFile[];
};

export async function createClaim(companyId: string, employeeId: number, c: ClaimInput) {
  const form = new FormData();
  form.append('company_id', companyId);
  form.append('employee_id', String(employeeId));
  form.append('expensetype_id', String(c.categoryId));
  form.append('amount', c.amount);
  Object.entries(c.values).forEach(([fieldId, value], i) => {
    form.append(`expense_details[${i}][expenseform_id]`, fieldId);
    form.append(`expense_details[${i}][expense_value]`, value.trim());
  });
  c.files.forEach(f => form.append('attachments[]', f as unknown as Blob));
  const {data} = await api.post<BasicResponse & {success?: boolean}>('api/expense/create', form, {
    headers: {'Content-Type': 'multipart/form-data'},
    timeout: 90_000,
  });
  return ensureOk(data);
}

/** Changes the amount and fields of a waiting claim. Attachments can't be changed here. */
export async function updateClaim(claim: Claim, c: Omit<ClaimInput, 'files' | 'categoryId'>) {
  const {data} = await api.post<BasicResponse & {success?: boolean}>(`api/expense/update/${claim.id}`, {
    company_id: claim.company_id,
    employee_id: claim.employee_id,
    amount: c.amount,
    status: claim.status,
    expense_details: Object.entries(c.values).map(([fieldId, value]) => ({
      expense_id: claim.id,
      expenseform_id: Number(fieldId),
      expense_value: value.trim(),
    })),
  });
  return ensureOk(data);
}

export async function setClaimStatus(id: number, status: 'Approved' | 'Rejected') {
  const {data} = await api.post<BasicResponse & {success?: boolean}>('api/expense/status-change', {
    id,
    status,
  });
  return ensureOk(data);
}

export async function deleteClaim(id: number) {
  const {data} = await api.delete<BasicResponse & {success?: boolean}>(`api/expense/delete/${id}`);
  return ensureOk(data);
}
