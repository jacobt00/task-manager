/**
 * Adapter for the Vibe Coding implementation (task-manager/vibe-coding:
 * Node.js, Express, MongoDB, Handlebars).
 *
 * Every operation sends the same HTTP request the app's own forms send
 * (URL, field names, `_csrf` token), through `session.fetch()`. Pages are
 * read with regular expressions written against the app's Handlebars
 * templates. The adapter adds no business rules or authorization of its own.
 *
 * Configuration (environment variables):
 *   BASE_URL                    the running app, e.g. http://127.0.0.1:3100
 *   TM_VIBE_MONGODB_URI         MongoDB URI of the *test* database the app uses
 *                               (needed only by the two test-data hooks)
 *   TM_VIBE_APP_DIR             path of the vibe-coding folder, used to load its
 *                               `mongodb` driver (default: ../../vibe-coding)
 *   TM_VIBE_CLIENT_PER_SESSION  '1' = give every Session its own client address
 *                               (see workaround W1). Leave unset for TC-061.
 *
 * LIMITATIONS (features that do not exist in the app; the tests fail or pass
 * vacuously, the adapter does not invent them)
 *
 * L1 Progress reporting (FR-011) does not exist: there is no progress field,
 *    page or endpoint. `reportProgress` sends nothing and every TaskView has
 *    `progress: null`.
 * L2 There is no user list. The only place a user's ID is visible is the
 *    receiver drop-down of the task form, which lists Receivers only. So
 *    `userRef` finds Receivers but returns null for every Admin, including
 *    the test Admin itself (TC-083, TC-087 fail at their precondition; the
 *    "admin must not be created" check of TC-013 can only ever see null).
 * L3 Receivers have no page for a single task. The only per-task URL is the
 *    Admin edit form, `/admin/tasks/:id/edit`. See workaround W2.
 * L4 The receiver dashboard shows a task's ID only inside its action forms,
 *    which exist only for active tasks. A terminal task in `listMyTasks` has
 *    `ref: ''`, so a receiver can't find their own terminal task by reference.
 * L5 The receiver dashboard does not show the assignee, so `listMyTasks`
 *    returns `assigneeEmail: null`.
 * L6 Admin "editTask" and "assignTask" are reported by `availableFeatures` only
 *    when the overview offers an Edit link, which needs at least one task in
 *    the database. The receiver dashboard draws its status/cancel buttons per
 *    task, so `updateStatus` and `cancelTask` are reported when the receiver
 *    dashboard is reachable. `reportProgress` is never reported (L1).
 *
 * WORKAROUNDS
 *
 * W1 Rate limiter (test environment). The app shares one limiter between
 *    POST /login and POST /register: 10 requests per 15 minutes per client
 *    address, counting successful logins too. The suite logs in hundreds of
 *    times from one address, so nearly every test would fail at "precondition:
 *    can log in". For the main run the app is started with TRUST_PROXY=1 (a
 *    setting the app supports) and, with TM_VIBE_CLIENT_PER_SESSION=1, the
 *    adapter sends a distinct X-Forwarded-For address per Session, so every
 *    Session is a separate client. TC-061 is run without it, on a restarted app.
 *    With W1 on, TC-062 can't detect a block caused by the earlier failed login.
 * W2 `viewTask` first requests the task directly by reference, at the only
 *    per-task URL (`/admin/tasks/:id/edit`). That works for the Admin. When the
 *    app denies it to a Receiver, the adapter reports the task as it appears
 *    on that Receiver's own dashboard (matched by the ID in its action forms),
 *    because that is everything the Receiver can observe about it. A task that
 *    isn't on the dashboard gives null.
 * W3 `editTask` and `reassignTask` post the whole edit form, as the browser
 *    does: the current values are read from the edit form first (as the same
 *    session), then the requested changes are applied. A session that can't
 *    open the form (a Receiver) posts only the changed fields.
 * W4 `changeStatus` and `cancelTask` use the Admin endpoints
 *    (`/admin/tasks/:id/status|cancel`) for an Admin session and the Receiver
 *    endpoints (`/receiver/tasks/:id/status|cancel`) otherwise. The role is
 *    read from where `/dashboard` redirects the session.
 * W5 `deadline: null` in `createTask` leaves the field out; in `editTask` it
 *    sends the field empty. Two receivers are sent as two `assignedReceiver`
 *    fields.
 *
 * TEST-DATA HOOKS (direct MongoDB access)
 *   storedPasswordHash: users.passwordHash of the user (the app stores emails
 *     lower-cased, so the email is looked up lower-cased).
 *   forceDeadline: sets tasks.deadline to 00:00 UTC of the given date, the
 *     way the app stores deadlines.
 */
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { APIResponse } from '@playwright/test';
import type {
  CallOptions,
  Feature,
  ForgedRequest,
  LoginResult,
  NewTaskInput,
  NewUserInput,
  RegistrationInput,
  TaskChanges,
  TaskManagerDriver,
  TaskRef,
  TaskView,
  UserRef,
} from '../src/driver';
import type { Session } from '../src/session';

