# Ripplegraph Data Flow and Value Propagation Model

Status: implemented

## Purpose and scope

This note defines how runtime values enter, move through, are retained by, and
leave Ripplegraph's current workflow and callable engines. It distinguishes
execution values from dispatcher orientation, admission inputs, host-facing
metadata, and audit-only payloads.

This note refines the active notes on host interaction, execution, validation,
state, metadata, effects, package composition, public contracts, and identity.
Those notes continue to own lifecycle transitions, validation details,
filesystem write ordering and recovery, effect admission, package resolution,
adapter framing, and scope identity. This note owns only the relationship among
the value channels those boundaries expose.

## Data-flow decision

Ripplegraph is a host-driven value-routing runtime. The host performs work and
submits explicit values at runtime boundaries. On normal routed step and
decision paths, Ripplegraph validates a value, uses that same value to select a
declared edge, retains it where the execution model requires, and projects a
bounded view back to the host. Apart from callable start's documented nullish
normalization, it does not transform successful routed node outputs, gate
decisions, or child results between routing, retention, and completion. It
does not evaluate expressions, bind named variables, execute host tools, or
infer data dependencies between nodes.

Workflow runs and callable calls have different entry contracts. A workflow
has no start payload; its first execution value is submitted for the active
node or gate. A callable has one normalized, validated, retained input value,
followed by explicit node outputs. A child workflow receives no mapped input;
the value that completes it is routed back through its parent
workflow-reference node.

## Current value channels

| Channel | Entry | Runtime use | Durable representation | Host projection |
| --- | --- | --- | --- | --- |
| Dispatcher request | `getDispatchRequest(request)` | Returned with dispatcher orientation, catalog, and action schema | None | `needs_action.request` |
| Dispatcher action | `applyDispatchAction(action)` | Selects a control operation; only `call_graph.input` enters an execution as data | Operation-dependent | Operation result |
| Workflow admission | `effectPolicy`, `preconditionState` at start | Authorizes or rejects start | Neither is retained on the run checkpoint | Start result or thrown rejection |
| Workflow submission | `step.output`, `decide.decision`, or `advance.input` | Path-dependent validation, edge selection, node/gate retention, and possible completion | Checkpoint maps, node artifact, and transition evidence as applicable | Next state, validation rejection, or completed output |
| Child workflow result | The value that reaches a child terminal | Child-output validation, parent-reference routing, parent retention, and possible outward completion | Parent reference-node output/artifact plus checkpoint state | Parent state or completed output |
| Callable input | `startCallableCall(input)`, normalizing omitted, `undefined`, or `null` input to `{}` | Callable input validation and call context | Callable checkpoint and start transition | Separate normalized `input` field on active and completed responses |
| Callable node output | `stepCallableCall(output)` | Node validation, edge selection, retention, and possible callable-output validation | Callable output map, artifact, checkpoint, and transition evidence | Next state or completed output and artifact reference |
| Side-channel or reconciliation payload | Audit APIs | Records claimed external activity or comparison; does not route or advance | Workflow transition log only | Unchanged runtime state plus audit result |

These are separate channels. Similar JSON shapes do not cause values to flow
between them, and persistence in one channel does not make a value an implicit
input to another.

## Dispatcher request and action boundary

Dispatcher request and action are separate invocations. A request is echoed in
the transient `needs_action` response with a catalog snapshot and an action
schema; it is not passed into `applyDispatchAction`, correlated with a later
action, or written to run or call state by Ripplegraph.

The action contract currently exposes `input` on both `start_run` and
`call_graph`, and exposes optional `reason` fields on several actions. The
adapter forwards `call_graph.input` into callable start. It does not forward
`start_run.input`, and the workflow start API has no input field. It also does
not consume or retain the action `reason` fields. These accepted-but-unused
fields are current adapter contract gaps, not supported workflow-data or audit
channels. `ask_user` question and choices are returned transiently and are not
checkpointed.

## Workflow start boundary

A workflow manifest deliberately has no `inputSchema`, workflow start options
have no payload, and the initial checkpoint contains empty output and gate
decision maps. The start transition records no execution input or output.
`preconditionState` and `effectPolicy` are admission inputs: they are consulted
before creation but are not retained as run data. Consequently, starting a run
positions the host at the entry node; it does not seed a workflow value.

## Workflow submission, routing, and retention

`advanceRun` treats its single input as a gate decision when the active node is
gated and otherwise as an ordinary node output. When the active node is neither
terminal nor gated, its node output schema validates the submitted value before
routing, including when the selected destination is terminal. On the gate
path, the gate decision schema validates the value. The same accepted value is
then passed to edge selection.

Edge selection scans edges in declaration order and chooses the first edge
that is unconditional or whose `when` object matches. Conditional matching is
limited to a non-array object whose named top-level fields are strictly equal
to the declared values. There is no expression language, coercion, nested
selector, transformation, merge, or named output-to-input binding.

