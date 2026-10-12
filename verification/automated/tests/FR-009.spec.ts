import { test, expect } from '../src/fixtures';

test.describe('FR-009 The assigned receiver and an Admin can cancel an active task', () => {
  test('TC-039a a Receiver cancels their own todo task', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('todo');
    await driver.cancelTask(receiver.session, task);
    expect((await adminView(task)).status).toBe('cancelled');
  });

  test('TC-039b a Receiver cancels their own ongoing task', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('ongoing');
    await driver.cancelTask(receiver.session, task);
    expect((await adminView(task)).status).toBe('cancelled');
  });

  test('TC-040 the Admin cancels a todo or ongoing task', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of ['todo', 'ongoing'] as const) {
      const { task } = await taskIn(status);
      await driver.cancelTask(admin, task);
      expect((await adminView(task)).status, `from ${status}`).toBe('cancelled');
    }
  });

  test("TC-041 a Receiver cannot cancel another receiver's task", async ({ driver, makeUser, taskIn, adminView }) => {
    const a = await makeUser();
    const { task } = await taskIn('ongoing');
    await driver.cancelTask(a.session, task);
    expect((await adminView(task)).status).toBe('ongoing');
  });

  test('TC-042 a done or failed task cannot be cancelled by its owner or the Admin', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of ['done', 'failed'] as const) {
      const { task, receiver } = await taskIn(status);
      await driver.cancelTask(receiver.session, task);
      await driver.cancelTask(admin, task);
      expect((await adminView(task)).status).toBe(status);
    }
  });

  test('TC-043 a cancelled task cannot be cancelled again', async ({ driver, admin, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('cancelled');
    const before = await adminView(task);
    await driver.cancelTask(receiver.session, task);
    await driver.cancelTask(admin, task);
    expect(await adminView(task)).toEqual(before);
  });

  test('TC-044 an unauthenticated visitor cannot cancel a task', async ({ driver, taskIn, newSession, adminView }) => {
    const { task } = await taskIn('ongoing');
    await driver.cancelTask(await newSession(), task);
    expect((await adminView(task)).status).toBe('ongoing');
  });
});
