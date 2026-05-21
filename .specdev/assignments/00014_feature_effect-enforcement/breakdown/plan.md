# Effect Enforcement Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Block effectful workflow and callable graph execution unless the caller explicitly allows the graph's declared effects.

**Architecture:** Add a small reusable effect-policy module, then enforce graph-level effects at every execution boundary before durable state mutation. Runtime APIs accept an optional `effectPolicy`, while read-only catalog and state inspection remain grant-free.

**Tech Stack:** TypeScript ESM, Zod schemas, Vitest, handwritten JSON CLI parser.

**Execution Mode:** inline

**Test Budget:** <= 5 new tests across all tasks. Prefer extending existing runtime tests and combining related assertions.

---

### Task 1: Add Effect Policy Core
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/effects.ts`, `src/index.ts`, `tests/effects.test.ts`

**Work:**
- Add `EffectPolicy`, `EffectCheck`, `checkEffects`, and `assertEffectsAllowed`.
- Treat empty required effects as allowed without policy.
- Treat non-empty required effects as denied unless all are in `allowedEffects`.
- Deduplicate required and allowed effects for stable missing-effect output.
- Throw `RipplegraphError` with code `E_EFFECT_NOT_ALLOWED` and a context-aware message.
- Export the public effect helpers from `src/index.ts`.

**Verify:**
- `npm test -- tests/effects.test.ts`
- `npm run typecheck`

**Test Budget:** +1 in `tests/effects.test.ts`; focused (<30s)

**Test Pruning:**
- No existing effect-policy tests exist; keep the new test table-driven and compact.

**Commit:** `git commit -m "Add effect policy checks"`

### Task 2: Enforce Direct Workflow Starts
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Extend `StartRunOptions` with `effectPolicy?: EffectPolicy`.
- In `startRun`, load the workflow and select the graph first, then enforce `graph.effects` before `ensureWorkflowRoot()` or any state reads/writes.
- Preserve existing behavior for effect-free graphs.
- Verify denied starts do not create `.ripplegraph/current.json`, `.ripplegraph/runs/`, or a checkpoint.

**Verify:**
- `npm test -- tests/coach.test.ts`
- `npm run typecheck`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Inspect existing start-run tests and extend the nearest direct-start section instead of adding duplicate setup.

**Commit:** `git commit -m "Enforce effects on workflow starts"`

### Task 3: Enforce Callable and Dispatcher Starts
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/callable.ts`, `src/dispatcher.ts`, `tests/callable.test.ts`, `tests/dispatcher.test.ts`

**Work:**
- Extend `StartCallableCallOptions` and `DispatchActionOptions` with `effectPolicy?: EffectPolicy`.
- In `startCallableCall`, enforce the loaded callable package manifest effects before input validation or checkpoint creation.
- In `applyDispatchAction`, enforce selected registry entry effects for `start_run` and `call_graph`, then pass the policy to `startRun` or `startCallableCall`.
- Leave `dispatch --request`, `list_runs`, `switch_run`, and read-only/state commands unchanged.
- Verify denied dispatcher actions do not create runs, calls, or focus state.

**Verify:**
- `npm test -- tests/callable.test.ts tests/dispatcher.test.ts`
- `npm run typecheck`

**Test Budget:** +2 in `tests/callable.test.ts`, `tests/dispatcher.test.ts`; focused (<30s) -- one direct callable boundary and one dispatcher boundary are different public contracts.

**Test Pruning:**
- Reuse existing registered graph fixtures and remove any redundant assertions that only repeat existing wrong-kind or unknown-graph coverage.

**Commit:** `git commit -m "Enforce effects through callable and dispatcher starts"`

### Task 4: Wire CLI Allow-Effect Flags
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/internal/cli-helpers.ts`, `src/cli.ts`, `tests/cli.test.ts`

**Work:**
- Update CLI flag parsing or add a helper so repeated `--allow-effect <effect>` values are preserved instead of overwritten.
- Add a normalizer for repeated `--allow-effect` plus comma-separated `--allow-effects a,b`.
- Pass the resulting `EffectPolicy` into `start`, `call`, and `dispatch --action`.
- Keep commands without execution, including `dispatch --request` and `graph list`, free of effect requirements.

**Verify:**
- `npm test -- tests/cli.test.ts`
- `npm run typecheck`

**Test Budget:** +1 in `tests/cli.test.ts`; focused (<30s)

**Test Pruning:**
- Extend existing CLI smoke coverage rather than adding separate tests for both flag spellings unless a single test cannot cover parser preservation.

**Commit:** `git commit -m "Add CLI effect allow flags"`

### Task 5: Document Effect Enforcement
**Mode:** lightweight
**Skills:** []
**Files:** `README.md`, `.specdev/project_notes/big_picture.md`

**Work:**
- Replace metadata-only wording with the new deny-by-default enforcement behavior for effectful graph starts and calls.
- Document example effects, CLI allow flags, read-only command behavior, and non-goals such as OS sandboxing and script execution.
- Keep wording clear for downstream CLI authors building on Ripplegraph as a coach backbone.

**Verify:**
- `rg -n "effects|allow-effect|E_EFFECT_NOT_ALLOWED|metadata only" README.md .specdev/project_notes/big_picture.md`
- `npm run typecheck`

**Test Budget:** +0; text-only

**Test Pruning:**
- No test changes for docs.

**Commit:** `git commit -m "Document effect enforcement policy"`

### Final Verification
**Mode:** standard
**Skills:** verification-before-completion
**Files:** `package.json`, full changed set

**Work:**
- Run focused tests from each task if not already run after final edits.
- Run full project verification.
- Run implementation reviewloop with Codex after implementation is complete.

**Verify:**
- `npm test`
- `npm run typecheck`
- `npm run build`
- `specdev reviewloop implementation --reviewer=codex`

**Test Budget:** +0; final verification only

**Test Pruning:**
- Confirm added tests are within the plan budget and no stale duplicate assertions were introduced.

**Commit:** `git commit -m "Approve effect enforcement implementation"` after review approval and any required fixes.
