# Ripplegraph State and Recovery Model

Status: implemented

## Purpose and scope

Ripplegraph persists workspace coordination, workflow runs, and callable calls
as filesystem state beneath the workspace. Recovery is invocation-driven: a
host calls the runtime again, the runtime validates the relevant persisted
snapshot and graph package, and it serves the next contract or terminal result.
There is no resident scheduler, event replay loop, or hidden conversational
state required to continue execution.

This note binds the current durable ownership model, filesystem boundaries,
checkpoint authority, retained evidence, write ordering, re-entry behavior, and
failure limits. It refines the persistence vocabulary in `core-concepts.md`,
the re-entry protocol in `host-runtime-interaction.md`, and the execution
semantics in `execution-and-workflow-model.md`. Operational repair recipes,
backup policy, and a future transactional or migration design are outside this
current-system capture.

## Durable ownership and authority

| Durable data | Current owner and role | Recovery authority |
| --- | --- | --- |
| Workspace `workflow.json` | The consuming product or host supplies workspace identity to runtime engines. Runtime paths read but do not author it; the bundled demo `init` copies a template workspace. | Required by workflow state, start/resume, and normal active-run operations, but not a run-position snapshot. `abandonRun` is a checkpoint-and-focus-only exception. |
| Graph registry | Runtime registry APIs record graph metadata and package paths in one version-1 catalog; the bundled demo `init` can instead seed the catalog from its template. | Used to select new executions and to resolve each newly entered child workflow. |
| Focus pointer | Ripplegraph stores the identifier of the single focused workflow run, or `null`. | Selects which run checkpoint workflow state and normal advancement load. |
| Workflow checkpoint | Ripplegraph stores one current snapshot per run. | Primary authority for run status, position, retained outputs, child frames, and final output. |
| Callable checkpoint | Ripplegraph stores one current snapshot per call. | Primary authority for call status, position, input, retained outputs, and final output. |
| Node artifacts | Ripplegraph retains accepted node values at stable run/call-relative paths. | Supporting retained evidence only; the engines do not read artifacts to reconstruct state. |
| Transition logs | Ripplegraph appends operation records as JSON Lines. | Chronological audit evidence only; the engines do not replay logs to rebuild checkpoints. |
| Graph packages | A package remains outside the checkpoint and is addressed by stored source identity. | Active recovery reloads the stored path, checks the stored identifier and version, and enforces the graph kind expected by the owning engine. |

The checkpoint is therefore the current execution truth. Artifacts and logs can
explain how an operation was recorded, but neither overrides the checkpoint or
repairs it. A package supplies the executable node contracts that are not copied
into the checkpoint.

## Current filesystem model

The current runtime paths are:

```text
<workspace>/
├── workflow.json                         # fallback workspace identity
└── .ripplegraph/
    ├── workflow.json                     # preferred workspace identity, when present
    ├── registry.json                     # version-1 registered graph catalog
    ├── current.json                      # { focusedRunId: string | null }
    ├── runs/
    │   └── <run-id>/
    │       ├── checkpoint.json
    │       ├── transition-log.jsonl
    │       ├── artifacts/
    │       │   ├── <node-id>/output.json
    │       │   └── <frame-scope>/<node-id>/output.json
    │       └── scratch/
    └── calls/
        └── <call-id>/
            ├── checkpoint.json
            ├── transition-log.jsonl
            ├── artifacts/<node-id>/output.json
            └── scratch/
```

The hidden workspace identity takes precedence over the root-level fallback
when both exist. Graph packages may live inside or outside the workspace; their
registered paths are not constrained to a fixed `graphs/` directory and their
contents are not copied into execution state.

Workflow validation, state, run listing, run creation and resume, and every
operation that loads the focused checkpoint ensure `runs/` and `current.json`
exist. A missing focus file is initialized with a null pointer; an existing
focus is preserved. A missing registry is interpreted as an empty catalog.

Callable-engine start creates call storage by writing its checkpoint. The
root-exported low-level artifact and transition writers can instead create an
artifact-only or log-only call directory. Such a partial directory is visible
to directory-based call listing, which then fails when it cannot read the
missing checkpoint. Checkpoint writes also create the execution's `artifacts/`
and `scratch/` directories; the current engines do not otherwise consume
`scratch/`.

