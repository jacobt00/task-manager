# Task Manager — Automated Specification-Based Tests

Automated tests for the 111 test cases in
[`task-manager-test-cases-final.md`](task-manager-test-cases-final.md).
They were written from the requirements only, without access to any
implementation, so the same suite can be run against every implementation
and the results compared.

## How it works

The tests never talk to an implementation directly. They call a small
**driver** interface (`src/driver.ts`) with operations taken from the
requirements, such as *log in*, *create task*, *change status* and
*view task*. For each implementation you write an **adapter** that performs
those operations against that app (URLs, form fields, CSRF tokens, reading
pages). The tests stay identical for every implementation; only the adapter
changes.

Tests check only **observable results**, meaning what a user can see after an
action. They never compare error messages or HTTP status codes between
implementations (decision Q-26).

```
task-manager-tests/
├── task-manager-test-cases-final.md   the test case specification
├── playwright.config.ts
├── src/
│   ├── driver.ts      the driver interface each adapter implements
│   ├── session.ts     per-user HTTP session that records cookies and responses
│   ├── fixtures.ts    shared test setup (Admin session, new users, new tasks)
│   └── data.ts        unique test data and date helpers
├── adapters/
│   └── template.ts    starting point for an adapter
└── tests/             one spec file per requirement
    ├── FR-001.spec.ts … FR-011.spec.ts
    └── NFR-001.spec.ts … NFR-003.spec.ts
```

Every test title starts with its test ID (e.g. `TC-045 …`), and each test is
in the spec file of its primary requirement, as listed in the coverage summary
of the specification.

## Requirements

- Node.js 18 or later
- A running instance of the implementation under test, with an empty or
  disposable database
