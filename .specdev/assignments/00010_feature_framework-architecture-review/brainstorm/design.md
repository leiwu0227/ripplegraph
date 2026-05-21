# Framework Architecture Review Design

## Overview

Ripplegraph should be treated as a portable coach runtime rather than a single
workflow file runner. Future consumers such as SpecDev, Oceanshed, Oceanlive,
and other host-agent-driven CLIs need a framework that can package reusable
workflow graphs, dispatch user intent into the right graph, persist many
resumable runs, expose callable graph-shaped utilities, and repeatedly re-anchor
the coding agent when context gets long.

The current implementation is a useful POC: it has a JSON workflow package,
multiple named graphs, focused runs, suspend/resume, external decision gates,
recent context, route rendering, and a reference demo CLI. The architectural
gap is not that the runtime cannot advance a node; it is that the framework
contract is still too implicit for other CLIs to build on safely. The next
design step should define stable schemas and a small command protocol around
graph packages, dispatcher actions, workflow runs, and callable graph
invocations.

## Real Findings

1. **The project notes are ahead of and behind the implementation at the same
   time.** `big_picture.md` still describes subgraph-as-node, latches, and
   `.xxx/subgraphs/`, while the implementation actually has focused runs,
   gates, hidden `.ripplegraph/workflow.json`, and no subgraph/latch runtime.
   That mismatch will mislead future CLI authors.

2. **`workflow.json` does not scale as the main distribution unit.** A single
   file works for demos, but future CLIs need drag-and-drop graph packages with
   their own docs, templates, tests, assets, and machine-readable invocation
   metadata. Monolithic workflow files also make diffs and reuse poor once a
   workspace has dispatcher, workflows, callable graphs, and domain-specific
   utilities.

3. **Graph selection is still exposed to the host agent.** `start <graph-id>`
   is acceptable for tests, but a real coach needs a dispatcher front door so
   user intent maps to structured actions rather than letting the LLM pick
   arbitrary graphs.

4. **Graph kind is missing from the schema.** Today every graph has the same
   shape. Long term we need at least `dispatcher`, `workflow`, and `callable`
   kinds, each with different lifecycle, side-effect, and invocation rules.

5. **Callable graph design is not represented.** We need graph-shaped tasks
   that can have internal transitions but behave externally like typed
   functions: explicit input, explicit output, no mutation of caller run state.
   This replaces loose plugin/tool calls with typed reusable capabilities.

6. **The command surface is drifting upward.** The low-level CLI has
   `validate`, `start`, `state`, `step`, `decide`, `suspend`, `resume`,
   `abandon`; the demo has `init`, `status`, `runs`, `start`, `pause`,
   `resume`, `submit`, `decide`. Some of this is lifecycle, some protocol,
   some rendering. Future CLIs will struggle unless Ripplegraph defines a
   smaller conceptual protocol and lets consumer CLIs alias domain words.

7. **Agent drift recovery is only partial.** The latest local changes add
   recent outputs and routes to status rendering, but the runtime contract lacks
   first-class `orientation`, `nextAllowedCommand`, and `helpCommand` fields.
   Without those, each consumer CLI must invent its own re-anchoring behavior.

8. **Permission/effect boundaries are underspecified.** `exec: script`, future
   callable graphs, and domain tools need declared effects. Otherwise a
   dispatcher or callable graph can look pure while reading/writing project
   state or causing external side effects.

9. **Versioning and registration semantics are missing.** If graphs become
   packages, the registry needs stable identity, version, path, kind,
   compatibility, and activation metadata. Resume must know whether an old run
   can execute against the currently installed graph package.

10. **README examples are stale.** They still mention `daily-execution` and
    `mockcopy-backtest`, but the current demo is `support-triage` and
    `policy-refresh`. This is a symptom of the broader issue: the public story
    is not synchronized with the runtime direction.

## Goals

- Reframe Ripplegraph as a graph-package repository and coach runtime for
  host-agent-driven CLIs.
- Define graph kinds with clear schemas: `dispatcher`, `workflow`, `callable`.
- Define graph package metadata, including `activationHints`, `inputSchema`,
  `outputSchema`, `effects`, and allowed runtime actions.
- Keep all durable workflow execution as runs with checkpointing,
  suspend/resume, history, and one focused run.
