# Workflow Start Requirements Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add graph-level workflow start requirements that hosts evaluate and Ripplegraph enforces before creating a run.

**Architecture:** Requirements are graph package metadata, preserved in registry and dispatch summaries. Hosts pass `preconditionState` into `startRun()` directly or through dispatcher/CLI start paths; `startRun()` throws a structured `RipplegraphError` before writing runtime state when any declared requirement is false or missing.

**Tech Stack:** TypeScript / Node.js, Zod runtime schemas, filesystem-backed registry and run state, Vitest.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks. Coverage should prune/extend nearby schema, registry, coach, dispatcher, and CLI tests rather than adding broad duplicate cases.

---

### Task 1: Add Requirement Metadata And Error Details Types
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/registry.ts`, `src/dispatcher.ts`, `tests/graph-package.test.ts`, `tests/registry.test.ts`, `tests/dispatcher.test.ts`, `tests/helpers/workspace.ts`

**Work:**
- Add a reusable requirement schema/type with `id`, `describe`, optional `unmetRedirect`, and optional `unmetMessage`.
- Add `requires` to graph package manifests with default `[]`.
- Add optional structured `details` to `RipplegraphError` while preserving existing two-argument construction.
- Preserve `requires` through registry entries and test workspace helpers.
- Expose `requires` in `RegisteredGraphSummary` and `getDispatchRequest().availableGraphs`.

**Verify:**
- `npx vitest run tests/graph-package.test.ts tests/registry.test.ts tests/dispatcher.test.ts`

**Test Budget:** +2 across `tests/graph-package.test.ts`, `tests/registry.test.ts`, `tests/dispatcher.test.ts`; focused (<30s) — metadata has three public surfaces that should be covered together.

**Test Pruning:**
- Extend existing metadata tests instead of adding separate one-off tests where assertions can fit current cases.

**Commit:** `git commit -m "Add workflow start requirement metadata"`

### Task 2: Enforce Requirements In startRun
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `tests/coach.test.ts`, `tests/helpers/workspace.ts`

**Work:**
- Add `preconditionState?: Record<string, boolean>` to `StartRunOptions`.
- In `startRun()`, check the target manifest's `requires` before effect-policy checks and before any run state is written.
- Treat missing predicate keys and values other than `true` as unmet.
- Throw `E_START_REQUIREMENTS_UNMET` with details `{ graphId, unmet }`, where each unmet item includes `id`, `describe`, optional `redirectTo`, and optional `message`.
- Keep existing no-run-created behavior aligned with effect-policy failures.

**Verify:**
- `npx vitest run tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s) — combine false/missing fail-closed and successful true state in one scenario if practical.

**Test Pruning:**
- Reuse existing start preflight tests around effect denial/no state creation where possible.

**Commit:** `git commit -m "Enforce workflow start requirements"`

### Task 3: Wire Dispatcher And CLI Start Paths
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/dispatcher.ts`, `src/cli.ts`, `src/internal/cli-helpers.ts`, `tests/dispatcher.test.ts`, `tests/cli.test.ts`

**Work:**
- Add `preconditionState` to dispatcher `start_run` validation in both Zod and JSON Schema contracts.
- Forward dispatcher `preconditionState` to `startRun()`.
- Add `--precondition-state <json>` to `ripplegraph start`, parse it as an object, update help text, and forward it to `startRun()`.
- Update `jsonErrorPayload()` to include `details` when a `RipplegraphError` carries one, preserving the existing shape for errors without details.

**Verify:**
- `npx vitest run tests/dispatcher.test.ts tests/cli.test.ts`

**Test Budget:** +2 across `tests/dispatcher.test.ts` and `tests/cli.test.ts`; focused (<30s) — one dispatcher contract/pass-through case and one CLI details/error case.

**Test Pruning:**
- Extend current dispatcher schema sync and CLI start tests rather than creating new broad suites.

**Commit:** `git commit -m "Wire start requirement state through dispatcher and CLI"`

### Task 4: Final Verification And Documentation Touches
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `README.md`, `docs/building-product-clis-on-ripplegraph.md`, `.specdev/assignments/00027_feature_workflow-start-requirements/implementation/progress.json`

**Work:**
- Update user-facing docs that describe graph metadata and start/dispatch behavior so `requires` and host-supplied predicate state are discoverable.
- Run focused and package-level verification.
- Record implementation progress according to the implementing guide.

**Verify:**
- `npx vitest run`
- `npm run build`

**Test Budget:** +0; verification/docs only.

**Test Pruning:**
- Do not add docs-only tests unless an existing docs assertion fails and needs updating.

**Commit:** `git commit -m "Document workflow start requirements"`
