# Ripplegraph Kernel Gap Design Roadmap

Date: 2026-05-26

This roadmap captures the next kernel design direction for strict product-CLI
ports, using Oceanlive as the primary acceptance case. The goal is to split the
remaining work into clear SpecDev follow-up assignments before implementation.

## Core Direction

Do not make "side channel" the primary abstraction. The term is useful in
conversation, but it is too broad for kernel design: it can mean read-only
inspection, evidence gathering, backend preload, validation, helper
computation, task switching, or menu-option execution.

Ripplegraph should instead model an audited activity sequence. An activity is
anything the host does through or around Ripplegraph that should appear in the
audit trail:

```ts
activityKind:
  | "graph"
  | "command"
  | "validator"
  | "reconcile"
  | "decision"
  | "status"
  | "note";
```

Each activity records how it relates to an origin workflow:

```ts
origin?: {
  runId: string;
  nodeId?: string;
  interactionId?: string;
};

originPolicy: "freeze" | "suspend" | "independent";
returnPolicy: "auto_return" | "stay" | "ask_user";
evidencePolicy: "attach_to_origin" | "local_only";
objective?: string;
```

A former side channel becomes a derived pattern: an activity whose origin
workflow remains frozen and whose result may attach as evidence.

## Focus And Storage Decision

The initial kernel path should preserve one primary focused workflow run.

- A frozen origin remains the focused run; it does not become `suspended`.
- Frozen-origin support activity is recorded in a workspace-level activity log.
- The activity log can reference the origin run, node, interaction, callable
  call, command, validator, or reconciliation record.
- Per-run transition logs remain the source of truth for workflow cursor
  movement.
- Per-call logs remain the source of truth for callable graph execution.
- True top-level task switching remains separate: suspend the current workflow
  and focus another workflow.

Support graph work should initially use callable-style graph execution or an
activity record that points at a callable/call log. It should not start a second
focused workflow while the origin is frozen. If a future product needs durable
support workflows with their own gates, that should be a separate focus-stack or
multi-workflow assignment.

This keeps the host-facing model simple: there is one primary workflow to track,
plus concise activity context when temporary support work runs.

## Oceanlive Acceptance Case

Oceanlive daily execution is the strictest target because its backend FSM is
authoritative and its numbered menus are hard workflow boundaries.

When an Oceanlive menu is open:

- the daily workflow cursor is frozen
- the frozen origin remains focused
- the menu cannot advance without the expected user choice
- read-only support activity may run if explicitly allowed
- backend-mutating preload cannot masquerade as a decision
- reconciliation drift is recorded and prevents automatic progress
- all commands, validators, callable support graphs, decisions, and
  reconciliation checks appear in the workspace-level activity trail

Examples:

- Show current MTM:
  `originPolicy: "freeze"`, `returnPolicy: "auto_return"`,
  `evidencePolicy: "attach_to_origin"`.
- Load scale table:
  `originPolicy: "freeze"`, but only if the graph/dispatcher policy allows the
  activity for the current interaction or the user selected the matching menu
  value.
- Switch to an unrelated SpecDev task:
  `originPolicy: "suspend"`, `returnPolicy: "stay"`,
  `evidencePolicy: "local_only"`.

## Non-Goals

Ripplegraph should not absorb product-domain behavior. The kernel should not:

- call `session.js`, `livecopy`, or `vessel`
- parse Oceanlive CSV/JSONL artifacts
- spawn SpecDev reviewers
- validate domain artifacts directly
- own trading, assignment-review, or Oceanshed business decisions
- become a generic shell/process runner

Product CLIs own commands, validators, prompts, scripts, business rules, and
domain-specific recovery policy.

## Follow-Up Assignments

### 1. Activity Audit Model

Define workspace activity records, origin/policy fields, relation to per-run
transition logs and per-call logs, and host-facing summaries. This assignment
should preserve one primary focused workflow.

### 2. Workflow Freeze / Interrupt Semantics

Define frozen workflow state, allowed activities while frozen, expected user
decision handling, and Oceanlive-style menu tests. A frozen workflow remains the
focused run rather than becoming suspended.

### 3. Dispatcher Activity Routing

Teach the dispatcher to route between continuation, support activity, task
switch, resume, and recovery.

### 4. Evidence Attachment Model

Define how command, validator, callable graph, and reconciliation outputs attach
to origin nodes/interactions and how state/history exposes them.

### 5. Reconciliation Semantics

Sharpen external-state drift records, aligned verdicts, and recovery handoff.
This may merge with evidence attachment if the final design is small enough.

### 6. WorkflowRef I/O Runtime Binding

Decide whether reusable graph input/output mapping becomes runtime behavior now
or remains metadata until a product CLI needs it.

### 7. Optional Multi-Workflow Support Runs

Only if a product proves callable-style support graphs are insufficient, design
focus stacks or multiple active workflow runs. This is deliberately outside the
initial Oceanlive-critical path.

## Testing Guidance

Implementation assignments should use small fixture graph packages rather than
Oceanlive itself:

- frozen menu graph
- support command activity
- callable-style support graph activity
- task-switch graph
- reconciliation drift fixture
- validator evidence fixture

Oceanlive-specific behavior should be represented by minimal tests that mimic
the daily execution rules without importing trading logic.
