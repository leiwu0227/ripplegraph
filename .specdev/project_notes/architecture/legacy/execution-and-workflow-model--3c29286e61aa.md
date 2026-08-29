# Ripplegraph Execution and Workflow Model

Status: deprecated

## Purpose and scope

Ripplegraph has three graph kinds with different execution roles: a dispatcher
coordinates selection, a workflow executes as a durable focused run, and a
callable executes as an isolated persisted call. The runtime owns validation,
position, and declared routing for executable graphs; the host owns the work
performed at each node and the choice of dispatcher action.

This note binds the current execution model: selection, node transitions,
workflow focus and lifecycle, gates, child workflows, callable isolation,
completion, history, and cross-execution boundaries. It refines the vocabulary
in `core-concepts.md` and the pull/submit protocol in
`host-runtime-interaction.md`. Exact storage layout and failure recovery are
reserved for the planned `state-and-recovery.md` note; effect-grant detail is
reserved for the planned `effects-and-authority.md` note. Those roadmap
destinations are not active authority until separately approved and published.
Command tutorials and installed workflow catalogs remain ordinary
documentation.

## Execution families and selection

| Graph kind | Execution role | Durable execution identity | Relationship to workflow focus |
| --- | --- | --- | --- |
| Dispatcher | Presents metadata, the registered graph catalog, and Ripplegraph's fixed action contract so the host can select an operation. It has no executable nodes. | No dispatcher run or pending selection is created. | It may start or resume a workflow or start a callable, but it is not itself focused. |
| Workflow | Executes nodes, gates, routes, and child-workflow references as one durable run. | Run identifier and run checkpoint. | An active run must be the workspace's single focused run to advance normally. |
| Callable | Executes a bounded input-to-output graph as an independently addressed call. | Call identifier and call checkpoint. | A call never acquires or changes workflow focus. |

Ripplegraph does not autonomously choose among executable graphs. Dispatcher
selection is a two-step host handoff: the runtime returns the catalog and
action schema, then the host submits one validated action. Direct library and
management paths instead name a graph identifier explicitly. In either path,
the runtime enforces the requested kind before creating a run or call.

The registry catalog is runtime input, not protected architecture. Adding,
removing, or renaming a consuming product's workflow packages does not change
this execution model.

## Deterministic node transitions

For host-submitted edge routing from a nonterminal ordinary workflow node, a
workflow gate, or any callable node, an accepted transition follows this order:

```text
host submission
    -> validate against the active response contract
    -> scan the node's edges in declared order
    -> select the first unconditional or matching edge
    -> if this would complete the run or call, validate its completion path
    -> record the accepted result and new position
    -> return the next contract or a terminal result
```

The completion-path check means the graph-level output validation that applies
when the selected route would finish the owning run or call. A child terminal
route that returns to a nonterminal parent instead enters the separate
child-return phase, whose validation and evidence ordering are described below.

An edge condition is a `when` object. It matches only when the submitted value
is a non-array object and every named top-level field is strictly equal to the
declared value. Matching is shallow. An edge without `when` is unconditional,
so its position in the edge array can make later edges unreachable. The host
does not submit a destination and cannot directly set runtime position.

Host-submitted routing from a nonterminal ordinary workflow node and every
callable step validates the current node's output schema before routing.
Workflow gates instead validate the gate decision schema. A schema-validation
failure leaves the checkpoint position unchanged and appends failed-validation
evidence. When selecting an edge on the currently submitted ordinary workflow
node, gate, or callable node, a schema-valid value for which no edge matches
raises an error before an output artifact or checkpoint transition is accepted;
the current engine does not append a failed transition for that direct no-route
case.

Workflow-reference entry and return are separate runtime-owned transitions, not
instances of this host-submitted pipeline. Entry automatically resolves the
child and persists a frame without validating a parent response or selecting a
parent edge. Parent-edge selection occurs only after child completion, and its
no-route evidence boundary differs as described under history below.

## Durable workflow runs

