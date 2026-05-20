## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The design says gated state responses must tell host agents and CLIs that a gate is pending and include the decision schema, but it does not define the actual `StateOk`/`responseContract` shape for that state. Today `StateOk` always exposes `node.outputSchema` and `responseContract: { command: 'step' }` (`src/coach.ts:49`, `src/internal/coach-responses.ts:14`, `src/internal/coach-responses.ts:30`), and the demo renderer always prints "Required output" plus a `ripplegraph-demo submit` command (`src/demo-cli.ts:52`, `src/demo-cli.ts:54`). Without an explicit contract such as `node.gate`, `node.gate.decisionSchema`, and `responseContract.command: 'decide'` for gated nodes, an implementation can satisfy the storage/API pieces while still instructing host agents to call the command that the runtime must reject. Please specify the gated state response shape and how demo/status rendering switches from output submission to decision submission.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- F1.1 is addressed. The design now defines the gated active-state contract with `node.gate`, `responseContract.command: "decide"`, and the gate `decisionSchema`, and it specifies that demo/status rendering must show "External decision required" with a `decide` command instead of the normal output/`submit` flow.
