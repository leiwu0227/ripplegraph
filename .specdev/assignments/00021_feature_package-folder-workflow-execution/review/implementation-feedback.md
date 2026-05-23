## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] [CRITICAL] `ripplegraph-demo init` still installs the workspace manifest at `.ripplegraph/workflow.json` instead of `<root>/workflow.json`. The design and success criteria require the demo template to produce a root-level `workflow.json` manifest plus a `.ripplegraph/registry.json` and graph package subtree, mirroring the package-folder workspace layout. `initDemoProject` currently sets `workflowFile = path.join(root, '.ripplegraph', 'workflow.json')` and copies the template there, while the test explicitly asserts that `<root>/workflow.json` does not exist. This keeps the demo on the old hidden-workflow layout and leaves the success criterion unverified. Change `initDemoProject` and the overwrite tests to protect/copy `<root>/workflow.json`; continue copying the template `.ripplegraph/` subtree verbatim. See `src/demo-cli.ts:167` and `tests/demo-cli.test.ts:50`.
2. [F1.2] [MINOR] `resolveDispatcher` now lives in `src/dispatcher.ts`, while `src/coach.ts` imports it and `src/dispatcher.ts` imports `startRun` / `resumeRun` / `listRuns` from `src/coach.ts`. That creates a bidirectional dependency between the coach and dispatcher modules. It does not appear to fail the current suite, but this is avoidable in the architecture touched by this assignment and makes dispatcher resolution harder to reuse independently. Move the registry-backed `resolveDispatcher` helper to a small internal module, for example `src/internal/dispatcher-resolution.ts`, and have both `coach.ts` and `dispatcher.ts` import from it. See `src/coach.ts:16` and `src/dispatcher.ts:3`.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** needs-changes

### Findings
1. [F2.1] [MINOR] The README quick start still uses the old demo graph ids `support-triage` and `policy-refresh`, but `ripplegraph-demo init` now installs registered demo graphs named `workspace-dispatcher`, `change-intake`, and `architecture-sweep`. As written, the documented first start command fails with `E_UNKNOWN_GRAPH` in a freshly initialized demo workspace, so the README update is incomplete for the new package-folder template. Update the quick start to use the shipped graph ids and matching sample payloads, or keep it generic if the architecture examples later introduce `support-triage` separately. See `README.md:17`, `README.md:28`, and `README.md:47`.

### Addressed from changelog
- [F1.1] Addressed: `ripplegraph-demo init` now copies `templates/minimal/workflow.json` to `<root>/workflow.json`, copies the registry and graph packages under `<root>/.ripplegraph/`, and the demo CLI tests assert that the hidden `.ripplegraph/workflow.json` is no longer created.
- [F1.2] Addressed: dispatcher resolution was extracted to `src/internal/dispatcher-resolution.ts`, and `coach.ts` / `dispatcher.ts` now import that helper instead of depending on each other.

## Round 3

**Verdict:** needs-changes

### Findings
1. [F3.1] [MINOR] `ripplegraph-demo status` still renders available registry entries as ids only, even though the implementation plan explicitly calls for `id  kind  title` lines after `state.availableGraphs` changed from strings to registry entries. This leaves useful registered-package metadata hidden in the demo UX and means the status rendering is only partially migrated to the new registry-backed shape. Update `renderNoFocusedRun` to include `graph.kind` and `graph.title` (with a sensible blank/fallback when title is absent), and add or adjust the demo CLI status assertion so this does not regress. See `src/demo-cli.ts:32` and `breakdown/plan.md:189`.

### Addressed from changelog
- [F2.1] Addressed: README quick-start commands now use the shipped `change-intake` and `architecture-sweep` demo graph ids with payloads matching the new template schemas.
