# Callable Runtime Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Make registered `kind: "callable"` graph packages invokable as isolated typed calls that validate inputs, node outputs, and final output without mutating focused workflow state.

**Architecture:** Add `src/callable.ts` for callable lifecycle and keep it separate from `src/coach.ts` focused workflow runs. Add storage/schema support for `.ripplegraph/calls/<call-id>/`, improve schema validation for callable contracts, then wire dispatcher `call_graph` and low-level JSON CLI commands onto the callable module.

**Tech Stack:** TypeScript, Zod, filesystem JSON state, existing graph package registry, existing runtime graph helpers, Vitest.

**Execution Mode:** inline

**Test Budget:** ≤ 10 new tests across the plan. This exceeds the default because the assignment creates a new runtime state surface, expands schema validation semantics, and adds dispatcher plus CLI integrations; each risk needs focused contract coverage.

---

### Task 1: Strengthen JSON Contract Validation
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/internal/output-validation.ts`, `tests/output-validation.test.ts`

**Work:**
- Extend the existing validator to support `const`, `oneOf`, array `items`, and `additionalProperties: false`.
- Add a callable-oriented unsupported-keyword scan, exported as a small helper, that rejects unsupported schema keywords with `E_UNSUPPORTED_SCHEMA_KEYWORD`.
- Keep existing `validateOutput` behavior compatible for workflow tests.
- Use clear validation issue paths for object properties and array indices.

**Verify:**
- `npm test -- tests/output-validation.test.ts`
- `npm test -- tests/coach.test.ts`

**Test Budget:** +3 in `tests/output-validation.test.ts`; focused (<30s) - supported keywords, unsupported keyword rejection, and compatibility/paths.

**Test Pruning:**
- No existing direct validator test file exists; keep tests contract-level and avoid duplicating all coach validation cases.

**Commit:** `git commit -m "Strengthen JSON contract validation"`

### Task 2: Add Callable State Storage
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/storage.ts`, `tests/callable.test.ts`

**Work:**
- Add callable checkpoint/status schemas with call id, graph id/version, package path, position, input, outputs, createdAt, updatedAt, final output, and optional output artifact.
- Add `.ripplegraph/calls/<call-id>/` storage helpers for call directory, checkpoint path, transition log path, artifact path, read/write checkpoint, write call output, append call transition, and list call ids.
- Validate call ids with the existing filesystem-safe id shape before any path construction.
- Reject duplicate call ids with `E_CALL_EXISTS` at the storage/runtime boundary before overwriting state.
- Keep workflow `runs/` storage behavior unchanged.

**Verify:**
- `npm test -- tests/callable.test.ts`

**Test Budget:** +2 in `tests/callable.test.ts`; focused (<30s) - unsafe call id and duplicate call id behavior.

**Test Pruning:**
- Keep callable storage assertions in callable tests; do not add broad storage tests that duplicate run storage coverage.

**Commit:** `git commit -m "Add callable state storage"`

### Task 3: Implement Callable Start And State
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/callable.ts`, `src/registry.ts`, `src/index.ts`, `tests/callable.test.ts`

**Work:**
- Add package resolution for registered graph packages: unknown graph -> `E_UNKNOWN_GRAPH`, wrong kind -> `E_WRONG_GRAPH_KIND`, stale manifest id/kind mismatch -> clear registry/package mismatch error.
- Implement `startCallableCall`, `getCallableCall`, and `listCallableCalls`.
- Validate callable package schemas for unsupported keywords before starting a call.
- Validate call input against package `inputSchema`; invalid input returns structured validation errors and creates no checkpoint.
- Return `CallableState` containing original input, current node contract, previous outputs, response contract, next command, and help command.
- Reject callable graph gates in v0 with `E_CALLABLE_GATE_UNSUPPORTED`.

**Verify:**
- `npm test -- tests/callable.test.ts`

**Test Budget:** +2 in `tests/callable.test.ts`; focused (<30s) - successful start/state/list with input and invalid input without checkpoint.

**Test Pruning:**
- Use compact callable package fixtures; avoid creating separate tests for every registry error if one wrong-kind/unknown assertion can share setup.

**Commit:** `git commit -m "Implement callable start state"`

### Task 4: Implement Callable Step And Completion
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/callable.ts`, `tests/callable.test.ts`

**Work:**
- Implement `stepCallableCall` for active calls.
- Validate current node output against the node schema; return structured validation errors without advancing on failure.
- Persist node output artifacts and append transition log entries.
- Select edges using existing edge semantics; throw `E_NO_EDGE` if no edge matches.
- Complete when the next node is terminal, validate final output against package `outputSchema`, persist completed checkpoint, and return `CallableCompleted` with final validated `output`.
- Reject stepping completed calls with a clear non-active call error.

**Verify:**
- `npm test -- tests/callable.test.ts`

**Test Budget:** +2 in `tests/callable.test.ts`; focused (<30s) - successful completion returns output and validation/no-edge/non-active behavior combined where practical.

**Test Pruning:**
- Combine artifact/log assertions into the successful completion test instead of adding separate implementation-detail tests.

**Commit:** `git commit -m "Implement callable step completion"`

### Task 5: Wire Dispatcher And JSON CLI Calls
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/dispatcher.ts`, `src/cli.ts`, `tests/dispatcher.test.ts`, `tests/cli.test.ts`

**Work:**
- Update `call_graph` action schemas to accept optional `callId`.
- Replace `E_CALLABLE_RUNTIME_NOT_IMPLEMENTED` for valid callable targets with `startCallableCall`.
- Keep dispatcher validation for missing dispatcher, unknown graph id, and wrong graph kind.
- Add JSON CLI commands: `call`, `call-state`, `call-step`, and `call-list`.
- Parse JSON input/output through existing CLI helpers and emit errors through `jsonErrorPayload`.
- Update help text.

**Verify:**
- `npm test -- tests/dispatcher.test.ts`
- `npm test -- tests/cli.test.ts`

**Test Budget:** +1 in `tests/dispatcher.test.ts`, +0 in `tests/cli.test.ts`; focused (<30s target, CLI may be slower) - add one dispatcher `call_graph` call-id test and extend an existing CLI test with call smoke coverage.

**Test Pruning:**
- Extend existing CLI integration coverage instead of adding a new CLI test process fixture.

**Commit:** `git commit -m "Wire callable dispatcher and CLI"`

### Task 6: Document And Build Callable Runtime
**Mode:** lightweight
**Skills:** []
**Files:** `README.md`, `.specdev/project_notes/big_picture.md`, `dist/`

**Work:**
- Document callable call lifecycle, state isolation, supported validation subset, dispatcher `call_graph`, and current effect-enforcement non-goal.
- Update project notes to show callable runtime status and remaining effects/workflow-call integration gaps.
- Run the build so tracked `dist/` output matches source changes.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`

**Test Budget:** +0; full assignment verification (<2m)

**Test Pruning:**
- No executable tests for docs/build output.

**Commit:** `git commit -m "Document callable runtime"`
