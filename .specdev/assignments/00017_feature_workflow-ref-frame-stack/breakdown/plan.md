# Workflow-Ref Frame Stack Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add workflow-ref nodes with durable frame-stack execution so a parent workflow can enter a registered workflow package and resume after the child reaches its terminal node.

**Architecture:** Extend workflow node and checkpoint schemas with workflow refs, stack frames, and active execution scope. Centralize active-context resolution so state, step, decide, suspend, and resume use the correct parent or child graph. Keep top-level output/artifact compatibility while adding scoped keys and artifact paths for nested frames.

**Tech Stack:** TypeScript, Zod schemas, Node filesystem storage, Vitest.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks. The feature crosses durable schema, runtime routing, effects, and recovery, so the budget is allocated to behavior-level integration tests rather than small implementation-detail tests.

---

### Task 1: Schema and scoped persistence primitives
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/storage.ts`, `tests/coach.test.ts`

**Work:**
- Add `workflowRef?: { graphId: string }` to node schema and reject nodes that combine `workflowRef` with `gate`.
- Add checkpoint `stack` frames with parent graph/node/source/scope, child `GraphSource`, frame `scope`, and `enteredAt`; default to `[]`.
- Add scoped node output helpers so top-level calls keep `outputs[nodeId]` and `artifacts/<nodeId>/output.json`, while nested scopes use `outputs["<scope>/<nodeId>"]` and `artifacts/<scope>/<nodeId>/output.json`.
- Keep callable artifacts unchanged.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Reuse the existing checkpoint persistence test area; avoid adding a separate schema-only test if the same assertion fits there.

**Commit:** `git commit -m "Add workflow-ref stack persistence primitives"`

### Task 2: Active context resolution and state rendering
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/internal/coach-responses.ts`, `tests/coach.test.ts`

**Work:**
- Replace one-graph checkpoint loading with an active-context helper returning graph, graph source, graph id, and scope from either top-level checkpoint source or the top stack frame.
- Route `getState`, `advanceRun`, `stepRun`, `decideGate`, `suspendRun`, and `resumeRun` through active context.
- Render `StateOk.stack` and filter previous outputs to the active scope while preserving existing top-level previous-output behavior.
- Preserve package-backed top-level run behavior from assignment 00016.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Extend nearby package-backed state coverage rather than duplicating a separate package loading test.

**Commit:** `git commit -m "Resolve active workflow context from stack frames"`

### Task 3: Workflow-ref entry and recursive effect enforcement
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- When state or advance lands on a workflow-ref node, resolve the registered child workflow package, pin its source into a new frame, allocate a stable frame scope, move to the child entry node, persist the checkpoint, and append a transition.
- Run child entry after top-level start and after parent transitions so callers receive the first actionable child node.
- Expand start-time effect checks to include reachable workflow-ref children recursively with cycle detection.
- Return existing error styles for unknown child packages and missing effects.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +2 in `tests/coach.test.ts`; focused (<30s) - one test covers child entry and persisted stack; one covers recursive child effect denial before run creation.

**Test Pruning:**
- Share package helper setup with existing registered workflow tests; remove duplicated package fixtures if they become redundant.

**Commit:** `git commit -m "Enter registered workflow refs with pinned frames"`

### Task 4: Child exit, parent resumption, and scoped history
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/internal/coach-responses.ts`, `tests/coach.test.ts`

**Work:**
- When a child transition reaches a terminal node and the stack is non-empty, validate the child result against the child graph output schema, pop the frame, write the result as the parent workflow-ref node output in the parent scope, and select the parent edge from that result.
- Continue to parent target or complete the run if the parent target is terminal and no parent frame remains.
- Ensure child node outputs and artifacts remain scoped, including overlapping parent/child node ids.
- Preserve normal terminal completion when no stack frame is active.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Fold collision and parent-resume assertions into one end-to-end test instead of adding separate tests for each internal helper.

**Commit:** `git commit -m "Resume parent workflows after child completion"`

### Task 5: Build artifacts and final verification
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `dist/`, `.specdev/assignments/00017_feature_workflow-ref-frame-stack/implementation/progress.json`

**Work:**
- Run the build so tracked `dist/` artifacts match the TypeScript sources.
- Run final assignment verification.
- Update implementation progress with completed task summaries and verification evidence.
- Scan for stale root-graph-only writes or direct nested output writes that bypass scoped helpers.

**Verify:**
- `npm run build`
- `npm test`
- `rg "checkpoint\\.rootGraph|checkpoint\\.outputs\\[" src tests`

**Test Budget:** +0; final verification only

**Test Pruning:**
- No new tests; use the final scan to catch implementation drift.

**Commit:** `git commit -m "Build workflow-ref frame stack artifacts"`