On an accepted ordinary route, the workflow value is written as the source
node's artifact and assigned to `checkpoint.outputs`. An accepted gate value is
also assigned to `checkpoint.gateDecisions`. Both use the current runtime
scope. Root keys are node identifiers; child keys are
`<frame-scope>/<node-id>`. A later child-output or enclosing return check can
still reject after an artifact and accepted transition exist but before the
updated checkpoint becomes durable; the validation and state notes own that
ordering. Revisiting the same node in the same scope replaces its retained
value and artifact rather than creating an immutable activation history.

Terminal entry, terminal destination, gate, child-return, and root-output
validation have path-specific short circuits and evidence behavior. The active
execution and validation notes own those exact branches. They do not change
the data-flow rule: the host-supplied value on the successful path is the value
used for routing, retention, or completion wherever those roles apply.

## Durable value representations

The workflow checkpoint is the current state snapshot. Its `outputs` map holds
the latest retained value per scoped node key, `gateDecisions` separately
identifies accepted gate values, and `finalOutput` holds the value that
completed the root run. A callable checkpoint separately holds its original
`input`, latest `outputs` per node, and, after completion, `finalOutput` plus an
`outputArtifact` reference.

Node artifacts are value files addressed by run/call, scope where applicable,
and node. Transition logs are audit evidence, not a universal value stream.
Successful ordinary workflow transitions generally record artifact references
rather than embedding the submitted value; successful gate transitions also
record the raw gate decision. Callable start records the normalized input
inline, while successful callable steps record artifact references. Rejection
records vary by validation path. A consumer cannot reconstruct every submitted
or overwritten value solely from checkpoint maps, artifacts, or transition
logs.

All durable values pass through JSON serialization. CLI value boundaries parse
JSON before calling the library. Direct library callers can supply `unknown`,
but only JSON-compatible values have reliable durable round-trip semantics;
the framework does not define a richer object-serialization contract.
Per-file atomic replacement, cross-file ordering, partial writes, and recovery
remain governed by the state-and-recovery note.

## Host context projection

Workflow state projects `context.previous` from retained outputs in the active
scope only. The current implementation filters the output map by scope, takes
its last three keys in JavaScript object-key enumeration order, removes the
scope prefix,
and labels each item `Completed node`. This is a bounded convenience view, not
a complete chronological history. Overwriting an existing key does not move it
to the end. Because gate decisions are also stored in `outputs`, accepted gate
values can appear in this view.

Parent-scope outputs are not automatically exposed while a child frame is
active, and child-scope outputs are not automatically exposed after return to
the parent. Callable responses instead return the retained normalized call
`input` as a separate field. Active callable state projects every currently
retained node output in `context.previous`, with purpose resolved from the
callable manifest; completed state omits previous context.

These projections provide values for a host to interpret. Ripplegraph does not
inject prior outputs or callable input into node commands, tools, validators,
instructions, or execution environments. Any such binding or prompt assembly
is host-owned.

## Child-workflow return propagation

Entering a `workflowRef` pushes a frame and moves control to the referenced
workflow's entry node. The manifest has no workflow-reference input map or
output map, and entry does not copy a parent value or parent context into the
child scope.

On the normal routed child-return path, the value that reaches a child terminal
is the child result. When declared, the child's graph output schema validates
that value. The unchanged child result then selects an edge on the parent
workflow-reference node, is stored as that parent node's output and artifact in
the parent scope, and becomes the value returned to the parent. The parent
reference node's own output schema is not applied to the child result. If the
selected parent destination is terminal, the same value can continue through
additional frames and ultimately complete the root run. Scope-qualified keys
keep child node outputs distinct from the parent reference-node value even when
node names overlap.

## Callable input and output propagation

At the library and dispatcher entry points, callable start accepts an optional
input. The machine CLI's `call` command instead requires `--input`, although
the JSON text `null` is accepted by that adapter. Once at the engine,
`opts.input ?? {}` normalizes omission, explicit `undefined`, and explicit
`null` to `{}` before schema validation. The normalized value—not necessarily
the caller's original value—is the call input used for validation, retention,
the start transition, and active or completed response projection. Failed
validation creates no call checkpoint, transition, or artifact. The retained
input remains distinct from the callable output map and is not automatically
passed into a node implementation.

For each callable step, the host submits one output value. The current node
schema validates it, and the same value selects the next edge. On a successful
nonterminal route it becomes that node's latest output and artifact. When the
route lands on a terminal node, the callable graph output schema also validates
the same value; success stores it as the node output, `finalOutput`, and the
artifact named by `outputArtifact`, then returns it as the completed output.
Callable graphs do not invoke workflow graphs, and workflow graphs do not
invoke callable graphs or wire values into callable inputs. A callable node
can currently pass package-shape validation with `workflowRef`, because
callable admission does not reject that field, but callable execution treats
the node as ordinary and does not enter the referenced workflow. This is a
current enforcement gap, not a cross-kind data channel.

## Workflow completion output

On the normal routed path, a workflow's completing value is the ordinary
output, gate decision, or child result that successfully reaches the root
terminal. If the root workflow declares an output schema, that path validates
the value; absence of the schema means there is no graph-level completion
contract.

