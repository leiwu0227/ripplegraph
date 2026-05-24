# Graph Package Host Contracts Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add validated, host-facing graph package metadata for interactions, user-turn interrupts, side-channel actions, workflowRef maps, tool contracts, and validators without moving host execution into Ripplegraph core.

**Architecture:** Extend the existing Zod package schema as the source of truth, then expose the parsed node metadata through the existing coach state response builder. Keep callable packages isolated by rejecting node-level host-interaction metadata during callable support checks. Effect preflight remains in `coach.ts`, with a small helper that includes side-channel and tool contract effects.

**Tech Stack:** TypeScript, Node.js, Zod, Vitest, filesystem-backed test workspaces.

**Execution Mode:** inline

**Test Budget:** <= 5 new tests across all tasks.

---

### Task 1: Schema Contracts
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/schema.ts`, `tests/graph-package.test.ts`

**Work:**
- Add strict Zod schemas and exported types for `interaction`, `interrupt`, `sideChannelActions`, `toolContract`, and `validators`.
- Add `interaction` support to gates and nodes.
- Add `workflowRef.inputMap` and `workflowRef.outputMap` as string-keyed metadata maps.
- Validate interaction-specific requirements: choice/confirm require choices; form requires an object JSON schema.

**Verify:**
- `npm test -- tests/graph-package.test.ts`

**Test Budget:** +3 in `tests/graph-package.test.ts`; focused (<30s) — one happy-path metadata test, one invalid interaction test, and one workflowRef map assertion combined with metadata coverage.

**Test Pruning:**
- Extend existing loader tests instead of adding a new test file.

**Commit:** `git commit -m "Add graph package host contract schemas"`

### Task 2: Coach State Exposure
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/coach.ts`, `src/internal/coach-responses.ts`, `tests/coach.test.ts`

**Work:**
- Extend `StateOk.node` with node-level `interaction`, `interrupt`, `sideChannelActions`, `toolContract`, and `validators`.
- Preserve gate-level metadata by exposing `gate.interaction` through the existing `node.gate` object.
- Keep `responseContract` behavior unchanged for step and decide nodes.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Add coverage near existing gate/state metadata tests and avoid duplicating start/resume behavior.

**Commit:** `git commit -m "Expose host contract metadata in coach state"`

### Task 3: Effect Preflight For Host Contracts
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/coach.ts`, `tests/effects.test.ts`

**Work:**
- Update node effect collection so start preflight includes effects from `sideChannelActions[].effects` and `toolContract.effects`.
- Preserve current node effect override semantics: `node.effects` still overrides graph effects for the primary node execution, while host-contract effects are additional requirements.
- Deduplicate effects through the existing missing-effect aggregation behavior.

**Verify:**
- `npm test -- tests/effects.test.ts`

**Test Budget:** +1 in `tests/effects.test.ts`; focused (<30s)

**Test Pruning:**
- Extend the existing union/override test only if it remains readable; otherwise add one focused test for host-contract effects.

**Commit:** `git commit -m "Include host contract effects in workflow preflight"`

### Task 4: Callable Guardrails And Final Verification
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/callable.ts`, `tests/callable.test.ts`, `README.md`, `.specdev/assignments/00022_feature_graph-package-host-contracts/review/implementation-changelog.md`

**Work:**
- Reject callable nodes that declare `interaction`, `interrupt`, `sideChannelActions`, `toolContract`, or `validators`.
- Document the new host-contract metadata briefly in README, including that execution remains host-owned.
- Append the implementation review changelog noting that the premature round-one implementation finding was resolved by adding the plan, code, tests, and verification evidence.
- Run final focused and full assignment verification.

**Verify:**
- `npm test -- tests/callable.test.ts`
- `npm run typecheck`
- `npm test`

**Test Budget:** +0 in `tests/callable.test.ts`; prune/replace an existing unsupported-callable assertion if needed, otherwise cover callable rejection via a compact extension of existing unsupported callable tests.

**Test Pruning:**
- Keep existing callable gate rejection coverage; add only the smallest assertion needed for new metadata rejection.

**Commit:** `git commit -m "Reject host interaction metadata in callables"`
