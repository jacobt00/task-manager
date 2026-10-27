/**
 * Adapter for the rewritten SDD implementation, v2 (./Taskmanager_SDD:
 * Python, PySide6 desktop GUI, SQLAlchemy + SQLite, Argon2).
 *
 * HOW IT TALKS TO THE APP
 * v2 is a desktop application with no HTTP server: no URLs, forms, cookies or
 * CSRF tokens. Its GUI controller (app/gui/app_controller.py) calls the
 * service layer (app/services/), which enforces roles and validation. The
 * adapter drives the app through adapters/sdd_v2_bridge.py, a Python process
 * (one per Playwright worker) that performs each request the way the
 * controller's handler for that GUI action does: the same service call with
 * the same input conversion. Calling the services (not clicking widgets)
 * means a hidden button never masks a missing check. Neither the adapter nor
 * the bridge adds rules; every rejection comes from the app.
 *
 * One app instance holds one logged-in identity (AuthenticationService.
 * current_user). Each test Session is given its own app instance: its own
 * AuthenticationService/TaskManagementService/UserManagementService, built as
 * AppController.__init__ builds them, all on the same test database.
 *
 * Configuration (environment variables):
 *   BASE_URL          required by the fixtures but never contacted; use an
 *                     address where nothing listens, e.g. http://127.0.0.1:9
 *   TM_SDD2_APP_DIR   path of the app (default: /root/Taskmanager_SDD)
 *   TM_SDD2_DB        SQLite file of the *test* database (required). The app's
 *                     default database (~/.desktop_task_manager/tasks.db) is
 *                     never opened.
 *   TM_SDD2_PYTHON    Python with the app's dependencies (SQLAlchemy,
 *                     argon2-cffi, PySide6), default: python3
 *
 * MAPPINGS (vocabulary, not rules)
 * M1 Users have only a username (no name, no email) and log in by username.
 *    The tests log in by email, so the email is sent as the username. The
 *    test's `name` isn't sent. Usernames are case-sensitive in the app.
 * M2 Statuses: the app has three, `to_do`, `in_progress`, `completed`. They
 *    are reported as `todo`, `ongoing`, `done`, and the test's `todo`,
 *    `ongoing`, `done` are sent as the app's names. Every other value
 *    (including `cancelled`, `failed`, `DONE`, `archived`, '') is sent
 *    unchanged, so the app decides.
 * M3 Role 'receiver' is the app's standard user ('user').
 * M4 Deadlines are sent as the task dialog sends them, a "YYYY-MM-DD" string
 *    (or nothing), and converted by `datetime.fromisoformat` as the controller
 *    does, so a malformed string is rejected by the app. `deadline: null`
 *    means the dialog's "Set deadline" box is unticked. Shown deadlines
 *    (`str(datetime)`) are cut to their date.
 * M5 The Admin table shows the assignee's username, which is the email (M1);
 *    the user dashboard has no assignee column, so receivers see `null`.
 *
 * LIMITATIONS (features that do not exist; tests fail or are not applicable)
 * L1 No self-registration (README: "does not include ... self-registration").
 *    `register` sends nothing.
 * L2 Only standard users can be created (the Create User dialog has no role
 *    field; UserManagementService.create_user always stores role 'user'). A
 *    request to create an *Admin* can't be expressed, so `createUser` with
 *    role 'admin' sends nothing (sending it would silently create a standard
 *    user instead). The only Admin is the one made by the first-run setup.
 * L3 No cancel action, no `cancelled` or `failed` status, no automatic
 *    failing of overdue tasks, no transition rules (any of the three statuses
 *    can be set from any other). `cancelTask` sends nothing.
 * L4 No progress feature. `reportProgress` sends nothing; `progress` is null.
 * L5 No user list: user IDs appear only in the task dialog's "Assigned User"
 *    box, which lists standard users. `userRef` finds standard users only and
 *    returns null for any Admin, including the test Admin (TC-083).
 * L6 No separate overview and no single-task view: every user's dashboard is
 *    TaskManagementService.get_tasks() (all tasks for an Admin, own tasks for a
 *    standard user). `listAllTasks` and `listMyTasks` both return the session's
 *    dashboard rows, and `viewTask` finds the task in them (null if absent).
 *    So a standard user's `listAllTasks` is their own list, never null.
 * L7 A task has one assignee, so two receivers can't be sent: `createTask`
 *    sends nothing in that case (TC-016). No receiver is sent as an empty
 *    selection (None), which the service rejects.
 * L8 No HTTP layer: no session cookie (`sessionCookieName` is ''), no CSRF
 *    token (`options.csrf` is ignored), no responses recorded in the Session,
 *    no endpoint for a cross-site form (`forgedCancelRequest` points at
 *    BASE_URL, where nothing listens), no login rate limiting. A Session's
 *    login lives in its app instance, not in its storage state.
 * L9 Forged extra fields (`extraFields`) have nowhere to go: the dialogs and
 *    services take fixed arguments, so they are not sent.
 *
 * WORKAROUNDS
 * W1 `editTask` and `reassignTask` save the Edit Task dialog, as the GUI does:
 *    the dialog is filled from the task (_show_edit_task_dialog + load_task),
 *    the requested fields are changed, and update_task_details is called with
 *    the whole form. Reassigning is the dialog's "Assigned User" box; the
 *    GUI never calls TaskManagementService.reassign_task.
 * W2 `availableFeatures` builds the dashboard window the controller opens after
 *    login (AdminDashboard or UserDashboard, offscreen) and maps its heading
 *    and buttons: "Create User" -> createUser, "Create Task" -> createTask,
 *    "Edit Task" -> editTask and assignTask (the edit dialog holds the
 *    assignee), "Administrator Dashboard" table -> taskOverview,
 *    "My Assigned Tasks" table -> ownTasks, "Update Status" -> updateStatus.
 * W3 The app's Python dependencies must be installed for TM_SDD2_PYTHON. The
 *    runs used SQLAlchemy 2.0.55 because the pinned 2.1.6 isn't available for
 *    the Python used (3.10); the app's own 128 pytest tests pass with it.
 *
 * TEST-DATA HOOKS (direct database access, in the bridge)
 *   storedPasswordHash: users.password_hash of the user (username = email).
 *   forceDeadline: sets tasks.deadline. The app has no auto-fail (L3), so the
 *     FR-008 tests wait for a `failed` status that never comes.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type {
  Feature,
  ForgedRequest,
  LoginResult,
  NewTaskInput,
  NewUserInput,
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
  const db = process.env.TM_SDD2_DB;
  if (!db) throw new Error('Set TM_SDD2_DB to the SQLite file of the SDD v2 test database.');
  const appDir = process.env.TM_SDD2_APP_DIR ?? '/root/Taskmanager_SDD';
  const child = spawn(process.env.TM_SDD2_PYTHON ?? 'python3', [path.join(__dirname, 'sdd_v2_bridge.py'), appDir, db], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
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
    const error: Reply = { id: 0, ok: false, kind: 'infrastructure', error: `SDD v2 bridge exited (${code}): ${stderr}` };
    for (const resolve of pending.values()) resolve(error);
    pending.clear();
  });
  child.unref();
  for (const stream of [child.stdin, child.stdout, child.stderr]) (stream as any).unref?.();
  return child;
}

/** Sends one request to the app. Throws only for infrastructure problems. */
async function call(op: string, args: Record<string, unknown> = {}): Promise<Reply> {
  bridge ??= startBridge();
  const id = nextId++;
  const reply = await new Promise<Reply>((resolve) => {
    pending.set(id, resolve);
    bridge!.stdin.write(JSON.stringify({ id, op, args }) + '\n');
  });
  if (!reply.ok && reply.kind === 'infrastructure') throw new Error(`SDD v2 ${op}: ${reply.error}`);
  return reply;
}

