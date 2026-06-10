## Overview

A dispatcher is registered as a graph package and resolved by metadata only, yet the shared graph
schema forces every dispatcher manifest to carry an executable body (`entry` + non-empty `nodes`)
that no code path ever runs. The dispatch contract is hardcoded in `dispatcher.ts`, and the
dispatcher's declared `inputSchema`/`outputSchema`/`requires` are never read. The dead body has
already drifted from the real contract (template declares 3 actions; engine accepts 6).

This refactor splits the single shared graph schema into a discriminated union on `kind` so the
dispatcher variant is metadata-only — no `entry`, `nodes`, `inputSchema`, `outputSchema`, or
`requires` — while `workflow` and `callable` keep their executable bodies unchanged. The dispatch
runtime's behavior is unchanged; this is a schema-honesty refactor that deletes a drift-prone,
never-executed field.

## Non-Goals

- **No change to dispatch runtime behavior.** `getDispatchRequest`, `applyDispatchAction`, and the
  hardcoded `dispatcherActionSchema`/`dispatchActionSchema` are untouched. Available actions and
  routing are identical before and after.
- **Not making the dispatcher executable.** We are not wiring the dispatcher's body into the coach
  runtime (the "lean in" alternative). We are removing the body, not activating it.
- **No backward-compatibility shim.** Per decision, legacy dispatcher manifests with a body are
  rejected outright (strict), not accepted-and-ignored with a deprecation window.
- **No registry storage change.** `registryEntrySchema` already stores metadata only; no migration
  of `registry.json` contents is required.
- **No change to workflow/callable manifests** beyond the schema being expressed as a union.

## Design

### Schema (src/schema.ts) — the core change

Convert the single shared graph schema into a Zod **discriminated union on `kind`**:

- `dispatcherGraphSchema` (`kind: 'dispatcher'`, `.strict()`): `id`, `version`, `kind`, `title?`,
  `description?`, `activationHints` (default `[]`), `effects` (default `[]`). **No** `entry`,
  `nodes`, `inputSchema`, `outputSchema`, or `requires`. Because it is `.strict()`, a manifest that
  includes any of those keys on a dispatcher fails validation — this delivers the strict-reject
  decision for free.
- `executableGraphSchema` (`kind: z.enum(['workflow','callable'])`, `.strict()`): the current
  fields unchanged, including required `entry` and non-empty `nodes`, plus
  `inputSchema`/`outputSchema`/`requires`.
- `graphPackageManifestSchema = z.discriminatedUnion('kind', [dispatcherGraphSchema, executableGraphSchema])`.
  Feasibility confirmed: the installed zod (3.25.76) supports `z.enum` discriminators in
  `discriminatedUnion` (`getDiscriminator` handles `ZodEnum`).

`validateGraphReferences()` (currently asserts `entry` and edges resolve against `nodes`) runs only
for the executable variants. For a dispatcher there are no nodes, so reference validation is
skipped. Exported manifest types become a discriminated union; downstream code that reads
`manifest.entry`/`manifest.nodes` must narrow on `kind` first (see knock-on edits).

**`kind` becomes required (deliberate breaking change).** Today `kind` carries
`.default('workflow')`, so a manifest that omits it validates as a workflow. A discriminated union
needs the discriminator present — Zod fails with an invalid-discriminator error when `kind` is
missing. We accept and document this as part of the strict-reject posture: every manifest must
declare its `kind` explicitly. All in-repo manifests and fixtures already do; only out-of-tree
manifests relying on the implicit default would break (see Risks).

**`graphSchema` (the manifest-less variant, also public API via `index.ts`'s
`export * from './schema.js'`) becomes executable-only.** It is built from the same shared fields
and currently admits all three kinds, but it only describes graphs that run; restrict its `kind`
to `workflow`/`callable` alongside the union split.

Note on `effects`: retained on the dispatcher variant per prior decision, even though a
non-executing graph arguably has no effects. Flagged as a candidate for a future cleanup; out of
scope here.

