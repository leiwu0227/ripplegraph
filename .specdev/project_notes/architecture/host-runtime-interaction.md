# Ripplegraph Host/Runtime Interaction Protocol

Status: implemented

## Purpose and scope

Ripplegraph uses a host-driven pull/submit protocol. A product CLI, coding agent,
or other host asks the runtime for a validated dispatch or execution contract,
performs the described work outside the runtime, and submits one structured
action, output, or decision. The runtime validates that submission, owns durable
execution state and routing, and returns the next contract or terminal result.

This note binds that high-level interaction as it exists today. It covers
workspace readiness, graph registration and selection, dispatcher handoff,
workflow and callable host loops, lifecycle boundaries, and re-entry after an
interruption. It does not define graph-internal transition semantics, the full
state and recovery model, effect-security policy, or copyable command tutorials;
those belong in later architecture notes or ordinary documentation.

The public TypeScript API and the machine-readable `ripplegraph` CLI are two
adapters over the same runtime services. Command spelling is included only where
it distinguishes the canonical protocol from compatibility or management
paths.

## Interaction boundary

The current protocol has no embedded agent loop and no runtime-to-host callback.
Every turn begins with a host invocation and ends with a returned value:

| Participant | Owns |
| --- | --- |
| Host | Workspace selection, user-intent interpretation, effect grants and precondition facts, node work, tool and user interaction, and submission of structured data. |
| Ripplegraph runtime | Workspace and package validation, registered-graph resolution, dispatch-action validation, focus and checkpoint state, response validation, deterministic routing, persistence, and the next host-facing contract. |
| Graph package | Descriptive activation metadata, start requirements, effects, node instructions and contracts, routes, and completion contracts. |

The host may use returned instructions and metadata to reason or invoke external
tools, but those actions do not advance Ripplegraph by themselves. Advancement
occurs only when the host makes another runtime call with structured data.

## Workspace readiness and package availability

1. The host selects a workspace root. The machine CLI accepts an explicit root
   and otherwise uses its current working directory.
2. Workflow operations that require workspace identity load it from
   `.ripplegraph/workflow.json` when that file exists; otherwise they load the
   root-level `workflow.json`. The hidden file therefore has precedence when
   both exist.
3. The core library and machine CLI do not author that workspace identity.
   Missing or invalid metadata stops workspace validation, state and dispatcher
   entry, workflow start and advancement, suspension, resumption, and run
   listing. The separate demo adapter can copy a demo template, but that is not
   the generic runtime protocol.
4. Graph packages become selectable through explicit registration. Registration
   loads and validates the package's `graph.json`, then records its identity,
   kind, version, activation metadata, and package path in
   `.ripplegraph/registry.json`. Registry entries retain requirements only for
   workflow graphs and effects only for executable workflow or callable graphs;
   dispatcher entries store empty lists for both. Registration records a
   relative path for a package inside the workspace and an absolute path
   otherwise; it does not copy or install package contents.
5. Workflow validation, state inspection, run listing, or run creation ensures
   the run directory and `current.json` focus pointer exist. Other state is
   created only by the operation that needs it, such as registry registration
   or callable start.

Registration and workspace preparation are management responsibilities. The
normal execution loop consumes their validated results rather than discovering
arbitrary package folders on each turn.

## Canonical high-level sequence

```text
Host                           Ripplegraph runtime                 Workspace state
 |                                      |                               |
 |-- state / explain ------------------>|-- load identity and focus ---->|
 |<-- focused node contract, or --------|                               |
 |    no-focused-run guidance           |                               |
 |                                      |                               |
 |-- dispatch(request), when offered -->|-- read dispatcher/catalog ---->|
 |<-- action schema + graph catalog ----|                               |
 |                                      |                               |
 |-- dispatch(validated action) ------->|-- preflight and apply -------->|
 |<-- active run/call state, list, or --|                               |
 |    structured user question          |                               |
 |                                      |                               |
 |   perform node work outside runtime  |                               |
 |                                      |                               |
 |-- advance(output/decision), or ------|-- validate, persist, route --->|
 |   call-step(call output)              |                               |
 |<-- next contract or completed result-|                               |
```