Starting a workflow resolves a registered workflow package, checks its declared
start requirements and current effect policy, creates an active checkpoint,
sets workspace focus to the new run, and records the start. A workspace may
retain many run checkpoints, but no second run can start or resume while another
run is focused.

Normal workflow advancement requires an active focused run. Its checkpoint
owns the root graph, current graph and node, lifecycle status, accepted outputs,
gate decisions, child-workflow stack, package-source identity, timestamps, and
the final output after completion.

The implemented lifecycle is:

```text
start -----------------------> active
active ------ suspend -------> suspended
suspended --- resume --------> active
active ------ complete ------> completed
active ------ abandon -------> abandoned
```

- Suspending persists the current position, changes the run to `suspended`, and
  clears focus.
- Resuming requires the named run to be suspended and the workspace to have no
  focused run; it marks that run active and focuses it. The returned resume path
  then automatically enters any `workflowRef` at the restored position, which
  can push a child frame and serve a different graph and node from the suspended
  checkpoint position.
- Completion and abandonment are terminal and clear focus.
- Switching is not a distinct engine transition. The dispatcher action named
  `switch_run` currently delegates to the same resume operation and cannot
  displace an existing focused run.

## Workflow node modes

### Ordinary nodes

A nonterminal ordinary node accepts one value matching its node output schema.
The runtime uses that value for edge selection, stores it under the active run
scope, and advances to the selected destination. If the destination is
nonterminal, the runtime serves its node contract. If the destination is
terminal, the active graph reaches its terminal boundary without a separate
terminal-node work turn. At the root frame this can complete the run; inside a
child frame it enters child-return handling. Reaching that boundary alone does
not durably exit the frame: the child graph output and a parent-reference route
must accept, and the return cascade must reach a checkpoint write or root
completion. The parent may then continue at a nonterminal node or unwind
further. A run already positioned on an ordinary terminal node takes the
separate completion short-circuit described below; that submission is not
validated against the terminal node's output schema and does not select one of
its edges.

### Gates

A gate is a workflow-only external-decision boundary. Canonical advancement
detects the gate and interprets the submitted value as a decision rather than
as an ordinary node output. The decision must satisfy the gate's decision
schema; decision-source and interaction fields describe how the host should
obtain it but do not make Ripplegraph contact a person or tool.

An accepted gate decision is stored both as the gate decision and as the node's
scoped output, is recorded as a `decide` transition, and routes through the
gate's ordered edges. The graph schema forbids one node from being both a gate
and a child-workflow reference. Canonical `advance` checks for a gate before
ordinary terminal-node handling; the lower-level direct `step` path reverses
that precedence for a node that is both terminal and gated, as recorded under
current enforcement limits.

### Child-workflow references

A workflow-reference node enters another registered workflow inside the same
run:

```text
parent reference node
    -> push parent position, package source, and output scope
    -> execute the child graph at a new frame scope
    -> validate the child result against its graph output schema, when declared
    -> pop the frame and route the parent reference node with that result
```

The child is not a new run or callable and does not acquire separate focus. Each
entry receives a monotonically allocated frame scope so parent, nested-child,
and repeated-child outputs with the same node identifiers do not collide. The
parent reference node retains the child's completion value in the parent scope.

The child package is resolved from the registry when the frame is entered and
its path, identifier, and version are retained on that active frame. A later or
repeated entry resolves again from the then-current registry. The child graph's
declared output schema, when present, validates its completion value before the
frame exits; the parent reference node's own node output schema is not
separately applied to that child result.

Within one automatic reference-entry chain, the runtime rejects a repeated
`active graph/node -> child graph` entry with `E_WORKFLOW_REF_CYCLE`. The guard
is scoped to that consecutive automatic-entry invocation; it is not a general
prohibition on every recursive graph shape across later host-advanced steps.

## Workflow completion

On the normal edge-driven completion path, the completion value is the ordinary
output, gate decision, or child result whose routing reaches and, where needed,
unwinds to the root terminal boundary. When that path reaches the root boundary
and the root workflow declares an output schema, Ripplegraph validates the
completion value before accepting the completing position change. With no
declared root output schema, there is no additional root-level completion
contract.

