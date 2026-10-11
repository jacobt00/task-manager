# Task Manager: Specification-Based Test Cases

**Assumptions used throughout**
- "Rejected" means the action has no effect on stored data and the user gets an error or access-denied response. The requirements don't name status codes or error messages, so the tests don't either.
- **Roles:** *Admin*, *Receiver A* and *Receiver B*.
- **Statuses:** *Active* means any non-terminal status. *Terminal* means `done`, `cancelled` or `failed`.

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
| TC-015 | FR-004 | A logged-in Admin and an existing Receiver A | They create a task assigned to Receiver A | The task is created, assigned only to Receiver A, and appears in Receiver A's task list | Positive |
| TC-016 | FR-004 | A logged-in Admin | They create a task assigned to two receivers (e.g. a crafted request with two receiver IDs) | The request is rejected, or the task ends up with exactly one receiver. It never has two | Negative |
| TC-017 | FR-004 | A logged-in Admin | They create a task assigned to a user ID that doesn't exist | Creation is rejected | Negative |
| TC-018 | FR-004, NFR-001 | A logged-in Receiver A | They send a create-task request directly to the server | The server rejects it and no task is created | Security |
| TC-019 | FR-005 | An Admin and an existing active task | They edit the task's details and save | The changes are stored and shown to the assigned receiver | Positive |
| TC-020 | FR-005 | An Admin and an active task with deadline D | They change the deadline to a later date D2 | The deadline is stored as D2 | Positive |
| TC-021 | FR-005 | An Admin and an existing task | They submit an invalid deadline value (malformed date) | The edit is rejected and the original deadline stays | Negative |
| TC-022 | FR-005, NFR-001 | Receiver A, who owns task T | They send an edit request for T's deadline or details directly to the server | The server rejects it and T is unchanged | Security |
| TC-023 | FR-006 | Receiver A has tasks T1 and T2; Receiver B has T3 | Receiver A opens their task list | Only T1 and T2 are listed | Positive |
| TC-024 | FR-006 | Receiver A has no tasks assigned | Receiver A opens their task list | The list is empty and shows no other user's tasks | Positive |
| TC-025 | FR-006, NFR-001 | T3 is assigned to Receiver B | Receiver A requests T3 directly by ID (URL/ID tampering) | Access is denied and none of T3's data is returned | Security |
| TC-026 | FR-006, NFR-001 | T3 is assigned to Receiver B | Receiver A sends a status-update request for T3 | The server rejects it and T3's status is unchanged | Security |
| TC-027 | FR-007 | Receiver A owns task T in a status where a transition to S is allowed by the table | Receiver A changes T to S | The status changes to S | Positive |
| TC-028 | FR-007 | Receiver A owns task T in a status where a transition to S is *not* allowed | Receiver A tries to change T to S | The change is rejected and the status stays the same | Negative |
| TC-029 | FR-007 | Task T is `done` | Its owner tries to change T to any other status | The change is rejected and T stays `done` | Negative |
| TC-030 | FR-007 | Task T is `cancelled` | Its owner tries to change T to any other status | The change is rejected and T stays `cancelled` | Negative |
| TC-031 | FR-007 | Task T is `failed` | Its owner tries to change T to any other status | The change is rejected and T stays `failed` | Negative |
| TC-032 | FR-007 | Task T is in a terminal state | An **Admin** tries to change T's status | The change is rejected and the terminal state holds for every role *(see Q-07)* | Negative |
| TC-033 | FR-007, NFR-001 | Receiver A owns active task T | They send a crafted request with an invalid target status or a made-up status value, bypassing the UI | The server rejects it and the status is unchanged | Security |
| TC-034 | FR-008 | Active task T has a deadline in the past | The deadline passes *(see Q-09)* | T's status becomes `failed` automatically, with no user action | Positive |
| TC-035 | FR-008 | Active task T has a deadline in the future | The status is checked before the deadline | T keeps its current status and is not marked `failed` | Negative |
| TC-036 | FR-008 | Task T is `done` and its deadline has since passed | The status is checked after the deadline | T stays `done` and doesn't become `failed` | Negative |
| TC-037 | FR-008 | Task T is `cancelled` and its deadline has since passed | The status is checked after the deadline | T stays `cancelled` | Negative |
| TC-038 | FR-008, FR-007 | Task T was auto-set to `failed` | Its owner tries to move T to any status | The change is rejected and T stays `failed` | Negative |
| TC-039 | FR-009 | Receiver A owns active task T | Receiver A cancels T | T becomes `cancelled` | Positive |
| TC-040 | FR-009 | Admin; active task T assigned to Receiver A | The Admin cancels T | T becomes `cancelled` | Positive |
| TC-041 | FR-009, NFR-001 | Active task T is assigned to Receiver B | Receiver A sends a cancel request for T | The server rejects it and T's status is unchanged | Security |
| TC-042 | FR-009 | Task T is `done` or `failed` | Its owner or an Admin tries to cancel T | The cancel is rejected and the status is unchanged | Negative |
| TC-043 | FR-009 | Task T is already `cancelled` | Someone tries to cancel T again | It is rejected or has no effect, and T stays `cancelled` | Negative |
| TC-044 | FR-009, NFR-001 | An unauthenticated visitor | They send a cancel request for any task | The request is rejected and the status is unchanged | Security |
| TC-045 | FR-010 | Admin; task T assigned to Receiver A with a status other than `todo` | The Admin reassigns T to Receiver B | T is assigned to Receiver B and its status is `todo` | Positive |
| TC-046 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B | Receiver A tries to view or update T | Access is denied | Security |
| TC-047 | FR-010, FR-006 | T was reassigned from Receiver A to Receiver B | Receiver B opens their task list | T is listed with status `todo` | Positive |
| TC-048 | FR-010 | Admin; task T is in a terminal state | The Admin tries to reassign T | Reassigning must not reset T to `todo`, because terminal states can't change (FR-007). The reassignment is rejected, or the status stays terminal *(see Q-12)* | Negative |
| TC-049 | FR-010, NFR-001 | Receiver A owns task T | Receiver A sends a request to reassign T to Receiver B | The server rejects it and both the assignee and the status are unchanged | Security |
| TC-050 | FR-011 | Receiver A owns active task T | Receiver A reports progress on T | The progress is saved and visible on T, to the Admin and to Receiver A | Positive |
| TC-051 | FR-011, NFR-001 | Task T is assigned to Receiver B | Receiver A submits a progress report for T | The server rejects it and nothing is recorded | Security |
| TC-052 | FR-011 | Receiver A owns task T in a terminal state | Receiver A tries to report progress | The status must not change. Whether a progress note is accepted is unspecified *(see Q-14)* | Negative |
| TC-053 | NFR-001 | Receiver A is logged in | They call every admin-only operation directly (create user, create/edit/reassign task) with a valid receiver session | Every call is rejected by the server | Security |
| TC-054 | NFR-001 | Receiver A owns active task T | They submit a status change that's allowed in the UI but invalid for T's current state, using a tampered hidden field or a replayed old request | The server checks the transition table and rejects the request | Security |
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

