# Verification & Validation

### FR = Functional Requirement
### NFR = Non-Functional Requirement

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
