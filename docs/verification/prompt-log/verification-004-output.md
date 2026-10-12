# Task Manager: Specification-Based Test Cases

**Assumptions used throughout**
- "Rejected" means the action has no effect on stored data and the user gets an error or access-denied response. The requirements don't name status codes or error messages, so the tests don't either.
- **Roles:** *Admin* (the same role the README calls "Admin/Sender"), *Receiver A* and *Receiver B*.
- **Statuses:** `todo`, `ongoing`, `done`, `cancelled`, `failed`.
- **Terminal:** `done`, `cancelled`, `failed`. These have no allowed next status for any role.
- **Active:** `todo` or `ongoing`.
- **Users** register with a name, an email and a password. The email must be unique. No password policy is specified, so none is tested.
- **Deadlines:** a "past" deadline is at least one day before the check, and a "future" deadline is at least one day after it. Timezones and the exact moment of the deadline aren't tested.
- **Overdue tasks:** a task can't be created with a deadline in the past. Tests that need an overdue task prepare it through test-data setup (for example seeded data or a controlled clock), not through the UI.
- **Auto-fail:** only the observable result is tested (the status a user sees). The internal mechanism isn't tested.
- **Progress** is a percentage from 0 to 100. It is separate from status, and recording it never changes the status.
- **Password hashing:** bcrypt was chosen as the salted, one-way password hashing algorithm.
- **Sessions:** standard practice is expected (`HttpOnly`, `Secure`, `SameSite`, and a new session ID at login). Session timeouts aren't tested.
- **Out of scope by decision:** rate limiting, session timeouts, and deleting or deactivating users.
- **Implementation independence:** every test is technology-agnostic, so the same suite can be run against both implementations.

**Status transition table (from the specification)**

| Current status | Allowed next statuses |
|---|---|
| todo | ongoing, cancelled, failed |
| ongoing | done, cancelled, failed |
| done | None |
| cancelled | None |
| failed | None |

A change to the status a task already has (e.g. `todo → todo`) is rejected. An Admin's only direct status change is cancelling an active task.

## Changes from v3

- **Removed:** TC-061 and TC-062 (rate limiting is out of scope).
- **Rewritten with your decisions:**
  - Registration, login and user creation: TC-001–004, TC-006, TC-007, TC-011–013.
  - Task creation: TC-015, TC-016.
  - Status transitions: TC-027c–d.
  - Deadlines: TC-034a–037, TC-067, TC-070, TC-071.
  - Cancelling and reassigning: TC-043, TC-048.
  - Progress: TC-050–052, TC-073, TC-074.
  - Password hashing, CSRF and cookies: TC-055, TC-059, TC-063.
- **New:** TC-079 to TC-098.
- **Order:** test cases are sorted by ID.

## Decisions Applied

| Q | Decision | Tests affected |
|---|---|---|
| Q-01 | Register with name, email and password; email is unique | TC-001–003, TC-005–007, TC-011, TC-012 |
| Q-02 | Self-registered users are always Receivers; only an Admin can create Admins | TC-004, TC-013, TC-079 |
| Q-03 | Login shows the same generic error for an unknown email and a wrong password | TC-006, TC-007, TC-080 |
| Q-04 | An Admin can create both Admins and Receivers | TC-011, TC-081 |
| Q-05 | A new task starts as `todo` and has exactly one receiver, who must be a Receiver | TC-015, TC-016, TC-082–084, TC-087 |
| Q-06 | A task can't be created with a deadline in the past | TC-085 |
| Q-08 | A receiver may set their own task to `failed` from `todo` or `ongoing` | TC-027c, TC-027d |
| Q-09 | Auto-fail internals aren't tested | TC-034a, TC-034b (observable result only) |
| Q-10 | Past/future deadlines are at least one day away; no timezone tests | TC-015, TC-020, TC-034a–037, TC-067, TC-070, TC-085 |
| Q-12 | Reassigning a terminal task is rejected, even to the same receiver; status and receiver stay the same | TC-048, TC-088 |
| Q-13 | Progress stays with the task after reassignment; the previous receiver loses access to it | TC-089, TC-090 |
| Q-14 | Progress is a percentage on the receiver's own active tasks, visible to the Admin, and never changes the status. For terminal tasks it was left to me: **progress on terminal tasks is rejected** | TC-050–052, TC-073, TC-074, TC-091–094 |
| Q-16 | Salted one-way hashing; **bcrypt** chosen | TC-055, TC-056 |
| Q-17 | No rate limiting | TC-061 and TC-062 removed |
| Q-18 | Logout and every state-changing action need CSRF protection | TC-059, TC-095 |
| Q-19 | Standard session practice; no timeout tests | TC-063, TC-064 |
| Q-20 | User deletion and deactivation are left out | No tests |
| Q-22 | A change to the same status is rejected | TC-043, TC-096, TC-097 |
| Q-23 | The Admin can cancel active tasks only, following the transition table, and never changes a terminal task. Read as: the Admin can't make other status changes | TC-032, TC-040, TC-042, TC-098 |
| Q-24 | Admin and Sender are the same role | Assumptions; no separate tests |
| Q-25 | "Manage task access" means assigning or reassigning the one receiver | Covered by TC-045–049, TC-069, TC-076, TC-077, TC-087, TC-088 |
| Q-27 | A deadline is required when a task is created | TC-086 |

