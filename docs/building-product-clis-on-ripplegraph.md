# Building Product CLIs On Ripplegraph

This guide is for coding agents building a product CLI, such as `specdev-cli`,
on top of Ripplegraph.

The main rule is simple:

> The product CLI owns product language and business behavior. Ripplegraph owns
> graph runtime state.

For example, a SpecDev user should see assignments, phases, checkpoints,
reviews, approvals, and project notes. They should not usually see nodes,
edges, transition logs, graph packages, or workflow refs unless they are
debugging the runtime.

## Layering Model

Build the product CLI as an adapter over Ripplegraph:

```text
User / host agent
  talks to
Product CLI, e.g. specdev
  translates to/from
Ripplegraph runtime APIs
  reads/writes
Product hidden folder + embedded .ripplegraph runtime state
```

The product CLI should translate Ripplegraph concepts into product concepts:

| Ripplegraph concept | Product CLI concept example |
|---|---|
| graph package | workflow definition |
| dispatcher graph | front-door intent router |
| workflow graph | durable product process |
| callable graph | isolated typed helper |
| node | phase, step, task, or action |
| gate | review, approval, or decision |
| checkpoint | current product status |
| transition log | audit/history |
| side-channel action | refresh/recheck/load context |
| reconciliation | external-state drift check |

Avoid exposing Ripplegraph vocabulary in normal host-agent prompts.

## Recommended Folder Layout

For a product CLI with a hidden folder, embed Ripplegraph inside the product
folder:

```text
project/
  .specdev/
    AGENTS.md
    runtime.json
    workflow.yaml
    graph_packages/
      workspace-dispatcher/
        graph.json
      assignment-lifecycle/
        graph.json
      reviewloop/
        graph.json
      artifact-validation/
        graph.json
    assignments/
    project_notes/
    skills/
    .ripplegraph/
      registry.json
      current.json
      runs/
      calls/
```

Set Ripplegraph's `workflowRoot` to the product hidden folder:

```ts
const productRoot = path.join(projectRoot, ".specdev");
```

Ripplegraph will then naturally write runtime state to:

```text
.specdev/.ripplegraph/
```

This keeps product artifacts and runtime internals separate:

| Path | Meaning |
|---|---|
| `.specdev/assignments/` | Product artifacts |
| `.specdev/project_notes/` | Product notes |
| `.specdev/skills/` | Product skills or adapters |
| `.specdev/graph_packages/` | Product-owned graph definitions |
| `.specdev/.ripplegraph/` | Internal Ripplegraph runtime state |

Do not ask the host agent to edit `.specdev/.ripplegraph/` directly.

## Use A Product Runtime Pointer

Add a small product-level pointer file:

```json
{
  "engine": "ripplegraph",
  "workflowRoot": ".specdev",
  "registry": ".specdev/.ripplegraph/registry.json",
  "graphPackages": ".specdev/graph_packages"
}
```

This file is useful for humans and debugging tools, but it should not become a
second registry. The source of truth for registered graph packages remains:

```text
.specdev/.ripplegraph/registry.json
```

## Registry And Dispatcher

Ripplegraph has a registry. It is the catalog of graph packages available in a
workspace.

For embedded product CLIs, the registry lives here:

```text
.specdev/.ripplegraph/registry.json
```

The host agent should not read it directly. Product commands should expose
registry-derived information:

```sh
specdev graph list
specdev status
specdev doctor
specdev help
specdev next --json
```

A dispatcher graph is a graph package with:

```json
{
  "kind": "dispatcher"
}
```

It is the product's front door. It routes user intent to structured actions,
such as:

- start a workflow run
- resume or switch a run
- list runs
- ask the user a question
- call a callable graph

Do not describe the dispatcher as a master workflow. It does not own every
durable workflow position. It routes intent.

## Product Commands Should Hide Runtime Internals

A command such as:

```sh
specdev next --json
```

should return product-shaped state:

```json
{
  "assignment": "00024_feature_new-workflow",
  "phase": "brainstorm",
  "requiredAction": {
    "kind": "create_artifacts",
    "files": [
      "brainstorm/proposal.md",
      "brainstorm/design.md"
    ],
    "after": "specdev checkpoint brainstorm"
  }
}
```

Internally, that may be backed by Ripplegraph state:

