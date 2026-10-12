import { createHash } from 'node:crypto';
import { test, expect } from '../src/fixtures';
import { uniqueEmail, uniqueName, uniquePassword } from '../src/data';

const NEEDS_HOOK = 'Needs the optional storedPasswordHash() adapter hook, because it reads the stored credential from the database.';

/** Values a stored credential must not contain: the password, reversible encodings and unsalted hashes of it. */
function weakForms(password: string): string[] {
  const forms = [password, Buffer.from(password).toString('base64'), Buffer.from(password).toString('hex')];
  for (const algorithm of ['md5', 'sha1', 'sha256', 'sha512']) {
    const digest = createHash(algorithm).update(password).digest();
    forms.push(digest.toString('hex'), digest.toString('base64'));
  }
  return forms;
}

test.describe('NFR-002 Passwords are stored as secure hashes', () => {
  test('TC-055 the stored credential is not the password, an encoding of it or an unsalted hash of it', async ({ driver, makeUser }) => {
    test.skip(!driver.storedPasswordHash, NEEDS_HOOK);
    const user = await makeUser();
    const stored = await driver.storedPasswordHash!(user.email);
    expect(stored, 'a credential is stored').toBeTruthy();
    for (const form of weakForms(user.password)) {
      expect(stored!.toLowerCase()).not.toContain(form.toLowerCase());
    }
  });

  test('TC-056 two users with the same password get different stored hashes', async ({ driver, admin }) => {
    test.skip(!driver.storedPasswordHash, NEEDS_HOOK);
    const password = uniquePassword();
    const emails = [uniqueEmail(), uniqueEmail()];
    for (const email of emails) await driver.createUser(admin, { name: uniqueName(), email, password, role: 'receiver' });
    const [first, second] = await Promise.all(emails.map((email) => driver.storedPasswordHash!(email)));
    expect(first, 'a credential is stored').toBeTruthy();
    expect(second, 'a credential is stored').toBeTruthy();
    expect(first).not.toBe(second);
  });

  test('TC-057 no password or password hash appears in any response', async ({ driver, admin, makeUser, makeTask }) => {
    const user = await makeUser();
    const task = await makeTask(user);
    // Visit every page that shows user data, as the Admin and as the user.
    await driver.userRef(admin, user.email);
    await driver.listAllTasks(admin);
    await driver.viewTask(admin, task);
    await driver.availableFeatures(admin);
    await driver.listMyTasks(user.session);
    await driver.viewTask(user.session, task);
    await driver.availableFeatures(user.session);

    const secrets = [user.password];
    const stored = driver.storedPasswordHash ? await driver.storedPasswordHash(user.email) : null;
    if (stored) secrets.push(stored);
    else test.info().annotations.push({ type: 'note', description: `Hash not checked. ${NEEDS_HOOK}` });

    const bodies = [...admin.responseBodies, ...user.session.responseBodies];
    expect(bodies.length, 'responses were recorded').toBeGreaterThan(0);
    for (const secret of secrets) {
      expect(bodies.filter((body) => body.includes(secret))).toEqual([]);
    }
  });
});
