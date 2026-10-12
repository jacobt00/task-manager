# Automated test results: Vibe Coding vs SDD

Run on 2026-10-12 with the suite in `verification/automated` (111 test cases), unchanged.
Neither application's code was changed.

| | Vibe Coding | SDD |
|---|---|---|
| Passed | 93 | 70 |
| Failed | 17 | 40 |
| Skipped | 1 (TC-067) | 1 (TC-067) |
| Failures that are real application defects | 13 (10 of them: no progress feature) | 26 (10 of them: no progress feature) |
| Failures caused by the adapter / test environment | 4 (TC-034a, TC-034b, TC-083, TC-087) | 0 |
| Failures from an interface mismatch (no requirement violated) | 0 | 3 (TC-053, TC-066, TC-079) |
| Blocked by another defect (precondition) | 0 | 6 (TC-031, TC-032, TC-042, TC-052, TC-088, TC-097) |
| Failures that are not applicable (no HTTP layer) | 0 | 5 (TC-057, TC-059, TC-063, TC-064, TC-095) |

## Result files

| File | What |
|---|---|
| `vibe-main.json` | Vibe, all tests except TC-061, with workaround W1 (one client address per session) |
| `vibe-rate-limit.json` | Vibe, TC-061 only, app restarted, default configuration, no W1 |
| `vibe-main-without-W1.json` | Vibe, all tests except TC-061, app restarted, **without** W1: what the suite sees with the app's limiter as shipped (4 passed, 105 failed, 1 skipped) |
| `sdd-main.json` | SDD, all tests except TC-061 |
| `sdd-rate-limit.json` | SDD, TC-061 only |

## Test environment

| | Vibe Coding | SDD |
|---|---|---|
| App | `task-manager/vibe-coding`, `node src/app.js`, port 3100 | `./TaskManager`, service layer via `adapters/sdd_bridge.py` (the app has no HTTP server) |
| Database | Separate MongoDB 7 in a Docker container (`tm-verify-mongo`, 127.0.0.1:27018), database `task_manager_verification`. The real `task_manager` database on 27017 wasn't touched. | Separate SQLite file `sdd-test.db` in a scratch directory. The app's default `task_manager.db` wasn't touched. |
| Test Admin | `admin.verify@example.test`, created with the app's own `npm run create-admin` script | `admin.verify@example.test` (username = email), registered as an administrator, the app's documented first-run step |
| Adapter | `adapters/vibe.ts` | `adapters/sdd.ts` + `adapters/sdd_bridge.py` |
| Hooks | `storedPasswordHash`, `forceDeadline` (MongoDB) | `storedPasswordHash`, `forceDeadline` (SQLite) |

The limitations and workarounds of each adapter are documented at the top of the adapter
file. The ones that affect results:

- **Vibe W1 (rate limiter).** The app shares one login limiter between `POST /login` and
  `POST /register`: **10 requests per 15 minutes per client address, successful ones included**.
  Run as shipped, the suite's Admin is locked out after a few tests: 103 of 110 tests fail at
  "precondition: the Admin can log in" (`vibe-main-without-W1.json`). For the main run, the
  app was started with `TRUST_PROXY=1` (a supported setting) and the adapter gave each test
  session its own `X-Forwarded-For` address. TC-061 was run separately on a restarted app
  without W1.
- **Vibe W2 (viewing a task as a Receiver).** Receivers have no single-task page. `viewTask`
  first requests the only per-task URL directly (the Admin edit form). When that's denied, it
  reports the task as shown on the Receiver's own dashboard.
- **SDD has no HTTP layer.** It is a Tkinter desktop app with a debugging CLI. The adapter calls
  the service layer (`auth.py`, `admin.py`, `receiver.py`), which both interfaces use and
  where the app enforces its rules, through a thin bridge that adds no rules. Users log in
  with a *username*, so the email is used as the username. There is no `name` field.

## Results per test

