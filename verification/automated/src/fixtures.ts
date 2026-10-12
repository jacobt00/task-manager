import path from 'node:path';
import { test as base, expect } from '@playwright/test';
import { Session, type StorageState } from './session';
import type { NewTaskInput, Role, Status, TaskManagerDriver, TaskRef, TaskView, UserRef } from './driver';
import { taskInput, uniqueEmail, uniqueName, uniquePassword } from './data';

export interface Account {
  name: string;
  email: string;
  password: string;
  role: Role;
  ref: UserRef;
  /** A session in which this user is logged in. */
  session: Session;
}

export function adminCredentials(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to an existing Admin account (see README.md).');
  }
  return { email, password };
}

function loadDriver(): TaskManagerDriver {
  const adapterPath = process.env.TM_ADAPTER;
  if (!adapterPath) throw new Error('Set TM_ADAPTER to the adapter file of the implementation under test (see README.md).');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(path.resolve(adapterPath));
  const factory = mod.default ?? mod.createDriver;
  if (typeof factory !== 'function') throw new Error(`${adapterPath} must export a default createDriver() function.`);
  return factory();
}

type Fixtures = {
  driver: TaskManagerDriver;
  /** A fresh, unauthenticated session. Disposed after the test. */
  newSession: (storageState?: StorageState) => Promise<Session>;
  /** A session in which the Admin from ADMIN_EMAIL/ADMIN_PASSWORD is logged in. */
  admin: Session;
  /** Creates a new user through the Admin and logs them in. */
  makeUser: (role?: Role) => Promise<Account>;
  /** Creates a task for `receiver` through the Admin (future deadline unless overridden). */
  makeTask: (receiver: Account, overrides?: Partial<NewTaskInput>) => Promise<TaskRef>;
  /** Creates a task and brings it to `status` through the receiver's own actions. */
  taskIn: (status: Status, receiver?: Account) => Promise<{ task: TaskRef; receiver: Account }>;
  /** The task as the Admin sees it; fails the test if the Admin can't see it. */
  adminView: (task: TaskRef) => Promise<TaskView>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  driver: async ({}, use) => {
    await use(loadDriver());
  },

  newSession: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Set BASE_URL to the address of the implementation under test (see README.md).');
    const sessions: Session[] = [];
    await use(async (storageState) => {
      const session = await Session.create(baseURL, storageState);
      sessions.push(session);
      return session;
    });
    await Promise.all(sessions.map((s) => s.dispose()));
  },

  admin: async ({ driver, newSession }, use) => {
    const { email, password } = adminCredentials();
    const session = await newSession();
    const result = await driver.login(session, email, password);
    expect(result.ok, 'precondition: the Admin from ADMIN_EMAIL/ADMIN_PASSWORD can log in').toBe(true);
    await use(session);
  },

  makeUser: async ({ driver, admin, newSession }, use) => {
    await use(async (role = 'receiver') => {
      const account = { name: uniqueName(), email: uniqueEmail(role), password: uniquePassword(), role };
      await driver.createUser(admin, account);
      const ref = await driver.userRef(admin, account.email);
      expect(ref, `precondition: the Admin can create the ${role} ${account.email}`).not.toBeNull();
      const session = await newSession();
      const login = await driver.login(session, account.email, account.password);
      expect(login.ok, `precondition: ${account.email} can log in`).toBe(true);
      return { ...account, ref: ref!, session };
    });
  },

  makeTask: async ({ driver, admin }, use) => {
    await use(async (receiver, overrides = {}) => {
      const input = taskInput([receiver.ref], overrides);
      await driver.createTask(admin, input);
      const task = await driver.findTaskByTitle(admin, input.title);
      expect(task, 'precondition: the Admin can create a task').not.toBeNull();
      return task!;
    });
  },

  taskIn: async ({ driver, admin, makeUser, makeTask }, use) => {
    await use(async (status, receiver) => {
      const owner = receiver ?? (await makeUser());
      const task = await makeTask(owner);
      const session = owner.session;
      if (status === 'ongoing' || status === 'done') await driver.changeStatus(session, task, 'ongoing');
      if (status === 'done') await driver.changeStatus(session, task, 'done');
      if (status === 'cancelled') await driver.cancelTask(session, task);
      if (status === 'failed') await driver.changeStatus(session, task, 'failed');
      const view = await driver.viewTask(admin, task);
      expect(view?.status, `precondition: the task can be brought to ${status}`).toBe(status);
      return { task, receiver: owner };
    });
  },

  adminView: async ({ driver, admin }, use) => {
    await use(async (task) => {
      const view = await driver.viewTask(admin, task);
      expect(view, 'the Admin can view the task').not.toBeNull();
      return view!;
    });
  },
});

export { expect };

/** Case-insensitive email comparison (Q-28). */
export const sameEmail = (a: string | null | undefined, b: string): boolean => a?.toLowerCase() === b.toLowerCase();
