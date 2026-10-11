# Task Manager: Specification-Based Test Cases (v3)

**Assumptions used throughout**
- "Rejected" means the action has no effect on stored data and the user gets an error or access-denied response. The requirements don't name status codes or error messages, so the tests don't either.
- **Roles:** *Admin* (the README calls this role "Admin/Sender"; see Q-24), *Receiver A* and *Receiver B*.
- **Statuses:** `todo`, `ongoing`, `done`, `cancelled`, `failed`.
- **Terminal:** `done`, `cancelled`, `failed`. These have no allowed next status for any role.
- **Active:** `todo` or `ongoing`.
- **Implementation independence:** every test is technology-agnostic so the same suite can be run against both implementations. The tech stack named in the README isn't used to write tests on purpose: a test that only applies to one stack would make the comparison unfair.

**Status transition table (from the specification)**

| Current status | Allowed next statuses |
|---|---|
| todo | ongoing, cancelled, failed |
| ongoing | done, cancelled, failed |
| done | None |
| cancelled | None |
| failed | None |

## Changes from v2

- **README coverage check:** added a traceability table (below) that maps every README feature and rule to its test cases.
- **New tests (TC-070 to TC-078):**
  - Setting a deadline when a task is created (TC-070, TC-071).
  - Receivers can't edit task details (TC-072).
  - Progress reporting as its own feature, separate from status (TC-073 to TC-075).
  - Reassignment failures and handover to the new receiver (TC-076, TC-077).
  - Role-based interfaces after login (TC-078).
- **Questions:**
  - Q-21 is answered by the README.
  - Q-05, Q-08, Q-12, Q-14 and Q-23 are updated.
  - Q-13 is reopened, because the README treats progress as separate from status.
  - Q-24 to Q-27 are new.
- **Unchanged:** existing test IDs and their content stay as they were in v2.

## Changes from v1 (in v2)

- **Rewritten with concrete statuses:** TC-027 is now TC-027a–d, TC-028 is now TC-028a–b, TC-034 is now TC-034a–b and TC-039 is now TC-039a–b. TC-029–033, TC-036, TC-040, TC-042, TC-045, TC-050 and TC-054 have also been rewritten.
- **New tests:** TC-065 to TC-069.
- **Questions:** Q-07, Q-11 and Q-15 are answered; Q-21 to Q-23 were added.

## README Traceability

| README feature / rule | Covered by | Coverage in v2 | Action in v3 |
|---|---|---|---|
| **Authentication** — User registration and login | TC-001 to TC-010 | Full | — |
| **Authentication** — Role-based access control (Admin/Sender and Receiver) | TC-004, TC-013, TC-018, TC-053, TC-066 | Partial: only *denial* of admin functions was tested, not that each role gets its own interface | Added TC-078; role naming → Q-24 |
| **Admin** — Create new users | TC-011 to TC-014 | Full | Role of created users → Q-04 (still open) |
| **Admin** — Create and assign tasks to individual users | TC-015 to TC-018 | Full | — |
| **Admin** — Edit existing tasks | TC-019, TC-021, TC-022 | Partial: a receiver editing a task's *details* (not the deadline) wasn't tested | Added TC-072 |
| **Admin** — Set and modify task deadlines | TC-020, TC-021, TC-067, TC-068 | Partial: only *modifying* a deadline was tested, not *setting* one when the task is created | Added TC-070, TC-071; whether a deadline is required → Q-27 |
| **Admin** — Manage task access and assignments | TC-045 to TC-049, TC-069 | Partial: a failed reassignment and the new receiver's ability to manage the task weren't tested; "task access" is undefined | Added TC-076, TC-077; Q-25 |
| **Admin** — View task status and progress | TC-065, TC-050 | Partial: covered status only, while the README lists progress separately | Added TC-074 |
| **Receiver** — View assigned tasks | TC-023 to TC-025 | Full | — |
| **Receiver** — Update task status | TC-026 to TC-033, TC-054 | Full | — |
| **Receiver** — Track and report task progress | TC-050 to TC-052 | Partial: v2 assumed progress *is* status; the README lists it as a separate feature | Added TC-073, TC-075; Q-14 updated |
| **Receiver** — Cancel assigned tasks | TC-039a to TC-044 | Full | — |
| **Rule** — Five task statuses | TC-033 (invalid values), transition grid | Full | — |
| **Rule** — Allowed status transitions | TC-027a to TC-031, transition grid | Full | — |
| **Rule** — Terminal states can't change | TC-029 to TC-032, TC-038, TC-042, TC-068 | Full | — |
| **Rule** — Deadline auto-fail unless already terminal | TC-034a to TC-038, TC-067 | Full | — |
| **Rule** — Receiver and Admin can cancel an active task | TC-039a to TC-044 | Full | — |
| **Rule** — Reassigning to another receiver resets the status to `todo` | TC-045, TC-047, TC-048, TC-069 | Partial: no test that a *rejected* reassignment leaves the status alone | Added TC-076 |
| **Access** — Each task has one receiver at a time | TC-016, TC-045, TC-046 | Full | — |
| **Access** — Receivers only view and manage their own tasks | TC-023 to TC-026, TC-041, TC-046, TC-051 | Partial: viewing *another receiver's progress* wasn't tested | Added TC-075 |
| **Access** — Admins create, edit, assign and monitor tasks | TC-015, TC-019, TC-045, TC-065 | Full | — |
| **Access** — Authorization and status rules enforced on the server | TC-053, TC-054 and every Security test | Full | — |
| **Implementation independence** | Whole suite | Not testable as a single feature | Covered by the assumption above: run the same suite on both implementations |

