# VERIFICATION-002

Prompt 2
Date: 11.10.2026
Tool: Claude code


## The prompt
Thank you. The previous prompt was missing the rules regarding task statuses:
-	task statuses: todo, ongoing, done, cancelled, failed
-	allowed status transitions:
| Current status | Allowed next statuses |
|---|---|
| todo | ongoing, cancelled, failed |
| ongoing | done, cancelled, failed |
| done | None |
| cancelled | None |
| failed | None |
-	done, cancelled and failed are terminal states, tasks in these states cannot
transition to another status
-	if a task's deadline has passed and the task is not already
in a terminal state, its status should automatically change to failed
-	both the assigned receiver and an administrator can cancel an
active task
-	when an administrator reassigns an existing task to another
receiver, its status resets to todo

Task access:
- each task is assigned to one receiver at a time
- receivers can only view and manage tasks assigned to them
- administrators can create, edit, assign and monitor tasks

Update any empty/generic test cases and open questions that are answered by what I wrote in this prompt. In the response, keep the same table format and columns. Write the result to a new file called task-manager-test-cases-v2.md


## Expected result
- TC-027 and TC-028 replaced by specific tests for each status transition
- open questions answered

# Result
See verification-002.output.md

## Observations
- before there were 64 test cases, now there are 75, because the generic transition tests were
  replaced by concrete ones (TC-027a–d, TC-028a–b) and new tests were added for:
  admin monitoring (TC-065, TC-066), deadline edits (TC-067, TC-068), reassigning a todo task (TC-069)
- the AI went beyond the request and produced a transition coverage matrix which must be
  rejected because it was not specified
- original test IDs were kept
- Q-07, Q-11 and Q-15 were answered by the rules, while other questions were
  partly answered

## Follow-up
The open questions will be resolved by the verifier, in the next prompt