A direct `stepRun` submission while the run is already positioned on a
terminal node takes a separate short circuit. At a root terminal it completes
with the submitted value against the root graph's optional output schema. With
an active child frame, the current implementation instead completes the whole
run against the child graph's optional output schema without routing the value
through the parent reference node, unwinding the frame, or validating the root
output schema. A terminal gate also differs by entry point: canonical
`advanceRun` uses the gate-decision path, while direct `stepRun` takes this
terminal short circuit. These are current engine gaps, not alternate
composition guarantees.

Both normal and short-circuit completion store the value in
`checkpoint.finalOutput`, mark the run completed, clear focus, and return the
value. Completed run summaries expose it when the persisted `finalOutput` is
present.

Workflow completion has no dedicated output-artifact field and does not append
a dedicated completion transition. Depending on the terminal path, the value
may be represented only by the checkpoint's `finalOutput` and response rather
than by a separate completion artifact or log entry. Consumers must not infer a
callable-style output-artifact guarantee for workflow runs.

## Audit-only values

Side-channel action recording defaults omitted status to `completed` and writes
the caller-supplied action input, action output, status, and note into a
workflow transition without changing position or checkpoint data.
Reconciliation writes the supplied snapshot, optional expected value, source,
note, and an `aligned` result into a transition, again without changing
checkpoint data. `aligned` is `true` when `expected` is absent; otherwise the
runtime recursively sorts object keys, JSON-serializes both values, and compares
those strings. Only reconciliation also returns a separate alignment summary.
These payloads describe host-owned external work or observation; they do not
become node outputs, route selectors, graph context, or completion values.

Dispatcher requests, `ask_user` responses, admission policy, and unused action
fields likewise do not become execution values merely because they cross a
public API boundary.

## Current limits and non-guarantees

Ripplegraph currently provides no:

- workflow start payload or workflow input schema;
- declarative node input, variable, expression, transformation, merge, or
  output-to-input binding model;
- workflow-reference input/output mapping or automatic parent/child context
  inheritance;
- workflow-to-callable or callable-to-workflow data invocation, including no
  execution of a shape-accepted callable `workflowRef`;
- automatic injection of callable input or prior outputs into host tools,
  commands, validators, prompts, or execution environments;
- immutable per-activation value history, event-sourced replay, or guarantee
  that transition logs embed every accepted or rejected value;
- guarantee that the last three workflow context entries are the last three
  chronological submissions;
- richer durable serialization contract than JSON-compatible data; or
- durable correlation between a dispatcher request and a later dispatcher
  action.

## Data-flow invariants present in the system

1. A workflow start establishes control position but carries no execution
   payload; callable start carries one nullish-normalized input value.
2. Admission inputs authorize creation and do not implicitly become retained
   execution values.
3. On implemented successful step, decision, and child-return paths, the value
   used for routing is also the value retained or returned; Ripplegraph does
   not transform it between those roles.
4. Edge predicates inspect only strict equality of declared top-level fields,
   and declaration order resolves the first match.
5. Workflow retained outputs are scoped to root or child frame; callable
   outputs are scoped to one call and node.
6. Retained output maps and node artifacts represent the latest value at an
   address, not every activation of that address.
7. Host context is a projection of retained state, not implicit data injection
   or a complete execution history.
8. Child entry carries control only; normal routed child completion carries one
   result back through the parent reference node.
9. Callable input, callable node outputs, and callable final output are
   distinct fields even when a host chooses related shapes.
10. Audit-only payloads and transient dispatcher values do not participate in
    graph routing or retained execution context.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`b3af413fa58617968aeb8098474f676ed20114f3` on 2026-08-29. Product source,
tests, package metadata, launchers, templates, TypeScript configuration, and
generated distribution output are unchanged from revision
`480dcc8ef55b4b840737d066d56c54ceca8f228d`; intervening commits published only
protected architecture notes and receipts.

Verification was static: focused tests were inspected but not executed because
the workspace has no installed Vitest executable.

Relevant source paths:

- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/schema.ts`
- `src/storage.ts`
- `src/cli.ts`
- `src/internal/cli-helpers.ts`
- `src/internal/coach-responses.ts`
- `src/internal/runtime-graph.ts`
- `src/internal/transitions.ts`
- `src/internal/json-io.ts`
- `src/internal/json-utils.ts`
- `tests/dispatcher.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
- `.specdev/project_notes/architecture/execution-and-workflow-model.md`
- `.specdev/project_notes/architecture/state-and-recovery.md`
- `.specdev/project_notes/architecture/effects-and-authority.md`
- `.specdev/project_notes/architecture/package-and-extension-model.md`
- `.specdev/project_notes/architecture/validation-and-error-model.md`
- `.specdev/project_notes/architecture/host-contract-and-metadata-model.md`
- `.specdev/project_notes/architecture/public-api-and-compatibility-model.md`
- `.specdev/project_notes/architecture/identity-naming-and-scope-model.md`
