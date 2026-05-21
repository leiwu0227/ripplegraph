## Round 1

- [F1.1] Fixed active callable calls rebinding through the mutable registry by loading `getCallableCall` and `stepCallableCall` from the checkpointed `packagePath` instead. The runtime now verifies the loaded manifest id, kind, and version against the checkpoint before exposing or stepping active call state.
- Added regression coverage that force-registers a replacement package after a call starts, then confirms `call-state` and `call-step` continue against the original package contract.

## Round 2

- [F2.1] Tightened callable schema preflight so supported keywords must also use supported value shapes. `assertSupportedCallableSchema` now rejects malformed `type`, `required`, `properties`, `enum`, `items`, `oneOf`, and `additionalProperties` values with `E_UNSUPPORTED_SCHEMA_KEYWORD` before callable runtime use.
- Added regression coverage for malformed supported keywords such as object-valued `oneOf`, tuple-style `items`, non-schema `oneOf` entries, and non-array `enum`.