A run already positioned on an ordinary terminal node uses a different
short-circuit: the submitted value completes the whole run against the active
graph passed to the completion routine, without validating the terminal node's
output schema or selecting an edge. With no child frame, the active graph is the
root and its declared output schema is applied. With an active child frame, the
current implementation instead applies the child graph's output schema and
does not unwind to the root boundary; this enforcement gap is recorded below.

Successful completion sets the run status to `completed`, stores the terminal
position and `finalOutput`, writes the checkpoint, clears focus, and returns the
value. Workflow transition records have no separate `complete` operation. A
normal completion reached through an edge is represented by its accepted
`step` or `decide` transition plus the completed checkpoint; completion from a
run already at a terminal node may be represented only by the checkpoint after
the earlier start or transition evidence.

## Isolated callable calls

Callable start validates the registered graph kind, graph-level effect policy,
callable feature restrictions, and graph input schema before creating call
state. Each call retains its input, current position, package identity, latest
accepted outputs by node, timestamps, and final output after completion.

Calls are independent execution records. Any number of persisted active or
completed calls may coexist with one another and with a focused workflow run,
and every call operation names its call identifier. This coexistence is not an
internal scheduler or a guarantee of parallel processing; Ripplegraph advances
only the call named by the host's current invocation.

A callable step validates the current node output and applies the same ordered
edge-selection rule as workflows. When the selected destination is terminal,
the same submitted value is additionally validated against the callable graph's
output schema, stored as `finalOutput`, and recorded by a dedicated callable
`complete` transition. The terminal destination is a completion marker rather
than a second node-work turn.

Callable outputs are retained by node identifier, so revisiting a node replaces
its retained value and artifact. Calls currently have no suspend, resume, or
abandon operations. Callable startup rejects gates and the interaction,
interrupt, side-channel, tool-contract, and validator metadata that workflow
execution can expose. The shared node schema still accepts `workflowRef`, but
the callable engine neither enters it nor rejects it; no child-workflow
semantics may therefore be inferred for callables.

## Checkpoints, artifacts, and history

Checkpoints are the current execution snapshots from which Ripplegraph serves
state and accepts the next operation. Node artifacts contain values written
after the active node response validates and an outgoing route is selected, but
they are not proof that every enclosing completion contract accepted it.
Workflow artifacts are keyed by run, frame scope, and node; callable artifacts
are keyed by call and node. Revisiting the same key replaces the retained
result, so the checkpoint output map and artifact tree are current retained
values rather than a complete history.

Before committing a terminal child submission that might unwind all the way to
root completion, the engine probes that cascade with read-only child-output and
parent-route checks. If the probe reaches the root and the root output schema
rejects the value, the engine returns the validation error before writing the
child source-node artifact or accepted operation; the failed validation record
is written at the durable pre-submission position.

When that early root rejection does not apply, the engine writes the child
source-node artifact and an accepted operation before `exitChildWorkflow`
validates the child graph output. That accepted record is `step` for an
ordinary child node and `decide` for a child gate. If exit-time child-output
validation rejects the value, the durable checkpoint position and frame stack
remain at the pre-submission state, while the artifact and accepted operation
remain and a separate failed `step` record is appended at the child terminal
position. A rejection at a later enclosing child boundary can likewise leave
the intervening child-return artifacts and accepted operations without a new
checkpoint.

If the child result passes its graph output contract but no parent-reference
edge matches, the same artifact and accepted child operation remain, the
durable checkpoint still stays at the child's pre-submission node, and the
engine raises the no-route error without a failed transition record. Artifact
presence and transition validation therefore have to be interpreted with the
checkpoint and any following child-output or parent-routing failure.

Transition logs are append-only chronological evidence separate from the
checkpoint snapshot. Workflow logs record starts, accepted and rejected steps
or decisions, lifecycle changes, automatic child entries and exits, and audit
operations. Callable logs record starts, steps, validation failures, and a
dedicated completion event. Transition logs are audit records, not an event bus
and not an input that automatically advances another run or call.

