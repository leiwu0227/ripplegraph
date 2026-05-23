## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The checkpoint migration story contradicts the proposed inheritance semantics. The design says `effectsForNode` returns `node.effects ?? graph.effects`, and `stepRun` / `decideGate` should check that against `checkpoint.effectPolicy`, defaulting a missing policy to `{ allowedEffects: [] }`. Existing checkpoints written by the current runtime have no policy field (`src/schema.ts:143-158`, `src/coach.ts:132-162`), so any in-flight run whose graph already declares graph-level effects would fail its next transition after upgrade, even if no node declares explicit effects. That conflicts with the migration section's claim that "per-node effects only activate when nodes declare them" and that legacy checkpoints "just deny everything if any node declares effects." Decide and document the compatibility rule before breakdown, for example by enforcing inherited graph effects only when a checkpoint has a stored policy, by adding a checkpoint migration/default strategy, or by explicitly accepting this breaking behavior and updating the migration notes/tests.
2. [F1.2] The transition enforcement point needs to be earlier than the current write path. In today's `stepRun`, the node output artifact is written before `selectEdge` resolves the next node (`src/coach.ts:222-229`); `decideGate` follows the same pattern for gate decisions (`src/coach.ts:282-289`). The design says to assert the next node's effects after resolving `nextNodeId` and before writing the transition, but that still permits a denied transition to leave artifacts on disk if implemented around the existing code shape. The design should require checking the target node's effects before `writeNodeOutput`, checkpoint mutation, and transition append, and the tests should assert denied transitions do not create artifacts or move state.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** needs-changes

### Findings
1. [F2.1] The effect policy remains a one-time run-start grant, so the design still does not support the phase-local effect escalation that motivates the assignment. `startRun` is the only workflow API that accepts an `effectPolicy` (`src/coach.ts:132-159`), and the CLI does not pass effect grants through `advance`, `step`, or `decide` (`src/cli.ts:91-127`). The design persists that single start policy and says the demo needs no CLI change (`brainstorm/design.md:95-99`, `brainstorm/design.md:166-168`), while success criteria require a later `write_repo` node to fail unless `write_repo` was granted at start (`brainstorm/design.md:174-179`). That means a specdemo-shaped run either has to over-grant implementation effects during brainstorm, defeating the claimed per-phase surface, or it cannot progress into implementation after the gate. Resolve this before breakdown by either adding an explicit policy-extension point for gate/advance transitions, or by narrowing the design claims to "node-level declarations checked against a run-wide allow-list" and updating the specdemo validation/success criteria accordingly.

### Addressed from changelog
- F1.1 addressed: the design now has an explicit legacy missing-policy rule and migration behavior.
- F1.2 addressed: the design now requires edge resolution and effect checks before artifact writes, checkpoint mutation, and successful transition logging.

## Round 3

**Verdict:** needs-changes

### Findings
1. [F3.1] `applyDispatchAction` still performs a registered graph-level effect check before delegating to `startRun`, so dispatcher starts can reject workflows that the proposed node-union rule says should be allowed. The design says `effects: []` on a node overrides `graph.effects` and Success Criterion 4 requires `graph.effects: ['write_repo']` with a single `node.effects: []` to start with no allowed effects. That works for a direct `startRun` after replacing the check in `src/coach.ts:135`, but a dispatcher `start_run` action first calls `assertEffectsAllowed(graph.effects, options.effectPolicy, ...)` on the registry summary in `src/dispatcher.ts:190-191`. With the same graph registered, that pre-check fails on `write_repo` before `startRun` can compute the empty node union. Update the design to remove or replace this dispatcher pre-check for workflow starts, and add a dispatcher-path test for the opt-out case so the documented inheritance semantics hold through both supported start paths.

### Addressed from changelog
- F2.1 addressed: the design now consistently narrows per-node effects to a start-time union/declaration primitive, removes transition-time checks and checkpoint policy changes, and updates success criteria to require all needed effects at run start.
