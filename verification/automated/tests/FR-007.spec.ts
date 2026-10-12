import { test, expect } from '../src/fixtures';
import { TERMINAL, otherStatuses } from '../src/data';
import type { Status } from '../src/driver';

test.describe('FR-007 Status transitions follow the transition table', () => {
  const allowed: Array<[string, Status, Status]> = [
    ['TC-027a', 'todo', 'ongoing'],
    ['TC-027b', 'ongoing', 'done'],
    ['TC-027c', 'todo', 'failed'],
    ['TC-027d', 'ongoing', 'failed'],
  ];
  for (const [id, from, to] of allowed) {
    test(`${id} a Receiver changes their own task from ${from} to ${to}`, async ({ driver, taskIn, adminView }) => {
      const { task, receiver } = await taskIn(from);
      await driver.changeStatus(receiver.session, task, to);
      expect((await adminView(task)).status).toBe(to);
    });
  }

  const forbidden: Array<[string, Status, Status]> = [
    ['TC-028a', 'todo', 'done'],
    ['TC-028b', 'ongoing', 'todo'],
  ];
  for (const [id, from, to] of forbidden) {
    test(`${id} a Receiver cannot change their own task from ${from} to ${to}`, async ({ driver, taskIn, adminView }) => {
      const { task, receiver } = await taskIn(from);
      await driver.changeStatus(receiver.session, task, to);
      expect((await adminView(task)).status).toBe(from);
    });
  }

  const terminal: Array<[string, Status]> = [
    ['TC-029', 'done'],
    ['TC-030', 'cancelled'],
    ['TC-031', 'failed'],
  ];
  for (const [id, status] of terminal) {
    test(`${id} a Receiver cannot move their own ${status} task to any other status`, async ({ driver, taskIn, adminView }) => {
      const { task, receiver } = await taskIn(status);
      for (const target of otherStatuses(status)) {
        await driver.changeStatus(receiver.session, task, target);
        expect((await adminView(task)).status, `${status} -> ${target}`).toBe(status);
      }
    });
  }

  test('TC-032 the Admin cannot move a terminal task to any other status', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of TERMINAL) {
      const { task } = await taskIn(status);
      for (const target of otherStatuses(status)) {
        await driver.changeStatus(admin, task, target);
        expect((await adminView(task)).status, `${status} -> ${target}`).toBe(status);
      }
    }
  });

  test('TC-033 a status value that is not one of the five is rejected', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('todo');
    for (const value of ['archived', '', 'DONE']) {
      await driver.changeStatus(receiver.session, task, value);
      expect((await adminView(task)).status, `value "${value}"`).toBe('todo');
    }
  });

  test('TC-096 an active task cannot be set to the status it already has', async ({ driver, makeUser, taskIn, adminView }) => {
    const receiver = await makeUser();
    for (const status of ['todo', 'ongoing'] as const) {
      const { task } = await taskIn(status, receiver);
      const before = await adminView(task);
      await driver.changeStatus(receiver.session, task, status);
      // The status can't visibly differ, so a rejection shows as no change to the task at all.
      expect(await adminView(task)).toEqual(before);
    }
  });

  test('TC-097 a terminal task cannot be set to the status it already has', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of TERMINAL) {
      const { task, receiver } = await taskIn(status);
      const before = await adminView(task);
      await driver.changeStatus(receiver.session, task, status);
      await driver.changeStatus(admin, task, status);
      expect(await adminView(task)).toEqual(before);
    }
  });

  test('TC-098 the Admin cannot make status changes other than cancelling', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const receiver = await makeUser();
    const attempts: Array<[Status, Status]> = [
      ['todo', 'ongoing'],
      ['todo', 'failed'],
      ['ongoing', 'done'],
      ['ongoing', 'failed'],
    ];
    for (const [from, to] of attempts) {
      const { task } = await taskIn(from, receiver);
      await driver.changeStatus(admin, task, to);
      expect((await adminView(task)).status, `Admin ${from} -> ${to}`).toBe(from);
    }
  });
});
