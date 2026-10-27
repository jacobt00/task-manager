# Automated test results: SDD v2 (Taskmanager_SDD)

Run on 2026-10-27 with the suite in `verification/automated` (111 test cases), unchanged,
against the rewritten SDD implementation in `./Taskmanager_SDD`. The application code
wasn't changed.

| | Count |
|---|---|
| Passed | 51 |
| Failed | 59 (58 in the main run + TC-061) |
| Skipped | 1 (TC-067, not automated by design) |

How the 59 failures break down:

| Category | Count | Tests |
|---|---|---|
| **Real defect** in the application (including required features it doesn't have) | 41 | see table |
| **Real defect, blocking**: the test couldn't set up its starting state because a required status or feature doesn't exist, so the requirement under test wasn't evaluated | 11 | TC-030, 031, 032, 037, 042, 043, 052, 088, 097 (no `cancelled`/`failed`); TC-083, 087 (an Admin can't be created) |
| **Adapter / environment problem**: the app's design can't be mapped onto what the test expects; no requirement violated | 2 | TC-053, TC-066 |
| **Not applicable**: no HTTP layer in a desktop app | 5 | TC-057, TC-059, TC-063, TC-064, TC-095 |

## Result files

| File | What |
|---|---|
| `sdd-v2-main.json` | All tests except TC-061 |
| `sdd-v2-rate-limit.json` | TC-061 only, run separately after the main run |

The existing result files (`sdd-*.json`, `vibe-*.json`, `summary.md`) weren't touched.

## Test environment

- **App:** `./Taskmanager_SDD`, a PySide6 desktop app with no HTTP server. The adapter
  (`adapters/sdd-v2.ts`) drives it through `adapters/sdd_v2_bridge.py`. For each request, the bridge
  makes the same service call, with the same input conversion, as the GUI controller's
  handler for that action (`app/gui/app_controller.py`), and adds no rules. Each test session
  gets its own app instance (its own `AuthenticationService`), as two copies of the desktop app would.
- **Python environment:** a separate virtualenv with argon2-cffi 25.1.0, PySide6 6.12.0 (run
  offscreen) and **SQLAlchemy 2.0.55**. The pinned SQLAlchemy 2.1.6 isn't available for the
  Python used here (3.10). The app's own test suite passes in this environment (128 passed).
- **Database:** a separate SQLite file, `sdd-v2-test.db`, in a scratch directory. The app's default
  database (`~/.desktop_task_manager/tasks.db`) was never opened.
- **Test Admin:** `admin.verify@example.test` (username = email), created with the app's
  first-run `SetupService.create_initial_admin`, the same step as the setup window.
- **Hooks:** `storedPasswordHash` and `forceDeadline` are both implemented (direct SQLite access).

All mappings, limitations and workarounds are documented at the top of `adapters/sdd-v2.ts`.
The ones that matter most for reading the results:
- Users have a username only, so the email is used as the username.
- The app's statuses `to_do`, `in_progress` and `completed` are reported as `todo`, `ongoing` and `done`.
- The adapter sends nothing for an operation the app can't express: self-registration,
  creating an Admin, cancelling, recording progress, or a task with two receivers.

## Results per test

