## Round 3

### F3.1 — Demo status now renders `id  kind  title` for available graphs
**Resolution:** Accepted. Updated `renderNoFocusedRun` in `src/demo-cli.ts`
to render each registry entry as `<id>  <kind>  <title>`, omitting the
title suffix when not present. Updated the demo CLI status assertion in
`tests/demo-cli.test.ts` to require the three lines for the three demo
graphs (`change-intake workflow Change Intake`,
`architecture-sweep workflow Architecture Sweep`,
`workspace-dispatcher dispatcher Workspace Dispatcher`).
Added a `title` to the `workspace-dispatcher` graph in
`tests/helpers/workflows.ts` so the demo fixture matches the bundled
template's title and the new status assertion.

## Round 2

### F2.1 — README quick start now uses shipped demo graph ids
**Resolution:** Accepted. The quick-start commands referenced
`support-triage` and `policy-refresh`, which were never part of the new
`templates/minimal/` layout (it ships `workspace-dispatcher`,
`change-intake`, and `architecture-sweep`). Rewrote the quick-start sequence
to use `change-intake` for the first run and `architecture-sweep` for the
pause/switch example, and updated the submit/decide payloads to match
`change-intake`'s actual `outputSchema` / gate `decisionSchema`
(`changeType` + `risk` + `rationale`; `approved-bugfix` etc.). The
documented sequence now succeeds end-to-end against a freshly
`ripplegraph-demo init`'d workspace.

## Round 1

### F1.1 — `ripplegraph-demo init` now installs `workflow.json` at the workspace root
**Resolution:** Accepted. Rewrote `initDemoProject` in `src/demo-cli.ts` to copy
the entire `templates/minimal/` tree verbatim, including the workspace
manifest at `<root>/workflow.json`, the registry at
`<root>/.ripplegraph/registry.json`, and each `<root>/.ripplegraph/graphs/<id>/graph.json`.
There is no longer a special case for `workflow.json` — it is just another
template file. The hidden `.ripplegraph/workflow.json` path is no longer
produced or protected by `init`.

Test updates in `tests/demo-cli.test.ts`:
- Renamed the test from "hidden workflow files" to "workspace manifest,
  registry, and graph packages" and asserted that `<root>/workflow.json`,
  `<root>/.ripplegraph/registry.json`, and the demo's three
  `.ripplegraph/graphs/<id>/graph.json` package files all exist, while
  `<root>/.ripplegraph/workflow.json` does not.
- "refuses to overwrite" now asserts the generic `already exists` + `--force`
  pair instead of a specific file path, because the alphabetically-first
  existing template file is no longer guaranteed to be `workflow.json`.

### F1.2 — Removed the `coach.ts` ↔ `dispatcher.ts` cycle
**Resolution:** Accepted. Extracted the registry- and manifest-aware
dispatcher resolver to `src/internal/dispatcher-resolution.ts` as
`resolveDispatcherEntry(workflowRoot)`. Both `src/dispatcher.ts`
(`resolveDispatcher`, which now wraps the helper and projects to
`RegisteredGraphSummary`) and `src/coach.ts` (`tryResolveDispatcher` in the
`no_focused_run` branch) import from the internal module instead of from each
other. `coach.ts` no longer imports anything from `dispatcher.ts`, breaking
the bidirectional dependency the reviewer flagged.
