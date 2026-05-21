# Dispatcher Runtime Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add a two-step dispatcher runtime that exposes a validated action contract to the host agent and applies only supported structured actions through Ripplegraph-owned state transitions.

**Architecture:** Add `src/dispatcher.ts` as the single owner of dispatch request/action schemas, dispatcher selection, registry catalog summaries, and action application. Keep language judgment in the host agent, registry reads in `src/registry.ts`, and run lifecycle mutations in existing `src/coach.ts` helpers.

**Tech Stack:** TypeScript, Zod, existing JSON CLI helpers, Vitest, current compact `workflow.json` runtime.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks. The dispatcher is a new runtime surface, so the budget covers request, validation, and CLI contracts without duplicating every existing coach path.

---

### Task 1: Add Dispatcher Request Contract
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/dispatcher.ts`, `src/index.ts`, `tests/dispatcher.test.ts`

**Work:**
- Add `getDispatchRequest({ workflowRoot, request })` that requires exactly one registered `dispatcher` graph.
- Return read-only state with `status: "needs_action"`, dispatcher identity, original request, orientation, available registered graph summaries, action schema, `nextAllowedCommand`, and `helpCommand`.
- Return graph summaries from `.ripplegraph/registry.json` including id, version, kind, title, description, activationHints, effects, and path.
- Throw `E_MISSING_DISPATCHER` when no dispatcher is registered and `E_AMBIGUOUS_DISPATCHER` with candidate ids in the message when more than one dispatcher is registered.
- Export dispatcher helpers from `src/index.ts`.

**Verify:**
- `npm test -- tests/dispatcher.test.ts`

**Test Budget:** +2 in `tests/dispatcher.test.ts`; focused (<30s) - one request success test and one combined dispatcher selection error test.

**Test Pruning:**
- Inspect existing registry tests before adding helpers; reuse package-writing setup where possible instead of duplicating broad manifest assertions.

**Commit:** `git commit -m "Add dispatcher request contract"`

### Task 2: Add Dispatcher Action Runtime
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/dispatcher.ts`, `tests/dispatcher.test.ts`

**Work:**
- Add a strict Zod discriminated union for `start_run`, `resume_run`, `switch_run`, `list_runs`, `ask_user`, and `call_graph`.
- Add `applyDispatchAction({ workflowRoot, action })` that validates dispatcher availability before applying any action.
- For `list_runs`, return existing `listRuns` output plus registered graph summaries without mutating focus.
- For `ask_user`, return `status: "needs_user_input"` with the question and optional choices without mutating focus.
- For `resume_run` and `switch_run`, call `resumeRun` with the requested run id.
- For `start_run`, require a registered `workflow` graph; if the graph is not present in compact `workflow.json`, throw `E_GRAPH_NOT_EXECUTABLE_YET`; otherwise call `startRun`, generating a run id only when omitted.
- For `call_graph`, validate the target graph id/kind and return `E_CALLABLE_RUNTIME_NOT_IMPLEMENTED`.
- Reject unknown graph ids, wrong graph kinds, and malformed action payloads with clear `RipplegraphError` codes.

**Verify:**
- `npm test -- tests/dispatcher.test.ts`

**Test Budget:** +3 in `tests/dispatcher.test.ts`; focused (<30s) - one read-only action test, one executable `start_run`/resume path test, and one unsupported/error-path test covering not-executable or callable behavior.

**Test Pruning:**
- Prefer combined assertions over separate tests for each action when the same setup covers multiple actions.

**Commit:** `git commit -m "Add dispatcher action runtime"`

### Task 3: Wire Dispatch CLI
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/cli.ts`, `tests/cli.test.ts`

**Work:**
- Add `dispatch --request <text> [--workflow-root <path>]` and `dispatch --action <json> [--workflow-root <path>]` to the low-level JSON CLI.
- Parse action JSON through existing CLI helpers and emit dispatcher errors through existing `jsonErrorPayload`.
- Update help text so the dispatcher command is discoverable without changing existing debug commands.
- Keep request and action mutually exclusive; reject missing or conflicting flags with `E_MISSING_ARG` or another existing clear CLI error.

**Verify:**
- `npm test -- tests/cli.test.ts`

**Test Budget:** +0 in `tests/cli.test.ts`; focused (<30s) - extend the existing registry CLI test with minimal dispatch request/action assertions instead of adding a new test.

**Test Pruning:**
- Do not add a separate CLI test when the existing graph registry CLI fixture can register a dispatcher and exercise dispatch.

**Commit:** `git commit -m "Wire dispatcher CLI"`

### Task 4: Document And Build Dispatcher Runtime
**Mode:** lightweight
**Skills:** []
**Files:** `README.md`, `.specdev/project_notes/big_picture.md`, `dist/`

**Work:**
- Document the two-step dispatcher loop, registered dispatcher requirement, supported action names, and current executable limitation for registered package workflows.
- Update project notes to reflect dispatcher runtime status and the remaining package-execution/callable/effects gaps.
- Run the build so tracked `dist/` output matches source changes.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`

**Test Budget:** +0; full assignment verification (<2m)

**Test Pruning:**
- No new tests for documentation/build output.

**Commit:** `git commit -m "Document dispatcher runtime"`
