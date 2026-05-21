## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] CRITICAL: `entryGraph` is treated as a dispatcher without validating that the referenced graph is actually `kind: "dispatcher"`. `workflowSchema` only checks existence (`src/schema.ts:104`), and `getState` then exposes any `entryGraph` as `dispatcher: available` with a `ripplegraph dispatch` next command (`src/coach.ts:164`). That breaks the new graph-kind contract and can make a metadata-rich package advertise dispatcher behavior for a normal workflow or callable graph. Tighten the schema so `entryGraph` must reference a dispatcher graph, and add a focused test for the rejection path.
2. [F1.2] MINOR: Gate decisions are not included in the canonical recent-context feed after leaving a gated node. `decideGate` writes an artifact and records `checkpoint.gateDecisions`, but it does not add the decision to `checkpoint.outputs` (`src/coach.ts:281`), while `previousNodes` only reads `checkpoint.outputs` (`src/internal/coach-responses.ts:66`). In a gate-heavy workflow, the next state omits the external approval/rejection that selected the route, which weakens the drift-recovery contract added by this assignment. Either include gate decisions in the recent-context source or make `previousNodes` merge `outputs` and `gateDecisions` in execution order.

### Addressed from changelog
- (none -- first round)
