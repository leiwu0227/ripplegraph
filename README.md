# ripplegraph

A lightweight, host-agent-driven coach runtime. Ripplegraph keeps workflow
state, validates node outputs, enforces gates, and tells a host agent what is
allowed next. The host agent still does the work; the graph owns flow.

Status: v0 in development.

## Install

```sh
npm install ripplegraph zod
```

## Quick Start

Initialize the reference engineering-coach demo. The workspace ships three
registered graph packages — `workspace-dispatcher`, `change-intake`, and
`architecture-sweep`:

```sh
ripplegraph-demo init /tmp/ripplegraph-demo
cd /tmp/ripplegraph-demo
ripplegraph-demo status --workflow-root .
```

Start the branched change-intake workflow:

```sh
ripplegraph-demo start change-intake --run change-demo --workflow-root .
```

Submit the first node output:

```sh
ripplegraph-demo submit '{"changeType":"bugfix","risk":"high","rationale":"Checkout regression blocks payments."}' --workflow-root .
```

The workflow stops at an external decision gate. Approve or reject it:

```sh
ripplegraph-demo decide '{"decision":"approved-bugfix","reason":"Checkout regression is a bugfix."}' --workflow-root .
```

Runtime state is stored under `.ripplegraph/`. To switch work:

```sh
ripplegraph-demo pause "switching workflows" --workflow-root .
ripplegraph-demo start architecture-sweep --run sweep-demo --workflow-root .
ripplegraph-demo pause --workflow-root .
ripplegraph-demo resume change-demo --workflow-root .
ripplegraph-demo runs --workflow-root .
```

## Architecture Direction

Ripplegraph is a graph package repository for coach CLIs. A workspace is a
folder with a thin `workflow.json` manifest (workspace identity only) and a
package registry under `.ripplegraph/registry.json`. Each registered graph is
a self-contained folder containing a `graph.json` manifest with metadata such
as `activationHints`, input/output schemas, and declared effects. The runtime
uses that registry for every graph lookup: dispatcher routing, workflow
execution, callable graph invocation, and effect checks at execution
boundaries.

Graph kinds:

- `dispatcher` receives user intent and emits structured actions.
- `workflow` creates durable runs with checkpoints, gates, and history.
- `callable` behaves like a typed function: graph-shaped internally, but no
  caller workflow side effects beyond its returned output.

Workflow runs execute directly against the registered package folder. Every
checkpoint pins its `graphSource` (package id, version, and path) so an
in-flight run keeps executing against the snapshot it started with, even if
the registry is later updated to point at a newer version of the same id.

Graph package management through the JSON CLI:

```sh
ripplegraph graph validate .ripplegraph/graphs/support-triage
ripplegraph graph register .ripplegraph/graphs/support-triage --workflow-root .
ripplegraph graph list --workflow-root .
ripplegraph graph diagram .ripplegraph/graphs/support-triage
ripplegraph graph diagram .ripplegraph/graphs/support-triage --format=dot
```

`graph diagram` emits text to stdout rather than JSON. Mermaid is the default
format; Graphviz DOT is available with `--format=dot`. Ripplegraph does not
render PNG/SVG images itself. Use Mermaid or Graphviz tooling outside the kernel
when a rendered image is needed.

The package manifest is a flat `graph.json` file with `id` and `version` beside
the graph fields:

```json
{
  "id": "support-triage",
  "version": "0.1.0",
  "kind": "workflow",
  "entry": "classify-ticket",
  "nodes": {
    "classify-ticket": {
      "purpose": "Classify a ticket",
      "terminal": true
    }
  }
}
```

Dispatcher routing is deliberately a two-step host-agent loop. Ripplegraph does
not infer intent with an embedded LLM; it returns the contract, then validates
the host agent's structured action:

```sh
ripplegraph dispatch --request "review and clean up this codebase" --workflow-root .
ripplegraph dispatch --action '{"action":"list_runs"}' --workflow-root .
```

Normal dispatch requires exactly one registered graph with `kind:
"dispatcher"`. Supported v0 actions are `start_run`, `resume_run`,
`switch_run`, `list_runs`, `ask_user`, and `call_graph`. `call_graph` accepts
`graphId`, optional `callId`, and optional `input`, then starts an isolated
callable call when the target is registered with `kind: "callable"`.