type Pairs = Array<[string, string]>;

// ---------------------------------------------------------------- HTTP

const clientAddress = new WeakMap<Session, string>();

function headersFor(session: Session): Record<string, string> {
  if (process.env.TM_VIBE_CLIENT_PER_SESSION !== '1') return {};
  let address = clientAddress.get(session);
  if (!address) {
    const b = randomBytes(3);
    address = `10.${b[0]}.${b[1]}.${b[2]}`;
    clientAddress.set(session, address);
  }
  return { 'x-forwarded-for': address };
}

function get(session: Session, url: string): Promise<APIResponse> {
  return session.fetch(url, { method: 'GET', headers: headersFor(session) });
}

function post(session: Session, url: string, pairs: Pairs): Promise<APIResponse> {
  const body = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return session.fetch(url, {
    method: 'POST',
    headers: { ...headersFor(session), 'content-type': 'application/x-www-form-urlencoded' },
    data: body,
  });
}

const pathOf = (response: APIResponse): string => new URL(response.url()).pathname;

/** The CSRF token the app issued to this session (rendered in every form, including the header's logout form). */
async function csrfToken(session: Session): Promise<string> {
  for (const url of ['/', '/login']) {
    const match = /name="_csrf" value="([^"]+)"/.exec(await (await get(session, url)).text());
    if (match) return match[1];
  }
  return '';
}

async function csrfPairs(session: Session, options?: CallOptions): Promise<Pairs> {
  const mode = options?.csrf ?? 'valid';
  if (mode === 'missing') return [];
  if (mode === 'invalid') return [['_csrf', randomBytes(32).toString('hex')]];
  return [['_csrf', await csrfToken(session)]];
}

// ---------------------------------------------------------------- HTML reading

