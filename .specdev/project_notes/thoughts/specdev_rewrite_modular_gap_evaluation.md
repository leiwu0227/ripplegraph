# SpecDev rewrite modular gap evaluation

**Date:** 2026-05-23
**Input reviewed:** `.specdev/project_notes/thoughts/specdev_rewrite_backbone_analysis.md`

## Verdict

The original analysis is directionally correct, but it understates one
architecture issue and overstates one runtime need.

Ripplegraph can be the small workflow kernel for a SpecDev rewrite only if the
rewrite keeps a hard boundary:

- **Ripplegraph kernel:** graph position, stack/frames, schema validation,
  edge selection, gates, durable run logs, graph package identity, declared
  effects.
- **SpecDev host:** filesystem artifact production/inspection, command
  rendering, user choice UI, reviewer subprocesses, session stickiness, and
  assignment-specific status files.
- **Reusable SpecDev packages:** reviewloop, artifact validators, phase
  templates, workflow graph packages, skills/assets.

Under that boundary, the required Ripplegraph addition is not generic command
execution. It is **composable graph calls inside a durable parent workflow**.
That should be designed as a kernel primitive, not as host orchestration.

## Evidence from current Ripplegraph

### 1. Current workflow state is flat, not compositional

`src/schema.ts` defines a checkpoint with exactly one `position`:

- `checkpoint.position: { graph, node }`
- no frame stack
- no parent/child call state
- no way to remember that the runtime is inside a nested graph and must return
  to a parent node

`src/coach.ts` also advances only inside `checkpoint.rootGraph`; both
`stepRun` and `decideGate` compute `to = { graph: checkpoint.rootGraph, node:
nextNodeId }`. Even though `Position` includes a `graph` field, the runtime is
effectively single-root once a run starts.

This confirms Gap A. A modular SpecDev workflow cannot model "brainstorm phase
is a reusable sub-workflow" or "run review subflow, then resume parent phase"
inside one parent assignment run.

### 2. Registered packages are catalogued, not executable by parent workflow nodes

The dispatcher can start a top-level workflow or start an isolated callable:

- `applyDispatchAction(... start_run ...)` starts a focused run.
- `applyDispatchAction(... call_graph ...)` starts a callable under
  `.ripplegraph/calls`.

Tests confirm the limitation: `tests/dispatcher.test.ts` expects a registered
workflow package to be rejected with `E_GRAPH_NOT_EXECUTABLE_YET` unless the
graph is also present in compact `workflow.json`.

So current registry support is useful discovery/dispatch machinery, but not a
composition mechanism. Subgraph-as-node has to resolve registered packages and
execute them within the workflow run, not through the dispatcher.

### 3. Callable runtime is intentionally the wrong shape for SpecDev phases

`src/callable.ts` rejects gates inside callable graphs with
`E_CALLABLE_GATE_UNSUPPORTED`. That is correct for graph-shaped functions, but
SpecDev phases need human/reviewer gates. Reusing callables for phases would
force either a bad relaxation of callable semantics or awkward host-side
simulation.

Therefore the missing primitive should be a **workflow subgraph node**, not
"make callables more powerful." Keep callables as isolated typed functions.

### 4. Effects are start-time declared capabilities, not side-effect execution

The current implementation checks the union of graph/node effects at workflow
start. That is good for policy and auditability, but it is not an execution
sandbox, file checker, or command runner.

This supports the host/kernel split: Ripplegraph should require effect grants
for graphs that may cause writes/network through the host, but should not be
the process runner for `specdev checkpoint` or review tools.

### 5. Current gates are strong enough for approval decisions, but not self-describing enough

`gateSchema` has `type: external_decision` plus a `decisionSchema`. That is
enough to validate decisions and route edges. It cannot express whether the
decision should be supplied by a human, an agent, or a tool such as reviewloop.

The optional `decisionSource` metadata proposed in the original note is still
the right small schema addition. Runtime behavior can remain unchanged; hosts
can use it to decide whether to render a prompt or invoke a tool package.

