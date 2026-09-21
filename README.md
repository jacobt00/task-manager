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