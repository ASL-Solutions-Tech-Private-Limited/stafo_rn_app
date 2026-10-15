/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import {
  daysLate,
  dueLabel,
  fileKind,
  myTasks,
  priorityOf,
  taskCounts,
  taskFileUrl,
  taskFormError,
  tasksFor,
  taskStatus,
} from '../src/features/tasks/taskLogic';

// Production's 5 tasks for company 1, fetched 3 Oct 2026.
const {data: tasks, file_path: base} = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/tasks-company1.json'), 'utf8'),
);
const now = new Date(2026, 9, 3, 13);

describe('task status', () => {
  it('reads the mix stored on the server', () => {
    expect(
      ['in_progress', 'In Progress', 'Active', 'Completed', 'Pending', 'Overdue', '', null].map(taskStatus),
    ).toEqual([
      'in-progress',
      'in-progress',
      'in-progress',
      'completed',
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
    expect(['urgent', 'High', 'nope'].map(priorityOf)).toEqual(['Urgent', 'High', 'Medium']);
  });
});

describe('real tasks', () => {
  it('counts 4 open (all overdue) and 1 done', () => {
    expect(taskCounts(tasks, now)).toEqual({open: 4, overdue: 4, done: 1, all: 5});
  });
  it('knows how late they are', () => {
    const t22 = tasks.find((t: any) => t.id === 22);
    expect(daysLate(t22, now)).toBe(446);
    expect(dueLabel(t22, now)).toBe('Late since 14 Jul 2025');
    expect(dueLabel({end_date: '2026-10-01', status: 'Pending'}, now)).toBe('2 days late');
    expect(dueLabel({end_date: '2026-10-03', status: 'Pending'}, now)).toBe('Due today');
    expect(dueLabel({end_date: '2026-10-09', status: 'Active'}, now)).toBe('Due 9 Oct');
    expect(dueLabel({end_date: '2026-10-01', status: 'Completed'}, now)).toBe('Done');
    expect(
      daysLate(
        tasks.find((t: any) => t.id === 21),
        now,
      ),
    ).toBe(0);
  });
  it('orders tabs', () => {
    expect(tasksFor(tasks, 'open', now).map((t: any) => t.id)).toEqual([22, 25, 26, 27]);
    expect(tasksFor(tasks, 'done', now).map((t: any) => t.id)).toEqual([21]);
  });
  it('finds an employee’s tasks', () => {
    expect(myTasks(tasks, 24).map((t: any) => t.id)).toEqual([21, 22, 25, 26]);
    expect(myTasks(tasks, 91).map((t: any) => t.id)).toEqual([21]);
  });
  it('flags files saved without a type (they 404)', () => {
    expect(taskFileUrl({filename: 'task_01751895128.'}, base)).toBeNull();
    expect(taskFileUrl({filename: 'task_01775470726.pdf'}, base)).toBe(
      'https://stafo.in/public/uploads/task/task_01775470726.pdf',
    );
    expect(['a.PDF', 'b.jpeg', 'c.xlsx', 'd'].map(fileKind)).toEqual(['PDF', 'Image', 'Spreadsheet', 'File']);
  });
});

describe('taskFormError', () => {
  const ok = {title: 'Count stock', start_date: '2026-10-05', end_date: '2026-10-09', assignees: [24]};
  it('passes a complete task and catches gaps', () => {
    expect(taskFormError(ok)).toBeNull();
    expect(taskFormError({...ok, title: ' '})).toMatch(/title/);
    expect(taskFormError({...ok, end_date: '2026-10-01'})).toMatch(/before the start/);
    expect(taskFormError({...ok, assignees: []})).toMatch(/Assign/);
  });
});