The concrete sequence is:

1. Re-anchor from runtime state rather than conversation memory.
2. When no workflow is focused and state exposes a dispatcher, submit user
   intent through the dispatcher request phase.
3. Use the returned graph catalog and fixed action schema to produce one
   dispatcher action, then submit that action separately.
4. For an active workflow or call, read the returned node instructions,
   operator context, response contract, and recent outputs.
5. Perform the bounded node work outside Ripplegraph.
6. Submit the node result through workflow `advance` or callable `call-step`.
7. Continue from the newly returned state; on completion, consume the validated
   terminal output.
8. After interruption, repeat the appropriate state operation from durable
   workspace data.

## Dispatcher entry protocol

Dispatcher use is available only when exactly one dispatcher graph is
registered and, when workspace metadata declares `entryGraph`, that identifier
matches the registered dispatcher. Both dispatch phases resolve that dispatcher
and fail when none exists, more than one exists, or the declared entry graph
disagrees. General workflow state treats those cases as “no dispatcher
available” and falls back to direct start or resume guidance.

Dispatch is a two-invocation host handoff:

1. The request phase accepts user-intent text and returns the selected
   dispatcher metadata, the complete registered-graph catalog, a fixed action
   schema, and orientation. This phase does not start, resume, or advance work.
2. The host interprets the request and catalog and chooses an action. The
   dispatcher manifest contains metadata only; Ripplegraph does not run a
   dispatcher node or use an LLM to choose.
3. The action phase validates the submitted value against Ripplegraph's action
   schema and then applies it.

The implemented actions are:

| Action | Current result |
| --- | --- |
| `start_run` | Resolve a registered workflow, check its supplied precondition state and allowed effects, create and focus a run, and return its first active-node contract. |
| `resume_run` / `switch_run` | Resume the named suspended run when no run is focused. Both names currently invoke the same resume operation. |
| `list_runs` | Return focus, saved-run summaries, and the graph catalog without advancing a run. |
| `ask_user` | Return a structured question and optional choices to the host; the runtime does not conduct the user interaction. |
| `call_graph` | Resolve a registered callable, preflight allowed effects and input, create an isolated call, and return its first call-node contract. |

There is no persisted pending-dispatch session and the action call does not
carry or verify the prior request. The host owns continuity between request and
action. After `ask_user`, the host likewise owns the user turn and must form a
subsequent request or action from the answer.

Direct workflow start and resume remain public library operations and machine
CLI management/debug paths. They are also the current fallback when state cannot
resolve a dispatcher. When a dispatcher is exposed by state, dispatcher entry
is the canonical user-intent path.

## Focused workflow loop

A successful workflow start or resume returns the same state shape used for
re-entry. It includes workspace and run identity, current graph and node,
child-workflow stack, orientation, node purpose and instructions, host-facing
metadata, the node output schema, recent outputs in the active scope, nearby
routes, a response contract, and suggested next and help commands.

The host performs the current node's work and submits one JSON value. Canonical
`advance` inspects the current node and applies the appropriate operation:

- at an ordinary node it validates the node output and performs a normal step;
- at a gate it validates the external decision and performs a decision step.

The lower-level `step` and `decide` operations remain compatibility/debug
paths, and the returned response contract currently names those lower-level
operations even though the suggested canonical command is `advance`.

A validation failure records a failed transition event and returns structured
issues without changing the durable position. A successful routed submission
writes the accepted artifact and transition evidence, updates the checkpoint,
applies declared routing, and returns either the next node contract or a
validated completion result. Completion persists the final output and clears
workflow focus.

At most one workflow run is focused. Suspending an active run persists its
position and clears focus; resuming requires a suspended run and no existing
focus. `switch_run` does not automatically suspend or replace a focused run.
Abandonment and completion also clear focus. Side-channel action recording and
external-state reconciliation append audit events and return the unchanged
active state; the host performs the external action itself.

## Callable loop

A callable may start directly or through `call_graph`. Callable start resolves
a registered callable package, checks graph-level effects, validates its input,
and only then creates call-local state. Direct callable operations use the
workspace registry and `.ripplegraph/calls/`; they do not load workspace
`workflow.json` or use workflow focus.