## Test Cases

| Test ID | Req ID | Given | When | Result | Type |
|---|---|---|---|---|---|
| TC-001 | FR-001 | A visitor without an account | They register with valid, complete data | The account is created and the user can log in with those credentials | Positive |
| TC-002 | FR-001 | A visitor without an account | They submit registration with required fields empty | Registration is rejected and no account is created | Negative |
| TC-003 | FR-001 | An account with username/email X already exists | A visitor registers with X | Registration is rejected and no duplicate account is created *(see Q-01)* | Negative |
| TC-004 | FR-001, NFR-001 | A visitor without an account | They register and add a forged parameter to the request (e.g. `role=admin`) | The account is not given admin rights and the user can't reach admin functions | Security |
| TC-005 | FR-002 | A registered user | They log in with correct credentials | An authenticated session is created and the user reaches their interface | Positive |
| TC-006 | FR-002 | A registered user | They log in with the wrong password | Login is rejected and no session is created | Negative |
| TC-007 | FR-002 | No account with username Y exists | Someone logs in as Y | Login is rejected and no session is created | Negative |
| TC-008 | FR-002 | A logged-in user | They log out | The session ends and opening a protected page asks them to log in | Positive |
| TC-009 | FR-002, NFR-003 | A user who has logged out and whose old session cookie was captured | The old cookie is replayed on a protected request | The request is rejected and the session is no longer valid | Security |
| TC-010 | FR-002, NFR-001 | An unauthenticated visitor | They request a task list or task detail URL directly | Access is denied and no task data is returned | Security |
| TC-078 | FR-002 (RBAC) | An Admin account and a Receiver account | Each logs in | The Admin reaches the Admin interface (create users, create/assign/edit tasks, task overview). The Receiver reaches the Receiver interface (own tasks, status update, progress, cancel) and isn't offered Admin functions | Positive |
| TC-011 | FR-003 | A logged-in Admin | They create a user with valid data | The user is created and can log in | Positive |
| TC-012 | FR-003 | A logged-in Admin | They create a user with required fields missing or an existing username | Creation is rejected and no user is created | Negative |
| TC-013 | FR-003, NFR-001 | A logged-in Receiver A | They send a create-user request directly to the server, bypassing the UI | The server rejects it and no user is created | Security |
| TC-014 | FR-003, NFR-001 | An unauthenticated visitor | They send a create-user request | The request is rejected and no user is created | Security |
| TC-015 | FR-004 | A logged-in Admin and an existing Receiver A | They create a task assigned to Receiver A | The task is created, assigned only to Receiver A, and appears in Receiver A's task list *(initial status: see Q-05)* | Positive |
| TC-016 | FR-004 | A logged-in Admin | They create a task assigned to two receivers (e.g. a crafted request with two receiver IDs) | The request is rejected, or the task ends up with exactly one receiver. It never has two | Negative |
| TC-017 | FR-004 | A logged-in Admin | They create a task assigned to a user ID that doesn't exist | Creation is rejected | Negative |
| TC-018 | FR-004, NFR-001 | A logged-in Receiver A | They send a create-task request directly to the server | The server rejects it and no task is created | Security |
| TC-019 | FR-005 | An Admin and an existing active task | They edit the task's details and save | The changes are stored and shown to the assigned receiver | Positive |
| TC-020 | FR-005 | An Admin and an active task with deadline D | They change the deadline to a later date D2 | The deadline is stored as D2 | Positive |
| TC-021 | FR-005 | An Admin and an existing task | They submit an invalid deadline value (malformed date) | The edit is rejected and the original deadline stays | Negative |
| TC-022 | FR-005, NFR-001 | Receiver A, who owns task T | They send an edit request for T's deadline directly to the server | The server rejects it and T is unchanged *(see Q-21)* | Security |
| TC-070 | FR-005 (README: set deadlines) | A logged-in Admin and an existing Receiver A | They create a task for Receiver A with a future deadline D | The task is created with deadline D, and D is shown on the task | Positive |
| TC-071 | FR-005 (README: set deadlines) | A logged-in Admin | They create a task with a malformed deadline value | Creation is rejected and no task is created *(whether a deadline is required: see Q-27)* | Negative |
| TC-072 | FR-005, FR-006, NFR-001 | Receiver A owns active task T | They send a request to change T's title or description directly to the server | The server rejects it and T's details are unchanged. Editing tasks is an Admin feature only *(see Q-21)* | Security |
| TC-065 | FR-005 (Task access: monitor) | Tasks assigned to Receiver A and Receiver B in various statuses | The Admin opens the task overview | All tasks are listed, whoever they're assigned to, each with its current assignee and status | Positive |
| TC-066 | FR-005 (Task access), NFR-001 | Tasks assigned to Receiver A and Receiver B | Receiver A requests the Admin task overview directly | Access is denied and no tasks belonging to Receiver B are returned | Security |
| TC-068 | FR-005, FR-007 | Admin; task T is `failed` because its deadline passed | The Admin changes T's deadline to a future date | T stays `failed` because terminal states can't change. Whether the deadline value itself may still be edited is unspecified *(see Q-06)* | Negative |
| TC-023 | FR-006 | Receiver A has tasks T1 and T2; Receiver B has T3 | Receiver A opens their task list | Only T1 and T2 are listed | Positive |
| TC-024 | FR-006 | Receiver A has no tasks assigned | Receiver A opens their task list | The list is empty and shows no other user's tasks | Positive |
| TC-025 | FR-006, NFR-001 | T3 is assigned to Receiver B | Receiver A requests T3 directly by ID (URL/ID tampering) | Access is denied and none of T3's data is returned | Security |
| TC-026 | FR-006, NFR-001 | T3 (`todo`) is assigned to Receiver B | Receiver A sends a request to change T3 to `ongoing` | The server rejects it and T3 stays `todo` | Security |
| TC-027a | FR-007 | Receiver A owns task T in `todo` | Receiver A changes T to `ongoing` | T is `ongoing` | Positive |
| TC-027b | FR-007 | Receiver A owns task T in `ongoing` | Receiver A changes T to `done` | T is `done` | Positive |
| TC-027c | FR-007 | Receiver A owns task T in `todo` | Receiver A changes T to `failed` | The table allows the transition, so T is `failed` *(who may set `failed` manually: see Q-08)* | Positive |
| TC-027d | FR-007 | Receiver A owns task T in `ongoing` | Receiver A changes T to `failed` | The table allows the transition, so T is `failed` *(see Q-08)* | Positive |
| TC-028a | FR-007 | Receiver A owns task T in `todo` | Receiver A changes T directly to `done`, skipping `ongoing` | The change is rejected and T stays `todo` | Negative |
| TC-028b | FR-007 | Receiver A owns task T in `ongoing` | Receiver A changes T back to `todo` | The change is rejected and T stays `ongoing` | Negative |
| TC-029 | FR-007 | Receiver A owns task T in `done` | Receiver A tries each of `todo`, `ongoing`, `cancelled` and `failed` | Every change is rejected and T stays `done` | Negative |
| TC-030 | FR-007 | Receiver A owns task T in `cancelled` | Receiver A tries each of `todo`, `ongoing`, `done` and `failed` | Every change is rejected and T stays `cancelled` | Negative |
| TC-031 | FR-007 | Receiver A owns task T in `failed` | Receiver A tries each of `todo`, `ongoing`, `done` and `cancelled` | Every change is rejected and T stays `failed` | Negative |
| TC-032 | FR-007 | Task T is in a terminal state (`done`, `cancelled` or `failed`) | An **Admin** tries to change T to any other status | The change is rejected. Terminal states can't change, whatever the role | Negative |
| TC-033 | FR-007, NFR-001 | Receiver A owns task T in `todo` | They send a crafted request with a status value that isn't one of the five (e.g. `archived`, an empty value, or `DONE` in another case) | The server rejects it and T stays `todo` | Security |
| TC-034a | FR-008 | Task T in `todo` with deadline D | D passes *(see Q-09, Q-10)* | T becomes `failed` automatically, with no user action | Positive |
| TC-034b | FR-008 | Task T in `ongoing` with deadline D | D passes | T becomes `failed` automatically, with no user action | Positive |
| TC-035 | FR-008 | Task T in `todo` or `ongoing` with a deadline in the future | The status is checked before the deadline | T keeps its current status and is not marked `failed` | Negative |
| TC-036 | FR-008 | Task T is `done` and its deadline has since passed | The status is checked after the deadline | T stays `done` and doesn't become `failed`, because it was already terminal | Negative |
| TC-037 | FR-008 | Task T is `cancelled` and its deadline has since passed | The status is checked after the deadline | T stays `cancelled` | Negative |
| TC-038 | FR-008, FR-007 | Task T was auto-set to `failed` | Its owner tries to change T to `todo`, `ongoing`, `done` or `cancelled` | Every change is rejected and T stays `failed` | Negative |
| TC-067 | FR-008, FR-005 | Task T in `ongoing` with deadline D | Before D, the Admin moves the deadline to D2 (later than D); then D passes but D2 hasn't | T stays `ongoing`, and becomes `failed` only after D2 passes | Positive |
| TC-039a | FR-009 | Receiver A owns task T in `todo` | Receiver A cancels T | T is `cancelled` | Positive |
| TC-039b | FR-009 | Receiver A owns task T in `ongoing` | Receiver A cancels T | T is `cancelled` | Positive |
| TC-040 | FR-009 | Admin; task T assigned to Receiver A, in `todo` (repeat with `ongoing`) | The Admin cancels T | T is `cancelled` | Positive |
| TC-041 | FR-009, NFR-001 | Task T in `ongoing` is assigned to Receiver B | Receiver A sends a cancel request for T | The server rejects it and T stays `ongoing` | Security |
| TC-042 | FR-009 | Task T is `done` or `failed` | Its owner or an Admin tries to cancel T | The cancel is rejected and the status is unchanged, because terminal states have no allowed next status | Negative |
| TC-043 | FR-009 | Task T is already `cancelled` | Someone tries to cancel T again | It is rejected or has no effect, and T stays `cancelled` | Negative |
| TC-044 | FR-009, NFR-001 | An unauthenticated visitor | They send a cancel request for any task | The request is rejected and the status is unchanged | Security |
| TC-045 | FR-010 | Admin; task T assigned to Receiver A, in `ongoing` | The Admin reassigns T to Receiver B | T is assigned only to Receiver B and its status is `todo` | Positive |
| TC-069 | FR-010 | Admin; task T assigned to Receiver A, in `todo` | The Admin reassigns T to Receiver B | T is assigned only to Receiver B and stays `todo` | Positive |
| TC-046 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B | Receiver A tries to view T or change its status | Access is denied | Security |
| TC-047 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B | Receiver B opens their task list | T is listed with status `todo` | Positive |
| TC-077 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B and is `todo` | Receiver B changes T to `ongoing` | T is `ongoing`, because the new receiver can now manage the task | Positive |
| TC-048 | FR-010 | Admin; task T is `done`, `cancelled` or `failed` | The Admin tries to reassign T | T must not go back to `todo`, because terminal states can't change. The reassignment is rejected, or the status stays terminal *(see Q-12)* | Negative |
| TC-076 | FR-010 | Admin; task T assigned to Receiver A, in `ongoing` | The Admin reassigns T to a user ID that doesn't exist | The reassignment is rejected. T stays assigned to Receiver A, and stays `ongoing` because there was no reset | Negative |
| TC-049 | FR-010, NFR-001 | Receiver A owns task T | Receiver A sends a request to reassign T to Receiver B | The server rejects it and both the assignee and the status are unchanged | Security |
| TC-050 | FR-011 | Receiver A owns task T in `todo` | Receiver A changes T to `ongoing`, and the Admin then opens the task overview | T shows `ongoing` to both Receiver A and the Admin *(other kinds of progress reporting: see Q-14)* | Positive |
| TC-073 | FR-011 | Receiver A owns active task T | Receiver A reports progress on T using the progress feature (separate from the status update), then reopens T | The progress report is saved and Receiver A can see it on T *(form of progress: see Q-14)* | Positive |
| TC-074 | FR-011, FR-005 (README: view progress) | Receiver A has reported progress on task T | The Admin opens T or the task overview | The Admin sees Receiver A's latest progress for T | Positive |
| TC-051 | FR-011, NFR-001 | Task T is assigned to Receiver B | Receiver A submits a progress update for T | The server rejects it and nothing is recorded | Security |
| TC-075 | FR-011, FR-006, NFR-001 | Receiver B has reported progress on task T, which is assigned to Receiver B | Receiver A requests T's progress directly by ID | Access is denied and none of T's progress data is returned | Security |
| TC-052 | FR-011 | Receiver A owns task T in a terminal state | Receiver A tries to report progress | The status must not change. Whether a progress note is accepted is unspecified *(see Q-14)* | Negative |
| TC-053 | NFR-001 | Receiver A is logged in | They call every admin-only operation directly (create user, create/edit/reassign task, view all tasks) with a valid receiver session | Every call is rejected by the server | Security |
| TC-054 | NFR-001 | Receiver A owns task T in `ongoing` | They send a crafted request to set T to `todo` (e.g. a tampered hidden field or a replayed old request) | The server checks the transition table, rejects the request, and T stays `ongoing` | Security |
| TC-055 | NFR-002 | A user registered with password P | A tester inspects the stored credential in the database | The stored value isn't P or a reversible encoding of P (such as base64); it's a hash | Security |
| TC-056 | NFR-002 | Two users registered with the same password | A tester compares their stored credentials | The stored values differ (salted) *(see Q-16)* | Security |
| TC-057 | NFR-002 | A logged-in user or Admin | They view user data through any page or response | No password or password hash appears in any response | Security |
| TC-058 | NFR-003 | A logged-in user | They submit a state-changing request with a valid CSRF token | The request is processed | Positive |
| TC-059 | NFR-003 | A logged-in user | They submit a state-changing request (create, edit, status change, cancel, logout) with no CSRF token, or a wrong or expired one | The request is rejected and no state changes | Security |
| TC-060 | NFR-003 | A logged-in user's browser | A cross-origin page auto-submits a form to the app (CSRF attack) | The request is rejected and no state changes | Security |
| TC-061 | NFR-003 | A registered user | Failed logins are repeated until they go past the rate limit | Further attempts are throttled or blocked, even with the correct password, during the lockout window | Security |
| TC-062 | NFR-003 | A registered user | A small number of failed logins below the limit, then a correct login | The login succeeds and there's no false lockout | Negative |
| TC-063 | NFR-003 | A user logs in | A tester inspects the session cookie | The cookie has the `HttpOnly`, `Secure` and `SameSite` attributes *(see Q-19)* | Security |
| TC-064 | NFR-003 | An attacker has a session ID that was set before the user logged in | The user logs in | A new session ID is issued, and the old one doesn't grant authenticated access (session fixation) | Security |

