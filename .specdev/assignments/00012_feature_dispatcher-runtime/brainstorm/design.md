# Design: dispatcher runtime

## Overview

The graph package registry foundation is now implemented: packages can be loaded from flat `graph.json` manifests, registered in `.ripplegraph/registry.json`, and listed through the JSON CLI. The next step is dispatcher runtime support. A dispatcher is the front door for user intent. It should not be an embedded LLM router; it is a graph package plus runtime contract that gives the host agent a narrow set of structured actions and lets Ripplegraph validate and apply those actions.

The normal flow should become:

```text
user request
  -> host agent calls ripplegraph dispatch --request "..."
  -> Ripplegraph returns dispatcher orientation, catalog hints, and action schema
  -> host agent submits ripplegraph dispatch --action '{...}'
  -> Ripplegraph validates and applies the structured action
```

This is intentionally a two-step host-agent loop. It preserves the principle that the host agent does language work, while Ripplegraph owns state transitions and safety checks. It also avoids pretending the runtime can infer user intent without an LLM.

## Goals

- Add a clear dispatcher action schema for the normal workspace-routing actions:
  - `start_run`
  - `resume_run`
  - `switch_run`
  - `list_runs`
  - `ask_user`
  - `call_graph` as a recognized-but-not-executed action until callable runtime exists.
- Add `dispatch` support to the low-level JSON CLI.
- Use `.ripplegraph/registry.json` as the authoritative graph catalog.
- Require a registered dispatcher graph before normal dispatch.
- Validate requested graph ids, graph kinds, run ids, and action payload shape before mutating state.
- Apply safe actions using existing run lifecycle functions where possible.
- Keep direct `start` and existing compact `workflow.json` behavior intact for debug and compatibility.
- Return agent-friendly state: orientation, available graph summaries, accepted action schema, next command, and clear errors.

## Non-Goals

- Do not embed an LLM SDK or attempt automatic natural-language routing.
- Do not implement callable graph execution in this assignment.
- Do not migrate existing compact `workflow.json` runtime to package-folder execution.
- Do not implement package copying/installing; dispatch should use registered package metadata and existing workflow runtime only where executable support exists.
- Do not add effect permission enforcement yet.
- Do not remove direct debug commands such as `start`.

## Design

### Current implementation facts

- `src/registry.ts` can read `.ripplegraph/registry.json`, list registered graph packages, and store package metadata.
- `src/coach.ts` already has durable run lifecycle operations: `startRun`, `resumeRun`, `suspendRun`, `listRuns`, `getState`, and related helpers.
- `src/schema.ts` distinguishes graph kinds: `dispatcher`, `workflow`, and `callable`.
- Current executable run behavior still loads graphs from compact `workflow.json`; registered package folders are a catalog, not yet executable workflow definitions.
- `getState` already has a no-focused-run branch that can expose dispatcher-ready guidance when compact `workflow.json` has `entryGraph`.

These facts suggest a conservative dispatcher runtime: implement action validation and action application now, but avoid replacing workflow execution with package-folder execution until that is intentionally designed.

### Recommended approach

Use a small `src/dispatcher.ts` module that owns dispatcher request/action contracts and catalog validation. Keep persistence in existing storage/registry modules and keep run lifecycle mutation in `coach.ts`.

Public helpers should be shaped around two operations:

```ts
getDispatchRequest(options: { workflowRoot: string; request: string }): DispatchRequestState
applyDispatchAction(options: { workflowRoot: string; action: unknown }): DispatchActionResult
```

`getDispatchRequest` is read-only. It checks for a registered dispatcher graph, lists registered graph summaries, includes activation hints, and returns the canonical action schema. It does not start a run or change focus.

`applyDispatchAction` validates the host-provided action, checks the registry/current run state, and applies the action if it is supported. It is the only mutating half of dispatch.

### Dispatcher package selection

For v0, keep selection deterministic and explicit:

- If exactly one registered graph has `kind: "dispatcher"`, use it.
- If none exist, return `E_MISSING_DISPATCHER`.
- If more than one exists, return `E_AMBIGUOUS_DISPATCHER` and list candidates. A later assignment can add `--dispatcher <id>` or priority metadata if needed.

This avoids hidden policy and keeps the first implementation predictable.

### Action schema