| Test ID | SDD v2 result | Reason for each v2 failure |
|---|---|---|
| TC-001 | **Fail** | DEFECT (missing feature). There is no self-registration (README: "does not include ... self-registration"), so the registered account never exists. |
| TC-002 | **Fail** | DEFECT (missing feature). There is no self-registration (README: "does not include ... self-registration"), so the registered account never exists. |
| TC-003 | **Fail** | DEFECT (missing feature). There is no self-registration (README: "does not include ... self-registration"), so the registered account never exists. |
| TC-004 | Pass |  |
| TC-005 | Pass |  |
| TC-006 | Pass |  |
| TC-007 | Pass |  |
| TC-008 | Pass |  |
| TC-009 | Pass |  |
| TC-010 | Pass |  |
| TC-011 | Pass |  |
| TC-012 | **Fail** | DEFECT (requirement mismatch). The app has no name field, so a user created without a name is accepted. The missing-email and missing-password steps passed. |
| TC-013 | Pass |  |
| TC-014 | Pass |  |
| TC-015 | Pass |  |
| TC-016 | Pass |  |
| TC-017 | Pass |  |
| TC-018 | Pass |  |
| TC-019 | Pass |  |
| TC-020 | Pass |  |
| TC-021 | Pass |  |
| TC-022 | Pass |  |
| TC-023 | Pass |  |
| TC-024 | Pass |  |
| TC-025 | Pass |  |
| TC-026 | Pass |  |
| TC-027a | Pass |  |
| TC-027b | Pass |  |
| TC-027c | **Fail** | DEFECT (missing status). There is no `failed` status; the status value is rejected and the task stays todo. |
| TC-027d | **Fail** | DEFECT (missing status). Same as TC-027c, from ongoing. |
| TC-028a | **Fail** | DEFECT. There are no transition rules: `update_status` accepts any of the three statuses from any status (task_management.py). todo→done was accepted. |
| TC-028b | **Fail** | DEFECT. There are no transition rules: `update_status` accepts any of the three statuses from any status (task_management.py). ongoing→todo was accepted. |
| TC-029 | **Fail** | DEFECT. There are no transition rules: `update_status` accepts any of the three statuses from any status (task_management.py). A done task was moved back to todo, so `done` isn't terminal. |
| TC-030 | **Fail** | BLOCKED. Precondition 'the task can be brought to cancelled' fails: no cancel action (see TC-039a). |
| TC-031 | **Fail** | BLOCKED. Precondition 'the task can be brought to failed' fails: no `failed` status (see TC-027c). |
| TC-032 | **Fail** | BLOCKED. Precondition 'the task can be brought to cancelled' fails: no cancel action (see TC-039a). The done case passed first: the Admin can't change any status (`update_status` is for standard users only). |
| TC-033 | Pass |  |
| TC-034a | **Fail** | DEFECT (missing feature). There is no `failed` status and no automatic failing of overdue tasks: with the deadline forced into the past, the task stayed active for the whole 60 s wait. |
| TC-034b | **Fail** | DEFECT (missing feature). There is no `failed` status and no automatic failing of overdue tasks: with the deadline forced into the past, the task stayed active for the whole 60 s wait. |
| TC-035 | Pass |  |
| TC-036 | **Fail** | DEFECT (missing feature). There is no `failed` status and no automatic failing of overdue tasks: with the deadline forced into the past, the task stayed active for the whole 60 s wait. The overdue control task never became failed, so the test can't confirm the done task stays done. |
| TC-037 | **Fail** | BLOCKED. Precondition 'the task can be brought to cancelled' fails: no cancel action (see TC-039a). |
| TC-038 | **Fail** | DEFECT (missing feature). There is no `failed` status and no automatic failing of overdue tasks: with the deadline forced into the past, the task stayed active for the whole 60 s wait. |
| TC-039a | **Fail** | DEFECT (missing feature). There is no cancel action and no `cancelled` status; the status stays unchanged. |
| TC-039b | **Fail** | DEFECT (missing feature). There is no cancel action and no `cancelled` status; the status stays unchanged. |
| TC-040 | **Fail** | DEFECT (missing feature). There is no cancel action and no `cancelled` status; the status stays unchanged. |
| TC-041 | Pass |  |
| TC-042 | **Fail** | BLOCKED. Precondition 'the task can be brought to failed' fails: no `failed` status (see TC-027c). The done case passed first, trivially, because no cancel exists. |
| TC-043 | **Fail** | BLOCKED. Precondition 'the task can be brought to cancelled' fails: no cancel action (see TC-039a). |
| TC-044 | Pass |  |
| TC-045 | **Fail** | DEFECT. Reassigning an ongoing task doesn't reset it to todo (`update_task_details` only changes the assignee). |
| TC-046 | Pass |  |
| TC-047 | **Fail** | DEFECT. Same cause as TC-045: the new receiver sees the task as ongoing. |
| TC-048 | **Fail** | DEFECT. A done task can be reassigned: there are no terminal statuses. |
| TC-049 | Pass |  |
| TC-050 | Pass |  |
| TC-051 | Pass |  |
| TC-052 | **Fail** | BLOCKED. Precondition 'the task can be brought to cancelled' fails: no cancel action (see TC-039a). The done case passed first, but only because progress doesn't exist. |
| TC-053 | **Fail** | MISMATCH (adapter L6). The create-user, create-task, edit and reassign steps were all rejected by the app, as required. Only the last step fails: the app has no separate Admin overview, so a standard user's `listAllTasks` is their own task list (empty here), not 'denied'. No other user's task was exposed. |
| TC-054 | **Fail** | DEFECT. There are no transition rules: `update_status` accepts any of the three statuses from any status (task_management.py). Same as TC-028b, ongoing→todo. |
| TC-055 | Pass |  |
| TC-056 | Pass |  |
| TC-057 | **Fail** | N/A: no HTTP responses to inspect. |
| TC-058 | Pass |  |
| TC-059 | **Fail** | N/A: no CSRF tokens in a desktop app; the request is processed. |
| TC-060 | Pass |  |
| TC-061 | **Fail** | DEFECT (missing feature). There is no login rate limiting: the correct password still works after 20 failed attempts. |
| TC-062 | Pass |  |
| TC-063 | **Fail** | N/A: no session cookie. |
| TC-064 | **Fail** | N/A: no session cookie. |
| TC-065 | Pass |  |
| TC-066 | **Fail** | MISMATCH (adapter L6). Same as the last step of TC-053. |
| TC-067 | Skipped | Not automated by design (needs control of the server clock). |
| TC-068 | **Fail** | DEFECT. The Admin can change the deadline of a done task. The cancelled and failed cases couldn't be reached. |
| TC-069 | Pass |  |
| TC-070 | Pass |  |
| TC-071 | Pass |  |
| TC-072 | Pass |  |
| TC-073 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). |
| TC-074 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). |
| TC-075 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). (precondition) |
| TC-076 | Pass |  |
| TC-077 | Pass |  |
| TC-078 | **Fail** | DEFECT (missing features). The standard user's dashboard offers no progress reporting and no cancel; the Admin part passed. |
| TC-079 | **Fail** | DEFECT (missing feature). There is no self-registration (README: "does not include ... self-registration"), so the registered account never exists. |
| TC-080 | Pass |  |
| TC-081 | **Fail** | DEFECT (missing feature). An Admin can't create another Admin: the Create User dialog has no role field and the service always stores role 'user'. The adapter sends nothing for an Admin request (sending it would create a standard user instead), so the login fails. |
| TC-082 | Pass |  |
| TC-083 | **Fail** | BLOCKED by the TC-081 defect: the precondition 'the Admin can create the admin' fails. From the code, `create_task` rejects any assignee whose role isn't 'user', so the app would likely pass. |
| TC-084 | Pass |  |
| TC-085 | **Fail** | DEFECT. A task with a past deadline is accepted: there is no deadline validation. |
| TC-086 | **Fail** | DEFECT. A task without a deadline is accepted: the deadline is optional by design (README: 'optional deadlines'). |
| TC-087 | **Fail** | BLOCKED by the TC-081 defect (precondition). From the code, `update_task_details` also rejects non-standard assignees. |
| TC-088 | **Fail** | BLOCKED. Precondition 'the task can be brought to cancelled' fails: no cancel action (see TC-039a). The done case passed first: saving the edit dialog with the same assignee changes nothing. |
| TC-089 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). (precondition) |
| TC-090 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). (precondition) |
| TC-091 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). |
| TC-092 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). |
| TC-093 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). |
| TC-094 | **Fail** | DEFECT (missing feature). There is no progress reporting (FR-011). (precondition) |
| TC-095 | **Fail** | N/A: no CSRF token on logout. |
| TC-096 | Pass |  |
| TC-097 | **Fail** | BLOCKED. Precondition 'the task can be brought to cancelled' fails: no cancel action (see TC-039a). The done case passed first. |
| TC-098 | Pass |  |
| TC-099 | **Fail** | DEFECT (missing feature). There is no self-registration (README: "does not include ... self-registration"), so the registered account never exists. (The case-sensitivity part is covered by TC-100.) |
| TC-100 | **Fail** | DEFECT. Usernames are case-sensitive, so logging in with the email in upper case fails (requirement Q-28). |
| TC-101 | Pass |  |
| TC-102 | **Fail** | DEFECT. The Admin can move an active task's deadline into the past. |
| TC-103 | **Fail** | DEFECT. The Admin can remove the deadline of an active task (untick 'Set deadline'). |
| TC-104 | **Fail** | DEFECT. The Admin can change the title and description of a done task. |
| TC-105 | Pass |  |

