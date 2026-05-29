## Overview

Ripplegraph will add an optional node-level `operatorContext` field for passive operator-facing metadata. The immediate driver is Oceanlive's live-day operator UI, which needs a stable upstream contract for showing where the operator is in the execution flow and what business object or file/table is active. The contract should be generic enough for other downstream CLIs while avoiding Oceanlive-specific schema concepts.

The field belongs on graph nodes because the metadata is local to a specific workflow position and should be available exactly when state/explain responses describe that current node. Ripplegraph will carry the value without interpreting it.

## Goals

- Allow graph node definitions to include `operatorContext?: Record<string, unknown>`.
- Preserve the value through graph validation, parsing, registration, and runtime state construction.
- Include `operatorContext` in public node data returned by workflow state/explain-style responses.
- Support nested unknown JSON-like values so consumers can define their own display contracts.
- Add tests that prove the metadata round-trips and does not alter normal runtime behavior.

## Non-Goals

- Do not add Oceanlive-specific fields such as `table`, `csv`, `columns`, or `editSurface` to Ripplegraph schemas.
- Do not make `operatorContext` part of transition selection, gate evaluation, validators, effects, side-channel handling, or callable execution semantics.
- Do not introduce runtime mutation of `operatorContext`; it is graph-authored metadata, not run state.
- Do not create a new operator UI renderer in Ripplegraph.
- Do not broaden this into a general dynamic node context or variable store.

## Design

The node schema in `src/schema.ts` should accept an optional `operatorContext` field typed as a record with string keys and unknown values. The inferred `Node` type should then expose this field naturally to runtime response builders. Build output under `dist/` should be regenerated through the normal TypeScript build process rather than edited by hand.

Workflow state response construction should add `operatorContext: node.operatorContext` to the current `node` object where `purpose`, instructions, execution mode, schemas, gates, validators, and related node-local metadata are already returned. This keeps the metadata adjacent to the current node identity and avoids treating it as graph-level or run-level state.

Callable state responses may use the same node type and response shape. If the code has an equivalent current-node response for callable graphs, the implementation should either expose `operatorContext` consistently there as passive metadata or deliberately document why this assignment only covers workflow state. In either case, callable transition behavior must remain unchanged.

No runtime logic should read this field except response shaping. Existing helpers such as graph node lookup, edge selection, effect collection, gate decision handling, validator execution, and side-channel reconciliation should continue to operate from their existing fields.

## Success Criteria

- A graph containing a node with nested `operatorContext` validates successfully.
- Starting a run at that node and calling the public state API returns the same metadata at `state.node.operatorContext`.
- Ordinary stepping still uses existing edge/output logic and ignores `operatorContext`.
- Existing tests continue to pass.
- Generated package artifacts reflect the source change after the normal build.

## Testing Approach

Add a focused test that defines or registers a minimal graph with `operatorContext` containing nested values such as strings, arrays, booleans, numbers, and objects. Start a run, call the public state API, and assert deep equality against the original metadata.

The same test, or a companion test, should advance through a normal edge to prove the metadata is passive and does not affect transition behavior. If callable state responses expose the same field, include a callable coverage case or update an existing callable state test.

## Risks

The main risk is scope drift: a generic metadata carrier can become a place for runtime behavior if future code starts reading it. The implementation should keep reads limited to response construction and tests should describe the field as passive metadata.

Another risk is naming ambiguity. `operatorContext` intentionally signals human/operator-facing usage and avoids the stronger runtime implications of a name like `nodeContext`.
