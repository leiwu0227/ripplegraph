# Operator Context Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add optional passive `operatorContext` metadata to Ripplegraph graph nodes and expose it in current-node state responses without changing runtime behavior.

**Architecture:** The node schema in `src/schema.ts` remains the single contract point for graph node parsing. Workflow and callable state response builders copy the parsed field onto their existing `node` response objects; no transition, gate, validator, effect, or side-channel logic reads it.

**Tech Stack:** TypeScript, Node.js, Zod, Vitest, generated `dist/` declarations and JavaScript via `npm run build`.

**Execution Mode:** inline

**Test Budget:** ≤ 3 new tests across the plan.

---

### Task 1: Add Schema And Response Contract
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/coach.ts`, `src/internal/coach-responses.ts`, `src/callable.ts`

**Work:**
- Add optional `operatorContext` to `nodeSchema` as a string-keyed record of unknown values.
- Add `operatorContext?: Node['operatorContext']` to workflow `StateOk.node`.
- Copy `node.operatorContext` into the workflow state response's current `node` object.
- Add the same optional response field to callable `CallableState.node` and copy it from the active callable node for consistency.
- Keep the field passive; do not reference it in edge selection, gates, validators, effects, side-channel reconciliation, or checkpoint storage.

**Verify:**
- `npm run typecheck`

**Test Budget:** +0; behavior coverage added in Task 2

**Test Pruning:**
- No pruning expected; this task changes public response shape but has no direct tests yet.

**Commit:** `git commit -m "Add operator context node contract"`

### Task 2: Cover Workflow And Callable Round-Trip Behavior
**Mode:** standard
**Skills:** test-driven-development
**Files:** `tests/coach.test.ts`, `tests/callable.test.ts`

**Work:**
- Add one workflow runtime test that registers or defines a graph node with nested `operatorContext`, starts a run, asserts `state.node.operatorContext` deep-equals the original metadata, and advances normally to prove transition behavior is unchanged.
- Add one callable state test or extend the existing callable state test to assert callable nodes expose `operatorContext` consistently when present.
- Use nested values covering strings, arrays, numbers, booleans, and objects.

**Verify:**
- `npm test -- --run tests/coach.test.ts tests/callable.test.ts`

**Test Budget:** +2 in `tests/coach.test.ts`, `tests/callable.test.ts`; focused (<30s) — workflow and callable have separate public state APIs.

**Test Pruning:**
- Prefer extending the existing callable state test instead of adding a separate callable test if that keeps the assertion clearer.

**Commit:** `git commit -m "Test operator context state round trip"`

### Task 3: Regenerate Build Artifacts And Final Verification
**Mode:** standard
**Skills:** test-driven-development
**Files:** `dist/schema.js`, `dist/schema.d.ts`, `dist/coach.d.ts`, `dist/internal/coach-responses.js`, `dist/callable.js`, `dist/callable.d.ts`

**Work:**
- Run the normal build so generated `dist/` JavaScript and declaration files reflect source changes.
- Inspect generated artifacts for `operatorContext` in schema and response output.
- Run focused tests plus typecheck, then run the project test suite if focused verification is clean.

**Verify:**
- `npm run build`
- `npm run typecheck`
- `npm test`
- `rg -n "operatorContext" src tests dist`

**Test Budget:** +0; build and full verification only

**Test Pruning:**
- No test pruning expected.

**Commit:** `git commit -m "Build operator context artifacts"`