`start_run` validates that the target graph is registered as a `workflow` and
starts it directly from its package folder.

Effectful `start_run` and `call_graph` actions are denied by default unless
the caller explicitly allows every declared graph effect. Read-only dispatcher
requests and catalog/list commands still expose graph metadata without effect
grants so a host agent can inspect requirements before choosing an action.

Callable graph execution is isolated from focused workflow runs. A call stores
checkpoint, transition log, and node artifacts under
`.ripplegraph/calls/<call-id>/`; it does not write `.ripplegraph/current.json`
or create entries under `.ripplegraph/runs/`.

Callable lifecycle through the JSON CLI:

```sh
ripplegraph call --graph summarize-ticket --call-id call-001 --input '{"ticketId":"TCK-1007"}' --allow-effect read_repo --workflow-root .
ripplegraph call-state --call-id call-001 --workflow-root .
ripplegraph call-step --call-id call-001 --output '{"summary":"Checkout failure."}' --workflow-root .
ripplegraph call-list --workflow-root .
```

The host agent still performs each callable node. Ripplegraph validates call
input, node output, internal edge transitions, and final output. Supported v0
schema keywords are `type`, `enum`, `required`, `properties`, `const`, `oneOf`,
array `items`, and `additionalProperties: false`. Unsupported callable schema
keywords fail before a call starts so contracts are not silently ignored.

## Host Contract Metadata

Workflow package nodes can declare host-facing metadata without asking
Ripplegraph to execute host work. Supported node metadata includes
`interaction`, `interrupt`, `sideChannelActions`, `toolContract`, and
`validators`; gates can also declare `interaction`, and `workflowRef` can carry
`inputMap` and `outputMap` metadata. State responses expose the active node's
metadata so a host CLI can render prompts, enforce user-turn pauses, offer
side-channel actions, and resolve validators or commands.

Ripplegraph validates and reports these contracts, but the host still performs
the command, validator, reviewer, or business action. Effects declared by
`toolContract` and `sideChannelActions` are included in workflow start preflight.
Callable packages reject node-level host contract metadata because callable
state is an isolated graph-shaped function contract, not a user-turn workflow.

Hosts can also append non-advancing runtime records for focused workflow runs:

```sh
ripplegraph side-channel --action refresh-backend --input '{"table":"positions"}' --output '{"rows":3}' --workflow-root .
ripplegraph reconcile --source backend-fsm --snapshot '{"status":"waiting"}' --expected '{"status":"ready"}' --workflow-root .
```

Both commands append transition-log entries with the current graph position as
both `from` and `to`. `reconcile` returns `reconciliation.aligned` so the host
can decide whether to stop, ask the user, or advance later.

## Effect Policy

Graphs can declare effects such as `read_repo`, `write_files`, `network`, or
domain-specific ids. Ripplegraph enforces graph-level effects when starting a
workflow run, dispatcher `start_run`, dispatcher `call_graph`, or a direct
callable call. Effect-free graphs keep working without policy options.

Effectful starts fail with `E_EFFECT_NOT_ALLOWED` unless all declared effects
are explicitly allowed for that command:

```sh
ripplegraph start --graph daily --run-id daily-a --allow-effects read_repo,write_files --workflow-root .
ripplegraph call --graph summarize-ticket --input '{"ticketId":"TCK-1007"}' --allow-effect read_repo --allow-effect network --workflow-root .
ripplegraph dispatch --action '{"action":"call_graph","graphId":"summarize-ticket"}' --allow-effects read_repo,network --workflow-root .
```

The allow-list is not persisted as a reusable grant. It authorizes the current
start/call boundary only. Ripplegraph does not provide OS sandboxing, process
isolation, network blocking, script execution, or automatic effect inference in
this version.

## Command Model

The intended normal host-agent protocol is:

```text
status    where am I and what is allowed?
dispatch  what should we do with this user request?
explain   give me more recovery context
advance   submit the current node response
```

The current reference CLI exposes compatibility/debug commands while the
canonical protocol settles:

```text
init, status, explain, advance, runs, start, pause, resume, submit, decide,
graph validate, graph register, graph list, graph diagram, call, call-state,
call-step, call-list
```

`ripplegraph-demo` is the reference agent-facing CLI with compact text output.
`ripplegraph` is the low-level JSON CLI for debugging and automation.
