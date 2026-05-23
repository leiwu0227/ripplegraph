# Kernel Final Cleanups Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Land two small follow-ups: factor a shared `buildInitialCheckpoint` helper used by both workflow start APIs, and document/lock the dispatcher's dual action-schema arrangement.

**Architecture:** Pure refactor + one drift-detection test. `src/coach.ts` and `src/dispatcher.ts` only.

**Tech Stack:** TypeScript + Zod + Vitest. No new deps.

**Execution Mode:** inline

**Test Budget:** +1 test total.

---

### Task 1: Extract `buildInitialCheckpoint`
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/coach.ts`

**Work:**
- Add a private `buildInitialCheckpoint({ runId, rootGraph, entryNode, workflow, graphSource? })` helper.
- Replace the two checkpoint construction blocks in `startRun` and `startRegisteredWorkflowRun` with calls to the helper.
- Confirm `createRun` still receives the same shape and that timestamps work as before (single `new Date().toISOString()` in the helper).

**Verify:**
- `npm run typecheck`
- `npm test -- tests/coach.test.ts tests/dispatcher.test.ts`

**Test Budget:** +0; behavior unchanged so existing tests cover it.

**Commit:** `git commit -m "Factor shared initial-checkpoint construction"`

---

### Task 2: Dispatcher dual-schema comment + drift test
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/dispatcher.ts`, `tests/dispatcher.test.ts`

**Work:**
- Add a short comment above `dispatcherActionSchema` (and a cross-pointer above `dispatchActionSchema`) explaining the dual role: server validator vs agent contract.
- Export both schemas from `dispatcher.ts` for test use.
- Add a `tests/dispatcher.test.ts` case asserting both schemas declare the same set of `action` discriminator values.

**Verify:**
- `npm run typecheck`
- `npm test -- tests/dispatcher.test.ts`

**Test Budget:** +1 in `tests/dispatcher.test.ts`.

**Commit:** `git commit -m "Lock dispatcher action schemas with drift test"`

---

### Task 3: Build and full verification
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `dist/`, `.specdev/assignments/00020_refactor_kernel-final-cleanups/implementation/progress.json`

**Work:**
- Rebuild dist artifacts.
- Run full verification.
- Update progress.json.

**Verify:**
- `npm run build`
- `npm test`

**Test Budget:** +0.

**Commit:** `git commit -m "Build kernel final cleanup artifacts"`
