import { randomBytes } from 'node:crypto';
import type { Feature, NewTaskInput, Status, UserRef } from './driver';

export const STATUSES: Status[] = ['todo', 'ongoing', 'done', 'cancelled', 'failed'];
export const TERMINAL: Status[] = ['done', 'cancelled', 'failed'];
export const ACTIVE: Status[] = ['todo', 'ongoing'];

export const ADMIN_FEATURES: Feature[] = ['createUser', 'createTask', 'editTask', 'assignTask', 'taskOverview'];
export const RECEIVER_FEATURES: Feature[] = ['ownTasks', 'updateStatus', 'reportProgress', 'cancelTask'];

export const otherStatuses = (status: Status): Status[] => STATUSES.filter((s) => s !== status);

export const token = (): string => `${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
export const uniqueEmail = (prefix = 'user'): string => `${prefix}.${token()}@example.test`;
export const uniqueName = (): string => `Test User ${token()}`;
export const uniquePassword = (): string => `Pw-${token()}-Aa1!`;
export const uniqueTitle = (prefix = 'Task'): string => `${prefix} ${token()}`;

/** A date relative to today, as YYYY-MM-DD. */
export function dateFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Q-10: "future" means at least one day ahead, "past" at least one day back. */
export const FUTURE = (): string => dateFromToday(7);
export const PAST = (): string => dateFromToday(-2);

export function taskInput(receivers: UserRef[], overrides: Partial<NewTaskInput> = {}): NewTaskInput {
  return { title: uniqueTitle(), description: `Description ${token()}`, deadline: FUTURE(), receivers, ...overrides };
}
