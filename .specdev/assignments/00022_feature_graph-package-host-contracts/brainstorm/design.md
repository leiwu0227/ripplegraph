# Graph Package Host Contracts

## Overview

Ripplegraph should remain the graph/runtime boundary, but graph and business packages need enough declarative metadata to own their user-facing and host-facing contracts. Today the runtime exposes node purpose, instructions, output schema, gates, and gate decision-source metadata. That is not enough for packages that sit on top of Ripplegraph to define rich user interactions, distinguish hard user-turn pauses from ordinary gates, advertise side-channel actions that must not advance graph position, or declare which host commands and validators are expected.

This assignment adds a metadata-first contract layer to the package schema and state API. Nodes and gates can declare interaction metadata. Nodes can declare user-turn interrupts, side-channel actions, tool contracts, and validator contracts. Workflow refs can carry input/output mapping metadata. Ripplegraph validates these structures during package loading and includes them in `state` responses for the active node so consumer CLIs can render, audit, and enforce them.

The runtime will not execute host tools, reviewers, validators, business commands, or side-channel actions in this assignment. It will own schema validation, effect preflight visibility, and state exposure. Host agents and consumer repos will own rendering and execution.

## Goals

- Add first-class interaction metadata for prompts that hosts can render consistently.
- Add explicit user-turn interrupt metadata that is stronger than a gate and visible in state.
- Add declarative side-channel action metadata for actions that can be offered without implying graph advancement.
- Add `workflowRef` input/output mapping metadata so package boundaries can state what they expect to receive and return.
- Add host tool contract and validator metadata that declares required host capabilities without invoking them.
- Keep all additions compatible with the existing graph package loader, coach state API, and package-folder workflow execution.
- Cover the new contract surface with schema and state-response tests.

## Non-Goals

- Do not add a generic shell runner, host command executor, reviewer spawner, or validator runner to Ripplegraph core.
- Do not parse domain-specific TOML, CSV, OceanWave, or Oceanlive formats.
- Do not make Ripplegraph call `oceanlive_app` or any external service directly.
- Do not implement full `workflowRef` map expression evaluation in this assignment. The mappings are declared and validated here; executable semantics can be added later if needed.
- Do not add a full side-channel runtime command in this assignment. The graph position must remain unchanged by these declarations; host-side audit logging can be added as a separate runtime feature.

## Design

### Schema Contracts

Extend `src/schema.ts` with small, explicit Zod schemas:

- `interaction`: `{ id, kind, prompt, renderVia?, choices?, schema?, followUp? }`, where `kind` is one of `choice`, `free_text`, `confirm`, or `form`. Choice and confirm interactions require at least one structured choice with `{ label, value, description? }`. Form interactions require an object JSON schema in `schema`; hosts render the form from that schema and submit the resulting payload through the normal node or gate response contract.
- `interrupt`: `{ requiresUserTurn: true, reason? }` for nodes that must return control to the user/host before any automatic continuation.
- `sideChannelActions[]`: `{ id, purpose, commandRef?, effects?, outputSchema?, validator? }` for host-visible actions that are separate from graph advancement.
- `toolContract`: `{ id, command, purpose?, effects?, inputSchema?, outputSchema?, validator? }` for commands a host may provide.
- `validators[]`: `{ id, purpose?, inputSchema?, outputSchema? }` for host-owned validation capabilities.
- `workflowRef.inputMap` and `workflowRef.outputMap`: string-keyed metadata maps that describe parent/child boundary values.

The schemas should stay strict at the object boundary, follow the repository’s current `idSchema` style, and reuse `jsonSchemaSchema` for schema-bearing fields.

### State Exposure

Extend `StateOk.node` and `stateForCheckpoint` so the active node response includes the new metadata. Hosts should not need to read the graph package directly to render the current interaction, discover side-channel actions, understand a required user turn, or see tool/validator requirements.

Gate-level interaction metadata should be exposed through the existing `node.gate` object. Node-level interaction metadata should be exposed on `node.interaction`. This keeps regular work-node interactions and decision-gate interactions distinct while preserving the existing gate response contract.

### Effects

Effect preflight should include effects declared by `sideChannelActions` and `toolContract` in addition to existing node/graph effects. This keeps Ripplegraph responsible for capability visibility even when the host performs the actual work.

### Compatibility

Existing packages that do not use the new fields should behave exactly as they do today. Existing gate decision-source metadata remains unchanged.

Callable packages remain graph-shaped functions. In this assignment, callable nodes reject host-interaction metadata that would require a user turn or host-side command rendering: `interaction`, `interrupt`, `sideChannelActions`, `toolContract`, and `validators`. This mirrors the existing callable gate rejection and avoids loading metadata that `CallableState.node` does not expose. Workflow packages are the supported target for the new host contract surface.

## Success Criteria

- A graph package containing the new metadata loads successfully and exposes it in `state`.
- Invalid interaction metadata is rejected during package loading, including choice/confirm interactions without choices and form interactions without an object schema.
- Callable packages reject node-level host-interaction metadata that would require host rendering or command execution.
- `workflowRef` accepts validated input/output map metadata.
- State responses include node interaction, interrupt, side-channel action, tool contract, validator, and gate interaction metadata when present.
- Effect preflight includes effects declared by side-channel actions and tool contracts.
- Existing workflowRef, gate, callable, and dispatcher tests continue passing.

## Testing Approach

- Add graph-package/schema tests for valid metadata, rejected invalid interaction choices, rejected invalid form interactions, and callable packages that reject host-interaction metadata.
- Add coach state tests proving the active state response exposes the new metadata.
- Add an effect preflight test proving side-channel/tool effects are included in required effects.
- Run the project test suite and type checks through the package’s existing npm scripts.
