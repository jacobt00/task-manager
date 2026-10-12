# VERIFICATION-004

Prompt 4
Date: 11.10.2026
Tool: Claude code

## The prompt
Here are my answers to the questions:
Q-01 A user registers with a name, email and password + the email has to be
unique
Q-02 Anyone who registers on their own always becomes a receiver + only an
admin can create other admins
Q-03 Yes, login should show the same generic error whether the email doesn't
exist or the password is wrong
Q-04 An admin can create both admins and receivers
Q-05 A new task always starts as todo + it must have exactly one receiver (a receiver, not an admin)
Q-06 You can't create a task with a deadline in the past
Q-08 Yes, the receiver can mark their own task as failed themselves, from todo or ongoing
Q-09 Don't test how the auto-fail works internally
Q-10 For overdue tasks, use a deadline at least one day in the past, and for future tasks at least one day ahead. Don’t think about the timezone or anything complicated
Q-12 Reassigning a task that is done, cancelled or failed should be rejected,
and both the status and the receiver stay the same. If the work needs to be
redone, the admin just creates a new task. This includes the same receiver
Q-13 Any progress already recorded stays with the task, so the previous receiver
loses access to the task after reassignment and its progress
Q-14 Progress is separate from status + the receiver can record progress on
their own active tasks with a percentage, and the admin can
see it. Reporting progress never changes the status. For terminal tasks, it is ok either way, you choose
Q-16 Passwords should be stored with a salted, one-way password hashing
algorithm, you choose which one
Q-17 Don’t do anything about rate limiting
Q-18 Do it with CSRF protection
Q-19 Choose standard practice + don't test timeouts
Q-20: Leave them out completely
Q-22 Reject the option to do that, you should not be able to change a task to a status it is already in
Q-23 The admin can cancel active tasks, but remember to follow
the transition table and never changes a terminal task
Q-24 Admin and Sender are the same thing/role
Q-25 "Manage task access" means assigning or reassigning the one
receiver
Q-27: A deadline is mandatory when creating a task

What you need to do now:
- apply all of these decisions to the test cases to make concrete tests where necessary 
- remove tests for anything I said so + and add tests where my decisions introduce new expected behaviour
- keep the existing test IDs + give new tests new IDs
- sort the test cases by ID
- write the result to a new file called task-manager-test-cases.md

## Expected result:
All questions have been answered

## Output:
See verification-004-output.md

## Observations
- 84 -> 102 test cases
- where the decision was given to the AI ("you choose"), the AI made its own
  choices
- the decision on Q-17 conflicts with NFR-003, which requires rate
  limiting
- remaining open questions

## Follow-up
Corrections will be made in verification-005
