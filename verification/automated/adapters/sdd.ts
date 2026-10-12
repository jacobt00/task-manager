/**
 * Adapter for the SDD implementation (./TaskManager: Python, SQLite, Tkinter
 * desktop GUI and a text-menu CLI).
 *
 * HOW IT TALKS TO THE APP
 * The SDD app has no HTTP server, so there are no URLs, forms, cookies or
 * CSRF tokens. Both of its interfaces (gui.py, cli.py) only call the service
 * layer (auth.py, admin.py, receiver.py), and its README says that is where
 * every role and status rule is enforced. This adapter therefore drives that
 * service layer through adapters/sdd_bridge.py: a Python process, one per
 * Playwright worker, that builds the services exactly as cli.build_app() does
 * and maps each request to one service call, as the CLI's menu actions do.
 * Calling the services directly (instead of the menus) means a hidden menu
 * item never masks a missing check, which is what the README asks of HTTP
 * adapters too. Neither the adapter nor the bridge adds rules: every
 * rejection comes from the app raising an error.
 *
 * Configuration (environment variables):
 *   BASE_URL        required by the test fixtures but never contacted; use an
 *                   address where nothing listens, e.g. http://127.0.0.1:9
 *   TM_SDD_APP_DIR  path of the SDD app (default: /root/TaskManager)
 *   TM_SDD_DB       SQLite file of the *test* database (required)
 *   TM_SDD_PYTHON   Python interpreter (default: python3)
 *
 * MAPPINGS (vocabulary differences, not rules)
 * M1 The app logs users in by *username* and has no "name" field. The tests
 *    log in by email, so the adapter uses the email as the username and also
 *    sends it as the email. The test's `name` is not sent (the app has no
 *    field for it). Usernames are case-sensitive in the app (docs/decisions.md).
 * M2 Role 'receiver' is the app's role 'user'. Registration sends the role the
 *    registration form would send: 'user' ("Regular user", the form's
 *    default) unless the request carries a forged `role` field, which is
 *    passed through like any other form field (TC-004).
 * M3 Deadlines: the app takes a date *and time* in local time (the CLI's
 *    "YYYY-MM-DD HH:MM", parsed by the CLI's own parse_deadline()). A test date
 *    D is sent as "D 12:00"; any other string is sent unchanged, so the
 *    app's parser decides. Shown deadlines are cut to their date part.
 * M4 Assignee: the task list shows the assignee's username, which is the
 *    email (M1). It is reported as `assigneeEmail`.
 * M5 An empty receiver list is sent as an empty assignee, as when nothing is
 *    picked in the GUI's "Assign to" box.
 *
 * LIMITATIONS (features that do not exist; tests fail or are not applicable)
 * L1 No progress feature (FR-011): `reportProgress` sends nothing, `progress`
 *    is always null.
 * L2 No access by reference: no service returns a single task. A user sees a
 *    task only in their task list (CLI "My tasks", GUI list + details pane),
 *    so `viewTask` reports the task as it appears in the session's own list,
 *    or null if it isn't there.
 * L3 No separate Admin overview: every user (Admin or not) gets one list from
 *    ReceiverService.list_tasks(). For an Admin it holds the tasks they
 *    assigned or reassigned (plus any assigned to them); for a regular user,
 *    their own tasks. `listAllTasks` and `listMyTasks` both return that list,
 *    so a Receiver's `listAllTasks` is their own list, never null.
 * L4 A task has exactly one assignee field, so a request with two receivers
 *    can't be expressed. The adapter sends nothing in that case (TC-016).
 * L5 No HTTP layer: no session cookie (`sessionCookieName` is ''), no CSRF
 *    tokens (`options.csrf` has nothing to act on and is ignored), no recorded
 *    responses (Session.responseBodies stays empty), and no endpoint a cross-site
 *    form could reach (`forgedCancelRequest` points at BASE_URL, where nothing
 *    listens). A Session's login is kept as the app's session token in
 *    adapter memory; it is not part of the Session's storage state.
 * L6 `availableFeatures` maps the CLI menu items the app builds for the user
 *    (cli.App.menu_items) to features. The GUI shows the same functions.
 *
 * WORKAROUNDS
 * W1 `logout` ends the app session (AuthService.logout) but the adapter keeps
 *    the old token, so `isAuthenticated` afterwards checks that the app really
 *    invalidated it, not just that the client forgot it.
 * W2 `editTask` follows the CLI's edit form: a field that isn't changed is
 *    left blank (None = keep). `deadline: null` is therefore "keep", the only
 *    way to send an empty deadline in this app.
 *
 * TEST-DATA HOOKS (direct SQLite access, in the bridge)
 *   storedPasswordHash: users.password_hash of the user (username = email).
 *   forceDeadline: sets tasks.deadline to 12:00 UTC of the given date. The
 *     app's Task model refuses to load a task whose deadline is not after its
 *     assignment_date (models.Task.__post_init__), which would make every list
 *     containing it crash. A real overdue task was always assigned before its
 *     deadline, so the hook also moves assignment_date to one day before the
 *     new deadline when it is later than that.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
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

// ---------------------------------------------------------------- bridge

interface Reply {
  id: number;
  ok: boolean;
  result?: any;
  error?: string;
  kind?: 'rejected' | 'infrastructure';
}

let bridge: ChildProcessWithoutNullStreams | undefined;
const pending = new Map<number, (reply: Reply) => void>();
let nextId = 1;

function startBridge(): ChildProcessWithoutNullStreams {
  const db = process.env.TM_SDD_DB;
  if (!db) throw new Error('Set TM_SDD_DB to the SQLite file of the SDD test database.');
  const appDir = process.env.TM_SDD_APP_DIR ?? '/root/TaskManager';
  const child = spawn(process.env.TM_SDD_PYTHON ?? 'python3', [path.join(__dirname, 'sdd_bridge.py'), appDir, db], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  createInterface({ input: child.stdout }).on('line', (line) => {
    const reply = JSON.parse(line) as Reply;
    pending.get(reply.id)?.(reply);
    pending.delete(reply.id);
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => (stderr += chunk));
  child.on('exit', (code) => {
    bridge = undefined;
    const error: Reply = { id: 0, ok: false, kind: 'infrastructure', error: `SDD bridge exited (${code}): ${stderr}` };
    for (const resolve of pending.values()) resolve(error);
    pending.clear();
  });
  child.unref();
  (child.stdin as any).unref?.();
  (child.stdout as any).unref?.();
  (child.stderr as any).unref?.();
  return child;
}

/** Sends one request to the app. Resolves with the reply; throws only for infrastructure problems. */
async function call(op: string, args: Record<string, unknown> = {}): Promise<Reply> {
  bridge ??= startBridge();
  const id = nextId++;
  const reply = await new Promise<Reply>((resolve) => {
    pending.set(id, resolve);
    bridge!.stdin.write(JSON.stringify({ id, op, args }) + '\n');
  });
  if (!reply.ok && reply.kind === 'infrastructure') throw new Error(`SDD ${op}: ${reply.error}`);
  return reply;
}

