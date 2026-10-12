import { test, expect } from '../src/fixtures';
import { PAST, otherStatuses } from '../src/data';
import type { Status } from '../src/driver';

/** How long to wait for an overdue task to show as failed (Q-09: the mechanism isn't tested, only the result). */
const AUTOFAIL_TIMEOUT = Number(process.env.AUTOFAIL_TIMEOUT_MS ?? 60_000);
const NEEDS_HOOK =
  'Needs the optional forceDeadline() adapter hook: the app never accepts a past deadline, so an overdue task can only be prepared as test data.';

test.describe('FR-008 A task whose deadline has passed is automatically set to failed', () => {
  for (const [id, status] of [['TC-034a', 'todo'], ['TC-034b', 'ongoing']] as Array<[string, Status]>) {
    test(`${id} an overdue ${status} task becomes failed without user action`, async ({ driver, taskIn, adminView }) => {
      test.skip(!driver.forceDeadline, NEEDS_HOOK);
      test.setTimeout(AUTOFAIL_TIMEOUT + 60_000);
      const { task, receiver } = await taskIn(status);
      await driver.forceDeadline!(task, PAST());
      await expect.poll(async () => (await adminView(task)).status, { timeout: AUTOFAIL_TIMEOUT }).toBe('failed');
      expect((await driver.viewTask(receiver.session, task))?.status).toBe('failed');
    });
  }

  test('TC-035 an active task with a future deadline is not failed', async ({ makeUser, taskIn, adminView }) => {
    const receiver = await makeUser();
    for (const status of ['todo', 'ongoing'] as const) {
      const { task } = await taskIn(status, receiver);
      expect((await adminView(task)).status).toBe(status);
    }
  });

  for (const [id, status] of [['TC-036', 'done'], ['TC-037', 'cancelled']] as Array<[string, Status]>) {
    test(`${id} an overdue ${status} task stays ${status}`, async ({ driver, taskIn, adminView }) => {
      test.skip(!driver.forceDeadline, NEEDS_HOOK);
      test.setTimeout(AUTOFAIL_TIMEOUT + 60_000);
      const { task, receiver } = await taskIn(status);
      // An overdue active control task shows when the auto-fail has had its chance to run.
      const { task: control } = await taskIn('todo', receiver);
      await driver.forceDeadline!(task, PAST());
      await driver.forceDeadline!(control, PAST());
      await expect.poll(async () => (await adminView(control)).status, { timeout: AUTOFAIL_TIMEOUT }).toBe('failed');
      expect((await adminView(task)).status).toBe(status);
    });
  }

  test('TC-038 a task that was auto-failed cannot be moved to any other status', async ({ driver, taskIn, adminView }) => {
    test.skip(!driver.forceDeadline, NEEDS_HOOK);
    test.setTimeout(AUTOFAIL_TIMEOUT + 60_000);
    const { task, receiver } = await taskIn('todo');
    await driver.forceDeadline!(task, PAST());
    await expect.poll(async () => (await adminView(task)).status, { timeout: AUTOFAIL_TIMEOUT }).toBe('failed');
    for (const target of otherStatuses('failed')) {
      await driver.changeStatus(receiver.session, task, target);
      expect((await adminView(task)).status, `failed -> ${target}`).toBe('failed');
    }
  });

  test(
    'TC-067 moving the deadline later before it passes keeps the task active',
    { annotation: { type: 'not automated', description: 'Needs control of the server clock' } },
    async () => {
      test.skip(
        true,
        'Not automated: the original deadline must pass in real time while the new one is still ahead. ' +
          'That needs control of the server clock, which a black-box suite does not have. Run it manually.',
      );
    },
  );
});
