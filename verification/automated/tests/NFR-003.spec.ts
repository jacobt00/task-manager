import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, expect } from '../src/fixtures';
import { taskInput, token, uniqueEmail, uniqueName, uniquePassword, uniqueTitle } from '../src/data';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

test.describe('NFR-003 CSRF protection, rate limiting and secure sessions', () => {
  test('TC-058 a state-changing request with a valid CSRF token is processed', async ({ driver, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('todo');
    await driver.changeStatus(receiver.session, task, 'ongoing', { csrf: 'valid' });
    expect((await adminView(task)).status).toBe('ongoing');
  });

  test('TC-059 state-changing requests without a valid CSRF token are rejected', async ({ driver, admin, makeUser, taskIn, adminView }) => {
    for (const csrf of ['missing', 'invalid'] as const) {
      await test.step(`token ${csrf}`, async () => {
        const email = uniqueEmail();
        await driver.createUser(admin, { name: uniqueName(), email, password: uniquePassword(), role: 'receiver' }, { csrf });
        expect(await driver.userRef(admin, email), 'create user').toBeNull();

        const receiver = await makeUser();
        const input = taskInput([receiver.ref]);
        await driver.createTask(admin, input, { csrf });
        expect(await driver.findTaskByTitle(admin, input.title), 'create task').toBeNull();

        const { task } = await taskIn('ongoing', receiver);
        const other = await makeUser();
        const before = await adminView(task);
        await driver.editTask(admin, task, { title: uniqueTitle('Edited'), description: `Edited ${token()}` }, { csrf });
        await driver.reassignTask(admin, task, other.ref, { csrf });
        await driver.changeStatus(receiver.session, task, 'done', { csrf });
        await driver.cancelTask(receiver.session, task, { csrf });
        await driver.reportProgress(receiver.session, task, 50, { csrf });
        expect(await adminView(task), 'edit, reassign, status, cancel and progress').toEqual(before);
      });
    }
  });

  test('TC-060 a form auto-submitted from another origin is rejected', async ({ driver, browser, baseURL, taskIn, adminView }) => {
    const { task, receiver } = await taskIn('ongoing');
    const forged = await driver.forgedCancelRequest(task);
    const inputs = Object.entries(forged.fields)
      .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
      .join('');
    const page = `<!doctype html><form id="f" method="${forged.method}" action="${escapeHtml(forged.action)}">${inputs}</form>` +
      `<script>document.getElementById('f').submit()</script>`;

    // Serve the attacker page from a host name that differs from the app's, so the origin and site differ.
    const attackerHost = new URL(baseURL!).hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1';
    const server = http.createServer((_, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(page);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const attackerUrl = `http://${attackerHost}:${(server.address() as AddressInfo).port}/`;

    const context = await browser.newContext({ storageState: await receiver.session.storageState(), ignoreHTTPSErrors: true });
    try {
      const tab = await context.newPage();
      await tab.goto(attackerUrl);
      await tab.waitForURL((url) => !url.toString().startsWith(attackerUrl), { timeout: 15_000 }).catch(() => undefined);
      await tab.waitForLoadState('load').catch(() => undefined);
    } finally {
      await context.close();
      server.close();
    }
    expect((await adminView(task)).status).toBe('ongoing');
  });

  test('TC-061 login is blocked after 20 failed attempts in a row from the same client', { tag: '@rate-limit' }, async ({ driver, makeUser, newSession }) => {
    const user = await makeUser();
    for (let attempt = 1; attempt <= 20; attempt++) {
      await driver.login(await newSession(), user.email, uniquePassword());
    }
    const session = await newSession();
    expect((await driver.login(session, user.email, user.password)).ok).toBe(false);
    expect(await driver.isAuthenticated(session)).toBe(false);
  });

  test('TC-062 a single failed login does not block the user', async ({ driver, makeUser, newSession }) => {
    const user = await makeUser();
    expect((await driver.login(await newSession(), user.email, uniquePassword())).ok).toBe(false);
    expect((await driver.login(await newSession(), user.email, user.password)).ok).toBe(true);
  });

  test('TC-063 the session cookie is HttpOnly, SameSite and, over HTTPS, Secure', async ({ driver, baseURL, makeUser }) => {
    const user = await makeUser();
    const name = driver.sessionCookieName;
    const header = [...user.session.setCookieHeaders].reverse().find((h) => h.split('=')[0].trim() === name);
    expect(header, `a Set-Cookie header for "${name}" was received`).toBeDefined();
    const attributes = header!.split(';').slice(1).map((a) => a.trim().toLowerCase());
    expect(attributes).toContain('httponly');
    const sameSite = attributes.find((a) => a.startsWith('samesite='))?.split('=')[1];
    expect(['lax', 'strict']).toContain(sameSite);
    if (new URL(baseURL!).protocol === 'https:') {
      expect(attributes).toContain('secure');
    } else {
      test.info().annotations.push({ type: 'note', description: 'Running over HTTP: the Secure flag is not required (Q-19).' });
    }
  });

  test('TC-064 logging in issues a new session ID (session fixation)', async ({ driver, baseURL, makeUser, newSession }) => {
    const user = await makeUser();
    const name = driver.sessionCookieName;
    const planted = `fixation${token()}`;
    const preset = {
      cookies: [{ name, value: planted, domain: new URL(baseURL!).hostname, path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' as const }],
      origins: [],
    };
    const victim = await newSession(preset);
    expect((await driver.login(victim, user.email, user.password)).ok).toBe(true);
    const issued = (await victim.storageState()).cookies.find((c) => c.name === name);
    expect(issued, `the "${name}" cookie is set after login`).toBeDefined();
    expect(issued!.value).not.toBe(planted);
    const attacker = await newSession(preset);
    expect(await driver.isAuthenticated(attacker)).toBe(false);
  });

  test('TC-095 logout without a valid CSRF token is rejected', async ({ driver, makeUser }) => {
    const user = await makeUser();
    for (const csrf of ['missing', 'invalid'] as const) {
      await driver.logout(user.session, { csrf });
      expect(await driver.isAuthenticated(user.session), `token ${csrf}`).toBe(true);
    }
  });
});
