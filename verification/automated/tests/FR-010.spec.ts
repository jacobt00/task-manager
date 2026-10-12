import { test, expect, sameEmail } from '../src/fixtures';
import { TERMINAL } from '../src/data';

test.describe('FR-010 Reassigning a task resets its status to todo', () => {
  test('TC-045 reassigning an ongoing task resets it to todo for the new receiver', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const { task } = await taskIn('ongoing');
    const b = await makeUser();
    await driver.reassignTask(admin, task, b.ref);
    const view = await adminView(task);
    expect(sameEmail(view.assigneeEmail, b.email)).toBe(true);
    expect(view.status).toBe('todo');
  });

  test('TC-046 the previous receiver loses access after reassignment', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const { task, receiver: a } = await taskIn('todo');
    const b = await makeUser();
    await driver.reassignTask(admin, task, b.ref);
    expect(await driver.viewTask(a.session, task)).toBeNull();
    await driver.changeStatus(a.session, task, 'ongoing');
    expect((await adminView(task)).status).toBe('todo');
  });

  test('TC-047 the new receiver sees the reassigned task as todo', async ({ driver, admin, makeUser, taskIn }) => {
    const { task } = await taskIn('ongoing');
    const b = await makeUser();
    await driver.reassignTask(admin, task, b.ref);
    const own = await driver.listMyTasks(b.session);
    expect(own?.find((t) => t.ref === task)?.status).toBe('todo');
  });

  test('TC-048 a terminal task cannot be reassigned', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const b = await makeUser();
    for (const status of TERMINAL) {
      const { task, receiver: a } = await taskIn(status);
      await driver.reassignTask(admin, task, b.ref);
      const view = await adminView(task);
      expect(sameEmail(view.assigneeEmail, a.email), `${status} task keeps its receiver`).toBe(true);
      expect(view.status).toBe(status);
    }
  });

  test('TC-049 a Receiver cannot reassign their own task', async ({ driver, makeUser, taskIn, adminView }) => {
    const { task, receiver: a } = await taskIn('ongoing');
    const b = await makeUser();
    await driver.reassignTask(a.session, task, b.ref);
    const view = await adminView(task);
    expect(sameEmail(view.assigneeEmail, a.email)).toBe(true);
    expect(view.status).toBe('ongoing');
  });

  test('TC-069 reassigning a todo task keeps it todo', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const { task } = await taskIn('todo');
    const b = await makeUser();
    await driver.reassignTask(admin, task, b.ref);
    const view = await adminView(task);
    expect(sameEmail(view.assigneeEmail, b.email)).toBe(true);
    expect(view.status).toBe('todo');
  });

  test('TC-076 reassigning to a user that does not exist is rejected without a reset', async ({ driver, admin, taskIn, adminView }) => {
    const { task, receiver: a } = await taskIn('ongoing');
    await driver.reassignTask(admin, task, driver.unknownUserRef());
    const view = await adminView(task);
    expect(sameEmail(view.assigneeEmail, a.email)).toBe(true);
    expect(view.status).toBe('ongoing');
  });

  test('TC-077 the new receiver can manage the reassigned task', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const { task } = await taskIn('todo');
    const b = await makeUser();
    await driver.reassignTask(admin, task, b.ref);
    await driver.changeStatus(b.session, task, 'ongoing');
    expect((await adminView(task)).status).toBe('ongoing');
  });

  test('TC-087 a task cannot be reassigned to an Admin', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const { task, receiver: a } = await taskIn('ongoing');
    const otherAdmin = await makeUser('admin');
    await driver.reassignTask(admin, task, otherAdmin.ref);
    const view = await adminView(task);
    expect(sameEmail(view.assigneeEmail, a.email)).toBe(true);
    expect(view.status).toBe('ongoing');
  });

  test('TC-088 a terminal task cannot be reassigned to its own receiver either', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of TERMINAL) {
      const { task, receiver: a } = await taskIn(status);
      const before = await adminView(task);
      await driver.reassignTask(admin, task, a.ref);
      expect(await adminView(task), `${status} task`).toEqual(before);
    }
  });

  test('TC-089 progress stays with the task after reassignment', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const { task, receiver: a } = await taskIn('ongoing');
    await driver.reportProgress(a.session, task, 60);
    expect((await adminView(task)).progress, 'precondition: progress recorded').toBe(60);
    const b = await makeUser();
    await driver.reassignTask(admin, task, b.ref);
    const asAdmin = await adminView(task);
    expect(asAdmin.progress).toBe(60);
    expect(asAdmin.status).toBe('todo');
    expect((await driver.viewTask(b.session, task))?.progress).toBe(60);
  });

  test("TC-090 the previous receiver can no longer see the task's progress", async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const { task, receiver: a } = await taskIn('ongoing');
    await driver.reportProgress(a.session, task, 50);
    expect((await adminView(task)).progress, 'precondition: progress recorded').toBe(50);
    const b = await makeUser();
    await driver.reassignTask(admin, task, b.ref);
    expect(await driver.viewTask(a.session, task)).toBeNull();
  });

  test('TC-105 saving an active task with its current receiver is not a reassignment', async ({ driver, admin, taskIn, adminView }) => {
    const { task, receiver: a } = await taskIn('ongoing');
    await driver.reassignTask(admin, task, a.ref);
    const view = await adminView(task);
    expect(sameEmail(view.assigneeEmail, a.email)).toBe(true);
    expect(view.status).toBe('ongoing');
  });
});
