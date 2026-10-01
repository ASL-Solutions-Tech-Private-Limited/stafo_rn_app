import {api, ensureOk} from '../client';
import type {BasicResponse, ReportExport, SalaryComponentDef, SalaryLine, SalaryPreview} from '../types';

// ---------- Salary components ----------

export async function getSalaryComponents(companyId: string) {
  const {data} = await api.post<{success: boolean; message: string; data: SalaryComponentDef[]}>(
    'api/salarytype/list',
    {company_id: Number(companyId)},
  );
  return ensureOk(data).data ?? [];
}

export type SalaryComponentInput = {
  kind: 'Earning' | 'Deduction';
  name: string;
  /** Rupees for Flat, percent of basic for Percentage. */
  amount: number;
  amountType: 'Flat' | 'Percentage';
};

export async function createSalaryComponent(companyId: string, c: SalaryComponentInput) {
  const {data} = await api.post<BasicResponse>('api/salarytype/store', {
    company_id: Number(companyId),
    payment_type: c.kind,
    salary_type: c.name.trim(),
    salary_type_description: '',
    amount: String(c.amount),
    amount_type: c.amountType,
  });
  return ensureOk(data);
}

export async function deleteSalaryComponent(companyId: string, id: number) {
  const {data} = await api.post<BasicResponse>('api/salarytype/delete', {
    salary_type_id: id,
    company_id: Number(companyId),
  });
  return ensureOk(data);
}

// ---------- Run salary ----------

export async function previewSalary(companyId: string, employeeId: number) {
  const {data} = await api.post<{success: boolean; message: string; data: SalaryPreview}>(
    'api/salary/preview',
    {
      employee_id: employeeId,
      company_id: Number(companyId),
    },
  );
  return ensureOk(data).data;
}

export type SalarySave = {
  employeeId: number;
  /** 1–12. The server takes the current year. */
  month: number;
  basic: number;
  gross: number;
  lossOfPay: number;
  absentDays: number;
  workingDays: number;
  expense: number;
  lines: SalaryLine[];
};

export async function saveSalary(companyId: string, s: SalarySave) {
  const {data} = await api.post<BasicResponse>('api/salary/save', {
    company_id: Number(companyId),
    employee_id: s.employeeId,
    month: s.month,
    basic_salary: s.basic,
    gross_salary: s.gross,
    other_deduction: s.lossOfPay,
    absent_days: s.absentDays,
    working_days: s.workingDays,
    expense: s.expense,
    components: s.lines.map(l => ({
      id: l.id,
      label: l.label,
      amount: Math.round(l.amount),
      amount_type: l.amount_type,
      payment_type: l.payment_type,
    })),
  });
  return ensureOk(data);
}

// ---------- Reports ----------

export type ReportKind = 'attendance' | 'leave' | 'employees';

const REPORT_URL: Record<ReportKind, string> = {
  // "attendace" is the server's spelling.
  attendance: 'api/report/export-attendace',
  leave: 'api/report/export-leave',
  employees: 'api/report/export-employee',
};

export async function exportReport(
  companyId: string,
  kind: ReportKind,
  p: {from: string; to: string; format: 'pdf' | 'excel'; branchId: number; departmentId: number},
) {
  const {data} = await api.post<{success: boolean; message: string; download_url?: string}>(
    REPORT_URL[kind],
    {
      start_date: p.from,
      end_date: p.to,
      format: p.format,
      company_id: companyId,
      department: p.departmentId,
      branch: p.branchId,
    },
    {timeout: 90_000},
  );
  const body = ensureOk(data);
  if (!body.download_url) {
    throw new Error(body.message || 'The report came back empty.');
  }
  return body.download_url;
}

export async function getReportExports(companyId: string) {
  const {data} = await api.get<{success: boolean; message: string; data: ReportExport[]}>(
    'api/attendace/reports/list',
    {params: {company_id: companyId}},
  );
  return ensureOk(data).data ?? [];
}