// ---------------------------------------------------------------- helpers

/** The app session token each Session holds after logging in. */
const tokens = new WeakMap<Session, string>();

const role = (r: string): string => (r === 'receiver' ? 'user' : r);

/** M3: a date becomes "D 12:00"; anything else is sent as given. */
const cliDeadline = (value: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} 12:00` : value);

const MENU_FEATURES: Record<string, Feature> = {
  'My tasks': 'ownTasks',
  'Tasks I assigned or was assigned': 'taskOverview',
  "Update a task's status": 'updateStatus',
  'Cancel a task': 'cancelTask',
  'Create a task': 'createTask',
  'Edit a task': 'editTask',
  'Reassign a task': 'assignTask',
  'Create a user': 'createUser',
};

async function taskList(session: Session): Promise<TaskView[] | null> {
  const reply = await call('list_tasks', { token: tokens.get(session) ?? null });
  if (!reply.ok) return null;
  return (reply.result as any[]).map((t) => ({
    ref: t.ref,
    title: t.title,
    description: t.description,
    deadline: typeof t.deadline === 'string' ? t.deadline.slice(0, 10) : null,
    status: t.status,
    assigneeEmail: t.assignee ?? null,
    progress: null,
  }));
}

// ---------------------------------------------------------------- driver

export default function createDriver(): TaskManagerDriver {
  return {
    sessionCookieName: '',

    async register(_visitor: Session, input: RegistrationInput) {
      const forgedRole = input.extraFields?.role;
      await call('register', {
        username: input.email ?? '',
        password: input.password ?? '',
        email: input.email ?? '',
        role: forgedRole !== undefined ? forgedRole : 'user',
      });
    },

    async login(session: Session, email: string, password: string): Promise<LoginResult> {
      const reply = await call('login', { username: email, password });
      if (!reply.ok) return { ok: false, message: reply.error ?? null };
      tokens.set(session, reply.result);
      return { ok: true, message: null };
    },

    async logout(session: Session) {
      const token = tokens.get(session);
      if (token) await call('logout', { token });
    },

    async isAuthenticated(session: Session) {
      return (await call('whoami', { token: tokens.get(session) ?? null })).ok;
    },

    async availableFeatures(session: Session): Promise<Feature[]> {
      const reply = await call('menu', { token: tokens.get(session) ?? null });
      if (!reply.ok) return [];
      return (reply.result as string[]).map((label) => MENU_FEATURES[label]).filter((f): f is Feature => f !== undefined);
    },

    async createUser(session: Session, input: NewUserInput) {
      await call('create_user', {
        token: tokens.get(session) ?? null,
        username: input.email ?? '',
        password: input.password ?? '',
        email: input.email ?? '',
        role: role(input.role),
      });
    },

    async userRef(admin: Session, email: string): Promise<UserRef | null> {
      const reply = await call('list_users', { token: tokens.get(admin) ?? null });
      if (!reply.ok) return null;
      const users = reply.result as Array<{ id: string; username: string; email: string }>;
      return (users.find((u) => u.username === email) ?? users.find((u) => u.email === email))?.id ?? null;
    },

    unknownUserRef: () => '00000000-0000-4000-8000-000000000000',

    async createTask(session: Session, input: NewTaskInput) {
      if (input.receivers.length > 1) return; // L4
      await call('create_task', {
        token: tokens.get(session) ?? null,
        title: input.title,
        description: input.description,
        deadline: input.deadline === null ? '' : cliDeadline(input.deadline),
        user_id: input.receivers[0] ?? '',
      });
    },

    async findTaskByTitle(admin: Session, title: string) {
      return (await taskList(admin))?.find((t) => t.title === title)?.ref ?? null;
    },

    listAllTasks: taskList,
    listMyTasks: taskList,

    async viewTask(session: Session, task: TaskRef) {
      return (await taskList(session))?.find((t) => t.ref === task) ?? null;
    },

    async editTask(session: Session, task: TaskRef, changes: TaskChanges) {
      await call('edit_task', {
        token: tokens.get(session) ?? null,
        task_id: task,
        title: changes.title ?? null,
        description: changes.description ?? null,
        deadline: changes.deadline ? cliDeadline(changes.deadline) : changes.deadline === '' ? '' : null,
      });
    },

    async changeStatus(session: Session, task: TaskRef, status: string, _options?: CallOptions) {
      await call('update_status', { token: tokens.get(session) ?? null, task_id: task, status });
    },

    async cancelTask(session: Session, task: TaskRef) {
      await call('cancel', { token: tokens.get(session) ?? null, task_id: task });
    },

    async reassignTask(session: Session, task: TaskRef, receiver: UserRef) {
      await call('reassign', { token: tokens.get(session) ?? null, task_id: task, user_id: receiver });
    },

    // L1: the app has no progress feature, so there is nothing to call.
    async reportProgress() {},

    async forgedCancelRequest(task: TaskRef): Promise<ForgedRequest> {
      // L5: no web endpoint exists; this points at BASE_URL, where nothing listens.
      return { method: 'POST', action: new URL(`/tasks/${encodeURIComponent(task)}/cancel`, process.env.BASE_URL).toString(), fields: {} };
    },

    async storedPasswordHash(email: string) {
      return (await call('stored_password_hash', { username: email })).result ?? null;
    },

    async forceDeadline(task: TaskRef, deadline: string) {
      const day = new Date(`${deadline}T12:00:00.000Z`);
      const before = new Date(day.getTime() - 24 * 60 * 60 * 1000);
      const text = (d: Date) => d.toISOString().replace('Z', '000+00:00'); // the app's storage format
      await call('force_deadline', { task_id: task, deadline: text(day), assigned_before: text(before) });
    },
  };
}
