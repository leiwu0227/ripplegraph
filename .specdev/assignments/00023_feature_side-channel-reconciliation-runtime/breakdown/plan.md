# Side-Channel And Reconciliation Runtime Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add host-submitted side-channel and external-state reconciliation records that append durable audit entries while preserving graph position.

**Architecture:** Extend the existing workflow transition log schema with two explicit operation names, then add coach-level APIs that read the focused checkpoint and append non-advancing transition entries. Expose the same APIs through JSON CLI commands; hosts still perform external work and only submit records/results.

**Tech Stack:** TypeScript, Node.js, Zod, Vitest, filesystem-backed transition logs.

**Execution Mode:** inline

**Test Budget:** <= 4 new tests across all tasks.

---

### Task 1: Runtime Audit APIs
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/schema.ts`, `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Extend workflow transition log ops with `side_channel` and `reconcile`.
- Add exported coach types/functions `recordSideChannelAction` and `reconcileExternalState`.
- Read the focused active checkpoint, append a transition entry whose `from` and `to` both equal the current position, and return the normal state without writing checkpoint/current/node artifacts.
- Compute reconciliation `aligned` by stable JSON normalization when `expected` is provided; omit drift blocking.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +2 in `tests/coach.test.ts`; focused (<30s) — one side-channel position/log test and one reconciliation drift/alignment test.

**Test Pruning:**
- Place tests near existing transition-log behavior and avoid duplicating start/step assertions.

**Commit:** `git commit -m "Add side-channel reconciliation runtime APIs"`

### Task 2: CLI Surface
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/cli.ts`, `src/index.ts`, `tests/cli.test.ts`

**Work:**
- Export the new coach APIs from the package entrypoint.
- Add `side-channel` and `reconcile` JSON CLI commands with the flags from the design.
- Parse optional JSON flags only when present; preserve existing JSON error behavior for invalid values.
- Return the API response directly as JSON.

**Verify:**
- `npm test -- tests/cli.test.ts`

**Test Budget:** +2 in `tests/cli.test.ts`; focused (<30s) — one side-channel CLI assertion and one drift reconciliation CLI assertion.

**Test Pruning:**
- Extend the existing reference CLI workflow test if readable; otherwise add one focused CLI test covering both commands.

**Commit:** `git commit -m "Expose side-channel reconciliation CLI commands"`

### Task 3: Docs, Review Changelog, And Final Verification
**Mode:** standard
**Skills:** []
**Files:** `README.md`, `.specdev/assignments/00023_feature_side-channel-reconciliation-runtime/review/implementation-changelog.md`

**Work:**
- Document the runtime audit/reconciliation commands briefly in README.
- Append the implementation changelog addressing the premature round-one findings by pointing to the plan, implementation, and verification evidence.
- Run final focused and full assignment verification.

**Verify:**
- `npm run typecheck`
- `npm test`

**Test Budget:** +0; final verification only.

**Test Pruning:**
- No new tests in this task.

**Commit:** `git commit -m "Document side-channel reconciliation runtime"`
