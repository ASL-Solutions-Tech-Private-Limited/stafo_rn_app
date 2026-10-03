import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';

export type TaskPerson = {id: number; emp_id?: string | null; name: string; image?: string | null};
export type TaskFile = {id: number; task_id: number; filename: string};

export type Task = {
  id: number;
  company_id: number;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  /** Stored inconsistently: "Pending", "In Progress", "in_progress", "Active", "Completed", "Overdue". */
  status: string;
  /** "Low" | "Medium" | "High" | "Urgent" */
  priority: string;
  created_at?: string | null;
  assigned_employees?: TaskPerson[] | null;
  task_files?: TaskFile[] | null;
};

export type TaskComment = {
  id: number;
  task_id: number;
  employee_id?: number | null;
  company_id?: number | null;
  comments: string;
  created_at?: string | null;
  employee?: {id: number; name: string; image?: string | null} | null;
};

export type UploadFile = {uri: string; name: string; type: string};

/** Every task in the company, plus the base URL for task files. */
export async function getTasks(companyId: string) {
  const {data} = await api.get<BasicResponse & {success?: boolean; data?: Task[]; file_path?: string | null}>(
    'api/task/list',
    {params: {company_id: companyId}},
  );
  const body = ensureOk(data);
  return {tasks: body.data ?? [], filePath: body.file_path ?? null};
}

export type TaskInput = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  assignees: number[];
  files: UploadFile[];
};

function taskForm(t: TaskInput, companyId?: string) {
  const form = new FormData();
  if (companyId) {
    form.append('company_id', companyId);
  }
  form.append('title', t.title.trim());
  form.append('description', t.description.trim());
  form.append('start_date', t.start_date);
  form.append('end_date', t.end_date);
  form.append('status', t.status);
  form.append('priority', t.priority);
  t.assignees.forEach((id, i) => form.append(`task_assign[${i}]`, String(id)));
  t.files.forEach((f, i) => form.append(`files[${i}]`, f as unknown as Blob));
  return form;
}

const multipart = {headers: {'Content-Type': 'multipart/form-data'}, timeout: 90_000};

export async function createTask(companyId: string, t: TaskInput) {
  const {data} = await api.post<BasicResponse>('api/task/create', taskForm(t, companyId), multipart);
  return ensureOk(data);
}

/** Replaces the task's fields and assignees; new files are added. */
export async function updateTask(id: number, t: TaskInput) {
  const {data} = await api.post<BasicResponse>(`api/task/update/${id}`, taskForm(t), multipart);
  return ensureOk(data);
}

export async function deleteTask(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/task/delete/${id}`);
  return ensureOk(data);
}

export async function setTaskStatus(id: number, status: string) {
  const {data} = await api.post<BasicResponse>(`api/task/status-change/${id}`, {status});
  return ensureOk(data);
}

export async function getTaskComments(taskId: number) {
  const {data} = await api.get<BasicResponse & {data?: TaskComment[]}>('api/task/comment-list', {
    params: {task_id: taskId},
  });
  return ensureOk(data).data ?? [];
}

/** A comment by the company (company_id) or by an employee (employee_id). */
export async function addTaskComment(
  taskId: number,
  comments: string,
  by: {companyId: number} | {employeeId: number},
) {
  const {data} = await api.post<BasicResponse>('api/task/comment-create', {
    task_id: taskId,
    comments: comments.trim(),
    ...('companyId' in by ? {company_id: by.companyId} : {employee_id: by.employeeId}),
  });
  return ensureOk(data);
}

export async function deleteTaskComment(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/task/comment-delete/${id}`);
  return ensureOk(data);
}

export async function uploadTaskFiles(taskId: number, files: UploadFile[]) {
  const form = new FormData();
  form.append('task_id', String(taskId));
  files.forEach((f, i) => form.append(`files[${i}]`, f as unknown as Blob));
  const {data} = await api.post<BasicResponse>('api/task/file-uploads', form, multipart);
  return ensureOk(data);
}

export async function deleteTaskFile(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/task/file-delete/${id}`);
  return ensureOk(data);
}
