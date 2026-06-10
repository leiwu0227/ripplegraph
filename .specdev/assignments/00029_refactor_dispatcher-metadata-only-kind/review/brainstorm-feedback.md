## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The design says `src/dispatcher.ts`, `src/coach.ts`, and `src/callable.ts` need no change because they are "already kind-guarded," but the current `resolveRegisteredGraphPackage()` API does not narrow `graphPackage.manifest` based on the `kind` option. After `GraphPackageManifest` becomes a dispatcher/workflow/callable union where dispatcher lacks `requires`, `entry`, `nodes`, `inputSchema`, and `outputSchema`, callers like `startRun()` still access `manifest.requires` and `manifest.entry` after `resolveRegisteredGraphPackage({ kind: 'workflow' })` (`src/coach.ts:261-274`), and callable startup/support still accesses `manifest.inputSchema`, `manifest.entry`, and `manifest.nodes` after `kind: 'callable'` (`src/callable.ts:98-109`, `src/callable.ts:264-267`). That is a structural API gap, not just a local edit: the plan should either make `resolveRegisteredGraphPackage` generic/overloaded so the requested kind narrows the returned manifest, or add explicit narrowing helpers at these call sites. Without that, the union split is not compile-feasible.
2. [F1.2] `packageSummary` is only called out for `manifest.entry`, but it also reads `manifest.requires` (`src/cli.ts:217-227`). The proposed dispatcher variant deliberately drops `requires`, so the CLI summary plan is incomplete: a metadata-only dispatcher validated by the new schema will still hit a non-common union property unless the summary is split/narrowed for dispatcher versus executable manifests. This is the same architectural boundary as the registry edit, but it is currently missing from the `src/cli.ts` knock-on work.
3. [F1.3] The test fixture plan updates dispatcher fixture objects but misses the shared workspace helper that forces every graph to be executable. `GraphPackageManifestInput` requires `entry` and `nodes` (`tests/helpers/workspace.ts:5-17`), and `normalizedManifest()` always writes those keys (`tests/helpers/workspace.ts:45-59`). Updating only `tests/helpers/workflows.ts`, `tests/dispatcher.test.ts`, `tests/cli.test.ts`, and `tests/coach.test.ts` to metadata-only dispatcher objects will either fail TypeScript or emit forbidden `entry`/`nodes` keys into generated dispatcher `graph.json` files. The plan should include making this helper shape conditional by kind or otherwise omitting executable fields for dispatcher manifests.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- [F1.1] Addressed. The revised design now treats resolver type narrowing as a required API-boundary change: `resolveRegisteredGraphPackage` becomes generic/typed by requested `kind`, so workflow/callable callers can keep accessing executable-only manifest fields after runtime kind validation. Verified current callers in `src/coach.ts` and `src/callable.ts` still depend on this compile-time narrowing once the manifest becomes a union.
- [F1.2] Addressed. The revised design now calls out both `manifest.entry` and `manifest.requires` in `src/cli.ts` `packageSummary`, with a dispatcher branch and optional `entry` in the returned summary shape.
- [F1.3] Addressed. The revised design now includes `tests/helpers/workspace.ts`, where `GraphPackageManifestInput` currently requires `entry`/`nodes` and `normalizedManifest()` always writes them. The plan explicitly makes that helper kind-conditional and omits executable-only fields for dispatcher manifests.
