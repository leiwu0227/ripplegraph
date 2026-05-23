# Proposal: Package-folder workflow execution

## What

Make registered graph packages the only runtime source of graph definitions.
Strip the `workspace.json` envelope (today: `workflow.json`) down to workspace
identity only and remove every code path that looks up a graph by name inside
that envelope's `graphs` map. Public APIs, CLI commands, demo template, and
tests all execute workflows by `graphId` resolved through the registry, exactly
the way the dispatcher already does.

## Why

The README still says *"Package-folder workflow execution is still future
runtime work"*, even though the kernel already supports it
(`startRegisteredWorkflowRun`, `graphSource` on checkpoints, schema-drift
detection in `graphForSource`, workflow-ref child resolution through the
registry). The actual gap is that the kernel still carries a parallel legacy
path — inline `workflow.json.graphs` resolved by `getGraph(workflow, name)` —
used by `startRun`, the `start` CLI command, `validateWorkflowRoot`, and the
`no_focused_run` state branch. Two sources of truth for "what graphs exist"
means specdev-cli (and any other consumer) cannot treat the registry as
authoritative, the demo template can't model the real layout, and the
documented runtime story stays partially-true. Closing this gap is the
prerequisite the previous assessment called out before specdev can adopt
ripplegraph as a kernel.