Run, call, node, and frame identifiers used as path segments are checked against
the storage path rules. Lists are produced by sorted directory enumeration, not
by a separate execution index.

## Checkpoint contents and invariants

### Workflow checkpoints

A workflow checkpoint retains:

- run identity and lifecycle status;
- the root graph and a copy of workspace identity at creation;
- current graph and node position;
- creation and update timestamps;
- latest accepted outputs and gate decisions, keyed by root or frame scope;
- the root package source and every active child frame's parent and child
  package sources;
- the child frame stack and monotonically allocated frame counter;
- an optional resume note; and
- the value that completed the run, when present.

The persisted schema requires `position.graph` to match the top child frame's
graph when a frame is active, otherwise the root graph source or root graph.
This catches a structurally inconsistent active-graph position during both
write and reload. It does not validate every referenced node or cross-file
relationship by itself; active package loading supplies those checks later.

The focus pointer is intentionally separate from the run checkpoint. Run
status says whether a run is active, suspended, completed, or abandoned;
`current.json` says which run normal workflow operations address. The engine
maintains their relationship through ordered writes rather than one combined
record.

### Callable checkpoints

A callable checkpoint retains its call identifier, status, graph identifier,
graph version, package path, position, original input, latest outputs by node,
timestamps, and optional final output and output-artifact path. It has no focus
field because every call operation names the call explicitly.

The schema recognizes `active`, `completed`, and `failed` callable states, but
the current callable engine creates active checkpoints and moves them only to
completed. Likewise, the log schema recognizes `fail`, while current engine
paths append start, step, and completion records only. These schema values do
not imply an implemented failure-transition workflow.

## Per-file persistence primitives

Control JSON records are validated by their owning schema before normal runtime
writes. The shared JSON writer creates parent directories, writes the complete
formatted payload to a sibling temporary file, then renames that file to the
destination. Artifacts use the same writer but have no storage-layer schema;
engine paths validate their values before writing them. This is a per-file
replacement strategy, not a transaction across the files touched by one
runtime operation.

Transition logs use a different primitive. Each schema-validated entry is
serialized as one JSON line and appended directly to `transition-log.jsonl`.
The runtime has no transition-log reader, replay cursor, checksum, or compaction
step.

Neither primitive requests an `fsync`, records a commit marker, or acquires a
filesystem lock. A failed temporary-file write can leave its sibling temporary
file behind, and the runtime has no cleanup pass for such files.

## Higher-level write ordering

One accepted runtime operation can write several independently durable files.
The current major orders are:

| Operation | Current successful write order |
| --- | --- |
| Register or replace a graph entry | Replace `registry.json`. |
| Start a workflow | Conditional scaffold first creates `runs/` and initializes a missing focus file to null; then run checkpoint → focus pointer → `start` log. Automatic child entry can add checkpoint → log pairs. |
| Accept an ordinary workflow step or gate decision | Node artifact → accepted `step` or `decide` log → eventual checkpoint. Root completion then clears focus; child return can add more artifacts and logs before the eventual checkpoint. |
| Enter an automatic child workflow | Checkpoint with pushed frame and child position → `step` log. |
| Suspend, resume, or abandon | Updated run checkpoint → focus pointer → lifecycle log; resume can then enter pending child references. |
| Complete from an already-terminal workflow position | Completed checkpoint → cleared focus, with no dedicated completion log. |
| Record side-channel activity or reconciliation | Append one same-position workflow log entry; no checkpoint write. |
| Start a callable | Call checkpoint → `start` log. |
| Accept a callable step or completion | Node artifact → updated call checkpoint → `step` or `complete` log. |
| Reject a schema-invalid active-node response or decision | Append failed-validation evidence; checkpoint position is not written forward. Invalid starts create no execution checkpoint or transition. |

The completion and child-return exceptions described in
`execution-and-workflow-model.md` still apply. In particular, a child-terminal
path can leave accepted artifacts and logs while its durable checkpoint remains
at the pre-submission state, whereas a root-output rejection found by the
read-only completion probe occurs before the accepted artifact and operation.

