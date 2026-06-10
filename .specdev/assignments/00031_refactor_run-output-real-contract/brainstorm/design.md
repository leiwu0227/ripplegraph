# Design: make run output a real contract

## Overview

Two changes that complete 00030's rule for workflow run output:

1. **Absent = no contract.** Workflow graph-level `outputSchema` loses its
   `.default({ type: 'object' })` and becomes truly optional. No declaration → root- and
   child-completion validation is skipped entirely. This kills a verified latent failure: under
   the undeclared default, any non-object completing value (e.g. a boolean gate decision edging
   into the root terminal) fails validation against a contract nobody wrote. "Absent = skip" is
   chosen over "default `{}`" deliberately — an empty schema passes everything in this validator
   but pretends a contract exists.
2. **Declared = enforced and exposed.** The completing value — currently validated and then
   discarded (no `output` on the completed response; nothing persisted at all on the
   already-on-terminal path) — becomes first-class: persisted on the checkpoint as `finalOutput`
   (mirroring `callableCheckpointSchema`), returned as `output` on the completed response, and
   included in `listRuns` summaries for completed runs. Provenance rule, documented: **a run's
   output is the value that completes it — terminal step output, gate decision, or child
   result** (exactly what 00030's validation already targets).

All user decisions validated: keep the node-level `outputSchema` object default (load-bearing for
`checkpoint.outputs` maps and `when` edge-matching — documented as deliberate, not accidental);
expose output in `listRuns` summaries; fold into the not-yet-vendored 0.1.0 (every change is a
loosening or additive).

## Non-Goals

- **No change to callable I/O defaults.** Callable `inputSchema`/`outputSchema` keep their object
  defaults — enforced on both ends, the default is a coherent contract there.
- **No change to node-level `outputSchema` default.** Kept per decision; add a code comment
  marking it deliberate.
- **No transition-log changes.** The already-on-terminal completion path still appends no success
  transition (pre-existing); adding a `complete` op to the log is flagged for future work, out of
  scope.
- **No per-run query command.** Completed-run output is reachable via the completed response and
  `listRuns`; a dedicated `run get` surface is not added.
- **No keyword-assertion hoisting.** That is the separate follow-up (review point 5), which is
  breaking and needs its own version decision.
- **No version bump.** Non-breaking; ships inside 0.1.0 before the tarball is vendored.

## Design

### Schema (src/schema.ts)

- Move `outputSchema` out of the shared `executableGraphFields`: the **workflow** variant gets
  `outputSchema: jsonSchemaSchema.optional()`; the **callable** variant keeps
  `.default({ type: 'object' })`. Affects `graphSchema`, `workflowGraphManifestSchema`, and the
  inferred `Graph`/`WorkflowGraphManifest` types (`outputSchema?: JsonSchema`).
- `checkpointSchema` gains `finalOutput: z.unknown().optional()` — name mirrors
  `callableCheckpointSchema.finalOutput`.

### Runtime (src/coach.ts)

- `rootCompletionValidationError`: return null (skip) when `graph.outputSchema` is undefined.
- `rootCompletionGraph`: the intermediate child-schema probe treats an undefined `outputSchema`
  as passing.
- `exitChildWorkflow` (coach.ts:696 region): skip the child output validation when the child
  graph declares no `outputSchema`. **Named behavior change (loosening):** child results were
  previously forced to be objects by the default; an undeclared child schema now accepts any
  value. Note: a non-object `childResult` matches no `when` conditions on parent edges
  (`matchesWhen` returns false for non-objects) — unconditional edges still route.
- `completeRun`: set `checkpoint.finalOutput = result` before `writeCheckpoint`, and return
  `{ status: 'completed', run, position, output: result }`. The `AdvanceResponse` completed
  branch type gains `output: unknown`. This also fixes the already-on-terminal path where the
  completing value previously evaporated without any durable trace.
- Document the provenance rule as a comment on `completeRun` and a line in the README run
  lifecycle/host sections.

### Responses (src/internal/coach-responses.ts)

- `runSummary` includes `output: checkpoint.finalOutput` for completed runs (omit the key for
  active/suspended/abandoned runs and for completed runs persisted before this change).
- `RunSummary` type gains `output?: unknown`.

### Docs

- README: note that absent workflow `outputSchema` means no completion contract, and that a
  completed run's `output` is the completing value (terminal step output, gate decision, or
  child result), exposed on the completion response and `listRuns`.

### Build

- `dist/` rebuilt (committed; built-CLI tests run against it).

## Success Criteria

- A workflow graph with **no** `outputSchema` completes with a non-object completing value (e.g.
  boolean gate decision into the root terminal) — the previously latent default-contract failure
  is gone. Child exits behave the same way when the child declares no schema.
- A workflow graph **with** a declared `outputSchema` is enforced exactly as in 00030 (all
  completion paths, pre-persistence ordering preserved; existing enforcement tests pass
  unchanged).
- The completed response carries `output`; the checkpoint persists `finalOutput`; `listRuns`
  shows `output` on the completed run's summary. Old checkpoints without `finalOutput` still
  parse and summarize (field optional).
- Callable behavior is byte-for-byte unchanged.
- Full suite passes; `dist/` rebuilt and consistent; no version change.

## Testing Approach

- **TDD.** Schema first: workflow manifest without `outputSchema` parses with the field absent
  (not defaulted); checkpoint with `finalOutput` round-trips; callable still defaults its
  schemas.
- Coach: (a) no-schema root run completes via a boolean gate decision into the terminal — the
  latent-failure repro; (b) declared-schema enforcement tests from 00030 pass unchanged;
  (c) completed response `output`, persisted `finalOutput`, and `listRuns` summary `output`
  asserted on both the step-into-terminal and already-on-terminal paths; (d) child exit with an
  undeclared child schema accepts a previously-rejected value.
- Full suite, rebuild `dist/`, re-run.

## Risks

- **Child-path loosening** is a behavior change to pre-00030 enforcement: graphs relying on the
  undeclared object default to reject non-object child results lose that check unless they
  declare a schema. Accepted and named; declaring `{ type: 'object' }` restores it verbatim.
- **Large outputs in `listRuns`.** Summaries now carry completed-run outputs; a huge final output
  bloats the list response. Accepted per decision (the oceanlive use case wants it); a future
  per-run query can supersede if it becomes a problem.
- **`finalOutput` may hold non-JSON-serializable values?** No — outputs already pass through
  JSON transition/checkpoint serialization; `z.unknown().optional()` matches callable precedent.
