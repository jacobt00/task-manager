# task-manager
Software construction course project - Task Manager (Vibe Coding vs SDD)

The project explores and compares two AI-assisted software development
approaches by developing the same Task Manager idea using:

- Vibe Coding
- Specification-Driven Development (SDD)

The development process, prompts, specifications, testing, verification,
and observations are documented throughout the project.

## Repository Structure

- `vibe-coding/` – Vibe Coding implementation
- `sdd/` – Specification-Driven Development implementation
- `verification/` – Testing and verification
- `docs/vibe-coding/` – Vibe Coding prompts and observations
- `docs/sdd/` – SDD documentation
- `docs/verification/` – Verification and test documentation

## Branches

The repository uses four main branches:

- `main` – Shared and reviewed project state
- `vibe-coding` – Vibe Coding development
- `sdd` – Specification-Driven Development
- `verification` – Testing and verification

Development should be performed on the corresponding working branch.
Changes are merged into `main` through Pull Requests after review.

Direct development on `main` should be avoided.

## Git Workflow

Before starting work, make sure your branch is up to date with `main`.

Commit changes regularly using descriptive commit messages, for example:

- `feat: add task creation`
- `fix: correct task validation`
- `test: add authentication tests`
- `docs: document vibe coding prompt`
- `chore: update project configuration`

When a set of changes is ready, push the working branch and create a
Pull Request to `main` for review.

## Core Features

## Authentication

- User registration and login.

- Role-based access control (Admin/Sender and Receiver).

## Admin / Sender Interface

- Create new users.

- Create and assign tasks to individual users.

- Edit existing tasks.

- Set and modify task deadlines.

- Manage task access and assignments.

- View task status and progress.

## Receiver Interface

- View assigned tasks.

- Update task status.

- Track and report task progress.

- Cancel assigned tasks.


## Task Status and Business Rules

Both implementations should follow the same functional requirements and business rules.

### Task Statuses

The application uses five task statuses:

- `todo`
- `ongoing`
- `done`
- `cancelled`
- `failed`

Allowed status transitions:

| Current status | Allowed next statuses |
|---|---|
| `todo` | `ongoing`, `cancelled`, `failed` |
| `ongoing` | `done`, `cancelled`, `failed` |
| `done` | None |
| `cancelled` | None |
| `failed` | None |

`done`, `cancelled`, and `failed` are terminal states. Tasks in these states cannot transition to another status.

### Deadline Handling

If a task's deadline has passed and the task is not already in a terminal state, its status should automatically change to `failed`.

### Cancellation

Both the assigned receiver and an administrator can cancel an active task.

### Task Reassignment

When an administrator reassigns an existing task to another receiver, its status resets to `todo`.

### Task Access

- Each task is assigned to one receiver at a time.
- Receivers can only view and manage tasks assigned to them.
- Administrators can create, edit, assign and monitor tasks.
- Authorization and status transition rules must be enforced server-side.

### Implementation Independence

Both implementations should provide equivalent functionality but may use different technologies, architectures and development approaches.

The Vibe Coding implementation uses Node.js, Express, MongoDB and Handlebars. The SDD implementation may use a different technology stack.

The shared functional requirements serve as the basis for verification and comparison.