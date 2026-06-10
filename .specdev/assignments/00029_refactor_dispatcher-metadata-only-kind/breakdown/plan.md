# Dispatcher Metadata-Only Kind — Implementation Plan

> **Note:** Breakdown was authored retroactively. The user implemented the approved design
> directly (skipping the interactive breakdown phase); this plan documents the actual
> decomposition that was carried out, so the workflow state and review have a plan to track.

**Goal:** Make `dispatcher` a metadata-only graph kind. Stop the shared graph schema from forcing
dispatcher manifests to carry an executable `entry`/`nodes` body (and `inputSchema`/`outputSchema`/
`requires`) that no code path ever runs. Reject body-carrying dispatcher manifests (strict), migrate
the one template, and keep dispatch runtime behavior unchanged.

**Architecture:** Split the single shared graph schema in `src/schema.ts` into a Zod
`discriminatedUnion('kind', …)`: a strict metadata-only `dispatcherGraphManifestSchema` and an
`executableGraphManifestSchema` (workflow|callable) that keeps the body. `validateGraphReferences`
runs only for executable variants. `kind` becomes required (the `.default('workflow')` is dropped —
a union needs the discriminator present). Fix the type boundary at `resolveRegisteredGraphPackage`
by making it generic on the requested `kind` (`ManifestForKind<K>`) so executable callers keep
compiling without local guards. Narrow the remaining body-readers (`cli.ts` `packageSummary`,
`graph/diagram.ts`) by kind. Make the `tests/helpers/workspace.ts` fixture helper kind-conditional.

**Tech Stack:** TypeScript (Node ESM), vitest, zod 3.25.76.

**Execution Mode:** inline

**Test Budget:** ≤ 6 new tests (dispatcher schema accept/reject cases + diagram dispatcher case).

---

### Task 1: Schema discriminated-union split
**Mode:** standard
**Files:** `src/schema.ts`, `src/graph-package.ts`

**Work:**
- Extract `graphMetadataFields` (title, description, activationHints, effects).
- `executableGraphFieldsSchema` = `kind: enum(['workflow','callable'])` + metadata + requires/
  inputSchema/outputSchema/entry/nodes, `.strict()`.
- `dispatcherGraphManifestSchema` = id, version, `kind: literal('dispatcher')`, metadata, `.strict()`.
- `graphPackageManifestSchema = discriminatedUnion('kind', [dispatcher, executable])`; superRefine
  skips `validateGraphReferences` for dispatcher.
- Restrict `graphSchema` to executable-only. Export `DispatcherGraphManifest`/`ExecutableGraphManifest`.
- Make `GraphPackage<M extends GraphPackageManifest = GraphPackageManifest>` generic.

**Verify:** `tsc --noEmit` clean.

### Task 2: Resolver kind-narrowing + registry/callable consumers
**Mode:** standard
**Files:** `src/registry.ts`, `src/callable.ts`

**Work:**
- Add `ManifestForKind<K>` mapping; make `resolveRegisteredGraphPackage<K>` generic returning
  `GraphPackage<ManifestForKind<K>>` (single justified cast at return, runtime kind-check already present).
- `registerGraphPackage`: `requires: manifest.kind === 'dispatcher' ? [] : manifest.requires`.
- Retype callable internal helpers to `ExecutableGraphManifest`.
- `coach.ts` expected to need no change (auto-narrows via resolver).

**Verify:** `tsc --noEmit` clean; coach/callable tests pass.

### Task 3: CLI summary + diagram dispatcher guards
**Mode:** standard
**Files:** `src/cli.ts`, `src/graph/diagram.ts`

**Work:**
- `packageSummary`: branch on kind — dispatcher omits `entry`, sets `requires: []`; `entry?` optional
  in the summary type.
- `renderGraphDiagram`: validate format first, then for dispatcher return a "metadata-only, no nodes"
  note; narrow internal render fns to `ExecutableGraphManifest`.

**Verify:** cli + graph-diagram tests pass.

### Task 4: Template migration + fixture helper + fixtures
**Mode:** standard
**Files:** `templates/minimal/.ripplegraph/graphs/workspace-dispatcher/graph.json`,
`tests/helpers/workspace.ts`, `tests/helpers/workflows.ts`, `tests/dispatcher.test.ts`,
`tests/cli.test.ts`, `tests/graph-diagram.test.ts`

**Work:**
- Strip body + I/O schemas from the template dispatcher manifest.
- Make `GraphPackageManifestInput` a discriminated union (dispatcher vs executable);
  `normalizedManifest` omits body/IO/requires for dispatcher.
- Update dispatcher fixtures to metadata-only shape.

**Verify:** affected suites pass.

### Task 5: Schema tests (TDD for the new contract)
**Mode:** standard
**Files:** `tests/schema.test.ts`

**Work:**
- Accept metadata-only dispatcher (defaults applied, no entry/nodes).
- Reject dispatcher carrying each of entry/nodes/inputSchema/outputSchema/requires (`it.each`).
- Reject a manifest with no explicit `kind`.

**Test Budget:** +6.

**Verify:** schema tests pass.

### Task 6: Build + full-suite verification
**Mode:** lightweight
**Files:** `dist/**`

**Work:** rebuild committed `dist/`; run typecheck + full suite.

**Verify:** `tsc --noEmit` exit 0; `vitest run` all green; fresh build produces no `dist/` drift.
