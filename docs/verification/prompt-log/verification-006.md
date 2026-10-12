# VERIFICATION-006

Prompt 6
Date: 12.10.2026
Tool: Claude code

## The prompt
(I used AI to write this prompt)

I have an automated test suite in task-manager/verification/automated. The
tests were written from the requirements only, without access to any
implementation. They call a driver interface (src/driver.ts), and every
implementation needs an adapter that implements it. The rules for adapters are
in README.md, section "Writing an adapter". adapters/template.ts is the
starting point.

There are two implementations:
- Vibe Coding: task-manager/vibe-coding (Node.js, Express, MongoDB, Handlebars)
- SDD: ./TaskManager

Please:
1. Write adapters/vibe.ts and adapters/sdd.ts. Read each implementation's
   code to find out how every driver operation is done in that application.
2. Do NOT change the application code or the tests. If an operation is
   impossible in an application (for example a feature that does not exist),
   do not invent it: let the test fail, and document it.
3. Keep each adapter as thin as possible. It must not add business rules or
   authorization of its own, so that every result reflects the application,
   not the adapter.
4. Implement the optional test-data hooks (storedPasswordHash, forceDeadline)
   where possible.
5. At the top of each adapter, document every limitation and workaround.
6. Use a separate test database for each application, so no real data is
   touched, and create a test Admin account in it.
7. Start each application and run the whole suite against it, then the
   rate-limit test separately, as described in the README. Save the results as
   JSON in verification/automated/results/.
8. Write verification/automated/results/summary.md with a table:
   Test ID | Vibe result | SDD result | Reason for each failure
   For every failure, say whether it is a real defect in the application or a
   problem with the test environment or adapter. List separately the tests
   that are not applicable to an implementation, and why.


## Purpose
- write 2 adapters, 1 for vibe-coding and 1 for sdd
- run the suite
NOTE: I ran this prompt on a new conversation with Claude

## Expected result
- two adapters
- test results for both implementations
- summary

## Result
See ../../../verification/automated/results/summary.md and the JSON result files

## Observations
- Vibe-coding: 93 passed, 17 failed (13 real defects + 4 adapter limitations), 1 skipped
- SDD: 70 passed, 40 failed (26 real defects + 5 not applicable + 6 blocked by another defect + 3 interface mismatches), 1 skipped
- The SDD implementation turned out to be a desktop application with no web server

## Follow-up
Real defects will be reported as a code audit log. Waiting for the next version of both implementations