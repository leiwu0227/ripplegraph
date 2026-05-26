# Kernel Gap Design Roadmap

## Overview

This assignment designs the next Ripplegraph kernel roadmap for strict
product-CLI ports, using Oceanlive as the primary acceptance case. The output is
not implementation. It is a design decision record plus a sequence of follow-up
SpecDev assignments that can be implemented and verified independently.

The main design shift is to avoid making "side channel" the central kernel
abstraction. The phrase is useful informally, but too broad: it can mean
read-only inspection, evidence gathering, backend preload, validation, helper
computation, task switching, or menu-option execution. Those cases need
different policies.

Instead, Ripplegraph should model an audited activity sequence. An activity may
be a graph run, command, validator, reconciliation check, decision, status read,
or note. Each activity records how it relates to the current workflow:

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

Under this model, a former side channel is a derived pattern: an activity whose
origin workflow remains frozen and whose result may attach as evidence. Some of
these activities may call another workgraph; others may be ad hoc commands,
validators, reconciliation checks, or status reads.

The focus/storage decision for this roadmap is:

- Ripplegraph keeps one primary focused workflow run.
- A frozen origin remains the focused run; it does not become `suspended`.
- Frozen-origin support activity is recorded in a workspace-level activity log
  that can reference the origin run/node/interaction.
- Support graph work initially uses callable-style graph execution or an
  activity record that points at a callable/call log. It does not start a second
  focused workflow run while the origin is frozen.
- True top-level task switching remains separate: suspend the current workflow
  and focus another workflow.

This preserves the host-facing invariant that there is one primary workflow to
track, while still allowing support commands, validators, reconciliation checks,
and callable graph work to be audited against the frozen origin.

## Goals

Answer the design questions needed to break the remaining kernel work into
concrete follow-up assignments:

- How should Ripplegraph represent graph switches, ad hoc support actions,
  validators, decisions, reconciliation, and evidence in one top-level audit
  trail?
- How should an active workflow behave when it is waiting at an interrupting
  interaction, especially Oceanlive's numbered menus?
- Which activities are allowed while an origin workflow is frozen?
- How does the kernel know whether an activity may attach evidence, return
  focus, suspend the origin, or remain independent?
- How should the dispatcher choose between continuing the current workflow,
  running a support activity, switching to another top-level workflow, resuming
  a previous workflow, or entering recovery?
- How many follow-up SpecDev assignments are needed, and what should each one
  own?

## Non-Goals

This brainstorm does not implement kernel changes.

Ripplegraph should also not absorb product-domain behavior. The kernel should
not:

- call `session.js`, `livecopy`, or `vessel`
- parse Oceanlive CSV/JSONL artifacts
- spawn SpecDev reviewers
- validate domain artifacts directly
- own trading, assignment-review, or Oceanshed business decisions
- become a generic shell/process runner

Ripplegraph should own the activity/audit model, workflow position, dispatch
contracts, freeze/interrupt semantics, evidence attachment, and reconciliation
records. Product CLIs should own commands, validators, prompts, scripts, and
business logic.

## Design

The recommended approach is a policy-based activity model.

An activity is anything the host does through or around Ripplegraph that should
be visible in the audit trail:

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

Every activity may carry origin and policy metadata:

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

Activities should be stored in a workspace-level append-only log, separate from
per-run transition logs and per-call logs. Per-run transition logs remain the
source of truth for workflow cursor movement. The workspace activity log is the
cross-cutting audit sequence that can say: "while run A was frozen at node N,
command B ran, callable C completed, validator D passed, and evidence was
attached to A/N."

This replaces side-channel-as-concept with explicit mechanics:

- A read-only support command uses `originPolicy: "freeze"` and
  `returnPolicy: "auto_return"`.
- A backend preload also freezes the origin, but may require an explicit menu
  selection or allow policy before it can run.
- A true task switch uses `originPolicy: "suspend"` and
  `returnPolicy: "stay"`.
- A normal workflow continuation is a decision or workflow step that advances
  the focused workflow through its normal transition rules and is mirrored into
  the activity log.