## Transition Coverage

All 25 current → next status pairs (including staying in the same status) are covered:

| From \ To | todo | ongoing | done | cancelled | failed |
|---|---|---|---|---|---|
| **todo** | Q-22 | ✅ TC-027a, TC-077 | ❌ TC-028a | ✅ TC-039a | ✅ TC-027c, TC-034a |
| **ongoing** | ❌ TC-028b, TC-054 | Q-22 | ✅ TC-027b | ✅ TC-039b | ✅ TC-027d, TC-034b |
| **done** | ❌ TC-029 | ❌ TC-029 | Q-22 | ❌ TC-029, TC-042 | ❌ TC-029, TC-036 |
| **cancelled** | ❌ TC-030 | ❌ TC-030 | ❌ TC-030 | TC-043 | ❌ TC-030, TC-037 |
| **failed** | ❌ TC-031, TC-038 | ❌ TC-031 | ❌ TC-031 | ❌ TC-031, TC-042 | Q-22 |

✅ = allowed, ❌ = must be rejected. A cell showing Q-22 has no test because the expected behaviour is unspecified.

## Coverage Summary

| Requirement | Test cases | Positive | Negative | Security |
|---|---|---|---|---|
| FR-001 | TC-001 to 004 | 1 | 2 | 1 |
| FR-002 | TC-005 to 010, 078 | 3 | 2 | 2 |
| FR-003 | TC-011 to 014 | 1 | 1 | 2 |
| FR-004 | TC-015 to 018 | 1 | 2 | 1 |
| FR-005 / Task access | TC-019 to 022, 065, 066, 068, 070 to 072 | 4 | 3 | 3 |
| FR-006 | TC-023 to 026 (+046, 047, 072, 075, 077) | 2 | 0 | 2 |
| FR-007 | TC-027a to 033 (+038, 054) | 4 | 6 | 1 |
| FR-008 | TC-034a to 038, 067 | 3 | 4 | 0 |
| FR-009 | TC-039a to 044 | 3 | 2 | 2 |
| FR-010 | TC-045 to 049, 069, 076, 077 | 4 | 2 | 2 |
| FR-011 | TC-050 to 052, 073 to 075 | 3 | 1 | 2 |
| NFR-001 | TC-053, 054 (+ every "Security" test above that cites it) | — | — | 2+ |
| NFR-002 | TC-055 to 057 | — | — | 3 |
| NFR-003 | TC-058 to 064 | 1 | 1 | 5 |
| **Total** | **84** | | | |