// ---------------------------------------------------------------- helpers

/** The app instance (bridge client) each Session runs in. */
const clients = new WeakMap<Session, string>();
let nextClient = 1;
function clientOf(session: Session): string {
  let id = clients.get(session);
  if (!id) {
    id = `${process.pid}-${nextClient++}`;
    clients.set(session, id);
  }
  return id;
}

const TO_APP: Record<string, string> = { todo: 'to_do', ongoing: 'in_progress', done: 'completed' };
const FROM_APP: Record<string, string> = { to_do: 'todo', in_progress: 'ongoing', completed: 'done' };

const FEATURES: Array<[string, Feature[]]> = [
  ['Create User', ['createUser']],
  ['Create Task', ['createTask']],
  ['Edit Task', ['editTask', 'assignTask']],
  ['Administrator Dashboard', ['taskOverview']],
  ['My Assigned Tasks', ['ownTasks']],
  ['Update Status', ['updateStatus']],
];

async function dashboardRows(session: Session): Promise<TaskView[] | null> {
  const reply = await call('list_tasks', { client: clientOf(session) });
  if (!reply.ok) return null;
  return (reply.result as any[]).map((t) => ({
    ref: t.ref,
    title: t.title,
    description: t.description,
    deadline: typeof t.deadline === 'string' ? t.deadline.slice(0, 10) : null,
    status: FROM_APP[t.status] ?? t.status,
    assigneeEmail: t.assignee ?? null,
    progress: null,
  }));
}