- One existing **Admin** account in that instance
- An adapter for that implementation (see [Writing an adapter](#writing-an-adapter))

## Installation

```bash
cd task-manager-tests
npm install
npx playwright install chromium   # only TC-060 uses a browser
```

## Configuration

| Variable | Required | Meaning |
|---|---|---|
| `BASE_URL` | yes | Address of the implementation under test, e.g. `http://localhost:8080` |
| `ADMIN_EMAIL` | yes | Email of an existing Admin account |
| `ADMIN_PASSWORD` | yes | Password of that account |
| `TM_ADAPTER` | yes | Path to the adapter file, e.g. `adapters/implementation-a.ts` |
| `AUTOFAIL_TIMEOUT_MS` | no | How long FR-008 tests wait for an overdue task to show as `failed` (default `60000`) |

## Running the tests

```bash
export BASE_URL=http://localhost:8080
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD='…'
export TM_ADAPTER=adapters/implementation-a.ts

npm test                          # everything; the rate-limit test runs last
npm run test:main                 # everything except the rate-limit test
npm run test:rate-limit           # only TC-061
npx playwright test tests/FR-007.spec.ts   # one requirement
npx playwright test -g "TC-045"            # one test case
npm run report                    # open the HTML report of the last run
npm run typecheck                 # type-check the tests and adapters
```

To compare implementations, run the suite once per implementation, changing
`BASE_URL`, `TM_ADAPTER` and the Admin credentials, then compare the reports.

### Reading the results

- **Passed:** the observable result matched the test case.
- **Failed:** it didn't. The failing step and the expected value are shown in the report.
- **Skipped:** the test couldn't run with the current setup. The reason is
  shown next to the test. As agreed for *Unspecified* results, a skipped test
  counts as neither pass nor fail.

A failure that mentions **"precondition"** means the test couldn't set up its
starting state (for example, the Admin couldn't create a user). Fix that first,
because it says nothing about the requirement being tested.

### Test independence and test data

Every test creates its own users and tasks, with unique emails and titles,
and doesn't depend on any other test or on the order tests run in. Tests run
in parallel. The suite doesn't delete what it creates, so run it against a
disposable database.

### Rate limiting (TC-061)

TC-061 deliberately makes 20 failed logins in a row and expects the next login
from the same client to be blocked. The test doesn't assume how long the block
lasts. Because all tests come from the same client, that block can affect every
later login. For that reason:

- TC-061 is tagged `@rate-limit` and runs in its own Playwright project, after
  all other tests.
- **Restart the implementation (or reset its rate limiter) before running the
  suite again**, otherwise the next run's logins may be blocked.

The rest of the suite makes about 10 failed logins in total, spread among many
successful ones, so it shouldn't trigger the limit. Registration isn't rate-limit
tested (decision Q-17).

## Writing an adapter

1. Copy `adapters/template.ts` to a new file, e.g. `adapters/implementation-a.ts`.
2. Implement every method of `TaskManagerDriver` (documented in `src/driver.ts`).
3. Set `TM_ADAPTER` to the new file and run `npm run typecheck`.

Rules an adapter must follow, so results stay comparable:

- **Send every request through `session.fetch()`.** Each `Session` has its own
  cookie jar and records every response, which TC-057, TC-063 and TC-064 inspect.
- **Perform actions as direct requests to the server**, the same requests the
  UI would send. Don't rely on the UI hiding a button: the tests check that the
  server enforces each rule (NFR-001).
- **Never throw because the app rejected an action.** Just return; the tests
  check the resulting state. Throw only for infrastructure problems.
- **Send the CSRF token by default.** Honour `options.csrf`: `'missing'` leaves
  the token out and `'invalid'` sends a value the app never issued.
- **Send inputs exactly as given**, including missing fields, extra fields,
  invalid statuses, invalid percentages and malformed dates. Several negative
  tests depend on this.
- **Report only what a user can observe.** `viewTask`, `listMyTasks` and
  `listAllTasks` return `null` when access is denied. Dates are normalised to
  `YYYY-MM-DD`, and statuses to the five lower-case names.
- `viewTask` must request the task **directly by its reference**, as a user
  typing the task's URL would, not by searching the user's list.
- `userRef` must find **any** user by email, including Admins (TC-083, TC-087).
- `availableFeatures` reports which functions the logged-in user's interface
  offers (TC-004, TC-011, TC-078, TC-079, TC-081).
- `forgedCancelRequest` describes the plain HTML form a malicious site would
  use to cancel a task, without a CSRF token (TC-060).
- Set `sessionCookieName` to the name of the cookie that holds the session ID
  (TC-063, TC-064).

### Optional test-data hooks

These two hooks need direct access to the implementation's data store, so they
are optional. Tests that need a hook are skipped, with a reason, when it's missing.

| Hook | Purpose | Tests that need it |
|---|---|---|
| `storedPasswordHash(email)` | Returns the stored password credential for a user | TC-055, TC-056 (TC-057 also checks the hash when available) |
| `forceDeadline(task, date)` | Sets a task's deadline in the past, bypassing the app's validation | TC-034a, TC-034b, TC-036, TC-037, TC-038 |

## What isn't automated or is only partly automated

| Test | Status | Why |
|---|---|---|
| TC-067 | **Not automated** (always skipped) | The original deadline must pass in real time while the new one is still ahead. That needs control of the server clock, which a black-box suite doesn't have. Run it manually. |
| TC-034a, TC-034b, TC-036, TC-037, TC-038 | Automated, **skipped without `forceDeadline`** | The app rejects past deadlines, so an overdue task can only be prepared as test data. |
| TC-055, TC-056 | Automated, **skipped without `storedPasswordHash`** | The stored credential is only visible in the data store. |
| TC-002, TC-012 | Partly automated | When the **email** is missing, the attempted account has nothing to look it up by. For that sub-case, TC-002 checks only that the visitor isn't logged in, and TC-012 sends the request but can't check anything afterwards. The name and password cases are fully checked. |
| TC-006 | Partly automated | That the message is *generic* is checked by comparing it with the unknown-email message (TC-080), not by judging its wording. |
| TC-057 | Partly automated | "Any response" is checked over every response the test receives while visiting the pages that show user data. It can't prove that no other page leaks a password. |
| TC-063 | Automated | The `Secure` flag is checked only when `BASE_URL` uses HTTPS. Over HTTP it isn't required (decision Q-19), and a note is added to the result. |
