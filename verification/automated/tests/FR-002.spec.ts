import { test, expect } from '../src/fixtures';
import { ADMIN_FEATURES, RECEIVER_FEATURES, uniqueEmail, uniqueName, uniquePassword } from '../src/data';

test.describe('FR-002 User login/logout', () => {
  test('TC-005 logging in with the correct email and password creates an authenticated session', async ({ driver, admin, newSession }) => {
    const user = { name: uniqueName(), email: uniqueEmail(), password: uniquePassword() };
    await driver.createUser(admin, { ...user, role: 'receiver' });
    const session = await newSession();
    expect((await driver.login(session, user.email, user.password)).ok).toBe(true);
    expect(await driver.isAuthenticated(session)).toBe(true);
  });

  test('TC-006 logging in with a wrong password is rejected', async ({ driver, makeUser, newSession }) => {
    const user = await makeUser();
    const session = await newSession();
    expect((await driver.login(session, user.email, uniquePassword())).ok).toBe(false);
    expect(await driver.isAuthenticated(session)).toBe(false);
  });

  test('TC-007 logging in with an unknown email is rejected', async ({ driver, newSession }) => {
    const session = await newSession();
    expect((await driver.login(session, uniqueEmail('nobody'), uniquePassword())).ok).toBe(false);
    expect(await driver.isAuthenticated(session)).toBe(false);
  });

  test('TC-008 logging out ends the session', async ({ driver, makeUser }) => {
    const user = await makeUser();
    await driver.logout(user.session);
    expect(await driver.isAuthenticated(user.session)).toBe(false);
  });

  test('TC-009 a session cookie replayed after logout is no longer valid', async ({ driver, makeUser, newSession }) => {
    const user = await makeUser();
    const captured = await user.session.storageState();
    await driver.logout(user.session);
    const replay = await newSession(captured);
    expect(await driver.isAuthenticated(replay)).toBe(false);
  });

  test('TC-010 an unauthenticated visitor gets no task data', async ({ driver, taskIn, newSession }) => {
    const { task } = await taskIn('todo');
    const visitor = await newSession();
    expect(await driver.listMyTasks(visitor)).toBeNull();
    expect(await driver.listAllTasks(visitor)).toBeNull();
    expect(await driver.viewTask(visitor, task)).toBeNull();
  });

  test('TC-078 each role reaches its own interface after logging in', async ({ driver, admin, makeUser }) => {
    const adminFeatures = await driver.availableFeatures(admin);
    for (const feature of ADMIN_FEATURES) expect(adminFeatures).toContain(feature);
    const receiver = await makeUser();
    const receiverFeatures = await driver.availableFeatures(receiver.session);
    for (const feature of RECEIVER_FEATURES) expect(receiverFeatures).toContain(feature);
    for (const feature of ADMIN_FEATURES) expect(receiverFeatures).not.toContain(feature);
  });

  test('TC-080 the login error is the same for a wrong password and an unknown email', async ({ driver, makeUser, newSession }) => {
    const user = await makeUser();
    const wrongPassword = await driver.login(await newSession(), user.email, uniquePassword());
    const unknownEmail = await driver.login(await newSession(), uniqueEmail('nobody'), uniquePassword());
    expect(wrongPassword.ok).toBe(false);
    expect(unknownEmail.ok).toBe(false);
    expect(wrongPassword.message).toBe(unknownEmail.message);
  });

  test('TC-100 logging in with the email in different letter case succeeds', async ({ driver, makeUser, newSession }) => {
    const user = await makeUser();
    expect((await driver.login(await newSession(), user.email.toUpperCase(), user.password)).ok).toBe(true);
  });
});

