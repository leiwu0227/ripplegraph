# Implementation Plan: Package-folder workflow execution

**Execution mode:** inline
**Test budget:** ≤ 3 new tests across the plan (one for unknown-graph/wrong-kind, one for bundled-template parity, one slack for emergent coverage).
**Verification baseline:** `pnpm test` (currently 63 passing across 9 files); `pnpm run build`; `pnpm run typecheck`.

## Goal recap

Make the package registry the sole runtime source of graph definitions.
Strip `workflow.json` to a workspace manifest (`id`, `version`, optional
`title`/`description`/`entryGraph`). Consolidate the two `startRun*` entry
points into one registry-resolved `startRun`. Replace inline test fixtures
with a shared workspace helper. Restructure the demo template into
`workflow.json` + `.ripplegraph/registry.json` + `.ripplegraph/graphs/<id>/`.
Update README to reflect kernel readiness.

## Task ordering rationale

Tasks are ordered so the suite stays green after each commit:
1. Add a `createTestWorkspace` helper that builds package-folder layouts and
   migrate every test file to call it. Tests still drive
   `startRegisteredWorkflowRun` / dispatcher / registered start paths —
   already supported by the kernel — so the suite stays green.
2. Once all tests run registry-only, shrink the schema and consolidate the
   coach API. No test changes needed; the legacy `startRun(graph)` path is
   no longer reachable by any test.
3. Update consumers (CLI, demo-cli, template) to match the new API.
4. Add the two new tests (unknown-graph, template parity) and update README.

### Task 1: Add `createTestWorkspace` helper and migrate test fixtures

**Mode:** standard
**Skills:** none
**Files:**
- `tests/helpers/workspace.ts` (new)
- `tests/callable.test.ts`
- `tests/cli.test.ts`
- `tests/coach.test.ts`
- `tests/demo-cli.test.ts`
- `tests/dispatcher.test.ts`
- `tests/effects.test.ts`
- `tests/graph-package.test.ts`
- `tests/output-validation.test.ts`
- `tests/registry.test.ts`

**Work:**
- Add `tests/helpers/workspace.ts` exporting `createTestWorkspace({
  rootDir, workspace?: { id, version, title?, description?, entryGraph? },
  graphs: Array<GraphPackageManifestInput> })`. Each graph input is the
  inline graph body plus `{ id, version }`; the helper writes
  `<rootDir>/workflow.json` (workspace manifest only — no `graphs` field
  yet, but the existing schema still accepts manifests with `graphs`
  because we have not shrunk it), writes
  `<rootDir>/.ripplegraph/graphs/<id>/graph.json` for each graph, and
  pre-populates `<rootDir>/.ripplegraph/registry.json` with entries
  pointing at those folders.
- In every test that today writes inline `workflow.json` graphs, replace
  the literal JSON build-up with `createTestWorkspace(...)`. Each
  per-test fixture becomes a list of manifests. Switch all
  `startRun({ graph })` calls in tests to
  `startRegisteredWorkflowRun({ graphId })`, switch demo-cli/cli tests'
  `start <graph-id>` invocations to graph ids that match registered
  packages (they already do — the demo template's `change-intake` etc.
  match `graph.id`).
- Keep tests in their current files and at their current count.

**Verify:**
- `pnpm test` — all 63 tests still pass.
- `pnpm run typecheck`.

**Test Budget:** +0 new tests; pure migration.

**Test Pruning:** Within touched files, delete any duplicate "inline graph"
builders; replace them with helper calls.

**Commit:** `Migrate tests to package-folder fixtures via createTestWorkspace helper`

### Task 2: Shrink workspace manifest + consolidate coach API

**Mode:** standard
**Skills:** none
**Files:**
- `src/schema.ts`
- `src/coach.ts`
- `src/internal/runtime-graph.ts`
- `src/dispatcher.ts`
- `src/internal/coach-responses.ts`
- `src/internal/dispatcher-resolution.ts` (new) — or keep `resolveDispatcher`
  inside `src/dispatcher.ts` and export it; pick whichever keeps the diff
  smaller.
- `src/index.ts`

**Work:**
- In `src/schema.ts`, replace `workflowSchema` with a strict object of
  `{ id, version, title?, description?, entryGraph? }`. Remove the
  `entryGraph`-must-be-dispatcher superrefine — it is enforced at runtime
  now. Keep all other schemas unchanged.
