# Side-Channel And Reconciliation Runtime

## Overview

Graph packages can declare `sideChannelActions`, `toolContract`, `validators`, and `interrupt` metadata, but runtime state still only records graph-advancing operations such as `step`, `decide`, `suspend`, and `resume`. That leaves a gap for hosts that need to load backend state, refresh an artifact, or compare authoritative external state before deciding whether a workflow can advance.

This assignment adds two host-submitted runtime operations for focused workflow runs:

- `recordSideChannelAction`: append an audited record that a declared or ad hoc side-channel action happened, with host-supplied input/output metadata, while preserving the checkpoint position.
- `reconcileExternalState`: append an audited reconciliation record containing a host-supplied external snapshot, optional expected snapshot, and a derived `aligned`/`drift` status, again without moving graph position.

The operations are append-only. They do not execute commands, read external systems, run validators, write node outputs, set gate decisions, or change focus. They make side-channel and reconciliation events durable enough for consumer CLIs to inspect after context loss.

## Goals

- Provide a runtime API for side-channel audit events that preserves graph position.
- Provide a runtime API for external state reconciliation and drift reporting that preserves graph position.
- Extend transition-log validation with explicit operation names for side-channel and reconciliation records.
- Expose CLI commands so host agents can submit these records without importing TypeScript APIs directly.
- Keep checkpoint mutation out of scope: no node output, gate decision, position, stack, or focus changes.
- Cover the behavior with focused tests proving transition-log entries are written and position remains unchanged.

## Non-Goals

- Do not execute side-channel commands or host tools inside Ripplegraph.
- Do not read Oceanlive, backend FSMs, files, network APIs, TOML, CSV, or domain-specific resources directly.
- Do not implement generic validator execution.
- Do not add a separate database, event store, or side-channel artifact directory.
- Do not block or advance graph execution based on drift. The host decides how to respond to `drift`.

## Design

### Runtime APIs

Add two exported coach functions:

- `recordSideChannelAction({ workflowRoot, actionId, input?, output?, status?, note? })`
- `reconcileExternalState({ workflowRoot, source, snapshot, expected?, note? })`

Both functions read the focused active checkpoint. If no run is focused or the run is not active, they reuse existing focused-run error behavior where practical. Both functions append a transition-log entry with `from` and `to` set to the current checkpoint position and return `{ status: 'ok', run, position, state }` where `state` is the normal `StateOk` response after the record is written.

`recordSideChannelAction` uses operation `side_channel` and stores `{ actionId, status, note, input, output }` in the log entry `output`. `status` defaults to `completed` and accepts `completed` or `failed`.

`reconcileExternalState` uses operation `reconcile` and stores `{ source, snapshot, expected?, aligned, note }` in the log entry `output`. `aligned` is `true` when `expected` is omitted or when `snapshot` and `expected` are deeply equal after stable JSON normalization; otherwise `false`. The returned response includes `reconciliation: { source, aligned }`.

### Transition Log Schema

Extend `transitionLogEntrySchema.op` to include `side_channel` and `reconcile`. Existing log fields remain unchanged. The new operations use the existing nullable `input`, `output`, `reason`, and `error` fields rather than adding a parallel log schema.

This keeps storage and parsing simple while making the operation names explicit and auditable.

### CLI

Add two JSON CLI commands:

- `side-channel --action <id> [--input <json>] [--output <json>] [--status completed|failed] [--note <text>]`
- `reconcile --source <id> --snapshot <json> [--expected <json>] [--note <text>]`

The commands return JSON only. They do not render UI, execute the action, or infer external state.

### Position Preservation

The implementation must read the checkpoint before appending the log and must not call `writeCheckpoint`, `writeCurrent`, `writeNodeOutput`, or transition selection helpers. Tests should assert the checkpoint position and focused run remain unchanged after both operations.

## Success Criteria

- A side-channel record appends a `side_channel` transition entry whose `from` and `to` positions are equal to the active checkpoint position.
- A reconciliation record appends a `reconcile` transition entry and reports `aligned: true` for matching or omitted expected state, `aligned: false` for drift.
- Neither operation writes node output, gate decisions, or changes checkpoint position/focus.
- CLI commands expose the same behavior.
- Existing workflow, callable, dispatcher, and package tests continue passing.

## Testing Approach

- Add coach tests for side-channel and reconciliation APIs preserving checkpoint position and writing transition-log entries.
- Add a CLI test for at least one side-channel command and one drift reconciliation command.
- Run focused tests for coach/CLI behavior plus typecheck and the full suite.
