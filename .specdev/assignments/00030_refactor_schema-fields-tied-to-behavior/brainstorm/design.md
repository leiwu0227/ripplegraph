# Design: tie every declared graph schema field to runtime behavior

## Overview

Assignment 00029 deleted the dispatcher's dead executable body but left the class problem: schema
fields that nothing ties to behavior. The governing rule adopted here, derived from how the
codebase already treats its healthy fields: **every declared graph-package schema field must be
(a) runtime-enforced, (b) host-exposed via an API response, or (c) deleted.** 00022's
host-contract fields (`interaction`, `toolContract`, `validators`, `sideChannelActions`) satisfy
(b) — they are surfaced in `StateOk.node`. Callable I/O schemas and workflow `requires` satisfy
(a). The audit found five violations; per-field decisions were validated with the user:

| Field | Status today | Decision |
|---|---|---|
| workflow `inputSchema` | never read (runs take no input), never exposed | **Delete** |
| workflow `outputSchema` at root completion | enforced only on child path (coach.ts:696) | **Wire** — validate at root completion |
| `workflowRef.inputMap`/`outputMap` | parsed and dropped; not applied (00017 deferred), not exposed | **Delete** |
| dispatcher `effects` | never asserted (dispatch is read-only) | **Delete** (00029 flagged it) |
| callable `requires` | exposed in dispatch summaries, never enforced at call-start | **Delete** |

Untouched counterexamples: callable `inputSchema`/`outputSchema` (enforced at callable.ts:109,
:187), workflow `requires` (enforced at coach.ts:269), `activationHints`/`title`/`description`
(exposed in dispatch/registry summaries), all node-level fields (enforced or state-exposed per
00022).

## Non-Goals

- **No new feature surface.** Not adding workflow start input, not adding `preconditionState` to
  callable calls, not implementing the inputMap/outputMap expression language (still deferred, as
  in 00017). Deleted fields can return when actually designed and wired.
- **No final-output persistence for workflow runs.** Root completion validates the completing
  value but does not start persisting a `finalOutput` (callable-style) on the run checkpoint.
- **No `registryEntrySchema` shape change.** Entries keep `requires`/`effects` keys (defaulted);
  dispatcher/callable entries simply store `[]` where the manifest no longer carries the field.
- **No backward-compatibility shim.** Manifests carrying deleted fields are strict-rejected,
  same posture as 00029.

## Design

### Schema (src/schema.ts): three kind-specific manifest variants

The two-member union from 00029 becomes three `.strict()` variants — each kind declares exactly
the fields its runtime path reads or its hosts see:

- **dispatcher**: `id`, `version`, `kind`, `title?`, `description?`, `activationHints` (loses
  `effects`).
- **workflow**: dispatcher's metadata fields + `effects`, `requires`, `outputSchema`, `entry`,
  `nodes` (loses `inputSchema`).
- **callable**: metadata fields + `effects`, `inputSchema`, `outputSchema`, `entry`, `nodes`
  (loses `requires`).

`graphPackageManifestSchema = z.discriminatedUnion('kind', [dispatcher, workflow, callable])`
with the existing `superRefine` running `validateGraphReferences` for the executable kinds.
`workflowRefSchema` drops `inputMap`/`outputMap`; it is already `.strict()`, so carriers are
rejected. Exported types: `WorkflowGraphManifest`, `CallableGraphManifest` replace
`ExecutableGraphManifest`. The `Graph` type / `graphSchema` export becomes the union of the two
executable variants minus `id`/`version` — the runtime helpers (`getNode`,
`missingEffectsForGraph`, `exitChildWorkflow`) only touch their common core (`entry`, `nodes`,
`effects`, `outputSchema`), so both manifest variants stay structurally assignable.

### Root-run outputSchema enforcement (src/coach.ts)

`completeRun` (coach.ts:800) is the single choke point — all four root-completion call sites go
through it: step-into-terminal (:428, value = `opts.output`), already-on-terminal (:388, value =
`opts.output`; the common single-node-graph path), gate-decision-into-terminal (:489, value =
`opts.decision`), and child-exit-landing-on-root-terminal (:751, value = `childResult`).
Extend `completeRun` to take the active graph and the completing value, and validate the value
against `graph.outputSchema` exactly as `exitChildWorkflow` does (coach.ts:696): on failure,
append a `validation: { ok: false, errors }` transition and return the `validation_error`
response with the run left active. The default `outputSchema` is `{ type: 'object' }`, so
existing graphs that never declared one are unaffected.