```json
{
  "position": {
    "graph": "assignment-lifecycle",
    "node": "brainstorm.create_artifacts"
  }
}
```

But the host agent should normally see the product-shaped result, not raw
Ripplegraph state.

## Initialization Flow

A product CLI should initialize Ripplegraph quietly.

Example `specdev init` flow:

1. Create `.specdev/`.
2. Write product files such as `workflow.yaml`, `AGENTS.md`, and
   `runtime.json`.
3. Copy or generate graph packages under `.specdev/graph_packages/`.
4. Ensure `.specdev/.ripplegraph/` exists.
5. Register graph packages with Ripplegraph.
6. Optionally validate that exactly one dispatcher graph exists.

Example TypeScript sketch:

```ts
import path from "node:path";
import { registerGraphPackage } from "ripplegraph";

export function initSpecdev(projectRoot: string): void {
  const specdevRoot = path.join(projectRoot, ".specdev");

  registerGraphPackage({
    workflowRoot: specdevRoot,
    packageRoot: path.join(specdevRoot, "graph_packages", "workspace-dispatcher"),
    force: true
  });

  registerGraphPackage({
    workflowRoot: specdevRoot,
    packageRoot: path.join(specdevRoot, "graph_packages", "assignment-lifecycle"),
    force: true
  });
}
```

## Dispatcher Flow

The product CLI can expose a product command:

```sh
specdev do "create a feature assignment for reviewloop cleanup"
```

Internally:

1. The CLI asks Ripplegraph for a dispatcher request.
2. The host agent or deterministic adapter chooses a structured action.
3. The CLI submits that action to Ripplegraph.

Sketch:

```ts
import { getDispatchRequest, applyDispatchAction } from "ripplegraph";

const workflowRoot = path.join(projectRoot, ".specdev");

const request = getDispatchRequest({
  workflowRoot,
  request: "create a feature assignment for reviewloop cleanup"
});

// Host or deterministic product logic decides:
const action = {
  action: "start_run",
  graphId: "assignment-lifecycle",
  runId: "assignment-00024",
  preconditionState: { workspace_ready: true }
};

const state = applyDispatchAction({ workflowRoot, action });
```

Product-facing output should say something like:

```text
Started assignment 00024 in brainstorm phase.
Next: create brainstorm/proposal.md and brainstorm/design.md.
```

Do not say:

```text
Moved Ripplegraph to node brainstorm.create_artifacts.
```

If a graph declares `requires`, the product CLI evaluates those opaque
predicate ids before calling `startRun` or dispatcher `start_run`. Ripplegraph
only enforces the supplied booleans; it does not know how to inspect product
state such as workspaces, servers, vessels, tickets, or repositories.

unless the command is explicitly a runtime debugging command.

## Workflow Graphs

A workflow graph should represent a durable product process.

For SpecDev, likely workflow packages include:

- `assignment-lifecycle`
- `reviewloop`
- `artifact-validation`
- `knowledge-capture`

Example graph package:

```json
{
  "id": "assignment-lifecycle",
  "version": "0.1.0",
  "kind": "workflow",
  "title": "Assignment Lifecycle",
  "entry": "brainstorm.create_artifacts",
  "nodes": {
    "brainstorm.create_artifacts": {
      "purpose": "Create brainstorm artifacts",
      "instructions": "Write proposal.md and design.md.",
      "outputSchema": {
        "type": "object",
        "required": ["proposalPath", "designPath"],
        "properties": {
          "proposalPath": { "type": "string" },
          "designPath": { "type": "string" }
        }
      },
      "edges": [{ "to": "brainstorm.checkpoint" }]
    },
    "brainstorm.checkpoint": {
      "purpose": "Run brainstorm checkpoint",
      "toolContract": {
        "id": "specdev-checkpoint-brainstorm",
        "command": "specdev checkpoint brainstorm",
        "effects": ["write_files"]
      },
      "edges": [{ "to": "breakdown.create_plan" }]
    },
    "breakdown.create_plan": {
      "purpose": "Create implementation plan",
      "edges": [{ "to": "implementation.execute_plan" }]
    },
    "implementation.execute_plan": {
      "purpose": "Execute implementation tasks",
      "terminal": true
    }
  }
}
```

The product CLI may translate the active node into:

```text
Phase: brainstorm
Required files:
- brainstorm/proposal.md
- brainstorm/design.md
When done: specdev checkpoint brainstorm
```

## Host-Facing Metadata

Graph packages can declare metadata that the product CLI reads and renders.

Graph-level `requires` declares start prerequisites. Use it when a workflow
should not create a run until the host confirms a product-specific condition:

```json
{
  "id": "daily",
  "kind": "workflow",
  "requires": [
    {
      "id": "workspace_ready",
      "describe": "a prepared workspace",
      "unmetRedirect": "setup-workspace",
      "unmetMessage": "Set up the workspace first."
    }
  ],
  "entry": "start",
  "nodes": {
    "start": { "purpose": "Begin the workflow.", "terminal": true }
  }
}
```

The product CLI maps `workspace_ready` to its own code, then starts the graph
with `preconditionState`. Missing or false keys are rejected before run state is
created.

Example:

```json
{
  "purpose": "Approve brainstorm design",
  "gate": {
    "type": "external_decision",
    "interaction": {
      "id": "brainstorm-approval",
      "kind": "choice",
      "prompt": "Approve the brainstorm design?",
      "choices": [
        { "label": "Approve", "value": "approved" },
        { "label": "Request changes", "value": "needs_changes" }
      ]
    },
    "decisionSchema": {
      "type": "object",
      "required": ["decision"],
      "properties": {
        "decision": {
          "type": "string",
          "enum": ["approved", "needs_changes"]
        }
      }
    }
  },
  "interrupt": {
    "requiresUserTurn": true,
    "reason": "A user or reviewer must approve this phase."
  }
}
```

Product CLI rendering:

```text
Brainstorm review is ready.

Choices:
1. Approve
2. Request changes
```

Raw Ripplegraph metadata should stay behind the product command.

## Subgraphs With workflowRef

Use `workflowRef` to compose product workflows from smaller graph packages.

Example:

```json
{
  "purpose": "Run implementation reviewloop",
  "workflowRef": {
    "graphId": "reviewloop",
    "inputMap": {
      "phase": "$.phase",
      "assignment": "$.assignment"
    },
    "outputMap": {
      "verdict": "$.verdict"
    }
  },
  "edges": [{ "to": "apply-review-result" }]
}
```

The product CLI can describe this as:

```text
Running implementation reviewloop.
```

The host does not need to know that Ripplegraph pushed a workflow frame unless
debugging.

## Callable Graphs

Use callables for isolated typed work that should not mutate the focused
workflow run.

Examples:

- summarize an assignment
- classify a user request
- produce a structured review report
- normalize a changelog entry

Callable graphs should not contain gates or user-turn interaction metadata.
They are function-like.

Example command:

```sh
specdev classify-request "review the current implementation"
```

Internally, this might call:

```ts
startCallableCall({
  workflowRoot: specdevRoot,
  graphId: "classify-request",
  input: { request: "review the current implementation" }
});
```

## Side-Channel Actions

Use side-channel actions for useful host work that should be audited by the
current runtime but should not move the workflow. This is the current API.

For new product CLI design, treat "side channel" as a derived pattern rather
than the long-term core abstraction. The roadmap direction is a workspace-level
activity audit model where support work carries origin, origin policy, return
policy, and evidence policy. See
[`docs/kernel-gap-design-roadmap.md`](kernel-gap-design-roadmap.md).

Examples:

- refresh project context
- reload reviewer configuration
- inspect current git state
- re-read an external task tracker

Graph metadata:

```json
{
  "sideChannelActions": [
    {
      "id": "refresh-project-context",
      "purpose": "Refresh project context without advancing the assignment.",
      "effects": ["read_files"]
    }
  ]
}
```

Product CLI behavior:

1. Host performs the action.
2. Product CLI records it with Ripplegraph.

```ts
recordSideChannelAction({
  workflowRoot: specdevRoot,
  actionId: "refresh-project-context",
  output: { filesRead: 14 },
  note: "Refreshed context before review."
});
```

Ripplegraph appends a `side_channel` transition whose `from` and `to` positions
are the same.

Under the activity roadmap, this kind of action would be a frozen-origin support
activity: the focused workflow remains at the same node, the action can attach
evidence to that origin, and host-facing state still presents one primary
workflow for the agent to track.

## External Reconciliation

