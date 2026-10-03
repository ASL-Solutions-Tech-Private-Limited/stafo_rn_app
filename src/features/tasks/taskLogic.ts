import type {Task, TaskFile} from '../../api/endpoints/tasks';
import {toDateKey} from '../../lib/date';

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

/** What the server is sent for each status. */
export const STATUS_VALUE: Record<TaskStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
};
export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In progress',
  completed: 'Completed',
};

/** Reads the mix the server stores (in_progress, In Progress, Active, Overdue…). */
export function taskStatus(raw: string | null | undefined): TaskStatus {
  const s = (raw ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (s === 'completed' || s === 'complete' || s === 'done') {
    return 'completed';
  }
  if (s === 'in progress' || s === 'active' || s === 'inprogress') {
    return 'in-progress';
  }
  return 'pending';
}

export function priorityOf(raw: string | null | undefined): Priority {
  const p = PRIORITIES.find(x => x.toLowerCase() === (raw ?? '').toLowerCase().trim());
  return p ?? 'Medium';
}

/** Days past the due date for an unfinished task (0 when not late). */
export function daysLate(t: Pick<Task, 'end_date' | 'status'>, now = new Date()) {
  if (taskStatus(t.status) === 'completed' || !t.end_date) {
    return 0;
  }
  const due = new Date(`${t.end_date.slice(0, 10)}T00:00:00`);
  const today = new Date(`${toDateKey(now)}T00:00:00`);
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000));
}

export type TaskTab = 'open' | 'overdue' | 'done' | 'all';

export function taskCounts(tasks: Pick<Task, 'end_date' | 'status'>[], now = new Date()) {
  let open = 0;
  let overdue = 0;
  let done = 0;
  for (const t of tasks) {
    if (taskStatus(t.status) === 'completed') {
      done++;
    } else {
      open++;
      if (daysLate(t, now) > 0) {
        overdue++;
      }
    }
  }
  return {open, overdue, done, all: tasks.length};
}

/** Tasks for a tab: open and overdue soonest-due first, done most recent first. */
export function tasksFor<T extends Pick<Task, 'id' | 'end_date' | 'status'>>(
  tasks: T[],
  tab: TaskTab,
  now = new Date(),
) {
  const done = (t: T) => taskStatus(t.status) === 'completed';
  const list = tasks.filter(t =>
    tab === 'all'
      ? true
      : tab === 'done'
      ? done(t)
      : tab === 'overdue'
      ? !done(t) && daysLate(t, now) > 0
      : !done(t),
  );
  return list.sort((a, b) =>
    tab === 'done' ? b.id - a.id : a.end_date.localeCompare(b.end_date) || a.id - b.id,
  );
}

/** Tasks assigned to this employee. */
export const myTasks = <T extends Pick<Task, 'assigned_employees'>>(tasks: T[], employeeId: number) =>
  tasks.filter(t => (t.assigned_employees ?? []).some(e => e.id === employeeId));

/**
 * A task file's URL, or null when it can't be opened: the old app saved some
 * files with no extension (e.g. "task_01751895128."), and those 404.
 */
export function taskFileUrl(f: Pick<TaskFile, 'filename'>, base: string | null | undefined) {
  const name = f.filename?.trim() ?? '';
  if (!base || !/\.[a-z0-9]{2,5}$/i.test(name)) {
    return null;
  }
  return /^https?:/.test(name) ? name : `${base.replace(/\/+$/, '')}/${name}`;
}

/** "PDF", "Image", "File". */
export function fileKind(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') {
    return 'PDF';
  }
  if (['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(ext)) {
    return 'Image';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'Word';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'Spreadsheet';
  }
  return 'File';
}

/** Problems that block saving a task, or null. */
export function taskFormError(t: {title: string; start_date: string; end_date: string; assignees: number[]}) {
  if (!t.title.trim()) {
    return 'Give the task a title.';
  }
  if (!t.start_date || !t.end_date) {
    return 'Pick the start and due dates.';
  }
  if (t.end_date < t.start_date) {
    return 'The due date is before the start.';
  }
  if (!t.assignees.length) {
    return 'Assign it to at least one person.';
  }
  return null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Due 9 Oct", "Due today", "3 days late", "Late since 14 Jul 2025", "Done". */
export function dueLabel(t: Pick<Task, 'end_date' | 'status'>, now = new Date()) {
  if (taskStatus(t.status) === 'completed') {
    return 'Done';
  }
  const due = new Date(`${t.end_date.slice(0, 10)}T00:00:00`);
  const sameYear = due.getFullYear() === now.getFullYear();
  const day = `${due.getDate()} ${MONTHS[due.getMonth()]}${sameYear ? '' : ` ${due.getFullYear()}`}`;
  const late = daysLate(t, now);
  if (late > 60) {
    return `Late since ${day}`;
  }
  if (late > 0) {
    return `${late} ${late === 1 ? 'day' : 'days'} late`;
  }
  return toDateKey(now) === t.end_date.slice(0, 10) ? 'Due today' : `Due ${day}`;
}
