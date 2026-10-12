import { test, expect } from '../src/fixtures';
import { TERMINAL } from '../src/data';

test.describe('FR-011 Receiver can track and report task progress', () => {
  test("TC-051 a Receiver cannot record progress on another receiver's task", async ({ driver, makeUser, taskIn, adminView }) => {
    const a = await makeUser();
    const { task } = await taskIn('ongoing');
    const before = await adminView(task);
    await driver.reportProgress(a.session, task, 50);
    expect((await adminView(task)).progress).toBe(before.progress);
  });

  test('TC-052 progress cannot be recorded on a terminal task', async ({ driver, taskIn, adminView }) => {
    for (const status of TERMINAL) {
      const { task, receiver } = await taskIn(status);
      const before = await adminView(task);
      await driver.reportProgress(receiver.session, task, 50);
      const after = await adminView(task);
      expect(after.progress, `${status} task`).toBe(before.progress);
      expect(after.status).toBe(status);
    }
  });

  test('TC-073 a Receiver records progress and sees it on the task', async ({ driver, taskIn }) => {
    const { task, receiver } = await taskIn('ongoing');
    await driver.reportProgress(receiver.session, task, 40);
    expect((await driver.viewTask(receiver.session, task))?.progress).toBe(40);
  });

  test("TC-074 the Admin sees the receiver's progress", async ({ driver, admin, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('ongoing');
    await driver.reportProgress(receiver.session, task, 40);
    expect((await adminView(task)).progress).toBe(40);
    const all = await driver.listAllTasks(admin);
    expect(all?.find((t) => t.ref === task)?.progress).toBe(40);
  });

  test("TC-075 a Receiver cannot see the progress of another receiver's task", async ({ driver, makeUser, taskIn, adminView }) => {
    const a = await makeUser();
    const { task, receiver: b } = await taskIn('ongoing');
    await driver.reportProgress(b.session, task, 40);
    expect((await adminView(task)).progress, 'precondition: progress recorded').toBe(40);
    expect(await driver.viewTask(a.session, task)).toBeNull();
  });

  test('TC-091 recording 100% progress does not change an ongoing task to done', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('ongoing');
    await driver.reportProgress(receiver.session, task, 100);
    const view = await adminView(task);
    expect(view.progress).toBe(100);
    expect(view.status).toBe('ongoing');
  });

  test('TC-092 recording progress does not change a todo task', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('todo');
    await driver.reportProgress(receiver.session, task, 30);
    const view = await adminView(task);
    expect(view.progress).toBe(30);
    expect(view.status).toBe('todo');
  });

  test('TC-093 0% and 100% are accepted', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('ongoing');
    for (const value of [0, 100]) {
      await driver.reportProgress(receiver.session, task, value);
      expect((await adminView(task)).progress).toBe(value);
    }
  });

  test('TC-094 progress outside 0-100 or not a number is rejected', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('ongoing');
    await driver.reportProgress(receiver.session, task, 40);
    expect((await adminView(task)).progress, 'precondition: progress recorded').toBe(40);
    for (const value of [-1, 101, 'abc']) {
      await driver.reportProgress(receiver.session, task, value);
      expect((await adminView(task)).progress, `value ${value}`).toBe(40);
    }
  });
});
