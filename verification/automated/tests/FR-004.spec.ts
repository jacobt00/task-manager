import { test, expect, adminCredentials, sameEmail } from '../src/fixtures';
import { PAST, taskInput } from '../src/data';

test.describe('FR-004 Admin creates a task and assigns it to a single receiver', () => {
  test('TC-015 a new task starts as todo, assigned only to its receiver', async ({ driver, makeUser, makeTask, adminView }) => {
    const receiver = await makeUser();
    const task = await makeTask(receiver);
    const view = await adminView(task);
    expect(view.status).toBe('todo');
    expect(sameEmail(view.assigneeEmail, receiver.email)).toBe(true);
    const own = await driver.listMyTasks(receiver.session);
    expect(own?.map((t) => t.ref)).toContain(task);
  });

  test('TC-016 a task with two receivers is rejected', async ({ driver, admin, makeUser }) => {
    const a = await makeUser();
    const b = await makeUser();
    const input = taskInput([a.ref, b.ref]);
    await driver.createTask(admin, input);
    expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
  });

  test('TC-017 a task for a user that does not exist is rejected', async ({ driver, admin }) => {
    const input = taskInput([driver.unknownUserRef()]);
    await driver.createTask(admin, input);
    expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
  });

  test('TC-018 a Receiver cannot create tasks', async ({ driver, admin, makeUser }) => {
    const receiver = await makeUser();
    const input = taskInput([receiver.ref]);
    await driver.createTask(receiver.session, input);
    expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
  });

  test('TC-082 a task with no receiver is rejected', async ({ driver, admin }) => {
    const input = taskInput([]);
    await driver.createTask(admin, input);
    expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
  });

  test('TC-083 a task cannot be assigned to an Admin', async ({ driver, admin, makeUser }) => {
    const otherAdmin = await makeUser('admin');
    const self = await driver.userRef(admin, adminCredentials().email);
    expect(self, 'precondition: the Admin can look up their own account').not.toBeNull();
    for (const target of [otherAdmin.ref, self!]) {
      const input = taskInput([target]);
      await driver.createTask(admin, input);
      expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
    }
  });

  test('TC-084 a forged starting status is never used', async ({ driver, admin, makeUser, adminView }) => {
    const receiver = await makeUser();
    for (const status of ['ongoing', 'done']) {
      const input = taskInput([receiver.ref], { extraFields: { status } });
      await driver.createTask(admin, input);
      const task = await driver.findTaskByTitle(admin, input.title);
      // A rejected request is also acceptable.
      if (task !== null) expect((await adminView(task)).status).toBe('todo');
    }
  });

  test('TC-085 a task with a deadline in the past is rejected', async ({ driver, admin, makeUser }) => {
    const receiver = await makeUser();
    const input = taskInput([receiver.ref], { deadline: PAST() });
    await driver.createTask(admin, input);
    expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
  });

  test('TC-086 a task without a deadline is rejected', async ({ driver, admin, makeUser }) => {
    const receiver = await makeUser();
    const input = taskInput([receiver.ref], { deadline: null });
    await driver.createTask(admin, input);
    expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
  });
});
