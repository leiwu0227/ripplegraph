# Package-Backed Workflow Execution Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Registered workflow graph packages can be started as durable focused runs and continue against pinned package identity.

**Architecture:** Preserve compact `workflow.json` runs while adding an optional checkpoint source for package-backed workflow runs. Reuse the callable package pinning pattern: resolve a registered package at start, persist package path/version, and reload that pinned package for state/advance/resume. Dispatcher `start_run` becomes the main host path for package-backed workflow starts.

**Tech Stack:** TypeScript + Zod + Vitest. No new dependencies.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks. Target: 4 focused tests.

---

### Task 1: Checkpoint schema — record optional workflow package source
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `tests/coach.test.ts`

**Work:**
- Add an optional package source field to workflow checkpoints, preferably:
  `graphSource?: { kind: 'package'; graphId: string; graphVersion: string; packagePath: string }`.
- Keep existing compact workflow checkpoints valid with no `graphSource`.
- Validate package source fields with existing `idSchema` and non-empty strings.
- Add a focused schema/storage test that writes and reads a checkpoint with `graphSource`.

**Verify:**
- `npm run typecheck`
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s). Single test writes a checkpoint with `graphSource` and confirms `readCheckpoint` preserves it.

**Test Pruning:** None; this is new persisted state shape coverage.

**Commit:** `git commit -m "Add workflow package source to checkpoints"`

---

### Task 2: Runtime — start and continue package-backed workflow runs
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/storage.ts`, `src/registry.ts`, `src/graph-package.ts`, `src/internal/coach-responses.ts`, `tests/coach.test.ts`

**Work:**
- Add an explicit runtime API for package-backed workflow starts, such as `startRegisteredWorkflowRun`.
- Resolve registered packages with `kind: 'workflow'`, load the manifest, enforce node-aware effects before state creation, and write a normal run checkpoint with `graphSource`.
- Add a helper that loads the active graph for a checkpoint:
  - compact checkpoint: load from `workflow.graphs[checkpoint.rootGraph]`
  - package-backed checkpoint: load `graphSource.packagePath`, assert id/kind/version match, and use that manifest as the active graph
- Update `getState`, `stepRun`, `advanceRun`, `decideGate`, `suspendRun`, `resumeRun`, and run summaries only where needed so package-backed runs can state/advance/resume.
- Keep output artifacts and transition logs under `.ripplegraph/runs/<run-id>/` exactly as compact runs do.
- Fail with a clear `RipplegraphError` if the pinned package path now resolves to a different id/version/kind.

**Verify:**
- `npm run typecheck`
- `npm test -- tests/coach.test.ts`

**Test Budget:** +2 in `tests/coach.test.ts`; focused (<30s). One happy-path test starts a package-backed workflow, advances it to completion, and checks checkpoint `graphSource`. One pinning test replaces the registry/package with a new version and proves the active run still uses the pinned package path/version or fails on direct pinned-package mismatch.

**Test Pruning:** Inspect existing start/advance tests in `tests/coach.test.ts`; extend helper coverage rather than duplicating compact-run assertions.

**Commit:** `git commit -m "Start registered workflow packages as pinned runs"`

---

### Task 3: Dispatcher — route registered workflow starts to package-backed runs
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/dispatcher.ts`, `src/index.ts`, `tests/dispatcher.test.ts`

**Work:**
- Export the new package-backed workflow start API from `src/index.ts`.
- In dispatcher `start_run`, keep requiring a registered graph of kind `workflow`.
- Remove the `compactWorkflowHasExecutableGraph` rejection for registered workflow packages.
- Call the package-backed start API for dispatcher `start_run` actions.
- Preserve current callable `call_graph` behavior and read-only dispatcher behavior.
- Keep direct `ripplegraph start --graph` behavior unchanged for compact workflow debugging.

**Verify:**
- `npm run typecheck`
- `npm test -- tests/dispatcher.test.ts`

**Test Budget:** +1 in `tests/dispatcher.test.ts`; focused (<30s). Replace or update the current `E_GRAPH_NOT_EXECUTABLE_YET` expectation so a package-only registered workflow starts successfully and can be advanced through the coach API.

**Test Pruning:** Replace the stale rejection assertion rather than adding a second contradictory test.

**Commit:** `git commit -m "Start registered workflow packages through dispatcher"`

---

### Task 4: Final verification and contract scan
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `src/schema.ts`, `src/coach.ts`, `src/dispatcher.ts`, `src/index.ts`, `tests/coach.test.ts`, `tests/dispatcher.test.ts`

**Work:**
- Run final verification commands.
- Scan for remaining `E_GRAPH_NOT_EXECUTABLE_YET` assumptions and remove only stale code/tests tied to this assignment.
- Update implementation progress with completed tasks and verification evidence.

**Verify:**
- `npm run build`
- `npm test`
- `rg "E_GRAPH_NOT_EXECUTABLE_YET|compactWorkflowHasExecutableGraph" src tests`

**Test Budget:** +0; text-only plus final executable verification.

**Test Pruning:** Confirm no stale rejection test remains for package-backed workflow starts.

**Commit:** `git commit -m "Verify package-backed workflow execution"`