Use a strict Zod discriminated union. Proposed v0 shape:

```json
{
  "action": "start_run",
  "graphId": "support-triage",
  "runId": "triage-001",
  "input": {},
  "reason": "User asked to triage support tickets."
}
```

Actions:

- `start_run`: requires `graphId`, optional `runId`, optional `input`, optional `reason`. The graph must be registered as `workflow`. For this assignment, it can only start if that graph also exists in the compact `workflow.json` runtime; otherwise return a clear `E_GRAPH_NOT_EXECUTABLE_YET` error. This preserves current executable behavior while making the repository gap explicit.
- `resume_run`: requires `runId`, optional `reason`. Calls existing `resumeRun`.
- `switch_run`: same as `resume_run` for v0. It exists because dispatcher language naturally says "switch"; internally it can call `resumeRun`.
- `list_runs`: read-only, returns `listRuns` plus registered graph summaries.
- `ask_user`: requires `question` and optional `choices`; returns a structured `needs_user_input` result without mutating state.
- `call_graph`: recognized and validated but returns `E_CALLABLE_RUNTIME_NOT_IMPLEMENTED` until the callable runtime assignment.

### CLI behavior

Add low-level JSON CLI support:

```text
ripplegraph dispatch --request "<user request>" [--workflow-root <path>]
ripplegraph dispatch --action '<json>' [--workflow-root <path>]
```

The request form returns a read-only state:

```json
{
  "status": "needs_action",
  "dispatcher": { "id": "workspace-dispatcher", "kind": "dispatcher" },
  "request": "review and clean up this codebase",
  "orientation": "Choose one validated dispatcher action for this request.",
  "availableGraphs": [],
  "actionSchema": {},
  "nextAllowedCommand": "ripplegraph dispatch --action '{...}'"
}
```

The action form returns the result of applying the action:

```json
{
  "status": "ok",
  "action": "list_runs",
  "runs": [],
  "availableGraphs": []
}
```

Errors should use existing `jsonErrorPayload` and `RipplegraphError` codes.

### Why not one-step `dispatch --request`?

A one-step command would imply Ripplegraph itself can infer the right graph/action from natural language. That would either require an LLM dependency or hide host-agent judgment in the runtime. The two-step design is clearer: request form serves the contract; action form validates and applies the host agent's proposed action.

## Success Criteria

- A workspace with no registered dispatcher returns a clear missing-dispatcher response.
- A workspace with one registered dispatcher returns a read-only dispatch request state containing dispatcher identity, registry graph summaries, action schema, orientation, and next command.
- `dispatch --action` validates action shape and rejects unknown graph ids, wrong graph kinds, ambiguous/missing dispatcher state, and unsupported callable execution.
- `list_runs`, `ask_user`, `resume_run`/`switch_run`, and executable `start_run` paths work where current runtime support exists.
- Registered workflow packages that are not present in compact `workflow.json` fail with an explicit not-executable-yet error rather than silently starting the wrong thing.
- Existing `start`, `state`, `advance`, registry commands, demo CLI behavior, typecheck, tests, and built `dist/` output remain valid.

## Testing Approach

Use temporary workflow roots and package folders. Keep tests focused and avoid a large fake dispatcher engine.

Recommended coverage:

- Dispatcher selection: missing, single dispatcher, ambiguous dispatcher.
- `dispatch --request`: read-only state with action schema and catalog summaries.
- `dispatch --action list_runs`: read-only action result.
- `dispatch --action ask_user`: structured user-input result.
- `dispatch --action start_run`: succeeds for a registered workflow that also exists in compact `workflow.json`; fails clearly for a registered package that is not executable by the current runtime.
- CLI coverage for request and action forms, including built `dist`/bin if source CLI behavior changes.

## Open Questions

- Should `start_run` require caller-provided `runId`, or should v0 generate one when omitted? Recommendation: allow omitted `runId` and generate a deterministic-enough timestamp/id helper, but keep tests using explicit ids.
- Should dispatcher selection support `--dispatcher <id>` immediately? Recommendation: not in this assignment unless ambiguous dispatcher support blocks real testing.
- Should `dispatch --request` create a durable dispatcher run? Recommendation: no for v0. Keep request state read-only; durable dispatcher runs can be revisited if audit requirements demand it.
