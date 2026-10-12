"""Bridge between the SDD adapter (adapters/sdd.ts) and the SDD Task Manager.

The SDD implementation (./TaskManager) is a desktop/CLI application with no
HTTP server. Its interfaces (gui.py, cli.py) only call the service layer
(auth.py, admin.py, receiver.py), which is where it enforces every rule. This
bridge builds those services exactly as cli.build_app() does and maps each
request to one service call, the way the CLI's menu actions do. It adds no
rules of its own.

Protocol: one JSON object per line on stdin, {"id", "op", "args"}; one JSON
object per line on stdout, {"id", "ok", "result"} or {"id", "ok": false,
"error", "kind"}. "kind" is "rejected" when the application raised an error,
"infrastructure" for SQLite operational errors.

Usage: python3 sdd_bridge.py APP_DIR DB_PATH
"""

from __future__ import annotations

import json
import sqlite3
import sys

APP_DIR, DB_PATH = sys.argv[1], sys.argv[2]
sys.path.insert(0, APP_DIR)

import cli  # noqa: E402  (the application's own CLI module, for build_app/parse_deadline/menu_items)

app = cli.build_app(DB_PATH)
auth, admin, receiver = app.auth, app.admin, app.receiver


def actor(token):
    """The user a session token represents, as every CLI/GUI action does first."""
    if not token:
        raise cli.InvalidSessionError()
    return auth.authenticate(token)


def deadline(text):
    """Parses a deadline with the CLI's own parser ("YYYY-MM-DD HH:MM", local time)."""
    return cli.parse_deadline(text)


def names(user):
    """user id -> name shown in the 'Assigned to' column, as cli.App.names() does."""
    return app.names(user)


def task_view(task, shown):
    return {
        "ref": task.id,
        "title": task.title,
        "description": task.description,
        "deadline": cli.fmt_dt(task.deadline),  # local time, as the CLI shows it
        "status": task.status.value,
        "assignee": shown.get(task.assigned_user_id),
    }


def op_register(a):
    auth.register(a["username"], a["password"], a["email"], a["role"])


def op_login(a):
    return auth.login(a["username"], a["password"])


def op_logout(a):
    auth.logout(a["token"])


def op_whoami(a):
    user = actor(a["token"])
    return {"id": user.id, "role": user.role.value}


def op_menu(a):
    return [label for label, _ in app.menu_items(actor(a["token"]))]


def op_create_user(a):
    admin.create_user(actor(a["token"]), a["username"], a["password"], a["email"], a["role"])


def op_list_users(a):
    # Only the columns the Users dialog shows, plus the id the dialogs select by.
    return [
        {"id": u.id, "username": u.username, "email": u.email, "role": u.role.value}
        for u in admin.list_users(actor(a["token"]))
    ]


def op_list_tasks(a):
    user = actor(a["token"])
    tasks = receiver.list_tasks(user)
    shown = names(user)
    return [task_view(t, shown) for t in tasks]


def op_create_task(a):
    admin.create_task(actor(a["token"]), a["title"], a["description"], deadline(a["deadline"]), a["user_id"])


def op_edit_task(a):
    admin.edit_task(
        actor(a["token"]),
        a["task_id"],
        title=a.get("title"),
        description=a.get("description"),
        deadline=deadline(a["deadline"]) if a.get("deadline") is not None else None,
    )


def op_reassign(a):
    admin.reassign_task(actor(a["token"]), a["task_id"], a["user_id"])


def op_update_status(a):
    receiver.update_status(actor(a["token"]), a["task_id"], a["status"])


def op_cancel(a):
    receiver.cancel(actor(a["token"]), a["task_id"])


# --- optional test-data hooks: direct database access ---------------------

def op_stored_password_hash(a):
    row = app.auth._users._conn.execute(
        "SELECT password_hash FROM users WHERE username = ?", (a["username"],)
    ).fetchone()
    return row["password_hash"] if row else None


def op_force_deadline(a):
    conn = app.auth._users._conn
    with conn:
        # The model refuses to load a task whose deadline is not after its
        # assignment_date, so an overdue task must also have been assigned
        # before its deadline, as any real overdue task was.
        conn.execute(
            "UPDATE tasks SET deadline = ?, assignment_date = MIN(assignment_date, ?) WHERE id = ?",
            (a["deadline"], a["assigned_before"], a["task_id"]),
        )


OPS = {name[3:]: fn for name, fn in globals().items() if name.startswith("op_")}


def main():
    for line in sys.stdin:
        if not line.strip():
            continue
        request = json.loads(line)
        try:
            result = OPS[request["op"]](request.get("args", {}))
            response = {"id": request["id"], "ok": True, "result": result}
        except sqlite3.OperationalError as exc:
            response = {"id": request["id"], "ok": False, "kind": "infrastructure", "error": str(exc)}
        except Exception as exc:  # the application rejected the request (or failed while handling it)
            response = {
                "id": request["id"], "ok": False, "kind": "rejected",
                "error": cli.describe(exc) or type(exc).__name__,
                "type": type(exc).__name__,
            }
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