## Evidence from current SpecDev

### 1. SpecDev state is filesystem-derived, not graph-position-derived

`detectAssignmentState` walks canonical phases, checks produced artifact paths,
reads `status.json`, and derives the next action each time. It does not persist
a step cursor.

A rewrite backed by Ripplegraph would intentionally change this: Ripplegraph
would own the cursor and evidence log, while SpecDev host validators would still
inspect files before submitting gate decisions.

This is a model shift, not a blocker. But the rewrite must be explicit about
the migration path from status-derived state to checkpoint-derived state.

### 2. Current modularity is content/plugin modularity, not workflow modularity

`workflow-runtime.js` hardcodes the canonical phase names and requires the
brainstorm, breakdown, and implementation steps. It allows pluggable guides,
hooks, interactions, reviewers, and agents at fixed slots.

That means a Ripplegraph rewrite should not merely mirror the current YAML
shape. If the goal is real modularity, phase graphs should be reusable packages
that compose into assignment workflows.

### 3. Artifact validation is domain logic

`checkpoint.js` and `approve-phase.js` validate:

- required files exist
- markdown content is non-empty
- brainstorm design has type-specific H2 sections
- implementation `progress.json` has non-empty completed tasks
- active tools are reflected in the plan

These rules are SpecDev-specific and evolve with assignment layout. They should
be reusable host/package validators, not Ripplegraph kernel behavior.

### 4. Reviewloop is orchestration/package logic

`reviewloop.js` handles reviewer config, preflight, subprocess spawning,
timeouts, logs, JSONL translation, verdict parsing, stdout salvage, max rounds,
multi-reviewer chains, phase approval, and autocontinue prompts.

Putting that in Ripplegraph would violate the clean decoupling boundary. The
right shape is a reusable `@specdev/reviewloop` package invoked by the SpecDev
host when a gate declares or conventionally implies a reviewloop source.

## Gaps to close

### P0: Subgraph-as-node with durable frame stack

Current design needs a concrete frame model.

Minimum kernel fields:

- node: `{ ref, inputMap?, outputMap? }`
- checkpoint: `{ position, stack: Frame[] }`
- frame: parent graph/node, child graph/package identity, return target or
  completion continuation, input/output binding context
- transition log ops: `enter_subgraph`, `subgraph_step` or normal `step` with
  frame metadata, `exit_subgraph`

Open design points:

- whether subgraphs may be registered package workflows only, compact
  `workflow.json` graphs only, or both
- how package version pinning works for nested graphs
- whether nested graphs may have their own effects and how parent start-time
  effect union is computed
- what output is written for the parent subgraph node when the child terminal
  node completes
- whether a terminal child without explicit output returns the last node output
  or a graph-level output schema value

Recommendation: implement package-backed workflow subgraphs, pin the package
version/path in the frame, and validate child `outputSchema` before popping.

### P0: Package executable gap

Dispatcher currently refuses registered workflow packages that are not also in
compact `workflow.json`. A modular rewrite needs registered package workflows
to be executable.

This can be solved as part of subgraph-as-node, but it should be named
explicitly: package loading/version pinning must become a runtime path for
workflow graphs, not only callable graphs and registry display.

### P1: Gate metadata for source/tool

Add optional metadata to gates:

```ts
decisionSource?: {
  kind: 'human' | 'agent' | 'tool'
  tool?: string
}
```

This keeps Ripplegraph pure while allowing portable workflow packages to say
"this gate is normally satisfied by reviewloop" or "this is a human approval
gate." The runtime should validate and persist the decision exactly as today.

### P1: Host validator package boundary

Do not add generic file checks to Ripplegraph. Instead define a SpecDev host
validator interface, for example:

```ts
validateArtifactGate({
  assignmentPath,
  phase,
  requires,
  validator,
}) -> { ok, decisionInput, issues }
```

The host calls that before advancing a Ripplegraph gate. The workflow graph can
name the validator as metadata, but Ripplegraph should not read arbitrary repo
files as part of edge selection.

