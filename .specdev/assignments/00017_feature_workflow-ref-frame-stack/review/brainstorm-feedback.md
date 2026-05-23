## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The design does not specify how the runtime resolves the active graph from the top stack frame. Today `graphForCheckpoint` chooses only between the root workflow graph and the top-level `checkpoint.graphSource`, and `stepRun`/`decideGate` always build the next position with `checkpoint.rootGraph` (`src/coach.ts:301-313`, `src/coach.ts:445-461`). With the proposed schema, entering a child stores `child: GraphSource` in the frame and moves `checkpoint.position.graph` to the child id, but the design never says to route `graphForCheckpoint` through `checkpoint.stack.at(-1).child`, nor to route non-terminal child steps to the child graph id instead of `rootGraph`. A package-backed parent that enters a child would either keep resolving the parent package and fail to find the child node, or would write child transitions back under the parent graph id. Add an explicit active-frame graph resolution rule and update-position rule for stacked execution.
2. [F1.2] The design reuses node-id-only output and artifact keys for both parent and child frames, which will corrupt durable history when node ids overlap. Current runtime state stores outputs as `checkpoint.outputs[checkpoint.position.node]` and writes artifacts under `artifacts/<nodeId>/output.json` (`src/coach.ts:296-304`, `src/storage.ts:79-82`, `src/storage.ts:211-214`), and state recovery renders previous outputs from those node ids (`src/internal/coach-responses.ts:66-70`). Workflow packages commonly use generic ids such as `review`, `work`, or `done`; a child `review` output would overwrite a parent `review` output in the same run. The design should require frame/graph-qualified keys or per-frame artifact namespaces before implementation.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
- (none)

### Addressed from changelog
- Addressed [F1.1]. The design now requires an active-context helper that resolves
  the active graph/source/scope from the top stack frame, uses the child graph id
  for child position writes, and restores the parent graph/source/scope from the
  popped frame.
- Addressed [F1.2]. The design now requires scoped output keys and matching
  artifact namespaces for nested frames while preserving existing top-level keys.