- A reconciliation activity records observed external state and drift verdicts,
  but does not repair state unless a product policy explicitly drives recovery.

For Oceanlive, an interrupting menu freezes the daily execution workflow cursor.
While frozen, the dispatcher may allow declared support activities, but the daily
workflow cannot advance until the user submits the expected menu value. The
host-facing state should show one clear primary workflow plus concise handoff
context for any temporary activity, rather than requiring the host agent to
manually reason about parent and child runs.

Support graph activities should be modeled as callable-style graph work in the
initial roadmap. That matches the current runtime direction: callable calls are
isolated from focused workflow state and can already run without moving the
workflow cursor. If a later product requires durable support workflows with
their own gates, that should be a separate focus-stack or multi-workflow
assignment, not part of the Oceanlive-critical path.

## Follow-Up Assignments

The likely follow-up sequence is:

1. **Activity Audit Model**
   Define workspace activity records, origin/policy fields, relation to per-run
   transition logs and per-call logs, and host-facing summaries. This assignment
   should preserve one primary focused workflow.

2. **Workflow Freeze / Interrupt Semantics**
   Define frozen workflow state, allowed activities while frozen, expected user
   decision handling, and Oceanlive-style menu tests. A frozen workflow remains
   the focused run rather than becoming suspended.

3. **Dispatcher Activity Routing**
   Teach the dispatcher to route between continuation, support activity, task
   switch, resume, and recovery.

4. **Evidence Attachment Model**
   Define how command, validator, graph, and reconciliation outputs attach to
   origin nodes/interactions and how state/history exposes them. Graph outputs
   in the initial design should mean callable-style support graph outputs, not
   second focused workflow outputs.

5. **Reconciliation Semantics**
   Sharpen external-state drift records, aligned verdicts, and recovery
   handoff. This may merge with the evidence assignment if the final design is
   small enough.

6. **WorkflowRef I/O Runtime Binding**
   Decide whether reusable graph input/output mapping becomes runtime behavior
   now or remains metadata until a product CLI needs it.

7. **Optional Multi-Workflow Support Runs**
   Only if a product proves that callable-style support graphs are insufficient,
   design focus stacks or multiple active workflow runs. This is explicitly not
   part of the initial Oceanlive-critical path.

Assignments 1-4 are the likely kernel-critical path for Oceanlive readiness.
Assignments 5-6 are important but may be ordered after the core freeze/activity
model depending on product pressure. Assignment 7 is deliberately deferred.

## Success Criteria

This brainstorm is successful when it produces:

- A recommended kernel direction: activity/audit sequence with origin policy,
  return policy, evidence policy, and objective text.
- A clear focus/storage decision: one primary focused workflow, frozen origins
  remain focused, support activity is recorded in a workspace activity log, and
  support graph work is callable-style unless a later assignment proves the need
  for multi-workflow focus.
- A clear answer that "side channel" is not the primary abstraction. It is a
  derived pattern: an activity that keeps the origin workflow frozen and may
  attach evidence.
- Oceanlive-first acceptance scenarios:
  - daily execution menu freezes the workflow cursor
  - read-only support activity can run while the menu remains pending
  - backend-mutating preload cannot masquerade as a decision
  - user menu choice is the only thing that advances the daily FSM
  - reconciliation drift is recorded and stops automatic progress
  - audit trail clearly explains the sequence of graph, command, validator,
    reconcile, and decision activities
- A concrete follow-up assignment list, with each assignment independently
  implementable and testable.
- Explicit non-goals keeping domain logic out of Ripplegraph.

## Testing Approach

Because this assignment is design-only, verification means the follow-up roadmap
has testable acceptance criteria.

Later implementation assignments should use small fixture graph packages rather
than Oceanlive itself:

- frozen menu graph
- support command activity
- callable-style support graph activity
- task-switch graph
- reconciliation drift fixture
- validator evidence fixture

Oceanlive-specific behavior should be represented by minimal tests that mimic
daily execution rules without importing trading logic.