### Type narrowing: runtime guards are not type narrowing (foundational)

The single most important consequence of the union split: code that is *runtime*-guarded by `kind`
is not *type*-narrowed. `resolveRegisteredGraphPackage({ kind: 'workflow' })` (`registry.ts:110`)
only throws `E_WRONG_GRAPH_KIND` at runtime (`registry.ts:116`); its return type still exposes
`graphPackage.manifest` as the full union. Once the union splits, every executable call site that
reads a non-common field stops compiling — e.g. `startRun` reads `manifest.requires`
(`coach.ts:268`) and `manifest.entry` (`coach.ts:274`); `startCallableCall`/`assertCallableSupported`
read `manifest.inputSchema`, `manifest.entry`, `manifest.nodes` (`callable.ts:98-109`, `:264-267`).

Fix at the API boundary, not per call site: make `resolveRegisteredGraphPackage` **generic on the
requested `kind`** so the returned manifest narrows. Concretely, parameterize `GraphPackage`/the
return type by a `ManifestForKind<K>` mapping (`'workflow'|'callable'` → executable variant,
`'dispatcher'` → metadata variant), so passing `kind: 'workflow'` yields a manifest with `entry`/
`nodes`/`requires` present and the existing call sites compile unchanged. Call sites that omit
`kind` keep the union and must narrow locally (none of the executable paths do this). This
supersedes the earlier "no change; already kind-guarded" note for `coach.ts`/`callable.ts`: no
*logic* changes there, but they compile only because the resolver narrows.

### Knock-on edits (consumers that assume a body)

- **`src/cli.ts:217` `packageSummary`** — reads **both** `manifest.entry` *and* `manifest.requires`,
  and its return type hard-codes `entry: string`. Both fields are non-common after the split, so the
  summary must branch on `kind`: for dispatcher, omit `entry` (and source `requires` as `[]`); for
  executable kinds, keep the current shape. Make `entry` optional in the returned summary type.
- **`src/graph/diagram.ts`** — iterates `manifest.nodes` and references `manifest.entry`. Guard on
  `kind === 'dispatcher'` and return early with a "metadata-only, no diagram" message.
- **`src/registry.ts:100` `registerGraphPackage`** — builds the registry entry with
  `requires: graphPackage.manifest.requires`, which no longer compiles once the dispatcher variant
  drops `requires`. Narrow on `kind` (or `?? []`) so dispatcher entries store `requires: []`.
  `registryEntrySchema` itself is unchanged. Note: registry entries and the dispatch
  `graphSummary` will still carry `requires: []` (and `effects`) for dispatchers — the same
  inert-field situation as `effects` on the manifest; flagged for the same future cleanup, out of
  scope here.
- **`src/internal/dispatcher-resolution.ts`** — no logic change; already metadata-only (reads
  registry entries, never the manifest body).
- **`src/dispatcher.ts`, `src/coach.ts`, `src/callable.ts`** — no *logic* change; they never touch a
  dispatcher's body at runtime. They compile only via the `resolveRegisteredGraphPackage` kind-narrowing
  above — without it, `manifest.requires`/`entry`/`nodes`/`inputSchema` accesses fail to typecheck.

### Template + fixtures

- **`templates/minimal/.ripplegraph/graphs/workspace-dispatcher/graph.json`** — strip `entry`,
  `nodes`, `inputSchema`, `outputSchema` (and `requires` if present); keep id/version/kind/title/
  description/activationHints/effects.
- **`tests/helpers/workspace.ts`** (the shared graph-writing helper — fix this first, it forces the
  problem). `GraphPackageManifestInput` (`:5-17`) declares `entry`/`nodes` as **required**, and
  `normalizedManifest()` (`:45-59`) **always** writes `entry`/`nodes`. So metadata-only dispatcher
  fixtures would either fail TypeScript or emit forbidden `entry`/`nodes` keys into generated
  dispatcher `graph.json` (which the new schema strict-rejects). Make the input type kind-conditional
  (discriminated union, or `entry`/`nodes` optional) and have `normalizedManifest` omit
  `entry`/`nodes`/`inputSchema`/`outputSchema`/`requires` when `kind === 'dispatcher'`.