### Knock-on edits

- **`src/registry.ts`**: `ManifestForKind` maps `'workflow'`/`'callable'` to their own variants.
  `registerGraphPackage` sources `requires` only from workflow manifests and `effects` only from
  executable manifests (else `[]`).
- **`src/callable.ts`**: helper signatures move from `ExecutableGraphManifest` to
  `CallableGraphManifest`; no logic change (resolver narrowing, as in 00029).
- **`src/cli.ts` `packageSummary`**: `requires` populated only for workflow kind, `effects` `[]`
  for dispatcher; shape otherwise unchanged.
- **`src/coach.ts`, `src/dispatcher.ts`, `src/graph/diagram.ts`**: no logic change beyond the
  `completeRun` wiring; they read common fields or registry entries. TypeScript narrowing
  enumerates anything the audit missed as a compile error.

### Template + fixtures

- `templates/minimal/.ripplegraph/graphs/workspace-dispatcher/graph.json`: drop `"effects": []`.
- Template workflow graphs (`architecture-sweep`, `change-intake`): drop `inputSchema` if present.
- `tests/helpers/workspace.ts`: input types follow the three-way split (dispatcher input loses
  `effects`; workflow input loses `inputSchema`; callable input loses `requires`);
  `normalizedManifest` emits only the variant's fields.
- Fixtures in `tests/dispatcher.test.ts` (baseManifest `effects`), `tests/helpers/workflows.ts`
  (metadata fixture dispatcher `effects: ['read_workspace']` and the coach.test.ts assertion that
  reads it), `tests/cli.test.ts`, `tests/callable.test.ts` (callable fixtures carrying
  `requires`, workflow fixtures carrying `inputSchema`) — update to variant shapes.
- `dist/` rebuilt (committed; `bin/ripplegraph` tests run against it).

## Success Criteria

- Manifests carrying a deleted field — workflow `inputSchema`, callable `requires`, dispatcher
  `effects`, `workflowRef.inputMap`/`outputMap` on any node — fail schema validation (strict).
- Each variant still accepts its legitimate fields; reference validation still catches bad
  `entry`/edges for executable kinds.
- A root run whose completing output violates the graph `outputSchema` gets `validation_error`
  (run stays active, transition logged), on all four completion paths; a child run's behavior is
  unchanged. Graphs with the default `{ type: 'object' }` outputSchema complete as before.
- Dispatch request/action output unchanged for the same registry state; registry entries for
  dispatcher/callable kinds store `requires: []`/`effects` appropriately.
- Full suite passes; `dist/` rebuilt and consistent.

## Testing Approach

- **TDD.** Extend `tests/schema.test.ts` first: per-kind rejection cases for each deleted field;
  per-kind acceptance of the legitimate shape; `workflowRef` with `inputMap` rejected.
- New coach test: root run with a non-default `outputSchema` — completing output that violates it
  returns `validation_error` and the run stays active; conforming output completes. Cover the
  single-node (:388) and step-into-terminal (:428) paths at minimum; gate (:489) and
  child-exit (:751) paths if existing fixtures make it cheap.
- Update fixtures; confirm dispatcher routing and callable call tests pass unchanged.
- Full suite, rebuild `dist/`, re-run.

## Risks

- **Root-output enforcement is a behavior change.** Out-of-tree graphs with a drifted
  (non-default) root `outputSchema` start failing at completion. Accepted — this is the
  drift-containment value proposition (00001 big picture); the default-schema case is unaffected.
- **Out-of-tree manifests carrying deleted fields break.** Accepted per the strict posture;
  error messages name the unrecognized keys.
- **The `:388` completion path validates `opts.output` for a node whose output was previously
  ignored.** Single-node graphs stepping with `{}` against the default schema still pass; only
  graphs that declare a stricter root outputSchema are affected, which is the point.
- **Missed consumer of a deleted field.** Mitigated as in 00029: the union split turns unguarded
  access into compile errors; `tsc` enumerates them exhaustively.
