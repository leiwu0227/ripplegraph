## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] CRITICAL: Active calls are not bound to the package version/path captured at call start. `startCallableCall` persists `packagePath` and `graphVersion` in the checkpoint, but `getCallableCall` and `stepCallableCall` ignore those fields and reload the callable through the current registry entry by `graphId` ([src/callable.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/callable.ts:113), [src/callable.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/callable.ts:140), [src/callable.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/callable.ts:151)). Because registry entries can be replaced with `registerGraphPackage(..., force: true)` ([src/registry.ts](/mnt/h/ripplepulse/lib/ripplegraph/src/registry.ts:97)), an in-flight callable can resume against a different package path/version/node schema than the one it started with. That breaks the function-like call contract and can validate/route/complete existing calls with the wrong manifest. Load active calls from the checkpoint's stored `packagePath` (and verify id/kind/version match the checkpoint) instead of rebinding through the mutable registry; keep registry resolution for starting new calls.

### Addressed from changelog
- (none -- first round)