Use reconciliation when the product has external authoritative state.

Examples:

- backend FSM says a live session is in a different state
- review artifact changed after the graph state was served
- task tracker status changed externally

Example:

```ts
reconcileExternalState({
  workflowRoot: specdevRoot,
  source: "assignment-files",
  snapshot: { phase: "implementation", hasPlan: true },
  expected: { phase: "implementation", hasPlan: true }
});
```

If the snapshot differs from `expected`, Ripplegraph returns:

```json
{
  "reconciliation": {
    "source": "assignment-files",
    "aligned": false
  }
}
```

Ripplegraph does not decide what to do next. The product CLI owns that policy.

## Host-Agent Instructions

Every product CLI should include clear host-agent instructions.

For SpecDev:

```text
You are operating SpecDev.

Use product commands such as:
- specdev next --json
- specdev checkpoint <phase>
- specdev approve <phase>
- specdev reviewloop <phase>

Do not inspect or edit .specdev/.ripplegraph directly.
That folder is internal runtime state.

SpecDev is backed by Ripplegraph internally, but you should use SpecDev
vocabulary unless debugging runtime internals.
```

This prevents the model from mixing two abstraction layers.

## Product Command Design

Prefer product commands that return product-shaped JSON.

Good:

```json
{
  "phase": "implementation",
  "task": {
    "number": 2,
    "name": "CLI Surface",
    "verify": "npm test -- tests/cli.test.ts"
  },
  "nextCommand": "specdev checkpoint implementation"
}
```

Avoid returning raw Ripplegraph state unless the command is explicitly a
debug/runtime command.

If you need a debug command, name it clearly:

```sh
specdev runtime state
specdev runtime registry
specdev runtime log --run-id assignment-00024
```

## Testing Strategy

Use three test levels.

### 1. Graph package tests

Validate graph packages load:

```ts
expect(loadGraphPackage(packageRoot).manifest.id).toBe("assignment-lifecycle");
```

### 2. Product command tests

Test the CLI as the host sees it:

```sh
specdev next --json
specdev checkpoint brainstorm
specdev approve brainstorm
```

Assert product-shaped outputs, not raw Ripplegraph internals.

### 3. Runtime integration tests

Use Ripplegraph APIs directly only for lower-level behavior:

- checkpoint is preserved
- transition log was appended
- side-channel does not advance position
- reconciliation reports drift
- callable state is isolated

## Common Mistakes

### Mistake: Letting the CLI become the workflow engine

Bad:

```ts
if (phase === "brainstorm") {
  if (filesExist()) {
    phase = "breakdown";
  }
}
```

Better:

```ts
// Let Ripplegraph own position and transitions.
advanceRun({ workflowRoot, input: { proposalPath, designPath } });
```

### Mistake: Showing raw node names to the host

Bad:

```text
Current Ripplegraph node: brainstorm.create_artifacts.
```

Better:

```text
Current phase: brainstorm.
Required action: create proposal.md and design.md.
```

### Mistake: Duplicating the registry

Bad:

```text
.specdev/registry.json
.specdev/.ripplegraph/registry.json
```

Two source-of-truth files can drift.

Better:

```text
.specdev/runtime.json              # pointer only
.specdev/.ripplegraph/registry.json # source of truth
```

### Mistake: Editing runtime state directly

Bad:

```sh
sed -i '...' .specdev/.ripplegraph/current.json
```

Better:

```sh
specdev resume --run-id <id>
specdev runtime repair
```

## Minimal Implementation Checklist

For a product CLI like `specdev-cli`, implement this in order:

1. Create the embedded folder layout.
2. Add product host-agent instructions.
3. Add graph packages under `.specdev/graph_packages/`.
4. Register graph packages with `workflowRoot = ".specdev"`.
5. Add `specdev graph list` and `specdev doctor`.
6. Add `specdev next --json` as the primary host-agent entrypoint.
7. Add product commands that wrap Ripplegraph transitions.
8. Add side-channel/reconciliation product commands only when needed.
9. Keep raw Ripplegraph state behind `specdev runtime ...` debug commands.
10. Test graph packages, product commands, and runtime integration separately.

## Guiding Principle

The product CLI should feel like the product.

Ripplegraph should feel like the engine.

The host agent should mostly talk to the product, not the engine.
