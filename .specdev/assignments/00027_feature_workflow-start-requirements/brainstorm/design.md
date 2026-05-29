## Overview

Add a generic start-time requirement contract for graph packages. A workflow graph can declare opaque predicates that must be true before a run may be created. The host product evaluates those predicates using domain knowledge, then passes the boolean results to Ripplegraph. Ripplegraph compares the supplied state against the graph declaration and blocks the start if any requirement is false or missing.

This is a graph/start contract, not dispatcher-owned routing. The motivating Oceanlive case is `live-day` and `mockcopy` requiring `vessel_present`, with `create-vessel` as the product-level redirect. Ripplegraph should not inspect `workspace.toml`, `storage/vessel/`, or any other domain files; it should only validate declarations, surface metadata, and enforce against host-supplied booleans.

## Goals

- Add manifest-level `requires` metadata with stable validation and a default of `[]`.
- Preserve `requires` through graph registration and expose it in dispatcher graph summaries.
- Add `preconditionState?: Record<string, boolean>` to the generic workflow start path.
- Make `applyDispatchAction({ action: "start_run" })` accept and forward `preconditionState`.
- Make the direct CLI `ripplegraph start` command accept and forward predicate state.
- Enforce requirements in `startRun()` before any run/checkpoint/current state is written.
- Fail closed: missing predicate keys are treated as unmet.
- Report unmet requirements through a structured `RipplegraphError` so hosts can render redirect guidance without parsing strings.

## Non-Goals

- Ripplegraph will not evaluate product/domain predicates such as `vessel_present`.
- The dispatcher will not own ordering rules or classify prerequisites.
- `resume_run` and `switch_run` will not re-check start requirements; they operate on an existing run.
- `call_graph` / callable starts are out of scope for this first feature unless explicitly pulled in later.
- This assignment will not implement Oceanlive's host predicate registry or update Oceanlive graph manifests.
- This assignment will not solve transitive redirect chains, redirect cycles, or automatic redirect execution.

## Design

Add a manifest field:

```json
"requires": [
  {
    "id": "vessel_present",
    "describe": "a created vessel",
    "unmetRedirect": "create-vessel",
    "unmetMessage": "No vessel exists yet. Create one first."
  }
]
```

`id` and `unmetRedirect` should use the existing `idSchema`; `describe` and `unmetMessage` are human-facing non-empty strings. The field defaults to an empty array and is available on workflow package manifests, registry entries, and `RegisteredGraphSummary`.

`startRun()` receives `preconditionState?: Record<string, boolean>`. Before effect-policy checks and before writing run state, it resolves the graph metadata and checks every declared requirement. If any requirement is not exactly `true`, it throws `RipplegraphError("E_START_REQUIREMENTS_UNMET", message, details)` where `details` includes the target `graphId` and an `unmet` array with `id`, `describe`, `redirectTo`, and `message`.

`RipplegraphError` needs an optional structured details payload. Existing two-argument construction remains valid. Requirement failures should mirror effect-policy behavior: `startRun()` throws and `applyDispatchAction()` lets the error propagate unchanged. This avoids separate throw-vs-return contracts for direct starts and dispatcher starts.

Dispatcher action validation must be updated in both places: the Zod `startRunActionSchema` and the hand-written agent-facing `dispatchActionSchema`, both of which are currently closed. The dispatcher start branch explicitly forwards `preconditionState` to `startRun()`.

The documented direct CLI start path also needs a way to satisfy requirements. Add a `--precondition-state <json>` flag to `ripplegraph start`, parse it as a JSON object, and forward it to `startRun()`. Update help text and CLI tests alongside the API tests. This keeps the direct debug/management path usable without weakening fail-closed behavior.

CLI error serialization must preserve structured requirement details. `jsonErrorPayload()` should include a `details` field when a `RipplegraphError` carries one, while preserving the existing `{ status, code, message }` shape for errors without details. This matters for both `ripplegraph start --precondition-state ...` and `ripplegraph dispatch --action ...`, because both command paths catch thrown errors at the CLI boundary.

Redirect integrity should be conservative. The schema validates redirect IDs syntactically. At enforcement time, if a redirect is present, Ripplegraph may verify that the target graph is registered as a workflow when the registry is already available. Chaining, self-redirects, and cycles remain host concerns.

## Success Criteria

- A graph manifest with valid `requires` parses successfully and defaults to `[]` when absent.
- Invalid requirement declarations fail validation with useful paths.
- Registration preserves `requires` in `.ripplegraph/registry.json`.
- `getDispatchRequest().availableGraphs` includes `requires`.
- `startRun()` with all declared predicates true behaves exactly as today.
- `startRun()` with a false or missing declared predicate throws `E_START_REQUIREMENTS_UNMET`.
- An unmet requirement creates no run, checkpoint, transition log, artifact, or current focus.
- Dispatcher `start_run` accepts `preconditionState`, forwards it, and propagates the same structured error.
- Direct CLI `ripplegraph start --precondition-state <json>` forwards predicate state to `startRun()`.
- CLI JSON errors preserve `RipplegraphError.details` for unmet requirement failures.
- Existing effect-policy behavior remains unchanged.

## Testing Approach

Add focused unit tests around schema parsing, package registration, dispatch summaries, direct `startRun()`, dispatcher `start_run`, CLI `start --precondition-state`, and CLI error serialization. Include negative tests for missing predicate state and explicit `false`. Confirm that the no-run-created invariant holds by checking `getState()`/run listings after an unmet start. Add a small test for `RipplegraphError.details` compatibility so existing two-argument error construction remains unaffected, and CLI tests asserting unmet requirement errors expose `details.unmet`.

## Risks

- Returning a union instead of throwing would create two contracts for one start-time policy concern. The design avoids this by matching effect-policy precedent.
- Adding a strict field to registry schema requires updating all fixtures/templates that include registry JSON.
- Validating redirect existence too early can be brittle because registration order varies. The design validates redirect shape at schema time and treats existence validation as an enforcement-time check if it is cheap and non-disruptive.
