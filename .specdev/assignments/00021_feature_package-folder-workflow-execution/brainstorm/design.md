## Overview

Today ripplegraph carries two parallel sources of truth for graph definitions
in a workspace:

1. **`workflow.json`** at the workspace root (or `.ripplegraph/workflow.json`),
   parsed by `workflowSchema` in `src/schema.ts`. Its `graphs` field is a map
   from graph-id to inline graph definitions; `loadWorkflow` returns this
   envelope, and `getGraph(workflow, name)` looks graphs up inside it.
2. **The package registry** under `.ripplegraph/registry.json`, parsed by
   `registrySchema` in `src/registry.ts`, populated by `graph register`. Each
   entry points at a graph package folder containing `graph.json`. Child
   `workflowRef` nodes, dispatcher `start_run` / `call_graph` actions, and
   `startRegisteredWorkflowRun` all resolve graphs through this registry.

The kernel already runs package-folder workflows end-to-end through path (2):
checkpoints carry a `graphSource: { kind: 'package', graphId, graphVersion,
packagePath }`, `activeContextForCheckpoint` re-resolves the graph from that
source on every step, and `graphForSource` validates the package against the
recorded `graphId` / `graphVersion` to catch on-disk drift. The remaining work
is to make path (2) the only runtime path, shrink `workflow.json` to a thin
workspace manifest with no embedded graph definitions, and update the public
API, CLI, demo template, and tests to match.

This is a behavior-preserving refactor for callers that already use the
registry (dispatcher path, `startRegisteredWorkflowRun`, workflow-refs). It is
a hard-break for callers that depend on inline `workflow.json.graphs`
(currently: the legacy `startRun({ graph })` API, the `ripplegraph start
--graph` CLI command, the `ripplegraph-demo start` command, the bundled
`templates/minimal/workflow.json`, the `tests/coach.test.ts` workspace
fixtures, and parts of `validateWorkflowRoot` / `getState`). Ripplegraph is
still at `0.0.1` with no external consumers, so we replace rather than
deprecate.

## Goals

- **One source of truth for graph definitions.** All graph lookups during run
  execution go through the registry; `loadWorkflow` returns workspace metadata
  only.
- **A thin workspace manifest.** `workflow.json` (kept under that filename to
  minimize churn) keeps `id`, `version`, optional `title`, optional
  `description`, optional `entryGraph`. The `graphs` field is removed from the
  schema entirely. Strict zod parsing rejects unknown fields, so old templates
  with inline `graphs` will fail loudly and need migration.
- **Registry-backed public API.** `startRun` accepts a registered `graphId`
  instead of an inline graph name (`startRegisteredWorkflowRun` collapses into
  this single name). All start paths produce checkpoints with `graphSource`.
- **Registry-backed CLI.** `ripplegraph start --graph <graphId>` and
  `ripplegraph-demo start <graphId>` resolve through the registry. `state` /
  `validate` / `no_focused_run` surface `availableGraphs` from the registry.
- **Updated demo template + tests.** `templates/minimal/` ships a workspace
  manifest plus one or more graph package folders pre-registered into
  `.ripplegraph/registry.json` so `ripplegraph-demo init` produces a layout
  that mirrors real consumers like specdev-cli. Test fixtures use a helper
  that registers ad-hoc graph packages under a tmp workflow root.
- **README + docs updated.** Remove the "future runtime work" line; document
  the package-folder execution model.

## Non-Goals

- **No new graph kinds, schema fields, or semantics.** `dispatcher` /
  `workflow` / `callable`, gates, workflow-refs, frame stack, and decision
  source metadata are unchanged.
- **No new file formats or storage layout.** Checkpoints, transition logs,
  artifact paths, and `graphSource` on checkpoints stay byte-identical. The
  filename `workflow.json` is preserved; only its schema shrinks.
- **No back-compat shim for inline `workflow.json.graphs`.** The field is
  removed; consumers must migrate by registering packages. Ripplegraph is
  pre-release; we will not maintain two code paths.
- **No registry-CRUD ergonomics beyond what exists today.** `graph register`
  / `graph list` are the entry points; we are not adding `graph unregister`,
  search, or versioning policies in this assignment.
- **No package-folder filesystem layout changes** (templates, schemas
  alongside graph.json, multi-file graph definitions, etc.) beyond the minimal
  `graph.json` we already validate.

## Design

### Workspace manifest (schema change)

In `src/schema.ts`, replace `workflowSchema` with a manifest of workspace
identity:

```ts
export const workflowSchema = z
  .object({
    id: idSchema,
    version: z.string().min(1),
    entryGraph: idSchema.optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  })
  .strict();
```

