# Ripplegraph Core Concepts

Status: implemented

## Purpose

Ripplegraph is a TypeScript and Node.js orchestration runtime for
host-agent-driven workflows. It loads validated graph packages, turns workflow
graphs into durable runs, and executes callable graphs as isolated calls. It is
available as both a library and a command-line interface.

Ripplegraph addresses the control-flow problem that appears when an external
agent must infer position, permitted actions, validation rules, and recovery
state from prose alone. It makes those concerns explicit and machine-validated
while leaving the actual work at each node to the host.

The core division of responsibility is:

| Participant | Responsibility |
| --- | --- |
| Graph package | Declares graph identity, contracts, nodes, routes, effects, and descriptive host-facing metadata. |
| Ripplegraph runtime | Validates packages and responses, owns execution position and focus, selects declared routes, persists state and evidence, and returns the next bounded contract. |
| Host | Interprets user intent, performs the work described by the current node, obtains external decisions or tool results, and submits structured data back to the runtime. |

“The graph owns flow; the host owns work inside nodes” is shorthand for this
boundary. The host controls how node work is performed, but it does not directly
choose or mutate runtime state. The runtime accepts only data that satisfies the
current contract and advances only along declared graph edges.

## Design principles present in the system

- **Flow is declared as data.** Executable graph manifests define an entry node,
  node contracts, and ordered outgoing edges. Runtime code validates results and
  selects the first matching edge.
- **Contracts precede mutation.** Package manifests, callable inputs, node
  outputs, gate decisions, and declared completion outputs are validated before
  successful state transitions are persisted.
- **Execution state is durable.** Workflow runs and callable calls persist
  checkpoints, node-output artifacts, and transition logs below the workspace's
  `.ripplegraph/` directory.
- **Context is served to the host.** Runtime state includes orientation, current
  node instructions and schema, nearby context, the accepted response contract,
  the next allowed command, and a help command.
- **Effects are explicit permissions.** Graphs, nodes, tool contracts, and
  side-channel actions can declare effect identifiers. Starts fail before
  execution state is created when required effects are not in the caller's
  allow-list.
- **Package identity is checked during recovery.** Checkpoints retain the graph
  identifier, version, and registered package path. Reload enforces the expected
  graph kind and refuses a package whose identity no longer matches.
- **Workflow focus and callable isolation are separate.** A workspace has at
  most one focused workflow run, while callable calls persist independently and
  do not take or mutate workflow focus.

## Abstract concepts

| Concept | Current meaning |
| --- | --- |
| Workspace | The root directory passed to Ripplegraph. It contains workspace workflow metadata and a `.ripplegraph/` state directory. |
| Workspace workflow | The small `workflow.json` identity record for a workspace. It declares an identifier, version, and optionally an entry dispatcher graph. |
| Graph package | A directory containing a `graph.json` manifest with a stable identifier, version, graph kind, descriptive metadata, and any kind-specific contracts. |
| Registry | The workspace catalog mapping graph identifiers to their kind, version, activation metadata, effects or start requirements, and package path. |
| Graph kind | One of `dispatcher`, `workflow`, or `callable`. Each kind has a distinct manifest and execution contract. |
| Dispatcher | A metadata-only registered front door. Ripplegraph presents the user's request, the registered graph catalog, and a fixed action schema to the host, then validates and applies the returned action. Dispatchers do not contain executable nodes. |
| Workflow graph | An executable graph with start requirements, declared effects, an entry node, nodes and edges, and an optional completion-output schema. It executes as a durable run. |
| Callable graph | An executable graph with validated input and output schemas. It executes as an isolated persisted call rather than as the focused workflow. |
| Node | A unit of host work with a purpose, optional instructions and host-facing metadata, an output schema, declared effects, and outgoing edges. Workflow nodes may also expose gates or child-workflow references. |
| Edge | An ordered route to another node. An edge may be unconditional or require shallow equality between named output fields and its `when` object; the first matching edge is selected. |
| Gate | A workflow node boundary whose transition requires an external decision conforming to the gate's decision schema. The decision source may identify a human or tool. |
| Workflow reference | A workflow node's reference to another registered workflow graph. The runtime pushes a stack frame, executes the child in the same run, and uses the child's result to route the parent. |
| Run | A durable execution instance of a workflow graph. Its checkpoint records status, root graph, current position, outputs, gate decisions, child-workflow stack, timestamps, and final output when completed. |
| Focus | The workspace pointer to the single workflow run currently eligible for normal advance operations. Suspending, abandoning, or completing a run clears focus. |
| Call | A persisted invocation of a callable graph with its own input, position, outputs, checkpoint, artifacts, and transition log. Calls are addressed by call identifier and are independent of focus. |
| Checkpoint | The schema-validated snapshot from which a run or call is inspected, advanced, and recovered. |
| Artifact | A JSON file containing a successfully accepted node result. Workflow artifacts belong to a run and scope; callable artifacts belong to a call. |
| Transition log | An append-only JSON Lines audit of workflow starts, accepted or rejected steps, decisions, lifecycle operations, and callable starts, steps, and completion. |
| Effect | A declarative capability identifier that must appear in the caller-provided allow-list before the associated graph can start. |
| Operator context | Arbitrary graph-authored metadata returned with the active node so a host can orient its work without deriving context from runtime internals. |

