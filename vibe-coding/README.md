# TaskFlow — Authentication starter

Node.js 20+, Express, MongoDB/Mongoose, Handlebars.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env`, set a strong random `SESSION_SECRET` (32+ characters), and configure `MONGODB_URI`.
3. Ensure MongoDB is running, then `npm run dev`.
4. Visit http://localhost:3000/register. Public registration always creates a Receiver.
5. To create the first Admin, run `npm run create-admin` locally (password input is visible in terminal; use a private terminal). Existing accounts are never promoted by this script.

## Routes

- `GET/POST /register`, `GET/POST /login`, `POST /logout`
- `/dashboard` redirects by role
- `/receiver/dashboard` requires Receiver; `/admin/dashboard`, `/admin/users/new`, `POST /admin/users` require Admin

Passwords use bcrypt (cost 12). Sessions live in MongoDB, rotate on login/registration, have HTTP-only SameSite=Lax cookies, and are HTTPS-only in production. POST requests use per-session CSRF tokens. Login and registration are rate-limited. Production requires HTTPS and correct `TRUST_PROXY=1` only behind a trusted reverse proxy. Do not expose the admin bootstrap command publicly. Task management is a future phase.

## Admin task management

Admins can create tasks at `/admin/tasks/new`, view all tasks at `/admin/tasks`, and edit individual tasks. The admin dashboard shows task totals. New tasks always start as `todo`; admins may later change status to `in_progress` or `done`. Each task stores a title, description, UTC calendar-date deadline, receiver reference, creator reference, status and timestamps. Only existing users with the `receiver` role may be assigned. All `/admin/tasks` routes are protected by `requireAdmin` and all writes use the existing CSRF protection. The receiver dashboard is unchanged; receiver task interactions are a later phase.

## Task lifecycle (v1.2)

Statuses: `todo`, `ongoing`, `done`, `cancelled`, `failed`. Allowed transitions: `todo → ongoing/cancelled/failed`, `ongoing → done/cancelled/failed`. `done`, `cancelled`, `failed` are terminal. Failed is set automatically when the UTC date-only deadline has passed (on task/dashboard reads and before task writes); the service's atomic database filter also prevents a late active transition. There is no background worker: an overdue record is updated at the next relevant request. New or edited active tasks cannot use a past deadline. Reassigning an active task resets it to `todo`; terminal tasks cannot be reassigned. Both admins and the assigned receiver can cancel active tasks. All writes use server-side role/assignment checks and CSRF protection. Existing legacy `in_progress` tasks should be migrated once with `db.tasks.updateMany({status:'in_progress'}, {$set:{status:'ongoing'}})` before deploying the updated model.