### P1: Migration/recovery story

A rewrite will move from filesystem-derived phase state to checkpoint-derived
run state. Required migration cases:

- existing assignments with only `status.json` and artifacts
- completed assignments
- assignments mid-brainstorm before approval
- assignments mid-implementation with incomplete `progress.json`
- reviewloop autocontinue/session state in flight

The original analysis does not cover this enough. It is a real product gap, not
a kernel gap.

### P2: Interaction rendering contract

SpecDev currently has choice interactions with follow-up reviewer selection.
Ripplegraph gates can validate the final decision, but do not render multi-step
choice interactions.

Keep rendering in the host, but define a metadata convention so workflow
packages can describe choices without embedding host-specific prose everywhere.

### P2: Observability shape for nested runs

Nested workflows need state/explain output that shows the stack clearly:

- current child node
- parent node waiting on the child
- prior child outputs
- return mapping
- next allowed command

Without this, subgraph-as-node may be technically correct but poor for long
context recovery.

## Proposed modular architecture

### Layer 0: Ripplegraph kernel

Owns schemas, graph/package validation, run checkpoints, frame stack,
transition logs, output/gate validation, edge selection, effect declarations,
and current focused run.

It never shells out, never scans assignment directories, and never parses
SpecDev markdown.

### Layer 1: Ripplegraph package runtime

Loads registered packages, pins package identity/version for active runs and
nested frames, resolves graph refs, computes effect unions, and exposes
state/advance APIs.

This is still Ripplegraph, but it should stay generic.

### Layer 2: SpecDev host CLI

Maps SpecDev commands and UI choices to Ripplegraph operations. It knows about
assignments, discussions, `.specdev`, artifact locations, reviewer configs, and
session state.

### Layer 3: SpecDev reusable packages

Includes:

- assignment workflow package
- phase graph packages: brainstorm, breakdown, implementation
- artifact validator packages
- `@specdev/reviewloop`
- skills/templates/assets

These packages should be replaceable without changing Ripplegraph.

## Updated answer to the original question

Ripplegraph can back a modular SpecDev rewrite if "modular" means composable
workflow packages with a small deterministic kernel. It cannot back that
rewrite in the current codebase because it lacks nested workflow execution and
package-backed workflow execution.

The clean path is:

1. Add package-backed subgraph-as-node with a durable frame stack.
2. Add gate `decisionSource` metadata.
3. Keep artifact validation and reviewloop out of Ripplegraph.
4. Define SpecDev host interfaces for validators, choice rendering, and
   reviewloop gate submission.
5. Plan migration from existing filesystem-derived assignments to
   checkpoint-derived runs.

The main correction to the original note is that Gap A is not just "add
subgraph-as-node." It also implies package execution, version pinning, nested
effect aggregation, stack-aware state responses, and migration rules.

## Evidence references

Ripplegraph:

- `src/schema.ts` - `nodeSchema`, `gateSchema`, `checkpointSchema`, and
  callable checkpoint shapes.
- `src/coach.ts` - `startRun`, `stepRun`, `decideGate`, focused run handling,
  and flat root-graph advancement.
- `src/callable.ts` - isolated callable checkpoints and
  `E_CALLABLE_GATE_UNSUPPORTED`.
- `src/dispatcher.ts` - `start_run`, `call_graph`, and
  `E_GRAPH_NOT_EXECUTABLE_YET`.
- `src/effects.ts` and `tests/effects.test.ts` - declared effect policy.
- `tests/coach.test.ts`, `tests/callable.test.ts`,
  `tests/dispatcher.test.ts` - current behavior cases.

SpecDev CLI:

- `src/utils/workflow-runtime.js` - canonical phases, interactions, hooks, and
  next-action derivation.
- `src/utils/state.js` - filesystem-derived assignment state.
- `src/commands/checkpoint.js` - artifact/content validation.
- `src/utils/approve-phase.js` - gate flag recording in `status.json`.
- `src/commands/reviewloop.js` - reviewer process orchestration,
  autocontinue, and approval handoff.
