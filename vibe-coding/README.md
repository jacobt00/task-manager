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