Recovery is invocation-driven. Workflow state reloads the focused checkpoint;
call state reloads the explicitly named call. Active execution reloads its
checkpointed package source and requires the stored identifier, version, and
expected graph kind to still match. These checks do not hash package contents.
Exact filesystem layout, write ordering, corruption behavior, and migration
guarantees are deferred to the planned `state-and-recovery.md` decision.

## Isolation and external-effect boundaries

- A workflow step mutates only its run-owned checkpoint, artifacts, and
  transition evidence, plus the workspace focus pointer when lifecycle changes
  require it. It does not advance another saved run.
- A child workflow shares its parent's run by design. Its frame-scoped state is
  isolation within that run, not isolation from it.
- A callable step mutates only its named call record and never reads or changes
  workflow focus. A workflow node does not automatically invoke a callable.
- A dispatcher action can explicitly create or resume one execution, but the
  dispatcher has no persistent execution state and does not link later run and
  call transitions.
- Node instructions, interactions, tool contracts, validators, interrupts, and
  side-channel metadata describe host work. Ripplegraph does not execute those
  external operations.
- Side-channel recording and reconciliation append workflow audit evidence at
  the unchanged position. They record host-performed external activity or
  observed drift; they do not perform that activity or select a route.
- Start-time effect checks are declarative admission gates. They do not create
  cross-run authority, infer actual side effects, or provide process or
  operating-system isolation.

## Execution invariants present in the system

1. Dispatchers coordinate host selection but never execute nodes or own an
   execution checkpoint.
2. Workflow runs and callable calls are sibling execution models. Neither
   engine invokes or mutates the other.
3. At most one workflow run is focused, while independently addressed callable
   calls may coexist without taking focus.
4. For a fixed valid submission and ordered edge list, route selection is
   deterministic and owned by the runtime.
5. A rejected response does not move durable execution position; any graph
   output schema selected by the current completion path is checked before the
   completed checkpoint state is written.
6. Workflow gates and child-workflow frames remain part of one run and one
   focus boundary.
7. Completion persists the returned value on the owning run or call; workflow
   completion clears focus, while callable completion has no focus effect.
8. External work remains host-owned and cannot advance graph state without a
   subsequent structured runtime invocation.

## Current enforcement limits

- Conditional routing supports shallow top-level strict equality only. It does
  not evaluate expressions, nested selectors, priorities, or backtracking.
- Retained outputs and artifacts are latest-value views, not immutable per-node
  histories. Transition logs carry chronology, but workflow completion has no
  dedicated completion event.
- Persisted package identity covers path, identifier, kind expectation, and
  version, not a content digest. A package changed in place under the same
  identity is not detected by this check alone.
- Callable lifecycle management and internal parallel scheduling are absent.
  Callable `workflowRef` acceptance remains an enforcement gap, not a supported
  nesting feature.
- A run durably positioned on an ordinary terminal node inside a child frame
  completes the entire run against that child graph's declared output schema,
  when present. It does not unwind the frame stack, validate the root graph's
  output schema, or move the completed position back to the root graph. This is
  a current terminal short-circuit gap, not the normal child-return path.
- A schema-legal terminal gate has divergent lower-level entry behavior.
  Canonical `advance` treats it as a gate, validates its decision, and requires
  a matching edge; direct `step` sees the terminal flag first and completes via
  the terminal short-circuit without applying the gate decision schema. This is
  a current engine-entry-point enforcement gap, not a portable graph-authoring
  guarantee.
- Runtime persistence operations are not claimed here to form one atomic
  transaction. Crash consistency and repair guarantees require the separate
  planned state-and-recovery decision.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`5cdf1c75b591baddee04d110c5a314ac2f830ad8` on 2026-08-28.
Verification was static: the focused test files were inspected but not executed
because the workspace has no installed Vitest executable.

Relevant source paths:

- `src/schema.ts`
- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/storage.ts`
- `src/internal/coach-responses.ts`
- `src/internal/output-validation.ts`
- `src/internal/runtime-graph.ts`
- `src/internal/transitions.ts`
- `tests/dispatcher.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