// ---------------------------------------------------------------- driver

export default function createDriver(): TaskManagerDriver {
  return {
    sessionCookieName: '',

    // L1: no self-registration exists.
    async register() {},

    async login(session: Session, email: string, password: string): Promise<LoginResult> {
      const reply = await call('login', { client: clientOf(session), username: email, password });
      return reply.ok ? { ok: true, message: null } : { ok: false, message: reply.error ?? null };
    },

    async logout(session: Session) {
      await call('logout', { client: clientOf(session) });
    },

    async isAuthenticated(session: Session) {
      return (await call('is_authenticated', { client: clientOf(session) })).result === true;
    },

    async availableFeatures(session: Session): Promise<Feature[]> {
      const reply = await call('dashboard', { client: clientOf(session) });
      if (!reply.ok || !reply.result) return [];
      const shown: string[] = [...reply.result.labels, ...reply.result.buttons];
      return FEATURES.filter(([label]) => shown.includes(label)).flatMap(([, features]) => features);
    },

    async createUser(session: Session, input: NewUserInput) {
      if (input.role === 'admin') return; // L2
      await call('create_user', { client: clientOf(session), username: input.email ?? '', password: input.password ?? '' });
    },

    async userRef(_admin: Session, email: string): Promise<UserRef | null> {
      const users = (await call('user_list')).result as Array<{ id: string; username: string }>;
      return users.find((u) => u.username === email)?.id ?? null;
    },

    unknownUserRef: () => '999999999',

    async createTask(session: Session, input: NewTaskInput) {
      if (input.receivers.length > 1) return; // L7
      await call('create_task', {
        client: clientOf(session),
        title: input.title,
        description: input.description,
        deadline: input.deadline,
        user_id: input.receivers[0] ?? null,
      });
    },

    async findTaskByTitle(admin: Session, title: string) {
      return (await dashboardRows(admin))?.find((t) => t.title === title)?.ref ?? null;
    },

    listAllTasks: dashboardRows,
    listMyTasks: dashboardRows,

    async viewTask(session: Session, task: TaskRef) {
      return (await dashboardRows(session))?.find((t) => t.ref === task) ?? null;
    },

    async editTask(session: Session, task: TaskRef, changes: TaskChanges) {
      await call('save_task', { client: clientOf(session), task_id: task, changes });
    },

    async changeStatus(session: Session, task: TaskRef, status: string) {
      await call('update_status', { client: clientOf(session), task_id: task, status: TO_APP[status] ?? status });
    },

    // L3: the app has no cancel action.
    async cancelTask() {},

    async reassignTask(session: Session, task: TaskRef, receiver: UserRef) {
      await call('save_task', { client: clientOf(session), task_id: task, changes: { user_id: receiver } });
    },

    // L4: the app has no progress feature.
    async reportProgress() {},

    async forgedCancelRequest(task: TaskRef): Promise<ForgedRequest> {
      // L8: no web endpoint exists; this points at BASE_URL, where nothing listens.
      return { method: 'POST', action: new URL(`/tasks/${encodeURIComponent(task)}/cancel`, process.env.BASE_URL).toString(), fields: {} };
    },

    async storedPasswordHash(email: string) {
      return (await call('stored_password_hash', { username: email })).result ?? null;
    },

    async forceDeadline(task: TaskRef, deadline: string) {
      await call('force_deadline', { task_id: task, deadline });
    },
  };
}