## Test Cases

| Test ID | Req ID | Given | When | Result | Type |
|---|---|---|---|---|---|
| TC-001 | FR-001 | A visitor without an account | They register with a name, an unused email and a password | The account is created and the user can log in with that email and password | Positive |
| TC-002 | FR-001 | A visitor without an account | They submit registration with the name, the email or the password missing (repeat for each field) | Registration is rejected and no account is created | Negative |
| TC-003 | FR-001 | An account with email X already exists | A visitor registers with email X | Registration is rejected and no second account with email X is created | Negative |
| TC-004 | FR-001, NFR-001 | A visitor without an account | They register and add a forged parameter to the request (e.g. `role=admin`) | The account is never an Admin. If it's created, it's a Receiver, and Admin functions are denied | Security |
| TC-005 | FR-002 | A registered user | They log in with the correct email and password | An authenticated session is created and the user reaches their interface | Positive |
| TC-006 | FR-002 | A registered user | They log in with the correct email and a wrong password | Login is rejected, no session is created, and a generic error is shown that doesn't say which part was wrong | Negative |
| TC-007 | FR-002 | No account with email Y exists | Someone logs in with email Y | Login is rejected, no session is created, and the same generic error as in TC-006 is shown | Negative |
| TC-008 | FR-002 | A logged-in user | They log out (with a valid CSRF token) | The session ends and opening a protected page asks them to log in | Positive |
| TC-009 | FR-002, NFR-003 | A user who has logged out and whose old session cookie was captured | The old cookie is replayed on a protected request | The request is rejected and the session is no longer valid | Security |
| TC-010 | FR-002, NFR-001 | An unauthenticated visitor | They request a task list or task detail URL directly | Access is denied and no task data is returned | Security |
| TC-011 | FR-003 | A logged-in Admin | They create a Receiver with a name, an unused email and a password | The user is created, can log in, and reaches the Receiver interface | Positive |
| TC-012 | FR-003 | A logged-in Admin | They create a user with a required field missing, or with an email that's already used | Creation is rejected and no user is created | Negative |
| TC-013 | FR-003, NFR-001 | A logged-in Receiver A | They send a create-user request directly to the server, for a Receiver and then for an Admin | The server rejects both and no user is created | Security |
| TC-014 | FR-003, NFR-001 | An unauthenticated visitor | They send a create-user request | The request is rejected and no user is created | Security |
| TC-015 | FR-004 | A logged-in Admin and an existing Receiver A | They create a task for Receiver A with a future deadline | The task is created with status `todo`, assigned only to Receiver A, and appears in Receiver A's task list | Positive |
| TC-016 | FR-004 | A logged-in Admin | They create a task assigned to two receivers (e.g. a crafted request with two receiver IDs) | Creation is rejected and no task is created | Negative |
| TC-017 | FR-004 | A logged-in Admin | They create a task assigned to a user ID that doesn't exist | Creation is rejected | Negative |
| TC-018 | FR-004, NFR-001 | A logged-in Receiver A | They send a create-task request directly to the server | The server rejects it and no task is created | Security |
| TC-019 | FR-005 | An Admin and an existing active task | They edit the task's details and save | The changes are stored and shown to the assigned receiver | Positive |
| TC-020 | FR-005 | An Admin and an active task with deadline D | They change the deadline to a later date D2, at least one day in the future | The deadline is stored as D2 | Positive |
| TC-021 | FR-005 | An Admin and an existing task | They submit an invalid deadline value (malformed date) | The edit is rejected and the original deadline stays | Negative |
| TC-022 | FR-005, NFR-001 | Receiver A, who owns task T | They send an edit request for T's deadline directly to the server | The server rejects it and T is unchanged | Security |
| TC-023 | FR-006 | Receiver A has tasks T1 and T2; Receiver B has T3 | Receiver A opens their task list | Only T1 and T2 are listed | Positive |
| TC-024 | FR-006 | Receiver A has no tasks assigned | Receiver A opens their task list | The list is empty and shows no other user's tasks | Positive |
| TC-025 | FR-006, NFR-001 | T3 is assigned to Receiver B | Receiver A requests T3 directly by ID (URL/ID tampering) | Access is denied and none of T3's data is returned | Security |
| TC-026 | FR-006, NFR-001 | T3 (`todo`) is assigned to Receiver B | Receiver A sends a request to change T3 to `ongoing` | The server rejects it and T3 stays `todo` | Security |
| TC-027a | FR-007 | Receiver A owns task T in `todo` | Receiver A changes T to `ongoing` | T is `ongoing` | Positive |
| TC-027b | FR-007 | Receiver A owns task T in `ongoing` | Receiver A changes T to `done` | T is `done` | Positive |
| TC-027c | FR-007 | Receiver A owns task T in `todo` | Receiver A changes T to `failed` | T is `failed` | Positive |
| TC-027d | FR-007 | Receiver A owns task T in `ongoing` | Receiver A changes T to `failed` | T is `failed` | Positive |
| TC-028a | FR-007 | Receiver A owns task T in `todo` | Receiver A changes T directly to `done`, skipping `ongoing` | The change is rejected and T stays `todo` | Negative |
| TC-028b | FR-007 | Receiver A owns task T in `ongoing` | Receiver A changes T back to `todo` | The change is rejected and T stays `ongoing` | Negative |
| TC-029 | FR-007 | Receiver A owns task T in `done` | Receiver A tries each of `todo`, `ongoing`, `cancelled` and `failed` | Every change is rejected and T stays `done` | Negative |
| TC-030 | FR-007 | Receiver A owns task T in `cancelled` | Receiver A tries each of `todo`, `ongoing`, `done` and `failed` | Every change is rejected and T stays `cancelled` | Negative |
| TC-031 | FR-007 | Receiver A owns task T in `failed` | Receiver A tries each of `todo`, `ongoing`, `done` and `cancelled` | Every change is rejected and T stays `failed` | Negative |
| TC-032 | FR-007 | Task T is in a terminal state (`done`, `cancelled` or `failed`) | An **Admin** tries to change T to any other status | The change is rejected. Terminal states can't change, whatever the role | Negative |
| TC-033 | FR-007, NFR-001 | Receiver A owns task T in `todo` | They send a crafted request with a status value that isn't one of the five (e.g. `archived`, an empty value, or `DONE` in another case) | The server rejects it and T stays `todo` | Security |
| TC-034a | FR-008 | Task T in `todo` whose deadline is at least one day in the past (prepared through test data) | Receiver A or the Admin views T | T is `failed`, with no user action | Positive |
| TC-034b | FR-008 | Task T in `ongoing` whose deadline is at least one day in the past (prepared through test data) | Receiver A or the Admin views T | T is `failed`, with no user action | Positive |
| TC-035 | FR-008 | Task T in `todo` or `ongoing` with a deadline at least one day in the future | Receiver A or the Admin views T | T keeps its current status and is not `failed` | Negative |
| TC-036 | FR-008 | Task T is `done` and its deadline is at least one day in the past | Receiver A or the Admin views T | T stays `done` and isn't `failed`, because it was already terminal | Negative |
| TC-037 | FR-008 | Task T is `cancelled` and its deadline is at least one day in the past | Receiver A or the Admin views T | T stays `cancelled` | Negative |
| TC-038 | FR-008, FR-007 | Task T was auto-set to `failed` | Its owner tries to change T to `todo`, `ongoing`, `done` or `cancelled` | Every change is rejected and T stays `failed` | Negative |
| TC-039a | FR-009 | Receiver A owns task T in `todo` | Receiver A cancels T | T is `cancelled` | Positive |
| TC-039b | FR-009 | Receiver A owns task T in `ongoing` | Receiver A cancels T | T is `cancelled` | Positive |
| TC-040 | FR-009 | Admin; task T assigned to Receiver A, in `todo` (repeat with `ongoing`) | The Admin cancels T | T is `cancelled` | Positive |
| TC-041 | FR-009, NFR-001 | Task T in `ongoing` is assigned to Receiver B | Receiver A sends a cancel request for T | The server rejects it and T stays `ongoing` | Security |
| TC-042 | FR-009 | Task T is `done` or `failed` | Its owner or an Admin tries to cancel T | The cancel is rejected and the status is unchanged, because terminal states have no allowed next status | Negative |
| TC-043 | FR-009, FR-007 | Task T is already `cancelled` | Its owner or an Admin tries to cancel T again | The cancel is rejected and T stays `cancelled` | Negative |
| TC-044 | FR-009, NFR-001 | An unauthenticated visitor | They send a cancel request for any task | The request is rejected and the status is unchanged | Security |
| TC-045 | FR-010 | Admin; task T assigned to Receiver A, in `ongoing` | The Admin reassigns T to Receiver B | T is assigned only to Receiver B and its status is `todo` | Positive |
| TC-046 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B | Receiver A tries to view T or change its status | Access is denied | Security |
| TC-047 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B | Receiver B opens their task list | T is listed with status `todo` | Positive |
| TC-048 | FR-010 | Admin; task T assigned to Receiver A is `done`, `cancelled` or `failed` | The Admin tries to reassign T to Receiver B | The reassignment is rejected. T stays assigned to Receiver A and keeps its terminal status | Negative |
| TC-049 | FR-010, NFR-001 | Receiver A owns task T | Receiver A sends a request to reassign T to Receiver B | The server rejects it and both the assignee and the status are unchanged | Security |
| TC-050 | FR-005 (monitor), FR-007 | Receiver A owns task T in `todo` | Receiver A changes T to `ongoing`, and the Admin then opens the task overview | The Admin sees T as `ongoing` | Positive |
| TC-051 | FR-011, NFR-001 | Task T is assigned to Receiver B | Receiver A submits a progress percentage for T | The server rejects it and T's progress is unchanged | Security |
| TC-052 | FR-011 | Receiver A owns task T in a terminal state | Receiver A records a progress percentage for T | The progress update is rejected. T's progress and status are unchanged | Negative |
| TC-053 | NFR-001 | Receiver A is logged in | They call every admin-only operation directly (create user, create/edit/reassign task, view all tasks) with a valid receiver session | Every call is rejected by the server | Security |
| TC-054 | NFR-001 | Receiver A owns task T in `ongoing` | They send a crafted request to set T to `todo` (e.g. a tampered hidden field or a replayed old request) | The server checks the transition table, rejects the request, and T stays `ongoing` | Security |
| TC-055 | NFR-002 | A user registered with password P | A tester inspects the stored credential in the database | The stored value is a bcrypt hash (it starts with `$2a$`, `$2b$` or `$2y$`), not P or a reversible encoding of P | Security |
| TC-056 | NFR-002 | Two users registered with the same password | A tester compares their stored credentials | The stored hashes differ, because each has its own salt | Security |
| TC-057 | NFR-002 | A logged-in user or Admin | They view user data through any page or response | No password or password hash appears in any response | Security |
| TC-058 | NFR-003 | A logged-in user | They submit a state-changing request with a valid CSRF token | The request is processed | Positive |
| TC-059 | NFR-003 | A logged-in user | They submit any state-changing request (create user, create/edit/reassign task, status change, cancel, progress update) with no CSRF token, or a wrong or expired one | The request is rejected and no state changes | Security |
| TC-060 | NFR-003 | A logged-in user's browser | A cross-origin page auto-submits a form to the app (CSRF attack) | The request is rejected and no state changes | Security |
| TC-063 | NFR-003 | A user logs in over HTTPS | A tester inspects the session cookie | The cookie has `HttpOnly`, `Secure`, and `SameSite` set to `Lax` or `Strict` | Security |
| TC-064 | NFR-003 | An attacker has a session ID that was set before the user logged in | The user logs in | A new session ID is issued, and the old one doesn't grant authenticated access (session fixation) | Security |
| TC-065 | FR-005 (monitor) | Tasks assigned to Receiver A and Receiver B in various statuses | The Admin opens the task overview | All tasks are listed, whoever they're assigned to, each with its current assignee and status | Positive |
| TC-066 | FR-005 (Task access), NFR-001 | Tasks assigned to Receiver A and Receiver B | Receiver A requests the Admin task overview directly | Access is denied and no tasks belonging to Receiver B are returned | Security |
| TC-067 | FR-008, FR-005 | Task T in `ongoing` with deadline D | The Admin moves the deadline to D2 before D passes. Then, at a point where D is at least one day in the past and D2 at least one day in the future, T is viewed | T is still `ongoing` | Positive |
| TC-068 | FR-005, FR-007 | Admin; task T is `failed` because its deadline passed | The Admin changes T's deadline to a future date | T stays `failed` because terminal states can't change *(whether the deadline value itself may be edited: see Q-06)* | Negative |
| TC-069 | FR-010 | Admin; task T assigned to Receiver A, in `todo` | The Admin reassigns T to Receiver B | T is assigned only to Receiver B and stays `todo` | Positive |
| TC-070 | FR-005 (set deadlines) | A logged-in Admin and an existing Receiver A | They create a task for Receiver A with a deadline D at least one day in the future | The task is created with deadline D, and D is shown on the task | Positive |
| TC-071 | FR-005 (set deadlines) | A logged-in Admin | They create a task with a malformed deadline value | Creation is rejected and no task is created | Negative |
| TC-072 | FR-005, FR-006, NFR-001 | Receiver A owns active task T | They send a request to change T's title or description directly to the server | The server rejects it and T's details are unchanged. Editing tasks is an Admin feature only | Security |
| TC-073 | FR-011 | Receiver A owns active task T | Receiver A records progress of 40% on T, then reopens T | T shows progress 40% | Positive |
| TC-074 | FR-011, FR-005 (view progress) | Receiver A has recorded 40% progress on task T | The Admin opens T or the task overview | The Admin sees 40% progress for T | Positive |
| TC-075 | FR-011, FR-006, NFR-001 | Receiver B has recorded progress on task T, which is assigned to Receiver B | Receiver A requests T's progress directly by ID | Access is denied and none of T's progress data is returned | Security |
| TC-076 | FR-010 | Admin; task T assigned to Receiver A, in `ongoing` | The Admin reassigns T to a user ID that doesn't exist | The reassignment is rejected. T stays assigned to Receiver A, and stays `ongoing` because there was no reset | Negative |
| TC-077 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B and is `todo` | Receiver B changes T to `ongoing` | T is `ongoing`, because the new receiver can now manage the task | Positive |
| TC-078 | FR-002 (RBAC) | An Admin account and a Receiver account | Each logs in | The Admin reaches the Admin interface (create users, create/assign/edit tasks, task overview). The Receiver reaches the Receiver interface (own tasks, status update, progress, cancel) and isn't offered Admin functions | Positive |
| TC-079 | FR-001 | A visitor without an account | They register normally and log in | The account is a Receiver: the user reaches the Receiver interface and Admin functions are denied | Positive |
| TC-080 | FR-002 | An account with email X exists; no account uses email Y | Someone logs in with email X and a wrong password, then with email Y and any password | Both attempts show exactly the same error message, so the response doesn't reveal whether the email exists | Security |
| TC-081 | FR-003 | A logged-in Admin | They create a new **Admin** with a name, an unused email and a password | The user is created, can log in, and reaches the Admin interface | Positive |
| TC-082 | FR-004 | A logged-in Admin | They create a task with no receiver | Creation is rejected and no task is created | Negative |
| TC-083 | FR-004 | A logged-in Admin and another Admin user | They create a task assigned to the other Admin (or to themselves) | Creation is rejected, because a task can only be assigned to a Receiver | Negative |
| TC-084 | FR-004, NFR-001 | A logged-in Admin | They send a crafted create-task request with a status other than `todo` (e.g. `ongoing` or `done`) | The task never starts in another status: either it's created as `todo` or the request is rejected | Security |
| TC-085 | FR-004 | A logged-in Admin and an existing Receiver A | They create a task for Receiver A with a deadline at least one day in the past | Creation is rejected and no task is created | Negative |
| TC-086 | FR-004 | A logged-in Admin and an existing Receiver A | They create a task for Receiver A with no deadline | Creation is rejected and no task is created | Negative |
| TC-087 | FR-010 | Admin; task T assigned to Receiver A, in `ongoing` | The Admin reassigns T to an Admin user | The reassignment is rejected. T stays assigned to Receiver A and stays `ongoing` | Negative |
| TC-088 | FR-010 | Admin; task T assigned to Receiver A is `done`, `cancelled` or `failed` | The Admin tries to reassign T to Receiver A again | The reassignment is rejected. T stays assigned to Receiver A and keeps its terminal status | Negative |
| TC-089 | FR-010, FR-011 | Receiver A recorded 60% progress on task T; the Admin then reassigns T to Receiver B | Receiver B opens T, and the Admin opens T | Both see 60% progress, because progress stays with the task. T's status is `todo` | Positive |
| TC-090 | FR-010, FR-011, NFR-001 | Receiver A recorded progress on task T, which was then reassigned to Receiver B | Receiver A requests T's progress directly by ID | Access is denied and none of T's progress data is returned | Security |
| TC-091 | FR-011 | Receiver A owns task T in `ongoing` | Receiver A records 100% progress on T | The progress is saved as 100% and T stays `ongoing`. Recording progress never changes the status | Negative |
| TC-092 | FR-011 | Receiver A owns task T in `todo` | Receiver A records 30% progress on T | The progress is saved as 30% and T stays `todo` | Negative |
| TC-093 | FR-011 | Receiver A owns active task T | Receiver A records 0%, then 100% | Both values are accepted and saved | Positive |
| TC-094 | FR-011 | Receiver A owns active task T with 40% progress | Receiver A records −1, 101, and a non-numeric value (one at a time) | Every value is rejected and T's progress stays 40% | Negative |
| TC-095 | NFR-003 | A logged-in user | They send a logout request with no CSRF token, or a wrong one | The logout is rejected and the session stays active | Security |
| TC-096 | FR-007 | Receiver A owns task T1 in `todo` and task T2 in `ongoing` | Receiver A changes T1 to `todo` and T2 to `ongoing` | Both changes are rejected, because a task can't be set to the status it already has. Both statuses are unchanged | Negative |
| TC-097 | FR-007 | Tasks in `done`, `cancelled` and `failed` | The owner or an Admin sets each task to the status it already has | Every change is rejected and the statuses are unchanged | Negative |
| TC-098 | FR-007, NFR-001 | Admin; task T1 in `todo` and task T2 in `ongoing`, both assigned to Receiver A | The Admin tries `todo → ongoing` and `todo → failed` on T1, and `ongoing → done` and `ongoing → failed` on T2 | Every change is rejected and the statuses are unchanged. The Admin's only direct status change is cancelling (TC-040) | Negative |

