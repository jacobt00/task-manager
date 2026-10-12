import { test, expect } from '../src/fixtures';

test.describe('FR-006 Receiver can only view their own tasks', () => {
  test('TC-023 a Receiver sees only their own tasks', async ({ driver, makeUser, makeTask }) => {
    const a = await makeUser();
    const b = await makeUser();
    const t1 = await makeTask(a);
    const t2 = await makeTask(a);
    await makeTask(b);
    const own = await driver.listMyTasks(a.session);
    expect(own?.map((t) => t.ref).sort()).toEqual([t1, t2].sort());
  });

  test('TC-024 a Receiver with no tasks sees an empty list', async ({ driver, makeUser, makeTask }) => {
    const a = await makeUser();
    await makeTask(await makeUser());
    expect(await driver.listMyTasks(a.session)).toEqual([]);
  });

  test("TC-025 a Receiver cannot open another receiver's task by its reference", async ({ driver, makeUser, taskIn }) => {
    const a = await makeUser();
    const { task } = await taskIn('todo');
    expect(await driver.viewTask(a.session, task)).toBeNull();
  });

  test("TC-026 a Receiver cannot change the status of another receiver's task", async ({ driver, makeUser, taskIn, adminView }) => {
    const a = await makeUser();
    const { task } = await taskIn('todo');
    await driver.changeStatus(a.session, task, 'ongoing');
    expect((await adminView(task)).status).toBe('todo');
  });
});
