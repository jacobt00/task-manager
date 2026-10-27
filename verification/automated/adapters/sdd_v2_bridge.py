"""Bridge between the SDD v2 adapter (adapters/sdd-v2.ts) and Taskmanager_SDD.

The v2 SDD implementation is a PySide6 desktop application with no HTTP server.
Its GUI controller (app/gui/app_controller.py) calls the service layer
(app/services/*.py), which enforces roles and validation. This bridge performs
each request the way the controller's handler for that GUI action does (the
same service call, with the same input conversion) and adds no rules.

One desktop app instance has one AuthenticationService, i.e. one logged-in
identity. Each test Session is therefore given its own "client": its own
AuthenticationService, TaskManagementService and UserManagementService, built
exactly as AppController.__init__ builds them, all sharing one database.

Protocol: one JSON object per line on stdin {"id", "op", "args"}; one JSON
object per line on stdout {"id", "ok", "result"} or
{"id", "ok": false, "kind": "rejected"|"infrastructure", "error"}.

Usage: python sdd_v2_bridge.py APP_DIR DB_PATH
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import datetime

APP_DIR, DB_PATH = sys.argv[1], sys.argv[2]
sys.path.insert(0, APP_DIR)
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

import sqlalchemy.exc  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.database.connection import (  # noqa: E402
    create_database_engine,
    create_session_factory,
    initialize_database,
)
from app.models.task import Task  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.auth import AuthenticationService  # noqa: E402
from app.services.setup import SetupService  # noqa: E402
from app.services.task_management import TaskManagementService  # noqa: E402
from app.services.user_management import UserManagementService  # noqa: E402

engine = create_database_engine(f"sqlite:///{DB_PATH}")
initialize_database(engine)
session_factory = create_session_factory(engine)

# The message AppController._handle_login shows for every failed login.
LOGIN_ERROR = "Incorrect username or password. Please try again."


class Client:
    """The services of one desktop app instance (AppController.__init__)."""

    def __init__(self):
        self.auth = AuthenticationService(session_factory)
        self.tasks = TaskManagementService(session_factory, self.auth)
        self.users = UserManagementService(session_factory, self.auth)
        self.dashboard = None  # 'admin' or 'user', chosen by _handle_login


clients: dict[str, Client] = {}


def client(a) -> Client:
    key = str(a["client"])
    if key not in clients:
        clients[key] = Client()
    return clients[key]


def as_id(value):
    """IDs travel as text; the GUI hands the services the integer it shows."""
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return value


def standard_users():
    """What AppController lists in the task dialog's 'Assigned User' box."""
    with session_factory() as session:
        return [(u.id, u.username) for u in session.scalars(select(User).where(User.role == "user")).all()]


def parse_deadline(value):
    """AppController: `datetime.fromisoformat(deadline)` when a deadline is given."""
    return datetime.fromisoformat(value) if value is not None else None


# --- operations ------------------------------------------------------------

def op_setup_admin(a):
    return SetupService(session_factory).create_initial_admin(a["username"], a["password"])


def op_login(a):
    c = client(a)
    user = c.auth.login(a["username"], a["password"])
    if user is None:
        c.dashboard = None
        raise ValueError(LOGIN_ERROR)
    c.dashboard = "admin" if user.role == "admin" else "user"  # _handle_login


def op_logout(a):
    c = client(a)
    c.auth.logout()  # _handle_logout
    c.dashboard = None


def op_is_authenticated(a):
    return client(a).auth.is_authenticated()


def op_dashboard(a):
    """Labels of the window _handle_login opened: its heading and buttons."""
    c = client(a)
    if c.dashboard is None or not c.auth.is_authenticated():
        return None
    from PySide6.QtWidgets import QApplication, QLabel, QPushButton

    QApplication.instance() or QApplication([])
    if c.dashboard == "admin":
        from app.gui.admin_dashboard import AdminDashboard as Window
    else:
        from app.gui.user_dashboard import UserDashboard as Window
    window = Window()
    try:
        return {
            "labels": [w.text() for w in window.findChildren(QLabel)],
            "buttons": [w.text() for w in window.findChildren(QPushButton)],
        }
    finally:
        window.deleteLater()


