# VERIFICATION-003
Prompt 3
Date: 11.10.2026
Tool: Claude code


##  The prompt
Below is a part of the original project README from which the requirements were derived. Hopefully it will fill some gaps.
What you need to do now:
- check that every feature and rule in this README is covered by at least one
   test case in task-manager-test-cases-v2.md. list any feature or rule that is
   not covered, or only partly covered, and add test cases for it
- check if the README answers any of the remaining open questions, if yes, update them
- do not change existing test IDs, instead add new tests with new IDs
- keep the same table format and write the result to a new file called
   task-manager-test-cases-v3.md

README:
Core Features
Authentication
•	User registration and login.
•	Role-based access control (Admin/Sender and Receiver).
Admin / Sender Interface
•	Create new users.
•	Create and assign tasks to individual users.
•	Edit existing tasks.
•	Set and modify task deadlines.
•	Manage task access and assignments.
•	View task status and progress.
Receiver Interface
•	View assigned tasks.
•	Update task status.
•	Track and report task progress.
•	Cancel assigned tasks.
Task Status and Business Rules
Both implementations should follow the same functional requirements and business rules.
Task Statuses
The application uses five task statuses:
•	todo
•	ongoing
•	done
•	cancelled
•	failed
Allowed status transitions:
Current status	Allowed next statuses
todo	ongoing, cancelled, failed
ongoing	done, cancelled, failed
done	None
cancelled	None
failed	None
done, cancelled, and failed are terminal states. Tasks in these states cannot transition to another status.
Deadline Handling
If a task's deadline has passed and the task is not already in a terminal state, its status should automatically change to failed.
Cancellation
Both the assigned receiver and an administrator can cancel an active task.
Task Reassignment
When an administrator reassigns an existing task to another receiver, its status resets to todo.
Task Access
•	Each task is assigned to one receiver at a time.
•	Receivers can only view and manage tasks assigned to them.
•	Administrators can create, edit, assign and monitor tasks.
•	Authorization and status transition rules must be enforced server-side.
Implementation Independence
Both implementations should provide equivalent functionality but may use different technologies, architectures and development approaches.
The Vibe Coding implementation uses Node.js, Express, MongoDB and Handlebars. The SDD implementation may use a different technology stack.
The shared functional requirements serve as the basis for verification and comparison.


## Purpose
Check the test suite against the project README, to find features or
rules that were not covered, or only partly covered, by the test cases

## Expected result
New test cases

## Result
See verification-003-output.md

## Observations
- 9 new test cases were added (TC-070 to TC-078) => 84 test cases
- new questions were raised
- the AI explicitly chose not to use the technology stack mentioned in the
  README, to keep the test suite implementation-independent

## Follow-up
The remaining open questions will be resolved by me, the verifier, in verification-004