## Transition Coverage

All 25 current → next status pairs are covered, for receivers and for the Admin:

| From \ To | todo | ongoing | done | cancelled | failed |
|---|---|---|---|---|---|
| **todo** | ❌ TC-096, TC-097 | ✅ TC-027a, TC-077 · Admin ❌ TC-098 | ❌ TC-028a | ✅ TC-039a, TC-040 | ✅ TC-027c, TC-034a · Admin ❌ TC-098 |
| **ongoing** | ❌ TC-028b, TC-054 | ❌ TC-096 | ✅ TC-027b · Admin ❌ TC-098 | ✅ TC-039b, TC-040 | ✅ TC-027d, TC-034b · Admin ❌ TC-098 |
| **done** | ❌ TC-029, TC-032 | ❌ TC-029, TC-032 | ❌ TC-097 | ❌ TC-029, TC-042 | ❌ TC-029, TC-036 |
| **cancelled** | ❌ TC-030, TC-032 | ❌ TC-030, TC-032 | ❌ TC-030, TC-032 | ❌ TC-043, TC-097 | ❌ TC-030, TC-037 |
| **failed** | ❌ TC-031, TC-038 | ❌ TC-031, TC-032 | ❌ TC-031, TC-032 | ❌ TC-031, TC-042 | ❌ TC-097 |

