import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';

/** Something the company scores people on, e.g. "Punctuality". status 1 = in use. */
export type ScoringType = {
  id: number;
  company_id: number;
  name: string;
  description?: string | null;
  status?: number | string | null;
};

export type RankRow = {
  employee_id: number;
  /** Sum of the month's points, as a string. */
  total_marks: string | number;
  employee?: {id: number; emp_id?: string | null; name: string} | null;
};

export type ScoreRow = {
  id: number;
  employee_id: number;
  performance_type_id: number;
  marks: number | string;
  month: number;
  year: number;
  performancetype?: {id: number; name: string; description?: string | null} | null;
};

type Ok = BasicResponse & {success?: boolean};

export async function getScoringTypes(companyId: string) {
  const {data} = await api.post<Ok & {data?: ScoringType[]}>('api/performancetype/list', {
    company_id: companyId,
  });
  return ensureOk(data).data ?? [];
}

export async function saveScoringType(id: number | undefined, t: {name: string; description: string}) {
  const body = {name: t.name.trim(), description: t.description.trim()};
  const {data} = await api.post<Ok>(
    id ? `api/performancetype/update/${id}` : 'api/performancetype/add',
    body,
  );
  return ensureOk(data);
}

export async function deleteScoringType(id: number) {
  const {data} = await api.delete<Ok>(`api/performancetype/delete/${id}`);
  return ensureOk(data);
}

/** Everyone scored in the month, by total. month is 1–12. */
export async function getRankings(month: number, year: number) {
  const {data} = await api.post<Ok & {ranklist?: RankRow[]}>('api/performance/rank-list', {
    employee_id: '',
    month: String(month),
    year: String(year),
  });
  return ensureOk(data).ranklist ?? [];
}

/** One person's score for each type in the month. */
export async function getScores(employeeId: number, month: number, year: number) {
  const {data} = await api.post<Ok & {data?: ScoreRow[]}>('api/performance/rank-details', {
    employee_id: String(employeeId),
    month: String(month),
    year: String(year),
  });
  return ensureOk(data).data ?? [];
}

/** Saves a person’s scores for the month, one per scoring type. */
export async function saveScores(
  employeeId: number,
  month: number,
  year: number,
  points: Record<number, number>,
) {
  const {data} = await api.post<Ok>('api/performance/save', {
    emp_id: employeeId,
    month: String(month),
    year: String(year),
    perform: Object.entries(points).map(([typeId, p]) => ({type_id: Number(typeId), points: String(p)})),
  });
  return ensureOk(data);
}