function decode(html: string): string {
  return html
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "19 Oct 2026" (en-GB, as the overview shows it) or "2026-10-19" -> "2026-10-19". */
function normaliseDate(text: string): string | null {
  const value = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/.exec(value);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const STATUS_LABELS: Record<string, string> = { 'to do': 'todo', ongoing: 'ongoing', done: 'done', cancelled: 'cancelled', failed: 'failed' };

/** Rows of the Admin overview (views/admin/tasks.hbs). */
function parseOverview(html: string): TaskView[] {
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1] ?? '';
  const rows: TaskView[] = [];
  for (const [, row] of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    const ref = /\/admin\/tasks\/([^/"]+)\/edit/.exec(row)?.[1];
    if (!ref || cells.length < 4) continue;
    rows.push({
      ref,
      title: decode(/<strong>([\s\S]*?)<\/strong>/.exec(cells[0])?.[1] ?? ''),
      description: decode(/<div class="task-description">([\s\S]*?)<\/div>/.exec(cells[0])?.[1] ?? ''),
      assigneeEmail: (() => {
        const email = /<small>([\s\S]*?)<\/small>/.exec(cells[1])?.[1];
        return email === undefined ? null : decode(email);
      })(),
      deadline: normaliseDate(decode(cells[2])),
      status: /status-([a-z]+)"/.exec(cells[3])?.[1] ?? '',
      progress: null,
    });
  }
  return rows;
}

/** Cards of the receiver dashboard (views/dashboard/receiver.hbs). */
function parseReceiverDashboard(html: string): TaskView[] {
  const cards = html.matchAll(
    /<div class="card" style="margin-bottom:1rem"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><p class="muted">Deadline: ([\s\S]*?) · Status: <strong>([\s\S]*?)<\/strong><\/p>([\s\S]*?)<\/div>/g,
  );
  return [...cards].map(([, title, description, deadline, status, forms]) => ({
    ref: /\/receiver\/tasks\/([^/"]+)\//.exec(forms)?.[1] ?? '',
    title: decode(title),
    description: decode(description),
    deadline: normaliseDate(decode(deadline)),
    status: decode(status).trim().toLowerCase(),
    assigneeEmail: null,
    progress: null,
  }));
}

interface EditForm {
  view: TaskView;
  receiverId: string;
}

/** The Admin edit form (views/admin/task-form.hbs). */
function parseEditForm(ref: string, html: string): EditForm | null {
  if (!/<form method="post" action="\/admin\/tasks\/[^"]+\/edit"/.test(html)) return null;
  const selected = /<option value="([^"]*)" selected>([\s\S]*?)<\/option>/.exec(html);
  const label = selected ? decode(selected[2]) : '';
  const statusLabel = decode(/Current status: <strong>([\s\S]*?)<\/strong>/.exec(html)?.[1] ?? '').toLowerCase();
  return {
    receiverId: selected?.[1] ?? '',
    view: {
      ref,
      title: decode(/<input name="title"[^>]*value="([^"]*)"/.exec(html)?.[1] ?? ''),
      description: decode(/<textarea name="description"[^>]*>([\s\S]*?)<\/textarea>/.exec(html)?.[1] ?? ''),
      deadline: normaliseDate(decode(/<input type="date" name="deadline" value="([^"]*)"/.exec(html)?.[1] ?? '')),
      status: STATUS_LABELS[statusLabel] ?? statusLabel,
      assigneeEmail: /\(([^()]*)\)\s*$/.exec(label)?.[1] ?? null,
      progress: null,
    },
  };
}

async function openEditForm(session: Session, task: TaskRef): Promise<EditForm | null> {
  const response = await get(session, `/admin/tasks/${encodeURIComponent(task)}/edit`);
  if (response.status() !== 200) return null;
  return parseEditForm(task, await response.text());
}

/** 'admin', 'receiver' or null (not logged in), from where /dashboard redirects. */
async function roleOf(session: Session): Promise<'admin' | 'receiver' | null> {
  const where = pathOf(await get(session, '/dashboard'));
  if (where.startsWith('/admin/')) return 'admin';
  if (where.startsWith('/receiver/')) return 'receiver';
  return null;
}

// ---------------------------------------------------------------- optional DB hooks

/** The app's own `mongodb` driver (the test project doesn't depend on it). */
function mongodb(): any {
  const appDir = process.env.TM_VIBE_APP_DIR ?? path.resolve(__dirname, '../../../vibe-coding');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(require.resolve('mongodb', { paths: [appDir] }));
}

let db: Promise<any> | undefined;
function database(): Promise<any> {
  if (!db) {
    const uri = process.env.TM_VIBE_MONGODB_URI;
    if (!uri) throw new Error('Set TM_VIBE_MONGODB_URI to the test database to use the test-data hooks.');
    db = new (mongodb().MongoClient)(uri).connect().then((client: any) => client.db());
  }
  return db!;
}

// ---------------------------------------------------------------- driver

export default function createDriver(): TaskManagerDriver {
  const driver: TaskManagerDriver = {
    sessionCookieName: 'taskflow.sid',

    async register(visitor: Session, input: RegistrationInput, options?: CallOptions) {
      await get(visitor, '/register');
      const pairs: Pairs = await csrfPairs(visitor, options);
      if (input.name !== undefined) pairs.push(['name', input.name]);
      if (input.email !== undefined) pairs.push(['email', input.email]);
      if (input.password !== undefined) pairs.push(['password', input.password]);
      for (const [k, v] of Object.entries(input.extraFields ?? {})) pairs.push([k, v]);
      await post(visitor, '/register', pairs);
    },

    async login(session: Session, email: string, password: string): Promise<LoginResult> {
      await get(session, '/login');
      const response = await post(session, '/login', [...(await csrfPairs(session)), ['email', email], ['password', password]]);
      const html = await response.text();
      const alert = /<div class="alert" role="alert">([\s\S]*?)<\/div>/.exec(html)?.[1];
      const message = alert !== undefined ? decode(alert).trim() : response.status() >= 400 ? html.trim() || null : null;
      const ok = await driver.isAuthenticated(session);
      return { ok, message: ok ? null : message };
    },

    async logout(session: Session, options?: CallOptions) {
      await post(session, '/logout', await csrfPairs(session, options));
    },

    async isAuthenticated(session: Session) {
      return (await roleOf(session)) !== null;
    },

    async availableFeatures(session: Session): Promise<Feature[]> {
      const dashboard = await get(session, '/dashboard');
      const where = pathOf(dashboard);
      const html = await dashboard.text();
      const features: Feature[] = [];
      if (where === '/admin/dashboard') {
        if (html.includes('href="/admin/users/new"')) features.push('createUser');
        if (html.includes('href="/admin/tasks/new"')) {
          features.push('createTask');
          const form = await (await get(session, '/admin/tasks/new')).text();
          if (form.includes('name="assignedReceiver"')) features.push('assignTask');
        }
        if (html.includes('href="/admin/tasks"')) {
          features.push('taskOverview');
          const overview = await (await get(session, '/admin/tasks')).text();
          if (/href="\/admin\/tasks\/[^"]+\/edit"/.test(overview)) features.push('editTask');
        }
      } else if (where === '/receiver/dashboard' && dashboard.status() === 200) {
        features.push('ownTasks', 'updateStatus', 'cancelTask');
      }
      return features;
    },

    async createUser(session: Session, input: NewUserInput, options?: CallOptions) {
      const pairs: Pairs = await csrfPairs(session, options);
      if (input.name !== undefined) pairs.push(['name', input.name]);
      if (input.email !== undefined) pairs.push(['email', input.email]);
      if (input.password !== undefined) pairs.push(['password', input.password]);
      pairs.push(['role', input.role]);
      await post(session, '/admin/users', pairs);
    },

    async userRef(admin: Session, email: string): Promise<UserRef | null> {
      const response = await get(admin, '/admin/tasks/new');
      if (response.status() !== 200) return null;
      const select = /<select name="assignedReceiver"[\s\S]*?<\/select>/.exec(await response.text())?.[0] ?? '';
      for (const [, id, label] of select.matchAll(/<option value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/g)) {
        const shown = /\(([^()]*)\)\s*$/.exec(decode(label))?.[1];
        if (shown && shown.toLowerCase() === email.toLowerCase()) return id;
      }
      return null;
    },

    unknownUserRef: () => 'ffffffffffffffffffffffff',

    async createTask(session: Session, input: NewTaskInput, options?: CallOptions) {
      const pairs: Pairs = await csrfPairs(session, options);
      pairs.push(['title', input.title], ['description', input.description]);
      if (input.deadline !== null) pairs.push(['deadline', input.deadline]);
      for (const receiver of input.receivers) pairs.push(['assignedReceiver', receiver]);
      for (const [k, v] of Object.entries(input.extraFields ?? {})) pairs.push([k, v]);
      await post(session, '/admin/tasks', pairs);
    },

    async findTaskByTitle(admin: Session, title: string) {
      return (await driver.listAllTasks(admin))?.find((t) => t.title === title)?.ref ?? null;
    },

    async listAllTasks(session: Session) {
      const response = await get(session, '/admin/tasks');
      if (response.status() !== 200 || pathOf(response) !== '/admin/tasks') return null;
      return parseOverview(await response.text());
    },

    async listMyTasks(session: Session) {
      const response = await get(session, '/receiver/dashboard');
      if (response.status() !== 200 || pathOf(response) !== '/receiver/dashboard') return null;
      return parseReceiverDashboard(await response.text());
    },

    async viewTask(session: Session, task: TaskRef) {
      const direct = await openEditForm(session, task);
      if (direct) return direct.view;
      // W2: a Receiver has no per-task page; report what their dashboard shows.
      return (await driver.listMyTasks(session))?.find((t) => t.ref === task) ?? null;
    },

    async editTask(session: Session, task: TaskRef, changes: TaskChanges, options?: CallOptions) {
      const current = await openEditForm(session, task);
      const fields: Record<string, string> = current
        ? {
            title: current.view.title,
            description: current.view.description,
            deadline: current.view.deadline ?? '',
            assignedReceiver: current.receiverId,
          }
        : {};
      if (changes.title !== undefined) fields.title = changes.title;
      if (changes.description !== undefined) fields.description = changes.description;
      if (changes.deadline !== undefined) fields.deadline = changes.deadline ?? '';
      await post(session, `/admin/tasks/${encodeURIComponent(task)}/edit`, [...(await csrfPairs(session, options)), ...Object.entries(fields)]);
    },

    async changeStatus(session: Session, task: TaskRef, status: string, options?: CallOptions) {
      const base = (await roleOf(session)) === 'admin' ? '/admin/tasks' : '/receiver/tasks';
      await post(session, `${base}/${encodeURIComponent(task)}/status`, [...(await csrfPairs(session, options)), ['status', status]]);
    },

    async cancelTask(session: Session, task: TaskRef, options?: CallOptions) {
      const base = (await roleOf(session)) === 'admin' ? '/admin/tasks' : '/receiver/tasks';
      await post(session, `${base}/${encodeURIComponent(task)}/cancel`, await csrfPairs(session, options));
    },

    async reassignTask(session: Session, task: TaskRef, receiver: UserRef, options?: CallOptions) {
      const current = await openEditForm(session, task);
      const fields: Record<string, string> = current
        ? { title: current.view.title, description: current.view.description, deadline: current.view.deadline ?? '' }
        : {};
      fields.assignedReceiver = receiver;
      await post(session, `/admin/tasks/${encodeURIComponent(task)}/edit`, [...(await csrfPairs(session, options)), ...Object.entries(fields)]);
    },

    // L1: the app has no progress feature, so there is no request to send.
    async reportProgress() {},

    async forgedCancelRequest(task: TaskRef): Promise<ForgedRequest> {
      const base = process.env.BASE_URL ?? '';
      return { method: 'POST', action: new URL(`/receiver/tasks/${encodeURIComponent(task)}/cancel`, base).toString(), fields: {} };
    },

    async storedPasswordHash(email: string) {
      const user = await (await database()).collection('users').findOne({ email: email.toLowerCase() });
      return user?.passwordHash ?? null;
    },

    async forceDeadline(task: TaskRef, deadline: string) {
      await (await database()).collection('tasks').updateOne({ _id: new (mongodb().ObjectId)(task) }, { $set: { deadline: new Date(`${deadline}T00:00:00.000Z`) } });
    },
  };
  return driver;
}