✅ = allowed, ❌ = must be rejected. Unless a cell says "Admin", it refers to the receiver who owns the task. The automatic change to `failed` is tested in TC-034a and TC-034b.

The `todo → todo` cell lists TC-096 for receivers. TC-097 covers terminal statuses only.

## Coverage Summary

| Requirement | Test cases | Positive | Negative | Security |
|---|---|---|---|---|
| FR-001 | TC-001 to 004, 079 | 2 | 2 | 1 |
| FR-002 | TC-005 to 010, 078, 080 | 3 | 2 | 3 |
| FR-003 | TC-011 to 014, 081 | 2 | 1 | 2 |
| FR-004 | TC-015 to 018, 082 to 086 | 1 | 6 | 2 |
| FR-005 / Task access | TC-019 to 022, 050, 065, 066, 068, 070 to 072 | 5 | 3 | 3 |
| FR-006 | TC-023 to 026 (+046, 047, 072, 075, 077) | 2 | 0 | 2 |
| FR-007 | TC-027a to 033, 096 to 098 (+038, 054) | 4 | 9 | 1 |
| FR-008 | TC-034a to 038, 067 | 3 | 4 | 0 |
| FR-009 | TC-039a to 044 | 3 | 2 | 2 |
| FR-010 | TC-045 to 049, 069, 076, 077, 087 to 090 | 5 | 4 | 3 |
| FR-011 | TC-051, 052, 073 to 075, 091 to 094 | 3 | 4 | 2 |
| NFR-001 | TC-053, 054 (+ every "Security" test above that cites it) | — | — | 2+ |
| NFR-002 | TC-055 to 057 | — | — | 3 |
| NFR-003 | TC-058 to 060, 063, 064, 095 | 1 | 0 | 5 |
| **Total** | **102** | **34** | **37** | **31** |

