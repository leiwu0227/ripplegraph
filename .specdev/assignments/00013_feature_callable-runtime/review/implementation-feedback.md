## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] CRITICAL: Active calls are not bound to the package version/path captured at call start. `startCallableCall` persists `packagePath` and `graphVersion` in the checkpoint, but `getCallableCall` and `stepCallableCall` ignore those fields and reload the callable through the current registry entry by `graphId` ([src/callable.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/callable.ts:113), [src/callable.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/callable.ts:140), [src/callable.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/callable.ts:151)). Because registry entries can be replaced with `registerGraphPackage(..., force: true)` ([src/registry.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/registry.ts:97)), an in-flight callable can resume against a different package path/version/node schema than the one it started with. That breaks the function-like call contract and can validate/route/complete existing calls with the wrong manifest. Load active calls from the checkpoint's stored `packagePath` (and verify id/kind/version match the checkpoint) instead of rebinding through the mutable registry; keep registry resolution for starting new calls.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** needs-changes

### Findings
1. [F2.1] CRITICAL: Callable schema subset enforcement still allows supported keywords with unsupported shapes, so contracts can be accepted and then silently ignored. `jsonSchemaSchema` only types the original keywords and uses `.passthrough()` for the new callable keywords ([src/schema.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/schema.ts:15)), while `assertSupportedCallableSchema` only rejects unknown keyword names and `additionalProperties` values ([src/internal/output-validation.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/internal/output-validation.ts:25)). If a callable declares malformed-but-recognized contracts such as `oneOf: { ... }`, tuple-style `items: [{ ... }]`, non-schema entries inside `oneOf`, or a non-array `enum`, the preflight accepts the schema, and `validateOutput` then ignores or under-validates the contract because it only acts on arrays/object schemas in selected branches ([src/internal/output-validation.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/internal/output-validation.ts:63), [src/internal/output-validation.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/internal/output-validation.ts:70)). This violates the design requirement that callable schemas either use the supported validation subset or fail clearly before unsupported keywords are ignored. Consolidate the schema-subset check so each supported keyword also has an allowed value shape, and reject unsupported forms with `E_UNSUPPORTED_SCHEMA_KEYWORD` before starting or stepping calls.

### Addressed from changelog
- [F1.1] Addressed. Active `getCallableCall` and `stepCallableCall` now load from the checkpointed `packagePath` and verify manifest id/kind/version before exposing or stepping the call; regression coverage confirms registry replacement does not rebind an in-flight call.

## Round 3

**Verdict:** approved

### Findings
- (none)

### Addressed from changelog
- [F2.1] Addressed. `assertSupportedCallableSchema` now validates supported keyword value shapes for `type`, `required`, `properties`, `enum`, `items`, `oneOf`, and `additionalProperties`, and the added regression coverage exercises malformed supported keywords before callable runtime use.

### Verification
- `npm test -- tests/output-validation.test.ts tests/callable.test.ts tests/dispatcher.test.ts tests/cli.test.ts`
- `npm run typecheck`
- `npm test`
