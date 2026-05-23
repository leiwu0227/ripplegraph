# Kernel Cleanups Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Apply three kernel simplifications (drop `decisionSource.system`, replace frame-scope regex with monotonic counter + one-shot migration, add checkpoint stack/position invariant) with no externally visible semantic change.

**Architecture:** All three changes live in `src/schema.ts` and `src/coach.ts`. The schema gains a counter field and a `superRefine`; the runtime gains a tiny `ensureFrameCounter` helper and loses `nextFrameScope`. Tests cover the new invariant, sibling-scope numbering, and removal of the `system` variant.

**Tech Stack:** TypeScript + Zod + Vitest. No new deps.

**Execution Mode:** inline

**Test Budget:** ≤ 4 new/modified tests total.

---

### Task 1: Drop `decisionSource.system` variant
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `tests/coach.test.ts`

**Work:**
- Remove the `system` variant from `decisionSourceSchema` so the discriminated union has only `human` and `tool`.
- Remove any references to `system` in tests, fixtures, and helpers.
- Confirm `tool` still requires `tool: idSchema` and that `human` still has only optional `label`.

**Verify:**
- `npm run typecheck`
- `npm test -- tests/coach.test.ts`

**Test Budget:** +0 net (delete `system`-specific test if present; existing `human`/`tool` coverage stays).

**Commit:** `git commit -m "Drop decisionSource system variant"`

---

### Task 2: Frame-scope monotonic counter with one-shot migration
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Add `frameCounter: z.number().int().nonnegative().default(0)` to `checkpointSchema`.
- Replace `nextFrameScope` with an `ensureFrameCounter(checkpoint)` migration helper that, when `frameCounter === 0`, scans both `checkpoint.stack` (scopes) and `checkpoint.outputs` keys (`^f(\d+)/`) and sets the counter to the max observed.
- In `enterWorkflowRefs`, call `ensureFrameCounter(checkpoint)` once at the top, then allocate each new frame scope as `` `f${++checkpoint.frameCounter}` ``.
- Delete `nextFrameScope`.

**Verify:**
- `npm run typecheck`
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; assert that after entering child A (scope `f1`), exiting, and entering child B from a sibling ref node, child B's scope is `f2` and `checkpoint.frameCounter === 2`.

**Commit:** `git commit -m "Persist frame scope counter on checkpoint"`

---

### Task 3: Checkpoint stack/position invariant via superRefine
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `tests/coach.test.ts`

**Work:**
- Add a `.superRefine` on `checkpointSchema` that computes the expected active graph (`stack.at(-1)?.child.graphId ?? graphSource?.graphId ?? rootGraph`) and rejects when `position.graph` doesn't match.
- The refinement must allow all valid existing checkpoints in tests (compact root run, package-backed root run, nested run) to keep passing.

**Verify:**
- `npm run typecheck`
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; write a hand-built checkpoint JSON to disk with a mismatched `position.graph`, then assert `readCheckpoint` throws a Zod validation error mentioning `position.graph`.

**Commit:** `git commit -m "Assert checkpoint stack/position consistency"`

---

### Task 4: Build and full verification
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `dist/`, `.specdev/assignments/00019_refactor_kernel-cleanups/implementation/progress.json`

**Work:**
- Rebuild tracked `dist/` artifacts.
- Run full verification.
- Scan for stale `system` decisionSource references and stale `nextFrameScope` mentions.
- Update implementation progress with completed task summaries.

**Verify:**
- `npm run build`
- `npm test`
- `rg "nextFrameScope|'system'" src tests`

**Test Budget:** +0.

**Commit:** `git commit -m "Build kernel cleanup artifacts"`
