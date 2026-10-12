import { test, expect } from '../src/fixtures';
import { ADMIN_FEATURES, uniqueEmail, uniqueName, uniquePassword } from '../src/data';

const newUser = () => ({ name: uniqueName(), email: uniqueEmail(), password: uniquePassword() });

test.describe('FR-003 Admin can create users', () => {
  test('TC-011 the Admin creates a Receiver who can log in to the Receiver interface', async ({ driver, admin, newSession }) => {
    const user = newUser();
    await driver.createUser(admin, { ...user, role: 'receiver' });
    const session = await newSession();
    expect((await driver.login(session, user.email, user.password)).ok).toBe(true);
    const features = await driver.availableFeatures(session);
    expect(features).toContain('ownTasks');
    for (const feature of ADMIN_FEATURES) expect(features).not.toContain(feature);
  });

  test('TC-012 creating a user with a missing field or a used email is rejected', async ({ driver, admin, makeUser, newSession }) => {
    for (const missing of ['name', 'email', 'password'] as const) {
      await test.step(`${missing} missing`, async () => {
        const user = newUser();
        await driver.createUser(admin, { ...user, [missing]: undefined, role: 'receiver' });
        // Without an email there is no user to look for afterwards.
        if (missing !== 'email') expect(await driver.userRef(admin, user.email)).toBeNull();
      });
    }
    await test.step('email already used', async () => {
      const existing = await makeUser();
      const otherPassword = uniquePassword();
      await driver.createUser(admin, { name: uniqueName(), email: existing.email, password: otherPassword, role: 'receiver' });
      expect((await driver.login(await newSession(), existing.email, existing.password)).ok).toBe(true);
      expect((await driver.login(await newSession(), existing.email, otherPassword)).ok).toBe(false);
    });
  });

  test('TC-013 a Receiver cannot create users', async ({ driver, admin, makeUser }) => {
    const receiver = await makeUser();
    for (const role of ['receiver', 'admin'] as const) {
      const user = newUser();
      await driver.createUser(receiver.session, { ...user, role });
      expect(await driver.userRef(admin, user.email), `${role} must not be created`).toBeNull();
    }
  });

  test('TC-014 an unauthenticated visitor cannot create users', async ({ driver, admin, newSession }) => {
    const user = newUser();
    await driver.createUser(await newSession(), { ...user, role: 'receiver' });
    expect(await driver.userRef(admin, user.email)).toBeNull();
  });

  test('TC-081 the Admin creates another Admin who can log in to the Admin interface', async ({ driver, admin, newSession }) => {
    const user = newUser();
    await driver.createUser(admin, { ...user, role: 'admin' });
    const session = await newSession();
    expect((await driver.login(session, user.email, user.password)).ok).toBe(true);
    const features = await driver.availableFeatures(session);
    for (const feature of ADMIN_FEATURES) expect(features).toContain(feature);
  });

  test('TC-101 creating a user with an existing email in different letter case is rejected', async ({ driver, admin, makeUser, newSession }) => {
    const existing = await makeUser();
    const otherPassword = uniquePassword();
    await driver.createUser(admin, { name: uniqueName(), email: existing.email.toUpperCase(), password: otherPassword, role: 'receiver' });
    expect((await driver.login(await newSession(), existing.email, existing.password)).ok).toBe(true);
    expect((await driver.login(await newSession(), existing.email, otherPassword)).ok).toBe(false);
  });
});