## Current execution invariants

1. A graph package must pass kind-specific manifest validation before it can be
   loaded or registered. Entry nodes and edge targets must resolve, and schemas
   enforced by the runtime may use only supported keywords.
2. A workflow run starts only from a registered workflow package, only when no
   other run is focused, and only after declared start requirements and the
   effect requirements of the root and referenced child workflows pass.
3. A normal workflow step validates the current node's output before recording
   an artifact or changing position. A gate validates its external decision in
   the same way. A rejected value leaves the durable position unchanged and is
   recorded as a failed validation event.
4. Route selection is deterministic for a fixed ordered edge list and submitted
   value: the runtime uses the first unconditional or matching edge and fails
   when none matches.
5. Completion validates the final value when the root graph declares an output
   schema, persists that value on the checkpoint, and clears workflow focus.
6. Callable start validates declared input before creating call state. Callable
   stepping validates node outputs and the terminal output, persists call-local
   artifacts and transitions, and never changes workflow focus.
7. Inspecting state returns the current contract and recovery context rather
   than requiring the host to reconstruct them from previous conversation.
8. Reloading a checkpointed run or call verifies the graph identifier, kind,
   and version at the stored package path before continuing.

## Boundaries of the current implementation

- Ripplegraph does not embed an LLM SDK or decide how node work is performed.
  The host remains responsible for reasoning, user interaction, tool execution,
  and submitting structured results.
- Node execution is currently host-driven and `inline`. Tool contracts,
  validators, interactions, interrupts, and side-channel actions are metadata
  exposed to the host; Ripplegraph does not execute those tools or validators.
- Effect checking is a declarative allow-list gate. It does not infer effects,
  sandbox a process, block network access, or enforce operating-system policy.
- Runtime-enforced JSON schemas support a deliberate subset: `type`, `required`,
  `properties`, `enum`, `const`, `oneOf`, array `items`, and
  `additionalProperties: false`. Unsupported runtime schema keywords fail
  package validation rather than being silently ignored.
- Dispatcher manifests carry metadata but no nodes, effects, or input/output
  body. The current dispatcher action vocabulary is implemented by Ripplegraph
  and includes starting, resuming or switching, and listing runs; asking the
  user; and starting callable calls.
- Callable nodes currently cannot use gates, interactions, interrupts,
  side-channel actions, tool contracts, or validators.
- A workspace may retain many workflow runs and callable calls, but only one
  workflow run may be focused at a time.
- Checkpoints bind package path and declared identity, not a content hash. A
  package changed in place without changing its identifier, kind, or version is
  not detected by package-identity checks alone.

## Conformance evidence

This note was verified against clean tracked source at Git revision
`8288620441e8fdcea2d70b52672d6b8f85436644` on 2026-08-28.

Relevant source paths:

- `package.json`
- `src/index.ts`
- `src/schema.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/effects.ts`
- `src/storage.ts`
- `src/internal/coach-responses.ts`
- `src/internal/dispatcher-resolution.ts`
- `src/internal/output-validation.ts`
- `src/internal/runtime-graph.ts`
- `src/internal/schema-keywords.ts`
