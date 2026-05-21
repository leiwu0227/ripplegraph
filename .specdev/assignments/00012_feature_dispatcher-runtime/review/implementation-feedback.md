## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] [CRITICAL] `start_run` only verifies that the requested id exists in compact `workflow.json`; it does not verify that the executable compact graph is also `kind: "workflow"` before calling `startRun`. This leaves a registry/runtime mismatch path where a registered package marked `workflow` can share an id with a compact dispatcher/callable graph, and dispatch will mutate state by starting the wrong graph kind. The design requires dispatcher actions to validate graph ids and graph kinds before mutating state, and `start_run` is supposed to start only workflow graphs. Tighten `compactWorkflowHasGraph` or replace it with a helper that loads the compact graph and rejects non-workflow kinds before line 191 in `src/dispatcher.ts`.

### Addressed from changelog
- (none -- first round)