The `graphs` map is removed. The single-dispatcher contract is preserved
exactly as `dispatcher.ts`'s `selectDispatcher` already enforces it: zero
registered dispatchers → `E_MISSING_DISPATCHER`; more than one →
`E_AMBIGUOUS_DISPATCHER`. The optional manifest `entryGraph` is treated as a
*manifest-level assertion* of that single dispatcher's id: if `entryGraph` is
set, it must match the one registered dispatcher; otherwise we raise
`E_ENTRY_GRAPH_MISMATCH`. We do **not** introduce any "prefer entryGraph when
multiple dispatchers exist" behavior — `getState` and `dispatcher.ts` share
one selection helper so they cannot drift.

To avoid the inconsistency the brainstorm review flagged, dispatcher
selection moves into a small shared helper used by both `getState`
(no-focused-run branch) and `dispatcher.ts`. Concretely, expose
`resolveDispatcher(workflowRoot)` from `src/dispatcher.ts` (or a new
`src/internal/dispatcher-resolution.ts`) that returns the single registered
dispatcher entry, validates `entryGraph` against it when present, and throws
the existing `E_MISSING_DISPATCHER` / `E_AMBIGUOUS_DISPATCHER` errors.
`getState`'s no-focused-run branch calls this helper and surfaces the
dispatcher only when resolution succeeds; otherwise it omits the dispatcher
hint in the orientation message (same as today's behavior).

`loadWorkflow` continues to read either `<root>/workflow.json` or
`<root>/.ripplegraph/workflow.json`, parses the manifest, and returns the
same `Workflow` shape minus `graphs`. Callers that previously did
`Object.keys(workflow.graphs)` switch to `listRegisteredGraphs(rootPath)`.

### Public API (`src/coach.ts`)

- **Delete `StartRunOptions.graph` / `startRun(opts)` legacy path.**
- **Rename `startRegisteredWorkflowRun` to `startRun`.** Single entry point;
  resolves the graph through `resolveRegisteredGraphPackage(..., kind:
  'workflow')`, builds an initial checkpoint with `graphSource`, writes it,
  enters any workflow-refs. `StartRunOptions = { workflowRoot, graphId, runId,
  effectPolicy? }`.
- **`activeContextForCheckpoint` no longer falls back to `getGraph(workflow,
  rootGraph)`.** Every checkpoint produced by the new code path has
  `graphSource`; the fallback branch is dead code and is removed.
- **`internal/runtime-graph.ts` keeps `getNode` / `selectEdge`.** Its
  `getGraph(workflow, name)` helper is deleted (it was the inline lookup).
- **`validateWorkflowRoot(root)`** returns `{ status, workflow: { id,
  version }, graphs: string[] }` where `graphs` lists registered ids from the
  registry, not inline names.
- **`getState`'s `no_focused_run` branch** sources `availableGraphs` from
  `listRegisteredGraphs(root)` and calls the shared `resolveDispatcher`
  helper to surface the `dispatcher` field. When `resolveDispatcher` throws
  (`E_MISSING_DISPATCHER`, `E_AMBIGUOUS_DISPATCHER`, or
  `E_ENTRY_GRAPH_MISMATCH`), `getState` omits the dispatcher field and falls
  back to the "Start or resume a run" orientation, exactly mirroring today's
  behavior when no `entryGraph` is set.

### Effects policy (existing assertion)

`assertGraphAndChildEffectsAllowed` and `collectMissingChildEffects` already
use the registry to resolve `workflowRef` children — no change needed beyond
deleting the now-unused `workflow` parameter.

### Dispatcher (`src/dispatcher.ts`)

`selectDispatcher` is replaced by the shared `resolveDispatcher(workflowRoot)`
helper described above. `getDispatchRequest` and `applyDispatchAction` call
the same helper, so `entryGraph` mismatches surface as
`E_ENTRY_GRAPH_MISMATCH` consistently regardless of the entry point.
Multiple registered dispatchers continue to raise
`E_AMBIGUOUS_DISPATCHER`; we are not changing the single-dispatcher contract.

### CLI (`src/cli.ts`)

- **`start`** flag rename: `--graph <graphId>` continues to work and now means
  "registered graph id." Internally just calls the renamed `startRun`. No new
  command surface.
- **`validate`** prints the registry-derived `graphs` list.
- **No new commands.** Dispatcher and `start` remain the two ways to begin a
  run; the dispatcher path is already registry-based and unchanged.

### Demo CLI + template (`src/demo-cli.ts`, `templates/minimal/`)

- **`templates/minimal/`** restructures to:
  ```
  workflow.json                      # workspace manifest, no graphs map
  .ripplegraph/registry.json         # pre-populated with the 3 demo graphs
  .ripplegraph/graphs/workspace-dispatcher/graph.json
  .ripplegraph/graphs/change-intake/graph.json
  .ripplegraph/graphs/architecture-sweep/graph.json
  AGENT.md, engineering-playbook.md, repo-brief.md, work-items/inbox.json
  ```
  Each `graph.json` is the existing node body lifted out of `workflow.json`,
  with the surrounding `{ id, version, ... }` package fields filled in. The
  registry's `path` fields are workspace-relative
  (`.ripplegraph/graphs/<id>`). Pre-populating the registry keeps `init`
  declarative — no extra `graph register` step required during init.
- **`ripplegraph-demo init`** copies the template tree verbatim
  (`workflow.json` + `.ripplegraph/` subtree + workspace files). Force-replace
  semantics unchanged.
- **`ripplegraph-demo start <graphId>`** calls the renamed `startRun`.
- **`templates/workflow.json.tmpl`** shrinks to a minimal workspace manifest
  with no `graphs` block.

### Tests

- Replace the inline `workflow.json { graphs: {...} }` fixtures in
  `tests/coach.test.ts`, `tests/dispatcher.test.ts`, `tests/effects.test.ts`,
  `tests/cli.test.ts`, and `tests/demo-cli.test.ts` with a shared helper
  `createTestWorkspace({ graphs: GraphPackageManifest[], entryGraph? })` that:
  1. Writes `workflow.json` (workspace manifest)
  2. For each graph, writes `.ripplegraph/graphs/<id>/graph.json`
  3. Writes a pre-populated `.ripplegraph/registry.json`

  Place the helper in `tests/helpers/workspace.ts`. Existing graph payloads
  (with all their nodes, schemas, gates, workflow-refs) move into the helper
  call sites unchanged.

- No new test files are required to prove kernel-level execution; the kernel
  path was already exercised by `tests/coach.test.ts`. After the refactor,
  those same tests cover the registry-resolved path because there is no other
  path.

- Add one new test in `tests/coach.test.ts`: `startRun` rejects an unknown
  graph id with `E_UNKNOWN_GRAPH`, and a callable graph id with
  `E_WRONG_GRAPH_KIND`. Both are already errors raised by
  `resolveRegisteredGraphPackage`; the test pins the public surface.

### README

Replace the "Architecture Direction" paragraph claiming "Package-folder
workflow execution is still future runtime work" with a short statement that
package-folder execution is the runtime model. Update the quick-start example
if needed (the existing one uses the demo CLI, which keeps working).

## Success Criteria

- `workflowSchema` has no `graphs` field; `loadWorkflow` returns workspace
  identity only.
- Public API exposes a single `startRun({ workflowRoot, graphId, runId,
  effectPolicy? })`; no caller can start a run by inline graph name.
- `ripplegraph validate`, `ripplegraph state`, and the
  `no_focused_run` branch of `getState` all source available graphs from the
  registry, not from `workflow.json`.
- `ripplegraph-demo init <path>` produces a workspace whose `workflow.json`
  has no `graphs` field and whose `.ripplegraph/registry.json` lists the
  demo's three graph packages, each living in
  `.ripplegraph/graphs/<id>/graph.json`. Running `ripplegraph-demo start
  workspace-dispatcher --run <id>` (or `change-intake`) starts a run with
  `graphSource` recorded on its checkpoint.
- All 63 existing tests pass after migration; one new test covers the
  unknown-graph and wrong-kind errors from `startRun`.
- README no longer claims package-folder execution is future work.

## Testing Approach

- **Unit / integration:** existing vitest suite, after fixture migration.
  `pnpm test` must show all green (63 + 1 = 64 passing). Continue to use the
  real filesystem under tmp dirs (no fs mocking) so the demo-cli end-to-end
  tests keep catching template regressions.
- **Manual end-to-end check:** run `ripplegraph-demo init /tmp/rg-demo`,
  inspect that `workflow.json` and `.ripplegraph/registry.json` look as
  designed, run `ripplegraph-demo status`, `start workspace-dispatcher`,
  `advance` once, and `runs`. Sanity-check that one demo run completes
  end-to-end on the new layout.

## Risks

- **Test migration is the biggest single chunk of churn.** Inline workflow
  fixtures in `tests/coach.test.ts` (28 tests) and `tests/dispatcher.test.ts`
  reach into the graph-shape directly. The `createTestWorkspace` helper keeps
  the migration mechanical: each fixture becomes a list of manifests + an
  entryGraph, no test logic changes. Risk is mostly bulk edit time, not
  design.
- **Schema-drift on the bundled template.** The demo template's pre-populated
  `registry.json` must stay in sync with the package `graph.json` files we
  ship. Mitigation: a tiny check during `loadGraphPackage` already validates
  manifest id/kind against the registry entry on resolve; we add one CI-style
  test that calls `loadGraphPackage` on each bundled template package to
  catch shipping a mismatched template before release.
- **Workflow-ref child graphs in tests** depend on having a registered child
  package, which the new helper handles. No new failure mode.
