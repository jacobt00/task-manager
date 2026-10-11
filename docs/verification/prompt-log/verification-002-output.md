# Task Manager: Specification-Based Test Cases (v2)

**Assumptions used throughout**
- "Rejected" means the action has no effect on stored data and the user gets an error or access-denied response. The requirements don't name status codes or error messages, so the tests don't either.
- **Roles:** *Admin*, *Receiver A* and *Receiver B*.
- **Statuses:** `todo`, `ongoing`, `done`, `cancelled`, `failed`.
- **Terminal:** `done`, `cancelled`, `failed`. These have no allowed next status for any role.
- **Active:** `todo` or `ongoing`.

**Status transition table (from the specification)**

| Current status | Allowed next statuses |
|---|---|
| todo | ongoing, cancelled, failed |
| ongoing | done, cancelled, failed |
| done | None |
| cancelled | None |
| failed | None |

## Changes from v1

- **Rewritten with concrete statuses:** TC-027 is now TC-027a–d, TC-028 is now TC-028a–b, TC-034 is now TC-034a–b and TC-039 is now TC-039a–b. TC-029–033, TC-036, TC-040, TC-042, TC-045, TC-050 and TC-054 have also been rewritten.
- **New tests:** TC-065 and TC-066 (Admin monitoring and access to all tasks), TC-067 and TC-068 (how a deadline edit interacts with auto-fail), and TC-069 (reassigning a `todo` task).
- **Questions:** Q-07, Q-11 and Q-15 are answered. Q-05, Q-06, Q-08, Q-10, Q-12, Q-13 and Q-14 are partly answered. Q-21 to Q-23 are new.
- **Unchanged:** the IDs of existing tests stay the same so they can be traced back to v1.

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
| TC-048 | FR-010 | Admin; task T is `done`, `cancelled` or `failed` | The Admin tries to reassign T | T must not go back to `todo`, because terminal states can't change. The reassignment is rejected, or the status stays terminal *(see Q-12)* | Negative |
| TC-049 | FR-010, NFR-001 | Receiver A owns task T | Receiver A sends a request to reassign T to Receiver B | The server rejects it and both the assignee and the status are unchanged | Security |
| TC-050 | FR-011 | Receiver A owns task T in `todo` | Receiver A changes T to `ongoing`, and the Admin then opens the task overview | T shows `ongoing` to both Receiver A and the Admin *(other kinds of progress reporting: see Q-14)* | Positive |
| TC-051 | FR-011, NFR-001 | Task T is assigned to Receiver B | Receiver A submits a progress update for T | The server rejects it and nothing is recorded | Security |
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
| **todo** | Q-22 | ✅ TC-027a | ❌ TC-028a | ✅ TC-039a | ✅ TC-027c, TC-034a |
| **ongoing** | ❌ TC-028b, TC-054 | Q-22 | ✅ TC-027b | ✅ TC-039b | ✅ TC-027d, TC-034b |
| **done** | ❌ TC-029 | ❌ TC-029 | Q-22 | ❌ TC-029, TC-042 | ❌ TC-029, TC-036 |
| **cancelled** | ❌ TC-030 | ❌ TC-030 | ❌ TC-030 | TC-043 | ❌ TC-030, TC-037 |
| **failed** | ❌ TC-031, TC-038 | ❌ TC-031 | ❌ TC-031 | ❌ TC-031, TC-042 | Q-22 |

✅ = allowed, ❌ = must be rejected. A cell showing Q-22 has no test because the expected behaviour is unspecified.

## Coverage Summary

| Requirement | Test cases | Positive | Negative | Security |
|---|---|---|---|---|
| FR-001 | TC-001 to 004 | 1 | 2 | 1 |
| FR-002 | TC-005 to 010 | 2 | 2 | 2 |
| FR-003 | TC-011 to 014 | 1 | 1 | 2 |
| FR-004 | TC-015 to 018 | 1 | 2 | 1 |
| FR-005 / Task access | TC-019 to 022, 065, 066, 068 | 3 | 2 | 2 |
| FR-006 | TC-023 to 026 (+046, 047) | 2 | 0 | 2 |
| FR-007 | TC-027a to 033 (+038, 054) | 4 | 6 | 1 |
| FR-008 | TC-034a to 038, 067 | 3 | 4 | 0 |
| FR-009 | TC-039a to 044 | 3 | 2 | 2 |
| FR-010 | TC-045 to 049, 069 | 3 | 1 | 2 |
| FR-011 | TC-050 to 052 | 1 | 1 | 1 |
| NFR-001 | TC-053, 054 (+ every "Security" test above that cites it) | — | — | 2+ |
| NFR-002 | TC-055 to 057 | — | — | 3 |
| NFR-003 | TC-058 to 064 | 1 | 1 | 5 |
| **Total** | **75** | | | |

## Ambiguities and Open Questions

