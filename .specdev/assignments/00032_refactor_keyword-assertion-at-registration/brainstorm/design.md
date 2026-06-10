# Design: assert supported schema keywords at manifest load

## Overview

`validateOutput` (src/internal/output-validation.ts) supports exactly eight keywords and ignores
the rest. The complete set of schemas the runtime hands it (verified by call-site enumeration):
callable `inputSchema` (callable.ts:109) and `outputSchema` (:187), node `outputSchema` for both
kinds (coach.ts:398, callable.ts:159), gate `decisionSchema` (coach.ts:462), and workflow graph
`outputSchema` (coach.ts:713/:827/:852). Only callable schemas are asserted today, and only at
call time. Everything else can declare `pattern`/`minLength`/`format` that silently validates
nothing.

Fix at the strongest choke point — the manifest zod schema — so every load fails fast with
path-named issues. User decisions validated: schema-level over a `registerGraphPackage` walker
(covers `graph validate` and checkpointed reloads for free); fold into the not-yet-vendored
0.1.0; keep the callable call-time assertion as defense-in-depth against in-place package edits.

## Non-Goals

- **Host-facing schemas stay exempt.** `interaction.schema`, `toolContract.inputSchema`/
  `outputSchema`, `validators[].inputSchema`/`outputSchema`, and
  `sideChannelActions[].outputSchema` are never passed to `validateOutput` (verified —
  `recordSideChannelAction` does not validate outputs); hosts may use full JSON Schema there.
  This exemption is deliberate and must survive future "helpful" generalization.
- **No expansion of the supported keyword set.** Annotation keywords (`description`, `title`)
  remain rejected, matching the existing callable posture; admitting them is a separate,
  deliberate decision if it ever pinches.
- **No removal of run-time callable assertions.** `assertCallableSupported` keeps its keyword
  checks (stale-disk defense) plus its gate/host-contract rejections.
- **No version bump.** Breaking, but ships inside 0.1.0 before the tarball is vendored. (If
  0.1.0 turns out to have been vendored already, bump to 0.2.0 instead.)

## Design

### Shared keyword walker (new `src/internal/schema-keywords.ts`)

Extract the supported-keyword knowledge from `assertSupportedCallableSchema` into a leaf module
(no runtime imports from schema.ts — avoids the schema ↔ output-validation cycle; type-only
imports are fine):

- `SUPPORTED_SCHEMA_KEYWORDS` (the existing eight).
- `collectUnsupportedSchemaKeywords(schema, path): Array<{ path: (string|number)[]; message: string }>`
  — non-throwing walk mirroring the existing recursion (properties, items, oneOf), reporting
  both unknown keywords and unsupported keyword values.

`assertSupportedCallableSchema` is reimplemented on top of the walker (rename to
`assertSupportedSchema`, internal-only symbol — not exported from index.ts, so not public API),
throwing the same `E_UNSUPPORTED_SCHEMA_KEYWORD` for the run-time defense path.

### Schema (src/schema.ts)

Extend the existing manifest/graph `superRefine` (where `validateGraphReferences` runs) with a
keyword walk over the runtime-validated schemas of the parsed value:

- workflow: graph `outputSchema` (when declared), each node's `outputSchema`, each
  `gate.decisionSchema`.
- callable: `inputSchema`, `outputSchema`, each node's `outputSchema`, each `gate.decisionSchema`.
- dispatcher: nothing (no schemas).

Each finding becomes a zod issue at the real path (e.g.
`nodes.classify.gate.decisionSchema: unsupported schema keyword: pattern`), so
`loadGraphPackage`'s existing `E_INVALID_GRAPH_PACKAGE` + `formatIssues` reporting names the
exact location. Applied to both `graphPackageManifestSchema` and the manifest-less `graphSchema`
(public API, same honesty).

### Untouched

- `src/registry.ts` — registration inherits the check via `loadGraphPackage`; no walker needed.
- `src/cli.ts` `graph validate` — inherits via `loadGraphPackage`.
- Runtime (`coach.ts`, `callable.ts`) — no changes beyond the output-validation rename fallout.

### Fixture/template audit

In-repo templates and fixtures use only supported keywords (template graphs: `type`/`required`/
`properties`/`enum`; callable fixtures add `additionalProperties: false` — supported). Any
straggler surfaces as a test failure and gets fixed to the supported set.

### Build

`dist/` rebuilt; full suite before and after.

## Success Criteria

- A manifest with an unsupported keyword in any runtime-validated schema — workflow/callable
  graph `outputSchema`, node `outputSchema`, gate `decisionSchema`, callable `inputSchema` —
  fails to load with an issue naming the keyword and its path.
- Manifests using only supported keywords load exactly as before.
- Host-facing schemas (`toolContract`, `validators`, `sideChannelActions`, `interaction.schema`)
  still accept arbitrary keywords.
- `graph validate` on the CLI rejects exotic-keyword packages (inherited, no special-casing).
- Callable call-time behavior unchanged (existing `E_UNSUPPORTED_SCHEMA_KEYWORD` tests pass).
- Full suite passes; `dist/` rebuilt; no version change.

## Testing Approach

- **TDD.** `tests/schema.test.ts` first: rejection cases per slot (graph outputSchema with
  `format`, node outputSchema with `minLength`, gate decisionSchema with `pattern`, callable
  inputSchema with `pattern`), asserting the issue path names the offending location; acceptance
  case for a manifest whose `toolContract.outputSchema`/`interaction.schema` carry exotic
  keywords (exemption holds).
- `tests/graph-package.test.ts`: `loadGraphPackage` rejection (covers registration and
  `graph validate` paths).
- Existing callable keyword tests confirm the run-time defense is intact.
- Full suite, rebuild `dist/`, re-run.

## Risks

- **Out-of-tree manifests with exotic or annotation keywords break at load.** Accepted —
  that is the point; the error names the exact path and keyword. Consumer check (oceanlive)
  already confirmed only supported keywords in use.
- **Walker drift from `validateOutput`'s actual support.** Mitigated by deriving both the
  asserter and the validator from the single `SUPPORTED_SCHEMA_KEYWORDS` set in one module.
- **Import cycle schema.ts ↔ output-validation.ts.** Avoided by placing the walker in a leaf
  internal module used by both.
