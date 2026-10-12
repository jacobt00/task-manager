# VERIFICATION-005

Prompt 5
Date: 12.10.2026
Tool: Claude code

## The prompt
Changes:
- Q-16 do not require bcrypt after all, any salted one-way password hashing algorithm
should be accepted
- Q-17 I forgot that NFR-003 explicitly requires rate limiting, so it must be tested after
  all. After 20 failed logins in a row from the same client, further attempts
  must be blocked, but do not assume a specific limit or time window. So restore
the test cases related to that. Remember that rate limiting on registration is still not tested
- Q-19 the Secure cookie flag is only required when the app runs over HTTPS,
  not when testing over HTTP

Answers:
- Q-06 an Admin can't edit an active task's deadline into the past, and can't remove the deadline, because it is mandatory. For tasks that are done, cancelled or failed, the Admin can’t edit the title, description or deadline and the status must never change
- Q-12: Saving an active task with the receiver it already has is not a
  reassignment, so the status stays the same.
- Q-26 error messages and status codes are never compared between the implementations, only the observable result + anything still not covered is marked as "Unspecified" and counts as neither pass nor fail
- Q-28 email addresses are not case-sensitive

Please update the test cases taking in mind what I said and write them to a new file called
task-manager-test-cases-final.md. There should be no more open questions

Then, write automated tests for the final test cases. You still have not seen either implementation, so do not include anything that might suggest otherwise. Remember to Ggoup the tests in one spec file per requirement (FR-001 -> NFR-003) and to start every test title with its test ID6. Every test must be independent. If a test case cannot be automated, skip it and tell me what test and why. Add a README.md explaining how to install and run the tests
Write everything to a new folder called task-manager-tests


## Purpose
- correct three decisions
- resolve the remaining open questions
- generate automated tests from the final test cases

## Expected result
- final test case document
- no more open questions 
- an automated test suite that can be run against both implementations

## Result
- final test cases: see ../../../verification/test-cases.md
- automated tests: see ../../../verification/automated/

## Observations
- all corrections and answers were applied
- no open questions
- my prompt did not explain how the tests could run against applications the
  AI had never seen, so claude identified this problem and designed an adapter architecture, but not the adapters themselves

## Follow-up
An adapter must be written for each implementation in verification-006