- **Test fixtures** in `tests/helpers/workflows.ts` (dispatcher manifests at `:156` `workspaceDispatcherGraph`
  and `:227`), `tests/dispatcher.test.ts`, `tests/cli.test.ts`, `tests/coach.test.ts` that construct
  dispatcher manifests with `entry`/`nodes` — update to the metadata-only shape (these flow through
  the `workspace.ts` helper above).

### Build output

- **`dist/`** is committed; rebuild after the source change so compiled JS/`.d.ts` reflect the
  union types.

### Approach chosen vs alternatives

- **Chosen — discriminated union, drop the body (lean out).** Lowest-risk, restores the original
  metadata-driven intent, removes the drift source, no runtime behavior change.
- **Rejected — execute the dispatcher body (lean in).** Would unify "one engine" and enable
  pluggable routing, but is a much larger change to the runtime and contradicts the bootstrap,
  stateless nature of dispatch (no run/checkpoint is created). Out of scope.
- **Rejected — keep body, accept-and-ignore with deprecation.** Carries transitional code and keeps
  the drift-prone fields alive; user chose strict reject instead.

## Success Criteria

- A dispatcher `graph.json` with **no** `entry`/`nodes`/`inputSchema`/`outputSchema`/`requires`
  loads and registers successfully.
- A dispatcher `graph.json` that **includes** `entry` or `nodes` (or the other dropped fields)
  **fails** schema validation with a clear error (strict reject).
- A manifest with **no `kind` field** fails validation (the implicit workflow default is gone).
- Workflow and callable manifests continue to validate and execute exactly as before, including
  `validateGraphReferences` still catching bad `entry`/edge references.
- `getDispatchRequest` / `applyDispatchAction` produce identical output to before for the same
  registry state (no runtime regression); existing dispatcher routing tests pass after fixture
  updates.
- `ripplegraph` CLI package summary and diagram rendering handle a metadata-only dispatcher without
  error.
- The minimal template registers and dispatches end-to-end with the migrated dispatcher manifest.
- `dist/` is rebuilt and the full test suite passes.

## Testing Approach

- **TDD per SpecDev.** Add a `tests/schema.test.ts` case first: a metadata-only dispatcher manifest
  parses; a dispatcher manifest with `entry`/`nodes` (and each other dropped field) is rejected; a
  manifest with no `kind` is rejected.
- Update existing dispatcher/cli/coach fixtures to the new shape and confirm routing behavior is
  unchanged.
- Add/confirm a diagram + `packageSummary` case for a dispatcher kind (no crash, sensible output).
- Run the full suite, then rebuild `dist/` and re-run to confirm the build output is consistent.

## Risks

- **Missed consumer of a non-common manifest field.** The split turns every unguarded access to
  `entry`/`nodes`/`inputSchema`/`outputSchema`/`requires` into a compile error, which is the
  mitigation: `tsc` enumerates them exhaustively. Known readers are handled explicitly — executable
  paths via the `resolveRegisteredGraphPackage` kind-narrowing, plus `cli.ts` `packageSummary`,
  `graph/diagram.ts`, `registry.ts:100`, and the `workspace.ts` test helper. Any reader the scan
  missed fails the build rather than slipping through.
- **Out-of-tree dispatcher manifests** (consumer workspaces beyond this repo) would break under
  strict reject. Accepted per the strict-reject decision; the only in-repo manifest is the template,
  which is migrated. Error messaging should make the required shape obvious.
- **Out-of-tree manifests that omit `kind`** (currently defaulted to `workflow`) also break, since
  the union requires an explicit discriminator. Accepted as part of the same strict posture; all
  in-repo manifests and fixtures already declare `kind`. Zod's invalid-discriminator error names
  the missing/invalid `kind` field, so the fix is obvious.