- Make dispatcher behavior flexible in selection but strict in action shape.
- Make callable graphs function-like: internal transitions allowed, external
  side effects disallowed unless explicitly declared and handled.
- Simplify commands into a small protocol that future CLIs can wrap without
  exposing framework internals.
- Make drift recovery a runtime contract, not only demo prose.

## Non-Goals

- Do not implement the full package registry in this assignment unless a later
  breakdown explicitly scopes it.
- Do not remove the single-file `workflow.json` format immediately; keep it as
  a shorthand/import format while graph folders become the recommended layout.
- Do not make Ripplegraph call LLM APIs directly.
- Do not make the dispatcher a free-form LLM router. It emits structured,
  schema-validated actions only.
- Do not use graph packages as arbitrary code plugins without declared effects
  and permissions.
- Do not force every historical run to migrate when graph packages evolve.

## Design

### Workspace as Graph Repository

A Ripplegraph workspace should contain a registry and graph packages:

```text
.ripplegraph/
  registry.json
  graphs/
    dispatcher/
      graph.json
      AGENT.md
      README.md
    specdev-assignment/
      graph.json
      AGENT.md
      templates/
    summarize-diff/
      graph.json
      README.md
  current.json
  runs/
    <run-id>/
      checkpoint.json
      transition-log.jsonl
      artifacts/
```

`workflow.json` remains supported as a compact single-file package, but the
folder layout becomes the long-term authoring and distribution model.

### Graph Kinds

`workflow` graphs are durable user-visible runs. They can suspend/resume,
checkpoint, gate, and produce auditable history.

`dispatcher` graphs are the front door. They interpret user/workspace context
and emit validated actions such as `start_run`, `resume_run`, `switch_run`,
`list_runs`, `ask_user`, or `call_graph`. They may be loop-oriented and less
linear than task workflows, but their outputs are still strict action objects.

`callable` graphs are graph-shaped functions. They accept typed input, may use
internal nodes and transitions, and return typed output. From the caller's
perspective, they do not mutate focused run state. Ripplegraph may log
invocations for audit, but the call result only affects a workflow if the
caller explicitly includes it in a node output.

### Dispatcher Invocation Contract

The dispatcher needs an explicit entry point; otherwise future CLIs will keep
falling back to `start <graph-id>`. The canonical operation should be
`dispatch`, which carries user intent and current workspace context into the
registered dispatcher graph:

```text
ripplegraph dispatch --request "review and clean up this codebase"
```

Low-level JSON form:

```json
{
  "request": "review and clean up this codebase",
  "context": {
    "cwd": "/repo",
    "focusedRunId": null,
    "recentRuns": []
  }
}
```

The dispatcher is a workspace-level graph invocation, not a focused workflow
run. It has typed input/output, may use internal transitions, and writes an
append-only dispatcher event for audit. Its output is a structured action:

```json
{
  "action": "start_run",
  "graphId": "specdev-assignment",
  "runId": "specdev-2026-05-21-001",
  "input": {
    "request": "review and clean up this codebase"
  },
  "reason": "The user requested a new structured codebase cleanup assignment."
}
```

Ripplegraph validates the action against the registry before applying it. Some
actions may be auto-applicable (`list_runs`, `ask_user`, safe `resume_run`);
others may require confirmation depending on workspace policy. Direct
`start <graph-id>` remains available as a management/debug command, but normal
host-agent entry should be `dispatch`.

When no workflow run is focused and a dispatcher is registered, `status` should
not merely list graphs. It should render dispatcher-ready state:

```text
No focused run.
Dispatcher: available
Next allowed command:
  ripplegraph dispatch --request "<user request>"
```

If no dispatcher is registered, `status` may fall back to listing startable
graphs and explicit management commands.

### Graph Package Contract

Each graph package should declare both selection metadata and hard runtime
contract:

```json
{
  "id": "specdev-assignment",
  "kind": "workflow",
  "version": "0.1.0",
  "title": "SpecDev Assignment",
  "description": "Run a structured assignment from brainstorm through implementation.",
  "activationHints": [
    "start a specdev assignment",
    "plan and implement a feature",
    "review and clean up a codebase"
  ],
  "inputSchema": {
    "type": "object",
    "required": ["request"],
    "properties": {
      "request": { "type": "string" }
    }
  },
  "effects": [],
  "entry": "brainstorm",
  "nodes": {}
}
```