A schema-valid direct no-route error is raised before accepted evidence is
written. A parent-reference no-route discovered during child return can occur
after child evidence is durable. These are execution semantics, not a general
transaction or rollback mechanism.

## Snapshot state and historical evidence

Checkpoint output maps and artifact paths are latest-value views:

- a root workflow node uses its node identifier as the output key;
- a child workflow node uses `<frame-scope>/<node-id>`;
- a callable uses its node identifier; and
- revisiting the same key replaces the earlier checkpoint value and artifact.

Transition logs preserve append order and can retain multiple visits, rejected
validations, lifecycle events, child entry/return records, and audit-only
operations. Accepted records commonly refer to the retained artifact path
rather than embedding an immutable copy of every result. Later overwrite of an
artifact does not rewrite an earlier transition entry, but the earlier entry's
shared path then resolves to the latest artifact bytes rather than the earlier
value.

Because each evidence file has its own write point, evidence is not a commit
journal. A log may describe a position not yet reflected in the checkpoint, or
a checkpoint may advance before its corresponding log is appended. Workflow
completion has no dedicated completion entry; callable completion does. The
checkpoint and any subsequent error therefore have to be read together with
artifacts and logs.

## Re-entry and resumability

### Workflow re-entry

Workflow state first loads current workspace identity and ensures the workflow
state scaffold. With no focused run, it reports registry choices and run
checkpoints whose status is `suspended`. With focus, it loads the referenced run
checkpoint, reloads its active package source, and serves the active node
contract.

State re-entry can itself persist work. If the durable position is a
`workflowRef`, automatic entry resolves the child from the current registry,
pushes and writes a frame, appends an entry transition, and can repeat through a
bounded chain before returning state.

Explicit resume accepts only a suspended run and only when no run is focused.
It writes active status, focuses the run, appends resume evidence, and then
performs automatic child entry. A merely persisted active checkpoint with no
focus is not accepted by the resume API. Completed and abandoned runs remain
listable but cannot be reopened by the current lifecycle.

### Callable re-entry

Calls have no workspace focus. Call listing enumerates checkpoints, and call
state reloads the explicitly named checkpoint. An active call reloads and
validates its stored graph package before serving the next contract. A
completed call returns input, final output, and artifact reference directly
from the checkpoint without reloading its graph package.

Run summaries likewise read checkpoint fields without loading each graph
package. Normal advancement of an active focused run or active call always
reloads the applicable package first.

## Source identity during recovery

Workflow root checkpoints, child frames, and callable checkpoints retain a
package path, graph identifier, and graph version. The owning workflow or
callable engine supplies and enforces the expected graph kind during active
reload. Reload resolves the stored relative path against the workspace, or uses
an absolute path as recorded, then validates the package manifest. Replacing a
registry entry does not retarget an already checkpointed source.

This is identity pinning, not content pinning. A package edited in place while
retaining the same identifier, version, and kind passes the recovery check. A
missing package, invalid manifest, or mismatch blocks active recovery. A child
first entered later resolves from the registry at that later time and pins the
then-current source on its frame.

Workflow checkpoints also retain the workspace identifier and version present
when the run was created. Current recovery loads the live workspace
`workflow.json` for its response but does not compare it with that retained
checkpoint copy. The stored workspace identity is therefore descriptive today,
not an enforced recovery pin.

## Invalid, missing, and incompatible state

JSON reads fail with `E_BAD_JSON` when a file cannot be read or parsed. Parsed
workspace identity, registry, focus, workflow checkpoint, call checkpoint, and
transition entries are checked by strict schemas at their owning read or append
boundaries and receive more specific invalid-state errors where implemented.

The current benign absence rules are narrow:

- no registry file means an empty version-1 catalog;
- no focus file means no focused run, and workflow state initialization can
  create the null pointer; and
- no run or call directory means an empty list.

A named missing checkpoint is an error. An invalid checkpoint, current pointer,
registry, workspace identity, or active graph package stops the operation that
needs it; Ripplegraph does not fall back to artifacts or transition replay.
Artifacts and transition logs are not read during normal checkpoint recovery,
so their corruption is not detected by state re-entry and cannot repair it.