- In `src/dispatcher.ts`, replace `selectDispatcher(graphs)` with a
  registry-driven `resolveDispatcher(workflowRoot)`:
  ```ts
  export function resolveDispatcher(workflowRoot: string): RegisteredGraphSummary {
    const dispatchers = listRegisteredGraphs(workflowRoot)
      .filter((entry) => entry.kind === 'dispatcher');
    if (dispatchers.length === 0) throw new RipplegraphError('E_MISSING_DISPATCHER', ...);
    if (dispatchers.length > 1) throw new RipplegraphError('E_AMBIGUOUS_DISPATCHER', ...);
    const dispatcher = dispatchers[0]!;
    const manifestEntry = loadWorkflow(workflowRoot).entryGraph;
    if (manifestEntry && manifestEntry !== dispatcher.id) {
      throw new RipplegraphError(
        'E_ENTRY_GRAPH_MISMATCH',
        `workspace entryGraph ${manifestEntry} does not match registered dispatcher ${dispatcher.id}`,
      );
    }
    return graphSummary(dispatcher);
  }
  ```
  Use this helper from both `getDispatchRequest` / `applyDispatchAction`
  (replacing the existing `selectDispatcher(graphs)` calls) and from
  `getState`'s `no_focused_run` branch.
- In `src/coach.ts`:
  - Delete the legacy `startRun(opts)` signature; rename
    `startRegisteredWorkflowRun` to `startRun`. Update
    `StartRunOptions = { workflowRoot, graphId, runId, effectPolicy? }`.
  - Delete `StartRegisteredWorkflowRunOptions`.
  - Update `validateWorkflowRoot` to return registered graph ids from
    `listRegisteredGraphs`.
  - In `activeContextForCheckpoint`, remove the inline-graphs fallback.
    Every checkpoint produced by the new `startRun` has `graphSource`; if
    `graphSource` is missing on a read, raise
    `E_INVALID_CHECKPOINT` (or a fresh `E_MISSING_GRAPH_SOURCE`) with a
    clear message — but in practice this is unreachable, since
    `checkpointSchema` doesn't require `graphSource` only because callable
    callers and pre-existing runs may lack it. Re-check whether any
    runtime path can land here without `graphSource`; if not, simply
    `throw new RipplegraphError('E_MISSING_GRAPH_SOURCE', ...)`. Tests
    will fail loudly if a path is missed.
  - Remove `assertGraphAndChildEffectsAllowed`'s `graphId` parameter
    redundancy if it is now derivable; otherwise leave as-is.
  - Update `getState`'s `no_focused_run` branch:
    - `availableGraphs` ← `listRegisteredGraphs(root)`.
    - `dispatcher` ← attempt `resolveDispatcher(root)`; on
      `E_MISSING_DISPATCHER` / `E_AMBIGUOUS_DISPATCHER` /
      `E_ENTRY_GRAPH_MISMATCH`, omit the dispatcher field and use the
      "Start or resume a run" orientation.
- In `src/internal/runtime-graph.ts`, delete `getGraph(workflow, name)`.
  Keep `getNode` and `selectEdge`.
- In `src/index.ts`, drop any export of the now-deleted
  `startRegisteredWorkflowRun` (rename it to `startRun`) and the
  deleted `StartRegisteredWorkflowRunOptions`.
- In `src/internal/coach-responses.ts` and anywhere else that calls
  `getGraph`, switch to the graphSource-resolved active graph.

**Verify:**
- `pnpm run typecheck` — clean.
- `pnpm test` — all 63 tests still pass (migrated test fixtures already
  go through registered graphs).

**Test Budget:** +0 new tests.

**Test Pruning:** none.

**Commit:** `Consolidate workspace manifest and startRun on the registry`

### Task 3: Update CLI, demo-cli, and minimal template

**Mode:** standard
**Skills:** none
**Files:**
- `src/cli.ts`
- `src/demo-cli.ts`
- `templates/workflow.json.tmpl`
- `templates/minimal/workflow.json` → `templates/minimal/workflow.json`
  (rewritten as workspace manifest)
- `templates/minimal/.ripplegraph/registry.json` (new)
- `templates/minimal/.ripplegraph/graphs/workspace-dispatcher/graph.json` (new)
- `templates/minimal/.ripplegraph/graphs/change-intake/graph.json` (new)
- `templates/minimal/.ripplegraph/graphs/architecture-sweep/graph.json` (new)

**Work:**
- `src/cli.ts`:
  - `start --graph <graphId>` flag continues to work; internally it now
    calls the unified `startRun({ graphId, runId, ... })`.
  - `validate` returns registered graph ids (already updated via
    `validateWorkflowRoot` change in task 2).
  - Remove any reference to inline graph lookup from CLI text/help.
  - Update the `HELP` text only where the command spelling changed.