## Not applicable to SDD v2

The app is a local desktop application with no HTTP server, so these web-layer tests don't apply.

| Test | Result | Why |
|---|---|---|
| TC-057 | Fail | No HTTP responses exist to check for passwords. |
| TC-059 | Fail | No CSRF tokens: every request is processed. |
| TC-063 | Fail | No session cookie. The login identity lives in the running app instance. |
| TC-064 | Fail | No session cookie to fix. |
| TC-095 | Fail | No CSRF token on logout. |
| TC-060 | Pass (vacuous) | No endpoint a cross-site form could reach. |
| TC-009 | Pass (vacuous) | No cookie to replay. |

## Passes that don't prove much

These pass because the operation can't be performed at all, not because a rule was enforced:
- **TC-004:** nobody can register.
- **TC-041, TC-044:** nobody can cancel.
- **TC-051:** progress is always empty.
- **TC-016:** two receivers can't be expressed.
- **TC-084:** a forged status has no field to go in.
- **TC-062:** there is no rate limiting.
- **TC-013:** only the Receiver-creates-Receiver step is a real check (the app rejects it);
  "create an Admin" can't be sent at all.
- **TC-096:** setting the same status again can't be observed as a change.

## Main gaps against the requirements

- No self-registration. No way to create a second Admin.
- No `cancelled` or `failed` status, no cancel action, no automatic failing of overdue tasks.
- No transition rules: any status can follow any status, so `done` isn't terminal.
- Reassignment doesn't reset the status. Terminal tasks can still be edited and reassigned.
- Deadlines are optional, can be in the past, and can be removed.
- No progress reporting. No login rate limiting. Login names are case-sensitive.
- **Holds up well:** role checks. The services reject every Admin action from a standard user,
  standard users see only their own tasks, tasks can only be assigned to standard users, and
  passwords are salted Argon2 hashes (TC-055, TC-056 pass).

## Re-running

```bash
# one-time: Python with the app's dependencies
python3 -m venv /path/venv && /path/venv/bin/pip install SQLAlchemy==2.0.55 argon2-cffi==25.1.0 PySide6_Essentials==6.12.0
# one-time: test database + Admin (the app's first-run setup)
echo '{"id":1,"op":"setup_admin","args":{"username":"admin.verify@example.test","password":"…"}}' \
  | /path/venv/bin/python adapters/sdd_v2_bridge.py /root/Taskmanager_SDD /path/sdd-v2-test.db

cd task-manager/verification/automated
export BASE_URL=http://127.0.0.1:9 ADMIN_EMAIL=admin.verify@example.test ADMIN_PASSWORD='…' \
  TM_ADAPTER=adapters/sdd-v2.ts TM_SDD2_DB=/path/sdd-v2-test.db TM_SDD2_PYTHON=/path/venv/bin/python
npm run test:main
npm run test:rate-limit
```