## README Traceability

| README feature / rule | Test cases |
|---|---|
| User registration and login | TC-001 to 010, 079, 080 |
| Role-based access control (Admin/Sender and Receiver) | TC-004, 013, 018, 053, 066, 078, 079, 081 |
| Admin — Create new users | TC-011 to 014, 081 |
| Admin — Create and assign tasks to individual users | TC-015 to 018, 082 to 086 |
| Admin — Edit existing tasks | TC-019, 021, 022, 072 |
| Admin — Set and modify task deadlines | TC-020, 021, 067, 068, 070, 071, 085, 086 |
| Admin — Manage task access and assignments | TC-045 to 049, 069, 076, 077, 087 to 090 |
| Admin — View task status and progress | TC-050, 065, 074, 089 |
| Receiver — View assigned tasks | TC-023 to 025 |
| Receiver — Update task status | TC-026 to 033, 054, 096 |
| Receiver — Track and report task progress | TC-051, 052, 073, 075, 091 to 094 |
| Receiver — Cancel assigned tasks | TC-039a, 039b, 041 to 044 |
| Five task statuses and the transition table | TC-027a to 033, 096 to 098; transition grid |
| Terminal states can't change | TC-029 to 032, 038, 042, 043, 048, 068, 088, 097 |
| Deadline auto-fail | TC-034a to 038, 067 |
| Cancellation by receiver and Admin | TC-039a to 044 |
| Reassignment resets the status to `todo` | TC-045, 047, 069, 089 |
| One receiver at a time | TC-016, 045, 046, 082, 083 |
| Receivers only view and manage their own tasks | TC-023 to 026, 041, 046, 051, 072, 075, 090 |
| Admins create, edit, assign and monitor tasks | TC-015, 019, 045, 065 |
| Enforcement on the server | TC-053, 054 and every Security test |
| Implementation independence | Whole suite (technology-agnostic) |

## Remaining Open Questions

| ID | Req | Concern |
|---|---|---|
| Q-06 | FR-005 | Only task *creation* with a past deadline is settled (rejected, TC-085). Still open: can an Admin edit the details or deadline of a terminal task (TC-068)? Can an Admin *edit* a deadline into the past, or remove it? |
| Q-12 | FR-010 | Reassigning a terminal task is settled (rejected, TC-048, TC-088). Still open: what should happen when an **active** task is "reassigned" to the receiver it already has? The rule only covers "another receiver". |
| Q-26 | General | It isn't stated how an "equivalent" result is judged between the two implementations where the requirements leave details open (e.g. error wording, status codes). |
| Q-28 | FR-001, FR-003 | **New.** It isn't stated whether email uniqueness ignores letter case (e.g. `Ana@x.com` vs `ana@x.com`). |