Tags in the reason column: **DEFECT** = real defect in the application (including features
the requirements ask for but the app doesn't have); **ADAPTER** = limitation of the adapter
or test environment, says nothing about the requirement; **MISMATCH** = the app's design
can't be mapped onto what the test expects, with no requirement actually violated;
**BLOCKED** = the test couldn't set up its starting state because of another defect;
**N/A** = not applicable, listed below.

| Test ID | Vibe result | SDD result | Reason for each failure |
|---|---|---|---|
| TC-001 | Pass | Pass |  |
| TC-002 | Pass | **Fail** | **SDD:** DEFECT (requirement mismatch). The app has no name field, so a registration without a name is accepted; the retry with the same email is then rejected as a duplicate. |
| TC-003 | Pass | Pass |  |
| TC-004 | Pass | **Fail** | **SDD:** DEFECT. Registration accepts a role chosen by the registrant, so a self-registered user can be an Admin (docs/decisions.md: 'Registration is open for now, including choosing the admin role'). |
| TC-005 | Pass | Pass |  |
| TC-006 | Pass | Pass |  |
| TC-007 | Pass | Pass |  |
| TC-008 | Pass | Pass |  |
| TC-009 | Pass | Pass |  |
| TC-010 | Pass | Pass |  |
| TC-011 | Pass | Pass |  |
| TC-012 | Pass | **Fail** | **SDD:** DEFECT (requirement mismatch). Same as TC-002: a user created without a name is accepted (no name field). |
| TC-013 | Pass | Pass |  |
| TC-014 | Pass | Pass |  |
| TC-015 | Pass | Pass |  |
| TC-016 | Pass | Pass |  |
| TC-017 | Pass | Pass |  |
| TC-018 | Pass | Pass |  |
| TC-019 | Pass | Pass |  |
| TC-020 | Pass | Pass |  |
| TC-021 | Pass | Pass |  |
| TC-022 | Pass | Pass |  |
| TC-023 | Pass | Pass |  |
| TC-024 | Pass | Pass |  |
| TC-025 | Pass | Pass |  |
| TC-026 | Pass | Pass |  |
| TC-027a | Pass | Pass |  |
| TC-027b | Pass | Pass |  |
| TC-027c | Pass | **Fail** | **SDD:** DEFECT. A Receiver can't set their own task from todo to failed. The app's transition table makes `failed` automatic-only (models.ALLOWED_TRANSITIONS), unlike the shared requirements. |
| TC-027d | Pass | **Fail** | **SDD:** DEFECT. Same as TC-027c, for ongoing→failed. |
| TC-028a | Pass | Pass |  |
| TC-028b | Pass | Pass |  |
| TC-029 | Pass | Pass |  |
| TC-030 | Pass | Pass |  |
| TC-031 | Pass | **Fail** | **SDD:** BLOCKED by the TC-027c defect: a `failed` task can't be prepared through the Receiver (precondition). |
| TC-032 | Pass | **Fail** | **SDD:** BLOCKED for the `failed` case by the TC-027c defect (precondition). The done and cancelled cases passed before it. |
| TC-033 | Pass | Pass |  |
| TC-034a | **Fail** | Pass | **Vibe:** ADAPTER. Auto-fail works: the Admin view turned `failed` (the poll passed). The last step, the Receiver viewing the task, fails because the receiver dashboard shows no task ID for a terminal task, so the adapter can't find it by reference (adapter L4). |
| TC-034b | **Fail** | Pass | **Vibe:** ADAPTER. Same as TC-034a: the Admin saw `failed`; the Receiver's view of a terminal task can't be found by reference (adapter L4). |
| TC-035 | Pass | Pass |  |
| TC-036 | Pass | Pass |  |
| TC-037 | Pass | Pass |  |
| TC-038 | Pass | Pass |  |
| TC-039a | Pass | Pass |  |
| TC-039b | Pass | Pass |  |
| TC-040 | Pass | Pass |  |
| TC-041 | Pass | Pass |  |
| TC-042 | Pass | **Fail** | **SDD:** BLOCKED for the `failed` case by the TC-027c defect (precondition). The done case passed before it. |
| TC-043 | Pass | Pass |  |
| TC-044 | Pass | Pass |  |
| TC-045 | Pass | **Fail** | **SDD:** DEFECT. Reassigning an ongoing task doesn't reset it to todo (admin.reassign_task changes only the assignee). |
| TC-046 | Pass | Pass |  |
| TC-047 | Pass | **Fail** | **SDD:** DEFECT. Same cause as TC-045: the new receiver sees the task as ongoing. |
| TC-048 | Pass | **Fail** | **SDD:** DEFECT. A terminal (done) task can be reassigned (docs/decisions.md: 'edits and reassignments are not blocked on finished tasks'). |
| TC-049 | Pass | Pass |  |
| TC-050 | Pass | Pass |  |
| TC-051 | Pass | Pass |  |
| TC-052 | Pass | **Fail** | **SDD:** BLOCKED. Precondition 'task can be brought to failed' fails (TC-027c defect). Progress itself doesn't exist (L1). |
| TC-053 | Pass | **Fail** | **SDD:** MISMATCH. The create-user, create-task, edit and reassign steps were all rejected, as required. The last step fails because the app has no separate Admin overview: a regular user's `listAllTasks` returns their own task list (empty here), not 'access denied'. No other user's task was exposed (adapter L3). |
| TC-054 | Pass | Pass |  |
| TC-055 | Pass | Pass |  |
| TC-056 | Pass | Pass |  |
| TC-057 | Pass | **Fail** | **SDD:** N/A. No HTTP responses exist to inspect (see the list below). |
| TC-058 | Pass | Pass |  |
| TC-059 | Pass | **Fail** | **SDD:** N/A. There is no CSRF token in a desktop app; the request is processed (see the list below). |
| TC-060 | Pass | Pass |  |
| TC-061 | Pass | **Fail** | **SDD:** DEFECT (missing feature). There is no login rate limiting: the correct password still works after 20 failed attempts. |
| TC-062 | Pass | Pass |  |
| TC-063 | Pass | **Fail** | **SDD:** N/A. No session cookie (see the list below). |
| TC-064 | Pass | **Fail** | **SDD:** N/A. No session cookie (see the list below). |
| TC-065 | Pass | Pass |  |
| TC-066 | Pass | **Fail** | **SDD:** MISMATCH. Same as the last step of TC-053: the Receiver gets their own (empty) list, not 'access denied' (adapter L3). |
| TC-067 | Skipped | Skipped | Not automated by design (needs control of the server clock), for both implementations. |
| TC-068 | **Fail** | **Fail** | **Vibe:** DEFECT. The Admin can change the deadline of a done/cancelled/failed task. `POST /admin/tasks/:id/edit` blocks only reassignment of terminal tasks (src/routes/admin-tasks.js).<br>**SDD:** DEFECT. The Admin can change the deadline of a terminal task (decisions.md: edits are not blocked on finished tasks). |
| TC-069 | Pass | Pass |  |
| TC-070 | Pass | Pass |  |
| TC-071 | Pass | Pass |  |
| TC-072 | Pass | Pass |  |
| TC-073 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). No progress reporting exists (FR-011).<br>**SDD:** DEFECT (missing feature). No progress feature (FR-011). |
| TC-074 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). No progress reporting exists (FR-011).<br>**SDD:** DEFECT (missing feature). No progress feature. |
| TC-075 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). Precondition 'progress recorded' fails: no progress feature.<br>**SDD:** DEFECT (missing feature). Precondition 'progress recorded' fails. |
| TC-076 | Pass | Pass |  |
| TC-077 | Pass | Pass |  |
| TC-078 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). The Receiver interface offers no progress reporting; all Admin features and the other Receiver features are present.<br>**SDD:** DEFECT (missing feature). No progress reporting in the user's menu; everything else is present. |
| TC-079 | Pass | **Fail** | **SDD:** MISMATCH. The user is a regular user with no Admin features (both checks passed); only the `listAllTasks` is null check fails, as in TC-066 (adapter L3). |
| TC-080 | Pass | Pass |  |
| TC-081 | Pass | Pass |  |
| TC-082 | Pass | Pass |  |
| TC-083 | **Fail** | **Fail** | **Vibe:** ADAPTER. Precondition failed: the app has no user list, and the only page with user IDs (the task form's receiver menu) lists Receivers only, so `userRef` can't find an Admin (adapter L2). By reading the code, the app would reject the task (`User.exists({ role: 'receiver' })` in POST /admin/tasks).<br>**SDD:** DEFECT. A task can be assigned to an Admin, including the creating Admin (admin.create_task only checks that the user exists). |
| TC-084 | Pass | Pass |  |
| TC-085 | Pass | Pass |  |
| TC-086 | Pass | Pass |  |
| TC-087 | **Fail** | **Fail** | **Vibe:** ADAPTER. Same as TC-083 (adapter L2). By reading the code, POST /admin/tasks/:id/edit also requires the new assignee to be a Receiver.<br>**SDD:** DEFECT. A task can be reassigned to an Admin. |
| TC-088 | Pass | **Fail** | **SDD:** BLOCKED for the `failed` case by the TC-027c defect (precondition). The done and cancelled cases passed (reassigning to the same user is a no-op in the app). |
| TC-089 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). Precondition 'progress recorded' fails: no progress feature.<br>**SDD:** DEFECT (missing feature). Precondition 'progress recorded' fails. |
| TC-090 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). Precondition 'progress recorded' fails: no progress feature.<br>**SDD:** DEFECT (missing feature). Precondition 'progress recorded' fails. |
| TC-091 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). No progress feature.<br>**SDD:** DEFECT (missing feature). No progress feature. |
| TC-092 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). No progress feature.<br>**SDD:** DEFECT (missing feature). No progress feature. |
| TC-093 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). No progress feature.<br>**SDD:** DEFECT (missing feature). No progress feature. |
| TC-094 | **Fail** | **Fail** | **Vibe:** DEFECT (missing feature). Precondition 'progress recorded' fails: no progress feature.<br>**SDD:** DEFECT (missing feature). Precondition 'progress recorded' fails. |
| TC-095 | Pass | **Fail** | **SDD:** N/A. There is no CSRF token in a desktop app; logout always works (see the list below). |
| TC-096 | Pass | Pass |  |
| TC-097 | Pass | **Fail** | **SDD:** BLOCKED for the `failed` case by the TC-027c defect (precondition). The done and cancelled cases passed. |
| TC-098 | **Fail** | **Fail** | **Vibe:** DEFECT. The Admin can make status changes other than cancelling (todo→ongoing, todo→failed, ongoing→done, ongoing→failed). `POST /admin/tasks/:id/status` accepts any allowed transition, and the overview shows Start/Complete/Mark failed buttons to the Admin.<br>**SDD:** DEFECT. The Admin can start and complete tasks (ReceiverService lets admins update the status of any task; decisions.md). |
| TC-099 | Pass | **Fail** | **SDD:** DEFECT. Login names are case-sensitive, so the same email in upper case registers a second account (requirement Q-28: emails aren't case-sensitive). |
| TC-100 | Pass | **Fail** | **SDD:** DEFECT. Same cause as TC-099: logging in with the email in different letter case fails. |
| TC-101 | Pass | Pass |  |
| TC-102 | Pass | Pass |  |
| TC-103 | Pass | Pass |  |
| TC-104 | **Fail** | **Fail** | **Vibe:** DEFECT. The Admin can change the title and description of a terminal task (same route as TC-068).<br>**SDD:** DEFECT. The Admin can change the title and description of a terminal task. |
| TC-105 | Pass | Pass |  |

## Not applicable to an implementation

**SDD.** These tests check properties of a web application's HTTP layer, and the SDD
implementation is a local desktop app with no HTTP server, cookies or cross-site request surface.
Their failures (and passes) say nothing about the requirement for this app:

| Test | Result | Why not applicable |
|---|---|---|
| TC-057 | Fail | No HTTP responses exist to check for passwords. (Note from reading the code: `AdminService.list_users` returns `User` objects with `password_hash` to the GUI/CLI, which don't display it; `User.__repr__` hides it.) |
| TC-059 | Fail | No CSRF tokens: every service call is processed. CSRF doesn't apply to a desktop app. |
| TC-060 | Pass (vacuous) | No web endpoint exists for a cross-site form to reach. |
| TC-063 | Fail | No session cookie. Sessions are random tokens stored hashed in SQLite. |
| TC-064 | Fail | No session cookie to fix. Login always creates a new random token. |
| TC-095 | Fail | No CSRF token on logout (desktop app). |
| TC-009 | Pass (vacuous) | No cookie to replay. TC-008 does check that the app invalidates the old token on logout (the adapter keeps the token after logout). |

**Vibe.** None of the tests is N/A for Vibe.

## Passes that don't prove much

- **Both, TC-051 and progress parts of TC-052:** progress doesn't exist, so "unchanged
  progress" compares `null` with `null`.
- **Vibe TC-013:** the "Admin must not be created" step can only ever see `null`, because
  the adapter can't look up Admins (adapter L2). The Receiver step is a real check.
- **Vibe TC-062:** with W1 every session is its own client, so it can't see a block caused by
  the earlier failed login. Without W1, this test fails because the Admin is already locked out.
- **SDD TC-016:** a task's assignee is a single field, so two receivers can't be sent at all.
- **SDD TC-062:** passes because there's no rate limiting at all (see TC-061).

## Other observations

- **Vibe rate limiter (real defect, not caught by a single test).** TC-061 passes, but the
  limit is 10 requests of *any* outcome, shared with registration, per 15 minutes. A user who
  logs in successfully 10 times (or 10 users behind the same NAT) gets blocked. The
  requirement (Q-17) only asks to block after 20 *failed* logins in a row.
- **Vibe auto-fail:** works (TC-034a/b, TC-036, TC-037, TC-038). Overdue tasks are failed on the
  next page load, not by a background job.
- **SDD auto-fail:** works (TC-034a/b, TC-036–TC-038 pass). The `forceDeadline` hook also
  moves `assignment_date` before the forced deadline: `models.Task` refuses to load a task
  whose deadline isn't after its assignment date, and with only the deadline forced, every
  task list containing that task would crash. A real overdue task always has its assignment
  date before its deadline, so this is test-data preparation, not a change of behaviour.
- **TC-067** is skipped for both: it isn't automated by design (needs control of the server clock).

## Re-running

```bash
# Vibe (main run with W1)
cd task-manager/vibe-coding
PORT=3100 MONGODB_URI=mongodb://127.0.0.1:27018/task_manager_verification \
  SESSION_SECRET=$(openssl rand -hex 32) TRUST_PROXY=1 node src/app.js &
cd ../verification/automated
BASE_URL=http://127.0.0.1:3100 ADMIN_EMAIL=admin.verify@example.test ADMIN_PASSWORD='…' \
  TM_ADAPTER=adapters/vibe.ts TM_VIBE_MONGODB_URI=mongodb://127.0.0.1:27018/task_manager_verification \
  TM_VIBE_CLIENT_PER_SESSION=1 npm run test:main
# Restart the app WITHOUT TRUST_PROXY, then run the same command without
# TM_VIBE_CLIENT_PER_SESSION and with `npm run test:rate-limit`.

# SDD (no server to start)
BASE_URL=http://127.0.0.1:9 ADMIN_EMAIL=admin.verify@example.test ADMIN_PASSWORD='…' \
  TM_ADAPTER=adapters/sdd.ts TM_SDD_DB=/path/to/sdd-test.db TM_SDD_APP_DIR=/root/TaskManager \
  npm run test:main        # then: npm run test:rate-limit
```
