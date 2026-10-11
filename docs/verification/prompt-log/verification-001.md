# VERIFICATION-001
Prompt 1
Date: 08.10.2026
Tool: Claude code

## The prompt
You are a QA engineer performing independent, specification-based verification. You have NOT seen the source code. Below are the requirements and rules of a Task Manager web application. Please create test cases derived from them.

Rules:
- Use the format: Test ID | Requirement ID | Given to | When | Result | Type
- Cover every requirement with at least two test cases, mostly based on success and failure (depending on the result of that action) => also include negative tests, not just positive ones, for example if the authentication fails
- Include security tests for authorization and access control
- Do not invent behaviour that is not stated in the requirements. If a requirement is ambiguous, state the concern separately

Requirements
FR = Functional Requirement
NFR = Non-Functional Requirement
| ID | Requirement | Core Feature from README |
|---|---|---|
| FR-001 | User registration | Authentication |
| FR-002 | User login/logout | Authentication |
| FR-003 | Admin can create users | Admin Interface |
| FR-004 | Admin creates a task and assigns it to a single receiver | Admin Interface |
| FR-005 | Admin edits a task and its deadline | Admin Interface |
| FR-006 | Receiver can only view their own tasks | Receiver Interface |
| FR-007 | Status transitions follow the transition table + terminal states (done/cancelled/failed) cannot change | Receiver Interface |
| FR-008 | A task whose deadline has passed is automatically set to failed | Deadline Handling |
| FR-009 | The assigned receiver + an admin can cancel an active task | Cancellation |
| FR-010 | Reassigning a task resets its status to todo | Task Reassignment |
| FR-011 | Receiver can track and report task progress | Receiver Interface |
| NFR-001 | Authorization and status rules are enforced server-side | Task Access |
| NFR-002 | Passwords are stored as secure hashes | - |
| NFR-003 | CSRF protection, rate limiting and secure sessions | - |

## Purpose
To derive test cases from the requirements that the team established, without seeing any code beforehand

## Expected result
Test cases in table format covering every requirement and following every rule

## Result
See verification-001-output.md

## Observations
- The AI did not invent behaviour: no status codes
- The prompt did not include rules like transition table, deadline, cancellation and reassignment. The AI flagged this (Q-07), which is why tests TC-027 and TC-028 remained generic
- The AI identified an ambiguity of reassigning a terminal task (TC-048, Q-12)
- Q-02 showed that the AI found an ambiguity regading the  role of self-registered users

## Follow-up
See verification-002.md
