## Overview

Ripplegraph should support a generic gate primitive for external decisions.
The feature is motivated by human-in-the-loop workflows, but the core concept
should not be hardcoded as "human approval." Ripplegraph is intended to be a
backbone for higher-level CLIs such as SpecDev, oceanshed, and oceanlive, so the
runtime should enforce the control-flow boundary while consumer CLIs decide how
to present, authorize, and name the decision.

The core behavior: a workflow node may declare a gate. When a run reaches that
node, normal agent `step` or demo `submit` output must be refused. The run can
advance only through a separate decision API/CLI command that accepts validated
JSON matching the gate's decision schema. The resulting decision is persisted
separately from agent node outputs and used with the existing edge selection
model to determine the next node.

## Goals

The first version should provide a clean, reusable runtime interface:

- graph schema support for gated nodes
- state responses that tell host agents and consumer CLIs a gate is pending
- a runtime API for submitting an external decision
- low-level CLI support through a generic command such as `decide`
- demo CLI rendering that explains the pending gate and refuses normal submit
- transition log and checkpoint persistence that distinguishes gate decisions
  from agent-produced node outputs

The feature should be simple enough for v0 but solid enough to serve as a
backbone primitive. Consumer-specific approval words, auth checks, web UIs, and
notification flows should layer on top rather than leak into core schema.

## Non-Goals

This assignment will not implement identity, authorization, signatures,
multi-approver quorum, Slack/GitHub/web integrations, or durable notification
queues. It will not decide whether SpecDev should call a gate "approval" or
whether oceanlive should call it "execute confirmation." Those are consumer
concerns.

This assignment will not introduce asynchronous background execution or runtime
LLM calls. The host agent still drives normal nodes, and external systems or
humans still submit gate decisions through a CLI/API boundary.

It will not remove the current `step` behavior for non-gated nodes or change
existing root workflow fallback behavior.

## Design

Add an optional `gate` field to workflow nodes:

```json
{
  "gate": {
    "type": "external_decision",
    "decisionSchema": {
      "type": "object",
      "required": ["decision"],
      "properties": {
        "decision": { "type": "string", "enum": ["approved", "rejected"] },
        "reason": { "type": "string" }
      }
    }
  }
}
```

For v0, support only `type: "external_decision"`. The gate's
`decisionSchema` uses the same JSON-schema subset as node `outputSchema`.
Gated nodes still have `purpose`, optional `instructions`, and `edges`. Edge
selection should use the decision payload, so existing `when` matching remains
the control-flow mechanism:

```json
"edges": [
  { "to": "execute", "when": { "decision": "approved" } },
  { "to": "revise", "when": { "decision": "rejected" } }
]
```

Persist gate decisions separately from agent outputs, for example
`checkpoint.gateDecisions[nodeId]`, because the source and trust boundary are
different from normal node output. Transition log entries should also mark the
operation distinctly, either through a new `op: "decide"` or by storing a
`gateDecision` field with the validated decision payload.

Add a runtime function such as `decideGate({ workflowRoot, decision })`. It
loads the focused active run, verifies the current node has a gate, validates
the decision against `gate.decisionSchema`, writes a decision artifact, stores
the decision in the checkpoint, selects an edge from the gate decision, and
advances or completes the run. Normal `stepRun` should reject gated nodes with
a clear error such as `E_GATE_DECISION_REQUIRED`.

State responses must make the pending gate impossible to confuse with normal
agent work. Extend the active state shape so `node.gate` is present when the
current node is gated:

```json
{
  "status": "ok",
  "node": {
    "id": "review-classification",
    "purpose": "Ask for an external decision",
    "instructions": "Review the classification before execution.",
    "exec": "inline",
    "outputSchema": { "type": "object" },
    "gate": {
      "type": "external_decision",
      "decisionSchema": {
        "type": "object",
        "required": ["decision"],
        "properties": {
          "decision": { "type": "string", "enum": ["approved", "rejected"] },
          "reason": { "type": "string" }
        }
      }
    }
  },
  "responseContract": {
    "command": "decide",
    "acceptedFormats": ["json"],
    "schema": { "type": "object", "required": ["decision"] }
  }
}
```

For non-gated nodes, keep the existing `responseContract.command: "step"`
behavior and normal `node.outputSchema` rendering. For gated nodes,
`responseContract.command` must be `"decide"` and the schema should be the
gate's `decisionSchema`. The normal node `outputSchema` may remain present for
backward structural consistency, but host-facing renderers must not present it
as the required next payload while a gate is pending.

Expose this through the low-level CLI:

```sh
ripplegraph decide --decision '{"decision":"approved","reason":"looks good"}'
```

The demo CLI can expose:

```sh
ripplegraph-demo decide '{"decision":"approved","reason":"looks good"}'
```

but should keep domain wording generic. Consumer CLIs can wrap this as
`approve`, `reject`, `promote`, or `confirm-execute`.

Demo/status rendering should switch based on `responseContract.command`. For
normal nodes it keeps the current "Required output" section and
`ripplegraph-demo submit '<json>'` next command. For gated nodes it should show
"External decision required", render the gate `decisionSchema`, and print
`ripplegraph-demo decide '<json>'` as the next command. This prevents host
agents from being instructed to call `submit` at a node where the runtime will
reject `submit`.

## Success Criteria

A workflow can declare a gated node with `gate.type:
"external_decision"`. When a run reaches that node, `state` and demo `status`
show that an external decision is pending and include the gate decision schema.
Normal `step`/`submit` fails with a clear gate-required error.

Submitting a valid decision through `decide` advances by existing edge matching
and records the decision separately from agent outputs. Invalid decision JSON
returns validation errors without advancing. Calling `decide` on a non-gated
node fails clearly.

Tests should cover schema parsing, state rendering for gated nodes, refusal of
normal step on gated nodes, valid approve/reject branch advancement, invalid
decision validation, and resume/list behavior staying intact. The support-triage
demo should be updated to include a gate between classification and branch
execution so real Claude/Codex testing demonstrates the enforced boundary.