The returned callable state contains call and graph identity, the original
input, current position, node instructions and output schema, operator context,
retained per-node outputs, and the `call-step` contract. Revisiting a node
replaces that node's retained value rather than creating an output history. The
host submits each result with the call identifier. Successful nonterminal steps
persist a call-local artifact and checkpoint; terminal completion additionally
validates the callable output contract and returns the final output directly.

Calls are addressed independently and can coexist with a focused workflow and
with other calls. They have no focus pointer and currently have no suspend,
resume, or abandon lifecycle. Re-entry is through call listing and explicit
`call-state` lookup. The callable state currently advertises an
`explain --call-id` help string, but the machine CLI's `explain` implementation
loads workflow state and ignores the call identifier; hosts must use
`call-state` for implemented callable recovery.

## Re-entry and recovery behavior

Durable workspace data, not the previous host conversation, is the recovery
source:

- `state` and `explain` currently invoke the same workflow-state operation.
  With a focused run they reload the checkpoint and pinned graph package and
  serve the active contract. Without focus they return the graph catalog,
  suspended runs, and dispatcher guidance when dispatcher resolution succeeds.
- `call-list` discovers persisted calls and `call-state` reloads one by its
  identifier. Active call state includes the original input and retained
  per-node outputs; completed call state returns the original input and final
  output without reconstructing prior-node context.
- A root workflow source, every currently active child-workflow frame, and an
  active callable reload from the package path, identifier, and version stored
  in durable state; the workflow or callable engine enforces the expected graph
  kind during reload. Replacing the registry entry does not retarget those
  checkpointed sources. A workflow reference first entered later, or re-entered
  after its earlier frame has exited, resolves from the registry as it exists at
  that time. That later resolution does not repeat the workflow start's effect
  preflight, so a replacement child can differ from the child examined at
  start.
- Package-source checks are identity checks, not content hashes. A mismatch at
  a checkpointed source stops active execution recovery, while completed run
  summaries and completed callable results can be read without reloading their
  packages.
- A dispatcher request or returned user question is not checkpointed. After an
  interruption at that boundary, the host reconstructs the handoff by issuing a
  new request from available user context.

State-oriented calls are not guaranteed to be filesystem no-ops. Workflow
validation, state, and run listing can create the initial run/focus scaffold,
and loading a focused checkpoint already positioned on a workflow-reference
node can enter the referenced child and persist that new position. The
dispatcher request phase itself is read-only with respect to run and call
execution state.

## Current adapter and guidance limits

- The machine CLI's canonical workflow vocabulary is `state`, `explain`, and
  `advance`; older `status`, `submit`, and similar names belong to the separate
  demo adapter or compatibility paths and are not machine-CLI commands.
- The core machine CLI has no generic workspace `init` command. Workspace
  identity provisioning and package placement belong to the consuming product
  or host; only explicit validation and registration are generic services.
- When dispatcher resolution fails, no-focused-run state suggests direct start
  from the unfiltered first registry entry. Because the catalog can also contain
  callable or dispatcher entries, a host using that fallback must select a
  registered workflow rather than assuming the example identifier is valid.
- `explain` is currently an alias of workflow `state`, not a richer diagnostic
  operation, and it does not explain callable state.
- Returned host metadata describes interactions, tools, validators,
  interrupts, and side-channel actions, but Ripplegraph does not execute them or
  call back into the host.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`acb802cb31ecc91d4fb3c8f20451e87932f6f8bc` on 2026-08-28.

Relevant source paths:

- `src/index.ts`
- `src/schema.ts`
- `src/storage.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/effects.ts`
- `src/cli.ts`
- `src/demo-cli.ts`
- `src/internal/cli-helpers.ts`
- `src/internal/coach-responses.ts`
- `src/internal/dispatcher-resolution.ts`
- `src/internal/output-validation.ts`
- `src/internal/runtime-graph.ts`
- `tests/storage.test.ts`
- `tests/registry.test.ts`
- `tests/dispatcher.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/cli.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
