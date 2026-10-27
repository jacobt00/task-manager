# VERIFICATION-007

Prompt 7
Date: 27.10.2026
Tool: Claude code

## The prompt
I have an automated test suite in task-manager/verification/automated. The
tests were written from the requirements only, without access to any
implementation. They call a driver interface (src/driver.ts); each
implementation needs an adapter. The rules are in README.md, section
"Writing an adapter".

The SDD implementation has been rewritten. The new version is in
./Taskmanager_SDD. The old SDD adapter (adapters/sdd.ts, adapters/sdd_bridge.py)
was written for the previous version and probably no longer fits.

Please:
1. Write a new adapter for the new SDD version as adapters/sdd-v2.ts (plus any
   helper it needs). Do not modify or delete the old SDD adapter, the Vibe
   adapter, the tests or the application code.
2. Keep the adapter as thin as possible: no business rules or authorization of
   its own. If a feature or status required by the tests does not exist in the
   application, do not invent it: let the test fail and document it.
3. Implement the optional test-data hooks where possible, use a separate test
   database, and create a test Admin account in it.
4. Document all limitations and workarounds at the top of the adapter.
5. Run the whole suite and then the rate-limit test against the new SDD
   version. Save the results as results/sdd-v2-main.json and
   results/sdd-v2-rate-limit.json. Do not overwrite the existing result files.
6. Write results/summary-sdd-v2.md with a table:
   Test ID | SDD v2 result | Reason for each v2 failure
   For every failure, say whether it is a real defect, an adapter or
   environment problem, or not applicable.

## Purpose
- write a new adapter for sdd
- run the suite

## Expected result
- one adapter
- test results for the new sdd implementation
- summary

## Result
See ../../../verification/automated/results/summary-sdd-v2.md and the JSON result files

## Observations
- SDD v2: 51 passed, 59 failed (41 real defect + 11 blocked by a missing status/feature + 2 interface mismatches + 5 not applicable), 1 skipped

## Follow-up
Real defects will be reported as a code audit log