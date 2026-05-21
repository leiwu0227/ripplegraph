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

Initialize the reference support-triage demo:

```sh
ripplegraph-demo init /tmp/ripplegraph-demo
cd /tmp/ripplegraph-demo
ripplegraph-demo status --workflow-root .
```

Start the branched workflow:

```sh
ripplegraph-demo start support-triage --run triage-demo --workflow-root .
```

Submit the first node output:

```sh
ripplegraph-demo submit '{"category":"bug","priority":"urgent","rationale":"Checkout failures block customers from completing payment."}' --workflow-root .
```

The workflow stops at an external decision gate. Approve or reject it:

```sh
ripplegraph-demo decide '{"decision":"approved-bug","reason":"The ticket describes a checkout regression."}' --workflow-root .
```

Runtime state is stored under `.ripplegraph/`. To switch work:

```sh
ripplegraph-demo pause "switching workflows" --workflow-root .
ripplegraph-demo start policy-refresh --run policy-demo --workflow-root .
ripplegraph-demo pause --workflow-root .
ripplegraph-demo resume triage-demo --workflow-root .
ripplegraph-demo runs --workflow-root .
```

## Architecture Direction

Ripplegraph is evolving from a single `workflow.json` runner into a graph
package repository for coach CLIs. Workspaces can register self-contained graph
package folders with metadata such as `activationHints`, input/output schemas,
and declared effects. Future runtime work will use that catalog for dispatcher
routing and callable graph invocation.

Graph kinds:

- `dispatcher` receives user intent and emits structured actions.
- `workflow` creates durable runs with checkpoints, gates, and history.
- `callable` behaves like a typed function: graph-shaped internally, but no
  caller workflow side effects beyond its returned output.

The current run lifecycle still uses a compact `workflow.json` format for demos
and tests. Graph package validation and registry commands are implemented as the
foundation for the repository model. Dispatcher request/action validation is
implemented against the registry; package-folder workflow execution, callable
graph invocation, and effect enforcement are still future runtime work.

Graph package management through the JSON CLI:

```sh
ripplegraph graph validate .ripplegraph/graphs/support-triage
ripplegraph graph register .ripplegraph/graphs/support-triage --workflow-root .
ripplegraph graph list --workflow-root .
```

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
`switch_run`, `list_runs`, `ask_user`, and `call_graph`. `call_graph` is
recognized but returns `E_CALLABLE_RUNTIME_NOT_IMPLEMENTED` until callable
runtime support exists.

`start_run` validates that the target graph is registered as a `workflow`.
For now it can only execute graphs that are also present in the compact
`workflow.json` runtime; registered package-only workflows return
`E_GRAPH_NOT_EXECUTABLE_YET`.

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
graph validate, graph register, graph list
```

`ripplegraph-demo` is the reference agent-facing CLI with compact text output.
`ripplegraph` is the low-level JSON CLI for debugging and automation.
