# Task Manager starter

A runnable foundation using Node.js, Express, Mongoose, Handlebars, HTML, CSS, and JavaScript.

## Requirements
- Node.js 20+
- A running local MongoDB server, or a MongoDB Atlas connection string

## Setup
```bash
npm install
cp .env.example .env   # On Windows PowerShell: Copy-Item .env.example .env
npm run dev
```
Open http://localhost:3000. Edit `.env` to set `MONGODB_URI` and `PORT` as needed. The app intentionally connects to MongoDB **before** listening, so startup fails clearly if the database is unavailable. `/health` returns `{ "status": "ok" }` when the server is running.

## Structure
- `src/app.js`: Express configuration and startup
- `src/config/database.js`: Mongoose connection
- `src/routes/index.js`: initial routes
- `src/controllers/`, `src/models/`, `src/middleware/`: reserved for later features
- `views/`: Handlebars layouts, partials, and pages
- `public/`: static CSS and JavaScript

## Scope
This stage provides a polished landing page, basic error pages, and a working MongoDB connection. It does **not** implement registration, login, authorization, task CRUD, or dashboards yet. The role cards are previews, not functional controls. Before deploying, add session handling, CSRF protection for forms, validation, rate limiting, and a strict Content Security Policy.