| ID | Req | Concern |
|---|---|---|
| Q-01 | FR-001 | **Open.** The required fields, the unique identifier (username or email), and any password policy aren't specified, so tests can't cover password-strength rules. |
| Q-02 | FR-001 | **Open.** The role given to a self-registered user isn't stated. Is it always Receiver? |
| Q-03 | FR-002 | **Open.** It isn't stated whether login errors should hide whether the account exists (user enumeration). |
| Q-04 | FR-003 | **Open.** It isn't stated whether an Admin can create other Admins, or only Receivers. |
| Q-05 | FR-004 | **Partly answered.** "One receiver at a time" confirms a task has at most one receiver (TC-016). Still open: the initial status of a new task isn't stated. `todo` is strongly implied, since it's the reset status and has no incoming transitions, but it isn't explicit. It's also still open whether a task can exist without a receiver. |
| Q-06 | FR-005 | **Partly answered.** A `failed` task stays `failed` if its deadline is extended (TC-068), because terminal states can't change. Still open: may an Admin edit the details or deadline of a terminal task at all? Can a deadline be set in the past, and if so, does the task fail at once? |
| Q-07 | FR-007 | **Answered.** The status list and transition table are now specified, and terminal states apply to every role. TC-027a–TC-032 are now concrete. |
| Q-08 | FR-007 | **Partly answered.** The table allows `todo → failed` and `ongoing → failed`. Still open: it doesn't say *who* may make those transitions manually (the receiver, the Admin, or only the system through the deadline rule). TC-027c and TC-027d assume the receiver may; if the transition is meant to be system-only, both become negative tests. |
| Q-09 | FR-008 | **Open.** It isn't stated how the failure is triggered (a scheduled job, or a check when the task is accessed) or how quickly it happens. That decides when a test should check the status. |
| Q-10 | FR-008 | **Partly answered.** "Has passed" means the task fails *after* the deadline, not before it. Still open: whether the exact moment of the deadline counts as passed, the timezone used, and the deadline's precision (date only or date and time). |
| Q-11 | FR-009 | **Answered.** Only `todo` and `ongoing` list `cancelled` as an allowed next status, so "active" means `todo` or `ongoing`. |
| Q-12 | FR-010 | **Partly answered.** Admins "assign" tasks, so reassignment is an Admin action (TC-049). The reset applies when a task goes "to another receiver". Still open: (a) reassigning a terminal task conflicts with the rule that terminal states can't transition, and it isn't said which rule wins (TC-048); (b) it isn't said whether "reassigning" to the *same* receiver is rejected, ignored, or also resets to `todo`. |
| Q-13 | FR-010 | **Partly answered.** Any progress recorded as status is reset to `todo`. Still open: if progress is also recorded some other way (Q-14), it isn't stated what happens to it, or whether the previous receiver can still see it. |
| Q-14 | FR-011 | **Partly answered.** Receivers "manage" their tasks, and the status flow (`todo → ongoing → done`) is the only progress mechanism defined, so TC-050 tests progress through status. Still open: whether "report progress" also means something else (percentage, comments) and whether that is allowed on terminal tasks. |
| Q-15 | NFR-001 | **Answered.** The status rules to enforce on the server are the transition table, the terminal-state rule, auto-fail, the cancel permissions and reset-on-reassign. |
| Q-16 | NFR-002 | **Open.** "Secure hash" doesn't name an algorithm (for example bcrypt, Argon2 or PBKDF2), and doesn't say whether salting is required. TC-056 assumes salting. |
| Q-17 | NFR-003 | **Open.** The rate-limit threshold, time window, lockout length and scope (per IP, per account or both) aren't specified, and it isn't stated which endpoints have limits (login only, or registration too). |
| Q-18 | NFR-003 | **Open.** It isn't stated whether logout and other GET-based actions need CSRF protection. |
| Q-19 | NFR-003 | **Open.** "Secure sessions" isn't defined: cookie attributes, idle and absolute timeouts, and session regeneration after login aren't specified. TC-063 and TC-064 apply common practice, which may need confirming. |
| Q-20 | General | **Open.** It isn't stated whether a deleted or deactivated user exists, what happens to that user's tasks, or whether their sessions are revoked. |
| Q-21 | Task access | **New.** "Receivers can view and *manage* tasks assigned to them" doesn't define *manage*. Does it cover only status changes and cancelling, or also editing the title, description or deadline? TC-022 assumes deadline edits are Admin-only (FR-005). |
| Q-22 | FR-007 | **New.** Setting a task to the status it already has (e.g. `todo → todo`) isn't in the table. It isn't stated whether this is rejected or treated as having no effect. |
| Q-23 | FR-005, FR-007 | **New.** Admins can "create, edit, assign and monitor" tasks. It isn't stated whether "edit" lets an Admin change the status directly (e.g. `ongoing → done`), apart from cancelling (FR-009). If it does, the TC-027 and TC-028 tests should be repeated for the Admin role. |
