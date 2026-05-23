# Package-Backed Workflow Execution

## Overview

Ripplegraph currently has two different package stories. Callable graph
packages are real executable units: the registry resolves a package, the call
checkpoint pins `graphId`, `graphVersion`, and `packagePath`, and later
`call-step` continues against that pinned package even if the registry changes.
Workflow graph packages are weaker. They can be registered and shown to the
dispatcher, but `start_run` rejects a registered workflow package unless the
same graph also exists in compact `workflow.json`.

That mismatch blocks the modular architecture proposed for the SpecDev rewrite.
Reusable phase workflows such as brainstorm, breakdown, implementation, and
review gates need to live as graph packages, not as a monolithic compact
workflow definition. Before adding nested workflow refs, Ripplegraph should be
able to start a registered workflow package as a normal durable focused run and
pin the package identity for recovery.

The chosen approach is to add package-backed workflow execution as a narrow
foundation. A workflow run may still start from compact `workflow.json`, but it
may also start from a registered package of kind `workflow`. Package-backed
runs persist enough package identity to continue safely after registry changes.

## Goals

- Allow dispatcher `start_run` to start registered workflow packages directly.
- Allow direct runtime/API start of registered workflow packages through an
  explicit package-backed path.
- Pin package path, graph id, and version in workflow run checkpoints when a
  run starts from a package.
- Continue package-backed workflow runs against the pinned package, mirroring
  the callable runtime's safety model.
- Preserve existing compact `workflow.json` behavior and current tests.
- Keep the change generic to Ripplegraph; do not add SpecDev-specific artifact,
  command, or reviewloop behavior.

## Non-Goals

- No subgraph-as-node or frame stack in this assignment.
- No recursive effect aggregation across nested graphs yet.
- No gate `decisionSource` metadata yet.
- No filesystem artifact validation or command execution.
- No callable semantic changes; callables remain isolated and gate-free.
- No migration from SpecDev assignment state to Ripplegraph runs.

## Design

The runtime should introduce a small package-backed workflow loading path
instead of forcing all executable workflows through compact `workflow.json`.
The existing `startRun` path can remain for compact graphs, while a new helper
or option starts a workflow from a registered package:

- resolve the registry entry with `kind: 'workflow'`
- load the package manifest
- enforce effects using the same node-aware policy used by compact workflows
- create the normal `.ripplegraph/runs/<run-id>/` state
- store package identity in the checkpoint, for example:
  `graphVersion` and `packagePath`, or a nested `graphSource`
- set `rootGraph` and `position.graph` to the package graph id

On `state`, `advance`, `step`, `decide`, `suspend`, and `resume`, the runtime
must load the graph from the checkpointed package when package metadata exists.
If the pinned package path no longer matches the recorded id/version/kind, the
runtime should fail clearly with a package mismatch error, matching the callable
runtime's behavior.

Dispatcher `start_run` should stop requiring registered workflows to exist in
compact `workflow.json`. Instead it should start package-backed runs for
registered workflow packages. Direct CLI support can be conservative: keep
`ripplegraph start --graph <id>` for compact graphs, and allow package-backed
starts through dispatcher first unless adding a direct flag is trivial and
well-tested.

This assignment should add tests that prove a registered workflow package can
start, advance, suspend/resume, and continue after registry replacement against
the pinned package version.

## Success Criteria

- A registered workflow package can be started via dispatcher `start_run`
  without being present in compact `workflow.json`.
- Package-backed workflow checkpoints record pinned package identity.
- Advancing a package-backed workflow uses the pinned package, not the latest
  registry entry.
- Existing compact workflow starts still work.
- Existing callable behavior remains unchanged.
- Effect denial happens before package-backed run state is created.
- Tests cover successful package-backed start/advance and registry replacement
  safety.
