## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The design promises typed callable inputs and outputs, but it directs implementation to reuse the current `src/internal/output-validation.ts` validator without accounting for its deliberately small JSON Schema subset. The manifest schema accepts arbitrary JSON-schema-shaped keywords via `.passthrough()` (`src/schema.ts` lines 15-23), while `validateOutput` only enforces `type`, `enum`, `required`, and nested `properties` (`src/internal/output-validation.ts` lines 14-34). That means common schemas using `additionalProperties: false`, `items`, `const`, `oneOf`, numeric/string bounds, etc. would be accepted in package manifests but silently ignored at callable start/step/completion. Because callable graphs are meant to be typed task calls and the dispatcher action schema itself uses ignored keywords like `oneOf`, `const`, `items`, and `additionalProperties`, the design needs to either explicitly define the supported schema subset and reject unsupported validation keywords for callable contracts, or expand/replace the validator before relying on it for callable input/output guarantees.
2. [F1.2] The dispatcher API design includes `callId` in the `call_graph` example and recommends optional user-supplied call IDs, but it does not explicitly update the current strict dispatcher schemas to allow `callId`. Today `callGraphActionSchema` only accepts `action`, `graphId`, `input`, and `reason` (`src/dispatcher.ts` lines 78-85), and the JSON action schema mirrors the same fields (`src/dispatcher.ts` lines 135-145). If implementation follows the design text literally, `ripplegraph dispatch --action '{"action":"call_graph","graphId":"summarize-ticket","callId":"call-001"}'` will still fail validation before reaching `startCallableCall`. The design should specify `callId?: string` in both dispatcher schemas and include dispatcher call-id coverage in the success criteria/tests, or remove callId from the dispatcher-facing API and keep it only on the low-level `call` command.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** needs-changes

### Findings
1. [F2.1] The design makes `callId` user-supplied through both the runtime API and dispatcher/CLI surface, then stores state under `.ripplegraph/calls/<call-id>/`, but it never requires validating `callId` as a filesystem-safe id or rejecting duplicate call ids before creating a checkpoint. Existing run state has two protections that the callable design should mirror: ids are constrained by `idSchema` in checkpoint/current schemas (`src/schema.ts`), and filesystem path segments are rejected by `assertPathSegment` before writing under `.ripplegraph/runs` (`src/storage.ts`). Without the same requirement for calls, an implementation can accidentally allow path traversal or overwrite an existing call's checkpoint/log/artifacts, especially because `startCallableCall` accepts caller-provided ids and the success criteria only mention graph-kind/input validation. Add explicit `callId` validation/collision behavior and tests for unsafe and already-existing call ids.

### Addressed from changelog
- [F1.1] Addressed. The design now requires a documented callable schema subset, adds support for `const`, `oneOf`, array `items`, and `additionalProperties: false`, and rejects unsupported callable schema keywords with `E_UNSUPPORTED_SCHEMA_KEYWORD`.
- [F1.2] Addressed. The dispatcher integration section now explicitly requires `callId?: string` in both dispatcher schemas and adds dispatcher call-id test coverage.

## Round 3

**Verdict:** needs-changes

### Findings
1. [F3.1] The design says a callable behaves like a typed function and that the runtime returns validated output, but it never defines the `CallableCompleted` response shape or requires the final output to be returned to the caller. The existing workflow completion path only returns status/run/position and clears focus (`src/coach.ts` lines 369-379), so an implementation that follows the established response pattern could validate the final node output and persist an artifact but still leave `ripplegraph call-step` without the function result. Add an explicit completed-call contract containing the final validated output, and add CLI/runtime tests that assert successful completion returns that output.
2. [F3.2] The agent-facing callable state is specified to include the current node contract and previous callable outputs, but it omits the original call input even though `startCallableCall` accepts typed `input` and the checkpoint stores it. Since the host agent executes callable nodes, `call-state` must expose the input after a resume or a separate process will not have the data needed to perform the current node. Add `input` to `CallableState`/`CallableCompleted` or otherwise define how the host recovers it, and cover `call-state` for an active call created with input.

### Addressed from changelog
- [F2.1] Addressed. The design now requires filesystem-safe validation for supplied and generated call ids, storage path-segment protection, duplicate rejection with `E_CALL_EXISTS`, and unsafe/duplicate call-id tests.
