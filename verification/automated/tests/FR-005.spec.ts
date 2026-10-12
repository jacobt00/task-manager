import { test, expect, sameEmail } from '../src/fixtures';
import { ACTIVE, PAST, TERMINAL, dateFromToday, taskInput, token, uniqueTitle } from '../src/data';

test.describe('FR-005 Admin edits a task and its deadline', () => {
  test('TC-019 the Admin edits the details of an active task', async ({ driver, admin, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('todo');
    const changes = { title: uniqueTitle('Edited'), description: `Edited ${token()}` };
    await driver.editTask(admin, task, changes);
    expect(await adminView(task)).toMatchObject(changes);
    expect(await driver.viewTask(receiver.session, task)).toMatchObject(changes);
  });

  test('TC-020 the Admin moves the deadline of an active task to a later date', async ({ driver, admin, taskIn, adminView }) => {
    const { task } = await taskIn('todo');
    const later = dateFromToday(14);
    await driver.editTask(admin, task, { deadline: later });
    expect((await adminView(task)).deadline).toBe(later);
  });

  test('TC-021 a malformed deadline is rejected', async ({ driver, admin, taskIn, adminView }) => {
    const { task } = await taskIn('todo');
    const before = await adminView(task);
    await driver.editTask(admin, task, { deadline: 'not-a-date' });
    expect((await adminView(task)).deadline).toBe(before.deadline);
  });

  test('TC-022 a Receiver cannot change the deadline of their own task', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('todo');
    const before = await adminView(task);
    await driver.editTask(receiver.session, task, { deadline: dateFromToday(14) });
    expect(await adminView(task)).toEqual(before);
  });

  test('TC-050 the Admin sees a status change made by the receiver', async ({ driver, admin, taskIn }) => {
    const { task, receiver } = await taskIn('todo');
    await driver.changeStatus(receiver.session, task, 'ongoing');
    const all = await driver.listAllTasks(admin);
    expect(all?.find((t) => t.ref === task)?.status).toBe('ongoing');
  });

  test('TC-065 the Admin task overview lists every task with its assignee and status', async ({ driver, admin, makeUser, taskIn }) => {
    const a = await makeUser();
    const b = await makeUser();
    const expected = [
      { ...(await taskIn('todo', a)), status: 'todo' },
      { ...(await taskIn('ongoing', b)), status: 'ongoing' },
      { ...(await taskIn('done', b)), status: 'done' },
    ];
    const all = await driver.listAllTasks(admin);
    expect(all).not.toBeNull();
    for (const { task, receiver, status } of expected) {
      const row = all!.find((t) => t.ref === task);
      expect(row?.status).toBe(status);
      expect(sameEmail(row?.assigneeEmail, receiver.email)).toBe(true);
    }
  });

  test('TC-066 a Receiver cannot open the Admin task overview', async ({ driver, makeUser, taskIn }) => {
    const a = await makeUser();
    await taskIn('todo');
    expect(await driver.listAllTasks(a.session)).toBeNull();
  });

  test('TC-068 the Admin cannot change the deadline of a terminal task', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of TERMINAL) {
      await test.step(status, async () => {
        const { task } = await taskIn(status);
        const before = await adminView(task);
        await driver.editTask(admin, task, { deadline: dateFromToday(14) });
        const after = await adminView(task);
        expect(after.deadline).toBe(before.deadline);
        expect(after.status).toBe(status);
      });
    }
  });

  test('TC-070 the Admin sets a deadline when creating a task', async ({ driver, admin, makeUser, adminView }) => {
    const receiver = await makeUser();
    const deadline = dateFromToday(7);
    const input = taskInput([receiver.ref], { deadline });
    await driver.createTask(admin, input);
    const task = await driver.findTaskByTitle(admin, input.title);
    expect(task).not.toBeNull();
    expect((await adminView(task!)).deadline).toBe(deadline);
  });

  test('TC-071 a task with a malformed deadline is rejected', async ({ driver, admin, makeUser }) => {
    const receiver = await makeUser();
    const input = taskInput([receiver.ref], { deadline: 'not-a-date' });
    await driver.createTask(admin, input);
    expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
  });

  test('TC-072 a Receiver cannot change the title or description of their own task', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('todo');
    const before = await adminView(task);
    await driver.editTask(receiver.session, task, { title: uniqueTitle('Hijacked'), description: `Hijacked ${token()}` });
    expect(await adminView(task)).toEqual(before);
  });

  test('TC-102 the Admin cannot move an active task deadline into the past', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of ACTIVE) {
      await test.step(status, async () => {
        const { task } = await taskIn(status);
        const before = await adminView(task);
        await driver.editTask(admin, task, { deadline: PAST() });
        const after = await adminView(task);
        expect(after.deadline).toBe(before.deadline);
        expect(after.status).toBe(status);
      });
    }
  });

  test('TC-103 the Admin cannot remove the deadline of an active task', async ({ driver, admin, taskIn, adminView }) => {
    const { task } = await taskIn('todo');
    const before = await adminView(task);
    await driver.editTask(admin, task, { deadline: null });
    expect((await adminView(task)).deadline).toBe(before.deadline);
  });

  test('TC-104 the Admin cannot change the title or description of a terminal task', async ({ driver, admin, taskIn, adminView }) => {
    for (const status of TERMINAL) {
      await test.step(status, async () => {
        const { task } = await taskIn(status);
        const before = await adminView(task);
        await driver.editTask(admin, task, { title: uniqueTitle('Edited'), description: `Edited ${token()}` });
        expect(await adminView(task)).toEqual(before);
      });
    }
  });
});