## Ambiguities and Open Questions

| ID | Req | Concern |
|---|---|---|
| Q-01 | FR-001 | **Open.** The required fields, the unique identifier (username or email), and any password policy aren't specified, so tests can't cover password-strength rules. |
| Q-02 | FR-001 | **Open.** The README confirms two roles (Admin/Sender and Receiver) but still doesn't say which role a self-registered user gets. Is it always Receiver? |
| Q-03 | FR-002 | **Open.** It isn't stated whether login errors should hide whether the account exists (user enumeration). |
| Q-04 | FR-003 | **Open.** The README says only "Create new users". It doesn't say whether an Admin can create other Admins, or only Receivers. |
| Q-05 | FR-004 | **Partly answered.** "One receiver at a time" and the README's "assign tasks to individual users" confirm a task has exactly one assignee (TC-016). Still open: (a) the initial status of a new task isn't stated (`todo` is strongly implied but not explicit); (b) whether a task can exist without a receiver; (c) the README says "users", not "receivers", so it's unclear whether a task can be assigned to an Admin. |
| Q-06 | FR-005 | **Partly answered.** A `failed` task stays `failed` if its deadline is extended (TC-068), because terminal states can't change. Still open: may an Admin edit the details or deadline of a terminal task at all? Can a deadline be set in the past, and if so, does the task fail at once? |
| Q-07 | FR-007 | **Answered (v2).** The status list and transition table are specified, and terminal states apply to every role. |
| Q-08 | FR-007 | **Partly answered.** The README lists "Update task status" as a Receiver feature, which supports the receiver making the transitions in the table, including `todo → failed` and `ongoing → failed` (TC-027c, TC-027d). Still open: it isn't stated explicitly that a user may set `failed` manually, rather than only the system through the deadline rule. If it's system-only, TC-027c and TC-027d become negative tests. |
| Q-09 | FR-008 | **Open.** It isn't stated how the failure is triggered (a scheduled job, or a check when the task is accessed) or how quickly it happens. That decides when a test should check the status. |
| Q-10 | FR-008 | **Partly answered.** "Has passed" means the task fails *after* the deadline, not before it. Still open: whether the exact moment of the deadline counts as passed, the timezone used, and the deadline's precision (date only or date and time). |
| Q-11 | FR-009 | **Answered (v2).** "Active" means `todo` or `ongoing`. |
| Q-12 | FR-010 | **Partly answered.** The README lists "Manage task access and assignments" under the Admin interface only, which confirms reassignment is an Admin action (TC-049). Still open: (a) reassigning a terminal task conflicts with the rule that terminal states can't transition, and it isn't said which rule wins (TC-048); (b) whether "reassigning" to the *same* receiver is rejected, ignored, or also resets to `todo`. |
| Q-13 | FR-010 | **Reopened.** The README lists progress separately from status (Q-14), so progress may be stored separately. It isn't stated whether existing progress reports are kept, cleared or hidden when a task is reassigned, or whether the previous receiver can still see them. |
| Q-14 | FR-011 | **Partly answered.** The README lists "Update task status" and "Track and report task progress" as **separate** Receiver features, and the Admin "View[s] task status and progress". So progress is something beyond status; TC-073 to TC-075 now test it. Still open: the form of progress (percentage, free-text notes, a history of updates), whether reporting progress can change the status, and whether progress can be reported on terminal tasks (TC-052). |
| Q-15 | NFR-001 | **Answered (v2).** The status rules to enforce on the server are the transition table, the terminal-state rule, auto-fail, the cancel permissions and reset-on-reassign. |
| Q-16 | NFR-002 | **Open.** The README doesn't mention password storage. "Secure hash" doesn't name an algorithm (for example bcrypt, Argon2 or PBKDF2), and doesn't say whether salting is required. TC-056 assumes salting. |
| Q-17 | NFR-003 | **Open.** The README doesn't mention rate limiting. The threshold, time window, lockout length and scope (per IP, per account or both) aren't specified, and it isn't stated which endpoints have limits. |
| Q-18 | NFR-003 | **Open.** It isn't stated whether logout and other GET-based actions need CSRF protection. |
| Q-19 | NFR-003 | **Open.** "Secure sessions" isn't defined: cookie attributes, idle and absolute timeouts, and session regeneration after login aren't specified. TC-063 and TC-064 apply common practice, which may need confirming. |
| Q-20 | General | **Open.** It isn't stated whether a deleted or deactivated user exists, what happens to that user's tasks, or whether their sessions are revoked. |
| Q-21 | Task access | **Answered.** The README's Receiver interface lists only: view assigned tasks, update status, track and report progress, and cancel. Editing tasks and setting deadlines appear only under the Admin interface. So "manage" for a receiver means status updates, progress and cancelling, and editing a task's details or deadline is Admin-only (TC-022, TC-072). |
| Q-22 | FR-007 | **Open.** Setting a task to the status it already has (e.g. `todo → todo`) isn't in the table. It isn't stated whether this is rejected or treated as having no effect. |
| Q-23 | FR-005, FR-007 | **Partly answered.** The README gives the Admin "View task status and progress", not "Update task status", and names cancelling as an explicit Admin power. This suggests an Admin's only direct status change is cancelling (plus the reset when reassigning). Still open: whether "Edit existing tasks" includes the status. If it does, the TC-027 and TC-028 tests should be repeated for the Admin role; if it doesn't, an Admin attempt at `ongoing → done` should be a negative test. |
| Q-24 | FR-002, FR-003 | **New.** The README names the role "Admin/Sender". Is that one role with two names, or two roles (e.g. a Sender who can create and assign tasks but can't create users)? If there are two, every Admin test has to be split by role. |
| Q-25 | FR-005, Task access | **New.** "Manage task access" isn't defined. If it means anything beyond assigning or reassigning the one receiver (e.g. giving another user read access), it would conflict with "Receivers can only view and manage tasks assigned to them". |
| Q-26 | General | **New.** "Both implementations should provide equivalent functionality" doesn't say how an equivalent result is judged when the requirements leave behaviour open (error messages, status codes, timing of auto-fail). The open questions above should be settled before the comparison, or the same behaviour may be judged differently for each implementation. |
| Q-27 | FR-004, FR-005 | **New.** It isn't stated whether a deadline is required when a task is created, or optional. If it's optional, it isn't stated how a task without a deadline is treated by the auto-fail rule. |
