# Gate Decision Source Metadata Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add optional `decisionSource` metadata to external decision gates without changing gate decision validation or routing.

**Architecture:** Extend the gate schema with a strict discriminated source shape. Let existing state rendering expose the full gate object, and include the same metadata on the decide response contract for hosts that key off contracts. Keep `decideGate` behavior unchanged except for typed metadata flowing through parsed gate definitions.

**Tech Stack:** TypeScript, Zod, Vitest, Node filesystem fixtures.

**Execution Mode:** inline

**Test Budget:** ≤ 3 new tests across all tasks.

---

### Task 1: Gate schema and state contract metadata
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/coach.ts`, `src/internal/coach-responses.ts`, `tests/coach.test.ts`

**Work:**
- Add a strict `decisionSource` discriminated union to `gateSchema`.
- Require `tool` for `kind: "tool"` and reject `tool` on human/system sources.
- Expose `decisionSource` in `StateOk.node.gate` through existing parsed gate data.
- Add `decisionSource` to the gated `responseContract` as optional metadata while keeping command, accepted formats, and schema unchanged.
- Add focused tests for a valid reviewloop source in state and invalid tool source omission.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +2 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Extend existing gated-node coverage rather than adding a separate gate fixture file.

**Commit:** `git commit -m "Expose gate decision source metadata"`

### Task 2: Decision behavior, build artifacts, and final verification
**Mode:** standard
**Skills:** test-driven-development
**Files:** `tests/coach.test.ts`, `tests/callable.test.ts`, `dist/`, `.specdev/assignments/00018_feature_gate-decision-source-metadata/implementation/progress.json`

**Work:**
- Verify `decideGate` persists only the submitted decision and routes as before when metadata is present.
- Keep callable gate rejection behavior unchanged.
- Rebuild tracked `dist/` artifacts.
- Run final focused and full verification.

**Verify:**
- `npm run build`
- `npm test -- tests/coach.test.ts tests/callable.test.ts`
- `npm test`

**Test Budget:** +1 in `tests/coach.test.ts`; focused plus final full suite

**Test Pruning:**
- Fold decision persistence assertions into the valid metadata test if possible; do not duplicate the existing normal gate routing test.

**Commit:** `git commit -m "Build gate decision source metadata artifacts"`