def op_create_user(a):
    client(a).users.create_user(a["username"], a["password"])


def op_user_list(a):
    return [{"id": str(i), "username": name} for i, name in standard_users()]


def op_create_task(a):
    client(a).tasks.create_task(
        title=a["title"],
        description=a["description"],
        assigned_user_id=as_id(a["user_id"]),
        deadline=parse_deadline(a["deadline"]),
    )


def op_list_tasks(a):
    """The dashboard rows (_refresh_admin_dashboard / _refresh_user_dashboard)."""
    c = client(a)
    tasks = c.tasks.get_tasks()
    names = dict(standard_users()) if c.dashboard == "admin" else None
    rows = []
    for t in tasks:
        rows.append({
            "ref": str(t.id),
            "title": t.title,
            # The admin table has no description column; the admin sees it in
            # the Edit Task dialog, which loads the same task.
            "description": t.description,
            "status": t.status,
            "assignee": names.get(t.assigned_user_id, "Unknown user") if names is not None else None,
            "deadline": str(t.deadline) if t.deadline is not None else None,
        })
    return rows


def edit_form(task_id):
    """The Edit Task dialog's fields as _show_edit_task_dialog + load_task fill them."""
    with session_factory() as session:
        task = session.get(Task, task_id)
        if task is None:
            return None
        listed = {i for i, _ in standard_users()}
        return {
            "title": task.title,
            "description": task.description,
            # findData() finds no entry for a non-standard user -> currentData() is None
            "assigned_user_id": task.assigned_user_id if task.assigned_user_id in listed else None,
            # QDateEdit holds the date only; the dialog emits it as yyyy-MM-dd
            "deadline": task.deadline.date().isoformat() if task.deadline else None,
        }


def op_save_task(a):
    """Edit Task dialog -> Save (_handle_edit_task -> update_task_details)."""
    c = client(a)
    task_id = as_id(a["task_id"])
    form = edit_form(task_id) or {"title": None, "description": None, "assigned_user_id": None, "deadline": None}
    for field in ("title", "description", "deadline"):
        if field in a["changes"]:
            form[field] = a["changes"][field]
    if "user_id" in a["changes"]:
        form["assigned_user_id"] = as_id(a["changes"]["user_id"])
    c.tasks.update_task_details(
        task_id,
        title=form["title"],
        description=form["description"],
        assigned_user_id=form["assigned_user_id"],
        deadline=parse_deadline(form["deadline"]),
    )


def op_update_status(a):
    client(a).tasks.update_status(as_id(a["task_id"]), a["status"])


# --- optional test-data hooks: direct database access ----------------------

def op_stored_password_hash(a):
    with session_factory() as session:
        return session.scalar(select(User.password_hash).where(User.username == a["username"]))


def op_force_deadline(a):
    with session_factory() as session:
        task = session.get(Task, as_id(a["task_id"]))
        task.deadline = datetime.fromisoformat(a["deadline"])
        session.commit()


OPS = {name[3:]: fn for name, fn in globals().items() if name.startswith("op_")}


def main():
    for line in sys.stdin:
        if not line.strip():
            continue
        request = json.loads(line)
        try:
            response = {"id": request["id"], "ok": True, "result": OPS[request["op"]](request.get("args", {}))}
        except (sqlite3.OperationalError, sqlalchemy.exc.OperationalError) as exc:
            response = {"id": request["id"], "ok": False, "kind": "infrastructure", "error": str(exc)}
        except Exception as exc:  # the application rejected the request
            response = {"id": request["id"], "ok": False, "kind": "rejected", "error": str(exc) or type(exc).__name__}
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
