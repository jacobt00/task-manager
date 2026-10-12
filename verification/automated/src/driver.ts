import type { Session } from './session';

/**
 * The contract between the tests and one implementation of the Task Manager.
 *
 * The tests only know the requirements. Everything implementation-specific
 * (URLs, form field names, CSRF token handling, how pages show data) lives in
 * an adapter that implements this interface. See README.md, "Writing an adapter".
 *
 * Rules every adapter must follow:
 * - Send every request through `session.fetch()`.
 * - Perform actions as direct requests to the server, the same requests the UI
 *   would send, so a hidden button never masks a missing server-side check.
 * - Never throw because the app rejected an action. Rejections are detected
 *   by the tests through observable state. Throw only for infrastructure
 *   problems (app unreachable, unexpected page structure).
 * - Report only what a user could observe; never read the database, except in
 *   the optional test-data hooks at the end of this interface.
 */

export type Status = 'todo' | 'ongoing' | 'done' | 'cancelled' | 'failed';
export type Role = 'admin' | 'receiver';

/** Opaque reference to a user, produced by the adapter (for example an ID). */
export type UserRef = string;
/** Opaque reference to a task, produced by the adapter (for example an ID). */
export type TaskRef = string;

/** Functions a user's interface offers them after logging in. */
export type Feature =
  | 'createUser'
  | 'createTask'
  | 'editTask'
  | 'assignTask'
  | 'taskOverview'
  | 'ownTasks'
  | 'updateStatus'
  | 'reportProgress'
  | 'cancelTask';

export interface CallOptions {
  /**
   * 'valid' (default): send the CSRF token the app issued to this session.
   * 'missing': leave the token out. 'invalid': send a token the app never issued.
   */
  csrf?: 'valid' | 'missing' | 'invalid';
}

export interface LoginResult {
  /** True when the session is authenticated after the attempt. */
  ok: boolean;
  /** The error text shown to the user, or null when there is none. */
  message: string | null;
}

export interface RegistrationInput {
  name?: string;
  email?: string;
  password?: string;
  /** Extra fields added to the request exactly as given (used for forged parameters). */
  extraFields?: Record<string, string>;
}

export interface NewUserInput {
  name?: string;
  email?: string;
  password?: string;
  role: Role;
}

export interface NewTaskInput {
  /** Unique per test, so the task can be found again by title. */
  title: string;
  description: string;
  /** YYYY-MM-DD, any other string (sent as-is), or null to leave the deadline out. */
  deadline: string | null;
  /** Every reference is sent, so zero or two receivers can be tested. */
  receivers: UserRef[];
  /** Extra fields added to the request exactly as given (used for forged parameters). */
  extraFields?: Record<string, string>;
}

export interface TaskChanges {
  title?: string;
  description?: string;
  /** YYYY-MM-DD, any other string (sent as-is), or null to send the deadline empty. */
  deadline?: string | null;
}

export interface TaskView {
  ref: TaskRef;
  title: string;
  description: string;
  /** Normalised to YYYY-MM-DD, or null when no deadline is shown. */
  deadline: string | null;
  /** One of the five status names, lower case, as shown to the user. */
  status: string;
  /** Email of the assigned receiver, or null when none is shown. */
  assigneeEmail: string | null;
  /** Progress percentage, or null when none has been recorded. */
  progress: number | null;
}

/** A request a cross-site page could forge with a plain HTML form. */
export interface ForgedRequest {
  method: 'GET' | 'POST';
  /** Absolute URL of the endpoint. */
  action: string;
  /** Form fields, without any CSRF token. */
  fields: Record<string, string>;
}

export interface TaskManagerDriver {
  /** Name of the cookie that carries the session ID. */
  readonly sessionCookieName: string;

  register(visitor: Session, input: RegistrationInput, options?: CallOptions): Promise<void>;
  login(session: Session, email: string, password: string): Promise<LoginResult>;
  logout(session: Session, options?: CallOptions): Promise<void>;
  isAuthenticated(session: Session): Promise<boolean>;
  /** The functions the logged-in user's interface offers. */
  availableFeatures(session: Session): Promise<Feature[]>;

  createUser(session: Session, input: NewUserInput, options?: CallOptions): Promise<void>;
  /** Looks up any user (Admin or Receiver) by email, as the Admin. Null when no such user exists. */
  userRef(admin: Session, email: string): Promise<UserRef | null>;
  /** A well-formed user reference that no user has. */
  unknownUserRef(): UserRef;

  createTask(session: Session, input: NewTaskInput, options?: CallOptions): Promise<void>;
  /** Finds a task by its exact title in the Admin's task overview. Null when there is none. */
  findTaskByTitle(admin: Session, title: string): Promise<TaskRef | null>;
  /** The Admin task overview, or null when the session is denied access to it. */
  listAllTasks(session: Session): Promise<TaskView[] | null>;
  /** The session user's own task list, or null when access is denied. */
  listMyTasks(session: Session): Promise<TaskView[] | null>;
  /** Requests one task directly by its reference (including its progress). Null when access is denied or nothing is returned. */
  viewTask(session: Session, task: TaskRef): Promise<TaskView | null>;

  editTask(session: Session, task: TaskRef, changes: TaskChanges, options?: CallOptions): Promise<void>;
  /** Sends a status change. `status` is sent as-is, so invalid values can be tested. */
  changeStatus(session: Session, task: TaskRef, status: string, options?: CallOptions): Promise<void>;
  cancelTask(session: Session, task: TaskRef, options?: CallOptions): Promise<void>;
  /** Saves the task with `receiver` as its receiver. Passing the current receiver saves it unchanged. */
  reassignTask(session: Session, task: TaskRef, receiver: UserRef, options?: CallOptions): Promise<void>;
  /** Sends a progress update. `percentage` is sent as-is, so invalid values can be tested. */
  reportProgress(session: Session, task: TaskRef, percentage: number | string, options?: CallOptions): Promise<void>;

  /** The request a cross-site HTML form would send to cancel `task`. */
  forgedCancelRequest(task: TaskRef): Promise<ForgedRequest>;

  // Optional test-data hooks. Tests that need them are skipped when they are missing.

  /** The stored password credential for the user with this email, read from the database. */
  storedPasswordHash?(email: string): Promise<string | null>;
  /** Sets a task's deadline directly in the database, bypassing the app's validation. */
  forceDeadline?(task: TaskRef, deadline: string): Promise<void>;
}
