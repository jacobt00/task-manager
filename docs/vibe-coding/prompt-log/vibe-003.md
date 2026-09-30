## VIBE-003

### Date and time
29.9.2026

### Prompt

Now implement task management functionality for the Admin (Sender) interface in the existing Task Manager application.

Administrators should be able to:

- Create new tasks.
- Assign tasks to individual receivers.
- Edit existing tasks.
- Set and modify task deadlines.
- View all created tasks and their current statuses.
- View which receiver each task is assigned to.

Each task should have a title, description, deadline, assigned receiver and status.

New tasks should initially have the status "todo".

Integrate the functionality into the existing Admin dashboard while maintaining the current visual design.

Ensure that receivers cannot access administrative task management functionality.

Use the existing application architecture and make reasonable implementation decisions where necessary.

### Purpose

Implement task management functionality for administrators, allowing them to create, assign, edit and monitor tasks.

### Expected result

A working Admin interface where administrators can create tasks, assign them to individual receivers, set and modify deadlines, and view all tasks together with their assigned receivers and current statuses.

The implementation should integrate with the existing authentication system and preserve the application's visual design.

### Actual result

The AI generated an updated version of the application with administrative task management functionality.

According to the AI's implementation summary, the following features were added:

- Task creation with title, description, deadline and assigned receiver.
- Selection of receivers from existing registered users.
- Editing of task details, deadlines, assignments and statuses.
- Overview of all tasks, assigned receivers and current statuses.
- Dashboard statistics showing total, pending and completed tasks.
- Automatic assignment of the initial "todo" status.
- Server-side authorization preventing receivers from accessing administrative task management routes.

The AI maintained the existing application structure and visual design.

The updated application was delivered as a ZIP archive.

### Problems / observations

The AI independently introduced three task statuses: "todo", "in_progress" and "done".

The prompt only specified that newly created tasks should initially have the status "todo". No additional statuses or status transitions were explicitly provided to the AI.

The AI therefore made its own implementation decisions regarding the task status workflow.

However, we had previously agreed on five statuses: "todo", "ongoing", "done", "cancelled" and "failed". These requirements had not yet been communicated to the AI.

This highlights an interesting characteristic of Vibe Coding: when requirements are not fully communicated, the AI fills in missing details based on its own assumptions.

The AI also introduced dashboard statistics without these being explicitly requested.

### Manual intervention

Manually downloaded and extracted the generated ZIP archive and integrated the updated application into the existing project directory.

No manual modifications to the generated application logic have been documented at this stage.

### Follow-up

A subsequent prompt is required to introduce the complete task status workflow agreed upon by the development team.

The Receiver interface also remains to be implemented.

The additional prompt is needed because the original prompt did not communicate all the agreed functional requirements, rather than because the AI failed to follow an explicitly stated instruction.

### Result

The AI generated the requested administrative task management functionality and independently introduced additional features and implementation decisions.

The generated status workflow differs from the our agreed requirements (by the group) because the complete workflow had not been included in the prompt.



### Follow-up – VIBE-003-F01

**Purpose:** Clarify previously omitted task management requirements.

**Actual result:** AI implemented all five statuses, status transitions, automatic deadline failure, cancellation permissions and task reassignment rules. It also added functionality to the Receiver dashboard.

**Observations:** AI identified that existing MongoDB records using "in_progress" needed migration to "ongoing" and provided a migration command.

**Manual intervention:** Integrated the updated ZIP into the existing project.

**Result:** Implementation generated. Pending local testing.


### Follow-up – VIBE-003-F02
I manually tested the task management functionality.

Most features work as expected, including terminal states and task reassignment.

However, I noticed that there is no way to manually mark an active task as "failed", even though this is an allowed status transition.

Please add this functionality while preserving the existing architecture and visual design. Ensure the transition is enforced server-side.

## Purpose
Add the missing functionality for manually marking active tasks as failed.

## Actual result
AI added a Mark failed button for administrators and assigned receivers and updated the backend to support the transition.

## Observations
The previous implementation supported the agreed status workflow but lacked a UI action for manually marking tasks as failed.

## Manual intervention
Integrated the updated application and performed local testing.

## Result
Successfully tested and verified.
Deadline handling: Manually verified on 30.9.2026. An active task with a passed deadline was automatically changed to failed as expected.