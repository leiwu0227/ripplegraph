## Round 1

- [F1.1] Clarified that the current validator is only a starting point. The design now requires callable schema validation to document and enforce a v0 subset, add support for `const`, `oneOf`, array `items`, and `additionalProperties: false`, and reject unsupported callable schema keywords with `E_UNSUPPORTED_SCHEMA_KEYWORD`.
- [F1.2] Updated dispatcher integration to require `callId?: string` in both the strict Zod `callGraphActionSchema` and public JSON action schema, with tests for dispatcher `call_graph` using a caller-provided call id.

## Round 2

- [F2.1] Added explicit call-id safety requirements: validate user-supplied and generated call ids with the existing filesystem-safe id shape, mirror storage path-segment protection before writes, reject duplicate call ids with `E_CALL_EXISTS`, and test unsafe and duplicate call-id paths.

## Round 3

- [F3.1] Added explicit `CallableCompleted` contract with final validated `output` returned in the JSON response, plus runtime/CLI completion-output test coverage.
- [F3.2] Added explicit `input` to `CallableState` and `CallableCompleted`, and required `call-state` coverage for an active call created with input.
