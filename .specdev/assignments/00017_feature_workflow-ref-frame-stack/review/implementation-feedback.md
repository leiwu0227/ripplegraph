## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] CRITICAL: `getState` renders a workflow-ref node instead of entering it when a persisted checkpoint is already positioned on that ref node. The design requires state or advance to enter workflow refs before returning, and the runtime currently persists parent positions before calling `enterWorkflowRefs` (`src/coach.ts:353`, `src/coach.ts:617`). A crash/process exit in that window, or any checkpoint restored at a ref node, resumes through `getState` at `src/coach.ts:300`-`src/coach.ts:301` and exposes the ref node as a normal inline step. From there `stepRun` validates caller output against the ref node and follows parent edges without ever running the child (`src/coach.ts:322`-`src/coach.ts:360`). This breaks the durable recovery requirement for workflow-ref entry. Route state/resume recovery through the same workflow-ref entry path, or consolidate the post-transition persistence so a checkpoint cannot be left at an unentered ref.
2. [F1.2] CRITICAL: Nested workflow-ref execution loses the parent scope after an inner child exits to a non-terminal parent node. `exitChildWorkflow` correctly pops the inner frame and writes the parent ref output with `frame.parent.scope` (`src/coach.ts:582`-`src/coach.ts:589`), but when the parent target is non-terminal it calls `enterWorkflowRefs(rootPath, workflow, checkpoint, parentGraph)` (`src/coach.ts:617`-`src/coach.ts:618`). `enterWorkflowRefs` then initializes `active.scope` to `''` regardless of the remaining stack (`src/coach.ts:500`-`src/coach.ts:501`), even though `activeContextForCheckpoint` would return the remaining frame scope (`src/coach.ts:628`-`src/coach.ts:636`). The immediate returned state shows top-level previous outputs for a node that is still inside the outer child, and if that next node is another workflow-ref its new frame records `parent.scope: ''` instead of the outer scope. That causes later parent result writes/artifacts to land under top-level keys rather than the active child scope. Build `enterWorkflowRefs` from the checkpoint active context, or pass the restored active context through child-exit resumption.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
- (none)

### Addressed from changelog
- [F1.1] Verified fixed. `getState` and `resumeRun` now call `enterWorkflowRefs`, and the added recovery test covers a checkpoint restored directly on a parent workflow-ref node.
- [F1.2] Verified fixed. `enterWorkflowRefs` now derives active graph and scope from `activeContextForCheckpoint`, and the nested inner-child exit test covers preserving the remaining outer frame scope.

### Verification
- `npm test -- tests/coach.test.ts` passed: 24 tests.
- `npm test` passed: 9 files, 58 tests.
- `npm run build` passed.
