# Codebase Cleanup Review Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Review and clean up the ripplegraph codebase by removing real maintenance drag while preserving current runtime and CLI behavior.

**Architecture:** Use a staged cleanup: document concrete findings, consolidate low-risk duplication, then split private runtime helpers around stable boundaries. Existing package exports remain compatible for this assignment, but newly extracted internal helpers must not be exported from `src/index.ts` unless they are intentionally public.

**Tech Stack:** TypeScript, Node.js ESM, Zod, Vitest, filesystem JSON state.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks.

---

### Task 1: Record Cleanup Findings and API Decision
**Mode:** lightweight
**Skills:** []
**Files:** `.specdev/assignments/00006_refactor_codebase-cleanup-review/implementation/cleanup-review.md`, `src/index.ts`

**Work:**
- Create `implementation/cleanup-review.md` with the verified findings from the brainstorm and review loop.
- Record the public API decision: keep current `src/index.ts` exports compatible during this cleanup, but do not export newly extracted internal helpers.
- Inspect `src/index.ts` and add no new exports in this task unless a later task requires compatibility preservation.
- Note any findings intentionally deferred so they are not rediscovered as ambiguous leftovers.

**Verify:**
- `test -f .specdev/assignments/00006_refactor_codebase-cleanup-review/implementation/cleanup-review.md`
- `rg "Public API decision|Deferred" .specdev/assignments/00006_refactor_codebase-cleanup-review/implementation/cleanup-review.md`

**Test Budget:** +0; text-only

**Test Pruning:**
- No executable tests for documentation-only cleanup review.

**Commit:** `git commit -m "record codebase cleanup findings"`

### Task 2: Consolidate CLI Argument and Error Helpers
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/internal/cli-helpers.ts`, `src/cli.ts`, `src/demo-cli.ts`, `tests/cli.test.ts`, `tests/demo-cli.test.ts`

**Work:**
- Add an internal CLI helper module for shared argument parsing, `stringFlag`, `workflowRoot`, required-value handling, JSON parsing from strings/files, and Ripplegraph error formatting.
- Preserve the low-level `ripplegraph` JSON output contract, including JSON error payloads on stdout.
- Preserve the `ripplegraph-demo` text output contract, including stderr error text and `--file` submit support.
- Keep renderer-specific code in each CLI; only consolidate common plumbing.
- Add or adjust focused tests only if existing CLI tests do not catch a changed helper behavior.

**Verify:**
- `npm test -- tests/cli.test.ts tests/demo-cli.test.ts`

**Test Budget:** +1 across `tests/cli.test.ts` or `tests/demo-cli.test.ts`; focused (<30s)

**Test Pruning:**
- Prefer extending existing CLI flow tests over adding a standalone parser test unless parser behavior is otherwise uncovered.

**Commit:** `git commit -m "consolidate cli helpers"`

### Task 3: Extract Runtime Navigation and Validation Helpers
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/internal/runtime-graph.ts`, `src/internal/output-validation.ts`, `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Move graph/node lookup, edge selection, and `when` matching from `src/coach.ts` into `src/internal/runtime-graph.ts`.
- Move the current minimal JSON-schema output validator from `src/coach.ts` into `src/internal/output-validation.ts`.
- Do not broaden validation semantics unless an existing defect is found; preserve current error paths and messages.
- Keep lifecycle state transitions in `src/coach.ts` if that remains the clearest boundary.
- Add focused coverage for validation semantics if current tests only cover the top-level invalid-output response.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Extend the invalid-output test to cover the smallest missing validator contract instead of adding overlapping validation tests.

**Commit:** `git commit -m "extract runtime graph and validation helpers"`

### Task 4: Extract Coach Response and Transition Construction
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/internal/coach-responses.ts`, `src/internal/transitions.ts`, `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Move `stateForCheckpoint`, previous/next context shaping, and resumable run summary shaping into `src/internal/coach-responses.ts`.
- Move transition-log entry construction into `src/internal/transitions.ts`.
- Keep public `getState`, `listRuns`, `startRun`, `stepRun`, `suspendRun`, `resumeRun`, `abandonRun`, and `validateWorkflowRoot` behavior unchanged.
- Ensure new internal modules import storage/schema APIs directly and are not re-exported from `src/index.ts`.

**Verify:**
- `npm test -- tests/coach.test.ts`

**Test Budget:** +0; covered by existing coach behavior tests

**Test Pruning:**
- Do not add implementation-detail tests for private response helpers; preserve public coach contract coverage.

**Commit:** `git commit -m "split coach response helpers"`

### Task 5: Deduplicate Test Workflow Fixtures
**Mode:** standard
**Skills:** test-driven-development
**Files:** `tests/helpers/workflows.ts`, `tests/cli.test.ts`, `tests/coach.test.ts`, `tests/demo-cli.test.ts`

**Work:**
- Add a small test helper that creates temporary workflow roots and writes reusable workflow JSON fixtures.
- Support the existing variations: single-graph CLI flow, multi-graph coach flow, and demo CLI required-output flow.
- Replace repeated inline `makeRoot()` workflow JSON blocks while keeping each test explicit about the scenario it covers.
- Keep storage path assertions and CLI output assertions in their existing test files.

**Verify:**
- `npm test -- tests/cli.test.ts tests/coach.test.ts tests/demo-cli.test.ts`

**Test Budget:** +0; refactor existing tests only

**Test Pruning:**
- Remove duplicated inline workflow literals as the helper replaces them.

**Commit:** `git commit -m "deduplicate workflow test fixtures"`

### Task 6: Clarify Template and Example Drift, Then Verify
**Mode:** standard
**Skills:** systematic-debugging
**Files:** `templates/minimal/AGENT.md`, `examples/minimal/AGENT.md`, `tests/demo-cli.test.ts`, `package.json`, `dist/`

**Work:**
- Decide whether the detailed template agent guide and abbreviated example quickstart should remain different; document the reason in the files if useful.
- Add a lightweight executable or test assertion that `templates/minimal/workflow.json` and `examples/minimal/workflow.json` stay identical, unless implementation finds they should intentionally diverge.
- Run a dead-code/export scan over `src/`, `bin/`, tests, templates, and package entrypoints; record any deferred cleanup in `implementation/cleanup-review.md`.
- Run final verification and build. Regenerate `dist/` only if the package convention for this repo expects built output updated with source changes.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack --dry-run`

**Test Budget:** +1 in `tests/demo-cli.test.ts`; final verification (<2m)

**Test Pruning:**
- Add only one workflow-drift check; do not duplicate template content assertions elsewhere.

**Commit:** `git commit -m "verify cleanup and template drift"`
