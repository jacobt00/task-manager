import { test, expect, sameEmail } from '../src/fixtures';
import { taskInput, token, uniqueEmail, uniqueName, uniquePassword, uniqueTitle } from '../src/data';

test.describe('NFR-001 Authorization and status rules are enforced server-side', () => {
  test('TC-053 every admin-only operation is rejected for a Receiver session', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    const r = await makeUser();
    const { task, receiver: owner } = await taskIn('todo');

    await test.step('create user', async () => {
      const email = uniqueEmail();
      await driver.createUser(r.session, { name: uniqueName(), email, password: uniquePassword(), role: 'receiver' });
      expect(await driver.userRef(admin, email)).toBeNull();
    });
    await test.step('create task', async () => {
      const input = taskInput([r.ref]);
      await driver.createTask(r.session, input);
      expect(await driver.findTaskByTitle(admin, input.title)).toBeNull();
    });
    await test.step('edit and reassign task', async () => {
      const before = await adminView(task);
      await driver.editTask(r.session, task, { title: uniqueTitle('Hijacked'), description: `Hijacked ${token()}` });
      await driver.reassignTask(r.session, task, r.ref);
      const after = await adminView(task);
      expect(after).toEqual(before);
      expect(sameEmail(after.assigneeEmail, owner.email)).toBe(true);
    });
    await test.step('view all tasks', async () => {
      expect(await driver.listAllTasks(r.session)).toBeNull();
    });
  });

  test('TC-054 a crafted request for a forbidden transition is rejected', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('ongoing');
    await driver.changeStatus(receiver.session, task, 'todo');
    expect((await adminView(task)).status).toBe('ongoing');
  });
});
