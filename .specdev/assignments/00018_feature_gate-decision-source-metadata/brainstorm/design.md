# Gate Decision Source Metadata

## Overview

Ripplegraph gates already model the important runtime behavior for SpecDev:
the run pauses at an `external_decision` node, validates a JSON decision, stores
that decision durably, and follows guarded edges. What is missing is
self-description. A host can see that a node needs an external decision, but it
cannot tell whether the intended source is a human approval, a codex
reviewloop, or another host-managed mechanism without out-of-band conventions.

This assignment adds optional gate metadata only. It does not make Ripplegraph
execute reviewers, call tools, inspect artifacts, or approve anything on its
own. The runtime continues to validate the submitted decision against
`decisionSchema` and route exactly as today. The metadata is exposed in state
responses so host agents can decide what external process to run before calling
`advance` or `decide`.

## Goals

- Add an optional `decisionSource` object to `gateSchema`.
- Preserve all existing gate validation, edge routing, and durable
  `gateDecisions` behavior.
- Expose the metadata in `StateOk.node.gate` and gated `responseContract` so
  hosts can inspect it without reading raw workflow files.
- Keep metadata generic enough for SpecDev reviewloop and human gates without
  embedding SpecDev-specific commands in Ripplegraph.
- Update dist artifacts and focused gate tests.

## Non-Goals

- No reviewloop execution inside Ripplegraph.
- No artifact validation, file inspection, or command orchestration.
- No change to `decideGate` input shape; decision provenance is metadata about
  the gate, not part of the submitted decision.
- No requirement that every gate declares a source.
- No changes to callable gate restrictions; callable graph nodes still cannot
  use gates.

## Design

### Schema

Extend `gateSchema`:

```ts
decisionSource?: {
  kind: 'human'
  label?: string
} | {
  kind: 'tool'
  tool: string
  label?: string
} | {
  kind: 'system'
  label?: string
}
```

For `kind: 'tool'`, `tool` is required and must be a non-empty identifier such
as `reviewloop`. `label` is optional human-facing text such as
`Implementation review`. Human and system sources do not have a `tool` field.
Keep the object strict and small; avoid a command language or package-specific
payloads.

The runtime should validate this metadata when loading compact workflows and
graph packages. Existing gates without the field continue to parse unchanged.

### Runtime behavior

`stateForCheckpoint` already returns the current node's full `gate` object and
the gated `responseContract`. The implementation should preserve that path so
`decisionSource` naturally appears in state responses. `decideGate` should not
branch on the metadata. It should keep validating `opts.decision` against
`node.gate.decisionSchema`, writing `gateDecisions`, appending transition logs,
and selecting edges exactly as today.

### Host contract

Ripplegraph's contract is "this gate declares where a decision is expected to
come from." The host owns interpretation:

- `kind: 'human'` means ask a user or operator.
- `kind: 'tool', tool: 'reviewloop'` means the host may run its reviewloop
  integration and submit the review verdict as the gate decision.
- `kind: 'system'` means another deterministic host process can produce the
  decision.

The metadata is advisory. If a caller submits a valid decision manually,
Ripplegraph accepts it; policy enforcement belongs to the host layer.

### Testing

Add focused tests that prove:

- Workflows with `decisionSource` load and expose it in gated state.
- `decideGate` still stores only the submitted decision and routes normally.
- Invalid `decisionSource` shapes are rejected by schema validation, including
  a tool source with no `tool` identifier.
- Existing gates without `decisionSource` and callable gate rejection remain
  green.

## Success Criteria

- A graph package or compact workflow can declare gate `decisionSource`
  metadata.
- Gated state responses include the metadata in `node.gate`.
- The `responseContract` remains a normal decide contract with the decision
  schema.
- Gate decisions continue to validate, persist, and route exactly as before.
- Invalid metadata fails workflow/package validation.
- Full test suite remains green.