`activationHints` are soft hints for dispatcher selection. `kind`,
`inputSchema`, `outputSchema`, `effects`, and allowed actions are hard
validation inputs.

### Drift Recovery Contract

Every active state response should expose:

- `orientation`: one sentence explaining where the agent is.
- `recentContext`: recent completed node outputs.
- `routes`: nearby outgoing transitions and conditions.
- `responseContract`: allowed submit/decide/call shape.
- `nextAllowedCommand`: exact next command or protocol action.
- `helpCommand`: command to re-anchor, such as `ripplegraph explain`.

Consumer CLIs may render this in domain language, but the canonical structured
fields should come from Ripplegraph so all hosts get consistent re-anchoring.

## Simplified Command Model

The framework should distinguish **protocol operations** from **management
operations**.

Protocol operations used by host agents during normal work:

```text
status        show focused state, or dispatcher-ready state when no focus
dispatch      submit user intent to the dispatcher and apply/return a validated action
advance       submit the current node response; covers normal outputs and gate decisions
explain       richer re-anchor for confused/long-context agents
```

Management operations for setup and run switching:

```text
init          create workspace files
runs          list known runs
focus         focus/resume/switch to a run
pause         suspend focused run
abandon       mark a run inactive without deleting evidence
graph         register/list/validate graph packages
call          invoke callable graphs directly for debugging or explicit host use
```

This suggests consolidating `submit` and `decide` into one conceptual
`advance` operation. The state response tells the host whether the accepted
payload is a node output or an external decision. Consumer CLIs can still alias
`decide` for clarity, but the framework protocol should not multiply commands
for every response kind.

Likewise, `state` and `status` should converge conceptually. Low-level JSON can
use `state`; agent-facing CLIs can render it as `status`, but the runtime
operation is one thing: "tell me where I am and what is allowed next."

`dispatch` is the one additional normal-work operation because it solves a
different problem than `advance`: it starts from user intent before there is a
focused workflow contract. Keeping it explicit is simpler than overloading
`status` or `advance` with hidden start/resume behavior.

## Approach Options

### Option A: Patch Current Shape Incrementally

Keep `workflow.json` as primary, add a `kind` field, add `orientation`, and
document dispatcher/callable concepts later. This is fastest, but it risks
baking the wrong package boundary into downstream CLIs.

### Option B: Define Schemas First, Implement in Slices

Write the target graph-package, registry, graph-kind, runtime-state, and command
contracts first. Then implement backward-compatible slices: schema additions,
state response improvements, command aliases, registry support, dispatcher, then
callable graphs. This is the recommended path because other CLIs need stable
contracts more than immediate feature breadth.

### Option C: Jump Directly to Graph Folders and Dispatcher

Replace `workflow.json` with graph folders and add dispatcher as mandatory
entry now. This is architecturally clean but too disruptive for the current POC
and tests. It risks slowing validation before the schema design has been
pressure-tested.

## Recommended Path

Choose Option B. The next implementation assignment should be a schema-first
foundation:

1. Update project notes and README to match the current consensus.
2. Add graph `kind`, package metadata, `activationHints`, and effect fields to
   schemas in a backward-compatible way.
3. Add orientation/help/next-command fields to runtime state.
4. Add `dispatch` as the canonical intent-entry operation for registered
   dispatcher graphs.
5. Introduce `advance` as the canonical operation while keeping `submit` and
   `decide` as compatibility aliases in the demo CLI.
6. Define registry and graph-folder loading before making it the default.
7. Add dispatcher and callable graphs only after the contract is stable.

## Success Criteria

- A future CLI author can understand the framework from `big_picture.md`,
  README, and schema definitions without reverse-engineering the demo.
- The schema distinguishes graph kinds and explains which lifecycle rules apply
  to each.
- Graph packages can be registered/discovered through metadata rather than
  prose.
- The command model has a small normal-work loop:
  status/dispatch/explain/advance.
- The dispatcher contract defines user-intent input, structured action output,
  audit logging, and no-focused status behavior.
- Drift recovery fields are part of the runtime contract.
- Current demos and tests continue to work through compatibility aliases while
  the target architecture becomes explicit.
- Stale README examples are corrected.
