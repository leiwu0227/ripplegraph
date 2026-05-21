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
package repository for coach CLIs. A future workspace can contain dispatcher,
workflow, and callable graph packages with metadata such as `activationHints`,
input/output schemas, and declared effects.

Graph kinds:

- `dispatcher` receives user intent and emits structured actions.
- `workflow` creates durable runs with checkpoints, gates, and history.
- `callable` behaves like a typed function: graph-shaped internally, but no
  caller workflow side effects beyond its returned output.

The current release still uses a compact `workflow.json` format for demos and
tests. Graph package folders and dispatcher registration are planned contract
work, not fully implemented runtime behavior yet.

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
init, status, explain, advance, runs, start, pause, resume, submit, decide
```

`ripplegraph-demo` is the reference agent-facing CLI with compact text output.
`ripplegraph` is the low-level JSON CLI for debugging and automation.