## Coverage Summary

| Requirement | Test cases | Positive | Negative | Security |
|---|---|---|---|---|
| FR-001 | TC-001 to 004 | 1 | 2 | 1 |
| FR-002 | TC-005 to 010 | 2 | 2 | 2 |
| FR-003 | TC-011 to 014 | 1 | 1 | 2 |
| FR-004 | TC-015 to 018 | 1 | 2 | 1 |
| FR-005 | TC-019 to 022 | 2 | 1 | 1 |
| FR-006 | TC-023 to 026 (+046, 047) | 2 | 0 | 2 |
| FR-007 | TC-027 to 033 (+038) | 1 | 5 | 1 |
| FR-008 | TC-034 to 038 | 1 | 4 | 0 |
| FR-009 | TC-039 to 044 | 2 | 2 | 2 |
| FR-010 | TC-045 to 049 | 2 | 1 | 2 |
| FR-011 | TC-050 to 052 | 1 | 1 | 1 |
| NFR-001 | TC-053, 054 (+ every "Security" test above that cites it) | — | — | 2+ |
| NFR-002 | TC-055 to 057 | — | — | 3 |
| NFR-003 | TC-058 to 064 | 1 | 1 | 5 |

## Ambiguities and Open Questions

| ID | Req | Concern |
|---|---|---|
| Q-01 | FR-001 | The required fields, the unique identifier (username or email), and any password policy aren't specified, so tests can't cover password-strength rules. |
| Q-02 | FR-001 | The role given to a self-registered user isn't stated. Is it always Receiver? |
| Q-03 | FR-002 | It isn't stated whether login errors should hide whether the account exists (user enumeration). |
| Q-04 | FR-003 | It isn't stated whether an Admin can create other Admins, or only Receivers. |
| Q-05 | FR-004 | The initial status of a new task isn't stated. FR-010 suggests `todo`, but that's an inference. It also isn't stated whether a task can be created without a receiver, or assigned to an Admin. |
| Q-06 | FR-005 | It isn't stated whether a task in a terminal state can still be edited. It also isn't stated whether a deadline can be set in the past, and if so, whether the task becomes `failed` at once. A related question: if an Admin extends the deadline of a `failed` task, does it stay `failed`? |
| Q-07 | FR-007 | The **transition table itself isn't provided**, so TC-027 and TC-028 can't be turned into concrete status pairs. The full status list (apart from `todo`, `done`, `cancelled` and `failed`) is also unknown. It isn't stated whether Admins follow the same transition rules. |
| Q-08 | FR-007 | It isn't stated whether a receiver can set `done` directly, or whether only `failed` is system-only. Can a user set `failed` manually? |
| Q-09 | FR-008 | It isn't stated how the failure is triggered (a scheduled job, or a check when the task is accessed) or how quickly it happens. That decides when a test should check the status. |
| Q-10 | FR-008 | The boundary isn't defined: is a task failed *at* the deadline or only after it? The timezone used and the deadline's precision (date only or date and time) aren't stated either. |
| Q-11 | FR-009 | "Active" isn't defined. It's assumed to mean any non-terminal status. |
| Q-12 | FR-010 | It isn't stated who may reassign; it's assumed to be Admin only (FR-005). Reassigning a terminal task conflicts with FR-007's rule that terminal states can't change. It also isn't stated whether reassigning to the *same* receiver resets the status. |
| Q-13 | FR-010 | It isn't stated what happens to the previous receiver's progress reports after a reassignment. |
| Q-14 | FR-011 | "Track and report progress" isn't defined: it could mean a percentage, free-text notes or a status change. It isn't stated whether progress can be reported on terminal tasks, or who can see the reports. |
| Q-15 | NFR-001 | "Status rules" aren't defined beyond FR-007 and FR-008. |
| Q-16 | NFR-002 | "Secure hash" doesn't name an algorithm (for example bcrypt, Argon2 or PBKDF2), and doesn't say whether salting is required. TC-056 assumes salting. |
| Q-17 | NFR-003 | The rate-limit threshold, time window, lockout length and scope (per IP, per account or both) aren't specified, and it isn't stated which endpoints have limits (login only, or registration too). |
| Q-18 | NFR-003 | It isn't stated whether logout and other GET-based actions need CSRF protection. |
| Q-19 | NFR-003 | "Secure sessions" isn't defined: cookie attributes, idle and absolute timeouts, and session regeneration after login aren't specified. TC-063 and TC-064 apply common practice, which may need confirming. |
| Q-20 | General | It isn't stated whether a deleted or deactivated user exists, what happens to that user's tasks, or whether their sessions are revoked. No test is written for this because the behaviour isn't specified. |

**Next step:** once the transition table (Q-07) is provided, TC-027 and TC-028 should become one test for every allowed pair and one for every disallowed pair.