The focus schema validates only the pointer's shape. It does not verify that the
named run checkpoint exists or has active status. A pointer to a missing
checkpoint stops focused state loading. A pointer to a suspended, completed, or
abandoned checkpoint can still be rendered by `getState`, which does not check
status there, while normal advancement rejects it as non-active. If that stale
checkpoint is positioned at a workflow-reference node, `getState` can also push
and persist a child frame and append its `step` transition for the non-active
run. `abandonRun` is another exception: it loads the focused checkpoint without
checking status, workspace identity, or the graph package, rewrites that
checkpoint as abandoned, clears focus, and appends an `abandon` transition. A
stale focus left after a completed-checkpoint write can therefore allow a later
abandon request to replace completed status with abandoned status. These are
enforcement gaps, not automatic focus/checkpoint reconciliation or repair.

The registry carries an explicit format version of `1`. Workflow checkpoints,
call checkpoints, focus, artifacts, and transition records do not carry a
general persistence-format version, and there is no format migration registry.
Some checkpoint fields have schema defaults, and a zero or absent child frame
counter can be reconstructed from retained frame scopes and output keys before
the next automatic child entry. This narrow compatibility behavior is not a
general migration or repair facility.

## Recovery and concurrency limits

- A higher-level operation is not atomic across its checkpoint, focus,
  artifact, registry, and log writes. Process exit or I/O failure can expose a
  prefix of the documented order.
- The runtime has no write-ahead log, rollback, checkpoint rebuild, orphan
  detection, automated repair, or quarantine operation.
- There is no `fsync`-backed guarantee that a successful return survives sudden
  device or power loss.
- There is no interprocess lock, compare-and-swap revision, or single-writer
  lease. Single focus and duplicate identifiers are enforced by read/check/write
  logic and can race across concurrent processes.
- Runtime calls have no idempotency key. After an ambiguous interruption, the
  host must inspect current state rather than blindly repeat a submission.
- External host work and side effects are outside the filesystem transaction.
  Audit records describe them but cannot atomically couple them to runtime
  position.
- Runs and calls are retained indefinitely. The current library provides no
  deletion, garbage collection, archival, or log compaction lifecycle.
- Low-level storage helpers are part of the root library surface. They validate
  their individual schemas and path segments, but direct use can bypass engine
  preconditions and cross-file ordering; the storage layer is not an authority
  or concurrency barrier by itself.

These limits mean “durable” denotes persisted, reloadable files under normal
operation, not transactional exactly-once execution or automatic crash repair.

## State and recovery invariants present in the system

1. A workflow checkpoint and a callable checkpoint are the primary current
   snapshots for their respective execution identities.
2. Workflow focus is one workspace-level pointer separate from all run
   checkpoints; calls never use it.
3. Artifacts retain latest accepted values, while transition logs retain
   append-only operation evidence; neither is replayed into state.
4. Active execution recovery reloads a stored package path, checks the stored
   graph identifier and version, and enforces the kind expected by the owning
   workflow or callable engine before serving or advancing it.
5. Registry replacement affects future resolution, not an already pinned root,
   child frame, or active call.
6. Registry, focus, checkpoint, workspace-identity, and transition control
   records are schema-validated; artifacts rely on engine validation, and one
   runtime operation can span several independently durable writes.
7. Rejected validation does not move the checkpoint, though it can append
   failure evidence.
8. Recovery begins with an explicit host invocation and current filesystem
   state; no background worker consumes logs or resumes work autonomously.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`1edad7c7f2d806279fff73f1183a5c46ee7c19dd` on 2026-08-28. Product source and
tests are unchanged from revision
`5cdf1c75b591baddee04d110c5a314ac2f830ad8`.

Verification was static: the focused tests were inspected but not executed
because the workspace has no installed Vitest executable.

Relevant source paths:

- `src/schema.ts`
- `src/storage.ts`
- `src/registry.ts`
- `src/graph-package.ts`
- `src/demo-cli.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/internal/json-io.ts`
- `src/internal/coach-responses.ts`
- `src/internal/transitions.ts`
- `templates/minimal/workflow.json`
- `templates/minimal/.ripplegraph/registry.json`
- `tests/storage.test.ts`
- `tests/registry.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
- `.specdev/project_notes/architecture/execution-and-workflow-model.md`
