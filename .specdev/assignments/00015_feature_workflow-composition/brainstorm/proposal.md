# Proposal: Per-node effect policies (Ripplegraph as specdemo backbone)

## Why

We want Ripplegraph to be an elegant backbone for a `specdemo` workflow (and
eventually a SpecDev CLI rewrite). A full code scan against
`.specdev/workflow.yaml` shows that most of the "composition gaps" we floated
earlier (iteration primitive, subgraph-as-node, cross-graph composition,
multiple focused runs, callable-as-node) are **not actually blockers** for the
SpecDev shape:

- Multi-phase progression with mandatory gates: already works via
  `external_decision` gates + `selectEdge` (`src/coach.ts:257-307`).
- Per-task self-loop in implement phase: already works via self-edge with a
  `when` predicate on the agent's reported output (`runtime-graph.ts:16`).
- Multiple suspended assignments / single focused run: matches `.specdev/.current`
  semantics by design.
- Filesystem-as-source-of-truth for artifacts / progress.json: matches Ripplegraph's
  existing storage model.

The **only structural mismatch** is that effects are declared per-graph and
checked once at `startRun` / `startCallableCall` / `applyDispatchAction`. A
SpecDev workflow naturally wants different effect surfaces in different phases
(e.g., brainstorm: `read_repo`; implementation: `read_repo, write_repo`), which
isn't expressible today without splitting phases into separate graphs and losing
the single-run gate model.

## What

Add an optional `effects?: string[]` field to `nodeSchema` so each node can
document the effects it requires. At `startRun`, the runtime computes the
**union** of all nodes' effective effects (graph's `effects` is the default
for nodes that don't override) and asserts that union against the caller's
policy. If any reachable node would need an ungranted effect, `startRun`
fails before any state is written.

The check happens **at start only**, not on every transition. An earlier
iteration of this design proposed transition-time enforcement, but reviewer
feedback (Round 2 / F2.1) showed that path was internally contradictory:
since `EffectPolicy` is set once at start and never extended on
`advance`/`step`/`decide`, transition-time enforcement gives the appearance
of phase-local scoping without the substance (you'd over-grant at start to
let the run reach later phases). Mid-run policy mutation is out of scope.

Bundled cleanup: the `exec` enum (`schema.ts:52`) declares `'spawn' | 'script'`
modes that **no code path honors**. They're dead values that lie about runtime
capability. Tighten the enum to `'inline'` only, so the schema stops promising
features that aren't implemented.

## Why not a bigger change

The earlier brainstorm considered subgraph-as-node, forEach, script exec, hooks,
and precondition gates. The scan showed:

- **Subgraph-as-node**: would require a checkpoint stack and new transition log
  entries. Not needed for specdemo (phases are nodes in one graph). Defer.
- **forEach**: not needed — self-edge with `when` already handles task loops.
- **Script exec / precondition gates / hooks**: only needed if the *runtime*
  takes responsibility for filesystem checks and process execution that the
  *agent* currently does. SpecDev today runs `specdev checkpoint <phase>` from
  the host; specdemo can keep that pattern (agent submits `{ artifactsReady:
  true }`; runtime trusts and validates against schema).

These items are documented as deferred — they belong in a future assignment
driven by the full SpecDev CLI rewrite, not by specdemo.

## Out of scope

- Subgraph-as-node primitive
- `exec: 'spawn' | 'script'` implementation (we are removing them, not building them)
- Filesystem-precondition gates
- Phase-boundary hooks
- Multiple concurrent focused runs
- Iteration primitives beyond self-edges

## Risks

- Removing `'spawn' | 'script'` from the exec enum is a strict-validation
  tightening. Any workflow.json declaring those values would fail to load. The
  demo workflow uses only `'inline'`, and no external consumers exist yet
  (Ripplegraph is at v0.0.1, pre-release), so the blast radius is the demo +
  tests in this repo. Acceptable.
- Per-node effects deliberately do **not** enforce per-phase scoping at
  transition time. This is documented in the design and may surprise
  readers who expect node-level declarations to act as runtime gates. The
  proposal calls this out explicitly so the expectation is set: this is a
  declaration + start-time fail-fast primitive, not a sandboxing mechanism.
