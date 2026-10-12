import { test, expect } from '../src/fixtures';
import { ADMIN_FEATURES, uniqueEmail, uniqueName, uniquePassword } from '../src/data';

const newVisitor = () => ({ name: uniqueName(), email: uniqueEmail(), password: uniquePassword() });

test.describe('FR-001 User registration', () => {
  test('TC-001 registering with a name, an unused email and a password creates an account that can log in', async ({ driver, newSession }) => {
    const user = newVisitor();
    await driver.register(await newSession(), user);
    expect((await driver.login(await newSession(), user.email, user.password)).ok).toBe(true);
  });

  test('TC-002 registration with the name, email or password missing is rejected', async ({ driver, newSession }) => {
    for (const missing of ['name', 'email', 'password'] as const) {
      await test.step(`${missing} missing`, async () => {
        const user = newVisitor();
        const visitor = await newSession();
        await driver.register(visitor, { ...user, [missing]: undefined });
        expect(await driver.isAuthenticated(visitor)).toBe(false);
        // Without an email there is no account to look for afterwards.
        if (missing === 'email') return;
        // If no account was created, the same email is still free to register.
        const retry = { ...user, password: uniquePassword() };
        await driver.register(await newSession(), retry);
        expect((await driver.login(await newSession(), retry.email, retry.password)).ok).toBe(true);
      });
    }
  });

  test('TC-003 registering with an email that is already used is rejected', async ({ driver, newSession }) => {
    const first = newVisitor();
    await driver.register(await newSession(), first);
    const secondPassword = uniquePassword();
    await driver.register(await newSession(), { name: uniqueName(), email: first.email, password: secondPassword });
    expect((await driver.login(await newSession(), first.email, first.password)).ok).toBe(true);
    expect((await driver.login(await newSession(), first.email, secondPassword)).ok).toBe(false);
  });

  test('TC-004 a forged role parameter at registration never creates an Admin', async ({ driver, newSession, admin }) => {
    const user = newVisitor();
    await driver.register(await newSession(), { ...user, extraFields: { role: 'admin', isAdmin: 'true' } });
    const session = await newSession();
    // A rejected registration is also acceptable: the account is then never an Admin.
    if (!(await driver.login(session, user.email, user.password)).ok) return;
    const features = await driver.availableFeatures(session);
    for (const feature of ADMIN_FEATURES) expect(features).not.toContain(feature);
    expect(await driver.listAllTasks(session)).toBeNull();
    const probe = uniqueEmail();
    await driver.createUser(session, { name: uniqueName(), email: probe, password: uniquePassword(), role: 'receiver' });
    expect(await driver.userRef(admin, probe)).toBeNull();
  });

  test('TC-079 a self-registered user is a Receiver', async ({ driver, newSession, admin }) => {
    const user = newVisitor();
    await driver.register(await newSession(), user);
    const session = await newSession();
    expect((await driver.login(session, user.email, user.password)).ok).toBe(true);
    const features = await driver.availableFeatures(session);
    expect(features).toContain('ownTasks');
    for (const feature of ADMIN_FEATURES) expect(features).not.toContain(feature);
    expect(await driver.listAllTasks(session)).toBeNull();
    const probe = uniqueEmail();
    await driver.createUser(session, { name: uniqueName(), email: probe, password: uniquePassword(), role: 'receiver' });
    expect(await driver.userRef(admin, probe)).toBeNull();
  });

  test('TC-099 registering with an existing email in different letter case is rejected', async ({ driver, newSession }) => {
    const first = newVisitor();
    await driver.register(await newSession(), first);
    const otherPassword = uniquePassword();
    await driver.register(await newSession(), { name: uniqueName(), email: first.email.toUpperCase(), password: otherPassword });
    expect((await driver.login(await newSession(), first.email, first.password)).ok).toBe(true);
    expect((await driver.login(await newSession(), first.email.toUpperCase(), otherPassword)).ok).toBe(false);
  });
});