- `src/demo-cli.ts`:
  - `start <graphId>` calls the unified `startRun`.
  - `renderNoFocusedRun`: `state.availableGraphs` now contains registry
    entries (id+kind+title), not strings. Update rendering to show
    `id  kind  title` lines.
  - `initDemoProject` copies the new template layout: it copies
    `workflow.json` to `<root>/workflow.json` (workspace manifest at the
    root, not the hidden path — same as today, but with the new shrunken
    content), copies the `.ripplegraph/registry.json` and
    `.ripplegraph/graphs/*` subtree into `<root>/.ripplegraph/`, and
    copies the docs (AGENT.md, engineering-playbook.md, repo-brief.md,
    work-items/inbox.json) to `<root>/`. Force semantics unchanged.
- `templates/workflow.json.tmpl`:
  ```json
  {
    "id": "replace-me",
    "version": "0.1.0"
  }
  ```
- `templates/minimal/workflow.json`: shrink to
  `{ id: "engineering-coach-demo", version: "0.4.0", entryGraph:
  "workspace-dispatcher", title, description }` — drop the `graphs`
  map entirely.
- For each demo graph (`workspace-dispatcher`, `change-intake`,
  `architecture-sweep`), lift the inline body into
  `templates/minimal/.ripplegraph/graphs/<id>/graph.json` adding `id` and
  `version` (`0.4.0` to match the workspace) to each package manifest.
- `templates/minimal/.ripplegraph/registry.json` lists those three
  packages with workspace-relative `path` values
  (`.ripplegraph/graphs/<id>`), correct `kind`, `version`, and a
  `registeredAt` ISO timestamp (use a frozen string like
  `"2026-01-01T00:00:00.000Z"` — `loadGraphPackage` re-validates the
  manifest on resolve, so timestamps are cosmetic).

**Verify:**
- `pnpm test` — green. (Demo-cli tests already exercise `init` + `start
  workspace-dispatcher` / `change-intake`; they pass only if the new
  template layout is wired correctly.)
- Quick manual check: `rm -rf /tmp/rg-demo && node ./node_modules/typescript/lib/tsc.js
  && node bin/ripplegraph-demo init /tmp/rg-demo && ls /tmp/rg-demo
  /tmp/rg-demo/.ripplegraph/graphs && node bin/ripplegraph-demo status
  --workflow-root /tmp/rg-demo`. (Optional; only if tests pass.)

**Test Budget:** +0 new tests.

**Test Pruning:** none.

**Commit:** `Register demo template graphs and resolve CLI start through the registry`

### Task 4: Add unknown-graph / wrong-kind test and bundled-template parity test

**Mode:** standard
**Skills:** none
**Files:**
- `tests/coach.test.ts` (one new test)
- `tests/templates.test.ts` (new file, one test)
- `src/demo-cli.ts` (read-only; no edits)

**Work:**
- In `tests/coach.test.ts`, add a single new test:
  `startRun rejects unknown and wrong-kind graph ids`. Set up an empty
  workspace via the helper, then assert that `startRun({ graphId:
  'missing', runId: 'r1' })` throws `E_UNKNOWN_GRAPH`; register a
  callable graph and assert `startRun({ graphId: '<callable id>',
  runId: 'r2' })` throws `E_WRONG_GRAPH_KIND`. This pins the new public
  surface.
- Add `tests/templates.test.ts` with a single test: load every entry
  from `templates/minimal/.ripplegraph/registry.json` via
  `loadGraphPackage` on the resolved package folder and assert that
  manifest `id` / `kind` / `version` match the registry entry. This
  catches drift between the bundled registry and the bundled
  `graph.json` files.

**Verify:**
- `pnpm test` — 65 tests passing (63 + 2 new).

**Test Budget:** +2 new tests; combined runtime focused (<5s).

**Test Pruning:** none.

**Commit:** `Pin unknown-graph and bundled-template parity contracts`

### Task 5: Update README

**Mode:** lightweight
**Skills:** none
**Files:**
- `README.md`
- `AGENTS.md` (only if it has a contradicting "future runtime work" line —
  spot-check; skip if not)

**Work:**
- Remove the "Package-folder workflow execution is still future runtime
  work." sentence in `README.md`.
- Rework the "Architecture Direction" paragraph to state that
  package-folder execution is the runtime model and `workflow.json` is a
  workspace manifest. Keep the rest of the README intact.
- Update the package manifest example block if it references inline
  graphs.

**Verify:** text-only scan; no new tests.

**Test Budget:** +0; text-only.

**Test Pruning:** none.

**Commit:** `Document package-folder execution as the runtime model`
