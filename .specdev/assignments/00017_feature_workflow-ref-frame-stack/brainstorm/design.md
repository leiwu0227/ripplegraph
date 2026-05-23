# Workflow-Ref Frame Stack

## Overview

Ripplegraph now supports registered workflow packages as top-level pinned runs,
but parent workflows still cannot compose those packages as nodes. That means a
SpecDev-style assignment workflow still has to inline each phase or start a
separate run. The missing primitive is a workflow-ref node: a node in a parent
workflow that enters a registered workflow package and returns to the parent
after the child finishes.

This assignment adds the first durable composition path. A workflow node may
declare a reference to a registered workflow package. When a run reaches that
node, Ripplegraph pushes a frame onto the checkpoint stack and moves the active
position to the child workflow's entry node. The child advances with the same
`advance` command and normal schema/gate behavior. When the child transitions
to a terminal node, Ripplegraph validates the child result, pops the frame,
stores that result as the parent ref-node output, and follows the parent ref
node's edges.

The design intentionally stays conservative. It supports registered workflow
packages only, not compact graph refs. It does not add an input/output mapping
language yet. The child terminal transition output becomes the parent
workflow-ref node output directly.

## Goals

- Add a schema field for workflow-ref nodes that references a registered
  workflow package.
- Add durable checkpoint stack frames so nested execution survives process and
  context loss.
- Enter a child workflow package automatically when the current node is a
  workflow-ref node.
- Advance child workflow nodes using the existing step/gate behavior.
- On child terminal transition, pop back to the parent and route parent edges
  using the child result.
- Preserve compact and package-backed top-level run behavior.
- Keep side effects explicit by requiring child workflow effects at parent run
  start.

## Non-Goals

- No inputMap/outputMap expression language in this assignment.
- No compact `workflow.json` graph refs as children; child refs target
  registered workflow packages only.
- No parallel child workflows.
- No reviewloop, artifact validation, command execution, or SpecDev-specific
  host behavior.
- No gate `decisionSource` metadata yet.
- No new CLI command surface unless needed for existing `advance/state` output.

## Design

### Schema

Add an optional workflow-ref field to nodes, for example:

```ts
workflowRef?: {
  graphId: string
}
```

A workflow-ref node still has `purpose`, optional `instructions`, `effects`,
`outputSchema`, and `edges`. It should not have `gate` because the node itself
does not ask for a decision; the referenced child workflow may contain gated
nodes. It should not need `exec` beyond the existing default.

Add a checkpoint stack:

```ts
stack: Array<{
  parent: {
    graph: string
    node: string
    graphSource?: GraphSource
    scope: string
  }
  child: GraphSource
  scope: string
  enteredAt: string
}>
```

Existing checkpoints default to `stack: []`.

Each frame has a stable `scope` allocated when the child is entered, for example
`f1`, `f2`, and so on within the run. Top-level execution keeps the existing
empty scope. The parent record keeps the parent scope so a nested child can pop
back to the correct parent context without guessing from stack depth.

### Active graph and scope resolution

Runtime code should resolve the active graph and write position updates from a
single checkpoint helper, not by checking only `checkpoint.graphSource`.

- If `checkpoint.stack` is empty, the active graph source is the top-level
  `checkpoint.graphSource` when present, otherwise the compact
  `workflow.graphs[checkpoint.rootGraph]` graph. The active graph id is
  `checkpoint.rootGraph`, and the active scope is the empty top-level scope.
- If `checkpoint.stack` is not empty, the active graph source is the top
  frame's `child` source, the active graph id is that child graph id, and the
  active scope is the top frame's `scope`.
- Any non-terminal step, gate decision, suspend/resume state render, or child
  entry while the stack is non-empty must use this active graph id for
  `checkpoint.position.graph`. It must not write child positions back to
  `checkpoint.rootGraph`.
- When a child exits, the popped frame's `parent` record supplies the parent
  graph id, node id, graph source, and scope for edge selection and subsequent
  parent position writes.

This replaces the current one-graph `graphForCheckpoint` assumption with an
active-context helper that returns `{ graph, graphSource, graphId, scope }`.
`stateForCheckpoint` should receive that active context so it renders the node
and previous outputs for the graph/scope that is actually current.

### Scoped outputs and artifacts

Nested execution cannot use raw node ids as durable keys. A parent node named
`review` and a child node named `review` must both be recoverable in the same
run.

For compatibility, keep existing top-level output keys unchanged for compact and
package-backed runs with an empty scope. For nested frames, derive a scoped node
key from the frame scope and node id, for example `f1/review`. All runtime
reads/writes should go through a helper such as `nodeOutputKey(scope, nodeId)`
instead of indexing `checkpoint.outputs[nodeId]` directly.

Artifact paths should use the same scope rule:

- top-level nodes keep `artifacts/<nodeId>/output.json`;
- nested nodes write under `artifacts/<scope>/<nodeId>/output.json`, with scope
  and node id validated as safe path segments.

The parent workflow-ref result is written under the parent ref node's scoped
key after the child exits. State output should list previous outputs for the
active scope by default, so a child node sees its child history while a parent
node sees parent history after the stack pops. The separate `stack` field
remains available for recovery context.

### Entering a child

When state or advance lands on a workflow-ref node, the runtime should enter the
child before returning the next state:

1. Resolve the registered workflow package by `workflowRef.graphId`.
2. Enforce/pin the child package identity in the frame.
3. Push a frame recording the parent position and child graph source.
4. Move `checkpoint.position` to the child entry node.
5. Write the checkpoint and append a transition log entry that clearly records
   the parent-to-child movement.

This keeps the host loop simple: the user still calls `ripplegraph advance`,
and the returned state is the child node that needs work.

### Exiting a child

When a child node transitions to a terminal node and `checkpoint.stack` is not
empty, the run does not complete. Instead:

1. Treat the output that caused the child terminal transition as the child
   workflow result.
2. Validate it against the child graph's `outputSchema`.
3. Pop the top frame.
4. Write the result as the parent workflow-ref node's output using the popped
   frame's parent scope.
5. Restore `checkpoint.position` to the parent ref node and select the parent
   edge using the child result.
6. Advance to the selected parent target. If that target is terminal and no
   parent frame remains, complete the run.

If parent edge selection fails, return the same `E_NO_EDGE` style used by
normal nodes, but name the parent workflow-ref node.

### Effects

At parent run start, Ripplegraph should include effects required by reachable
workflow-ref children. For this assignment, a simple static check is enough:
when checking a graph's node effects, include the graph-level/node-level effects
of referenced child workflow packages. Nested refs can be resolved recursively
with cycle detection. If recursion gets complex, a depth-first helper with a
visited set is sufficient; do not add a general graph analysis framework.

### State output

State output should expose the current child node as today, plus stack context
so agents can recover:

```json
{
  "position": { "graph": "child-workflow", "node": "work" },
  "stack": [
    {
      "parent": { "graph": "assignment", "node": "brainstorm" },
      "child": { "graphId": "child-workflow", "graphVersion": "0.1.0" }
    }
  ]
}
```

The exact shape can stay minimal, but it must be present in `state` responses.

## Success Criteria

- A parent workflow package can contain a workflow-ref node targeting a
  registered child workflow package.
- Starting the parent and advancing into the ref node moves the run to the
  child entry node with a persisted stack frame.
- Advancing the child to terminal pops the frame, stores the child output as
  the parent ref-node output, and follows the parent edge.
- Nested execution survives suspend/resume and process reload through
  checkpoint state.
- Parent start denies missing child effects before creating run state.
- Existing compact runs, package-backed top-level runs, callables, gates, and
  dispatcher start behavior remain green.
