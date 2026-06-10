## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] CRITICAL: Root `outputSchema` rejection is checked after the runtime has already persisted the transition into the terminal node. In `stepRunWith`, a normal node output is written, `checkpoint.position` is moved to the terminal node, and a successful `step` transition is appended before `completeRun` validates the graph-level output (`src/coach.ts:408`, `src/coach.ts:416`, `src/coach.ts:418`, `src/coach.ts:428`). The gate path has the same ordering for `decide` (`src/coach.ts:467`, `src/coach.ts:476`, `src/coach.ts:478`, `src/coach.ts:489`), and child-exit-to-root-terminal does it after popping the child frame and appending the parent transition (`src/coach.ts:724`, `src/coach.ts:731`, `src/coach.ts:733`, `src/coach.ts:751`). If `completeRun` then rejects the root output, it appends a validation failure at `to -> to` and returns `position: to` while leaving the durable checkpoint active at the previous position (`src/coach.ts:807`, `src/coach.ts:810`, `src/coach.ts:817`). That means a rejected completion leaves misleading durable history/artifacts from a terminal transition that did not commit, and the immediate response position can disagree with the active run state. Validate the graph-level completion output before committing the terminal transition/artifact, or otherwise make the rollback/persisted state explicit and consistent.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- [F1.1] Verified. Root-output validation now runs before the terminal transition/artifact is persisted on the normal step, gate decision, and child-exit-to-root-terminal paths. The rejection response position remains at the durable active position, and focused tests assert no successful terminal transition is logged after rejection.

### Verification
- `npm run typecheck -- --noEmit`
- `node ./node_modules/vitest/vitest.mjs run tests/schema.test.ts tests/coach.test.ts`
- `npm test`

## Round 3

**Verdict:** needs-changes

### Findings
1. [F3.1] CRITICAL: The child-workflow root-completion path still performs root `outputSchema` validation after durable child-step side effects have been emitted. When a child workflow steps into its terminal node, `stepRunWith` writes the child node artifact, mutates `checkpoint.position` to the child terminal, and appends a successful child `step` transition before calling `exitChildWorkflow` (`src/coach.ts:417`, `src/coach.ts:421`, `src/coach.ts:423`, `src/coach.ts:430`). If the parent edge then lands on the root terminal and the root graph `outputSchema` rejects the child result, `exitChildWorkflow` returns from `rootCompletionValidationError` before writing the checkpoint (`src/coach.ts:742`, `src/coach.ts:744`, `src/coach.ts:745`, `src/coach.ts:771`). That leaves the durable checkpoint active at the pre-step child node while the response reports the in-memory child-terminal position (`src/coach.ts:837`, `src/coach.ts:840`) and the transition log already contains a successful terminal child step for a rejected root completion. This is the same consistency problem Round 1 targeted, just one level earlier in the child-exit-to-root-terminal path. Validate the root completion result before writing the child terminal artifact/transition, or persist/return a consistent active state intentionally.

### Addressed from changelog
- [F1.1] Partially verified. The direct root step, gate decision, and parent terminal transition ordering were fixed, but the child-exit-to-root-terminal path still has pre-validation durable side effects before the root completion rejection.

### Verification
- `npm run typecheck -- --noEmit`
- `node ./node_modules/vitest/vitest.mjs run tests/schema.test.ts tests/coach.test.ts`
