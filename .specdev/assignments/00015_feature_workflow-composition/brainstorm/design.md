## Overview

Add per-node effect declarations to Ripplegraph so each node in a workflow can
document the effects it requires. At `startRun`, the runtime computes the
**union** of all nodes' effective effects (with the graph's `effects`
declaration as the default for nodes that don't override) and asserts that
union against the caller's `EffectPolicy`. If any node would need an effect
the policy does not grant, `startRun` fails with `E_EFFECT_NOT_ALLOWED`
before any state is written — fail-fast at start, no mid-run surprises.

This is the only structural change needed to back a `specdemo` workflow
elegantly. The rest of the SpecDev shape (phase nodes, gates, self-loops,
suspend/resume, filesystem artifacts) is already expressible on today's
runtime.

A second, smaller change: tighten the `exec` enum on `nodeSchema` from
`'inline' | 'spawn' | 'script'` to `'inline'` only. The two extra values are
declared but no code path honors them — they lie about runtime capability
and will confuse future readers.

### Why start-time union check (not per-transition enforcement)

An earlier iteration of this design proposed checking each node's effects on
transition into that node. The reviewer (Round 2 / F2.1) correctly pointed
out that this gives the *appearance* of phase-local scoping without the
substance: because `EffectPolicy` is set once at `startRun` and never
extended (no CLI surface accepts new grants on `advance`/`step`/`decide`), a
specdemo-shaped run would either over-grant `write_repo` at start (defeating
the per-phase narrative) or fail to enter the implementation phase after the
brainstorm gate.

Two ways to resolve the contradiction:

1. Add a policy-extension point so gates can grant new effects mid-run.
2. Narrow the claim: per-node effects are a **declaration** primitive checked
   at start as a union, not a **transition-time enforcement** primitive.

(1) is a meaningfully bigger change (new gate decision shape, new CLI surface,
new checkpoint state). (2) preserves the value that specdemo actually needs
(catch missing grants early, document each node's needs) without introducing
mid-run policy mutation.

This assignment takes path (2). Phase-local effect escalation is explicitly
out of scope and deferred to a future assignment if a real use case appears.

## Goals

1. **Per-node effects declaration.** `nodeSchema` gains an optional
   `effects?: string[]` field. If absent, the node inherits the graph's
   `effects` declaration. If present (including empty `[]`), the node's
   declaration overrides the graph's for that node only.
2. **Start-time union check.** At `startRun`, compute the union of
   `effectsForNode(graph, node)` over all nodes in the entry graph and
   assert the union against `opts.effectPolicy`. The existing graph-level
   check at `startRun` is **replaced** by this union check (which subsumes
   it — if no node overrides, the union equals the graph's `effects`).
3. **No transition-time effect checks.** `stepRun` and `decideGate` are
   unchanged with respect to effects. No checkpoint shape changes are
   required for effects.
4. **Tighten `exec` enum** to `z.literal('inline')` (or equivalent default).
   Remove `'spawn'` and `'script'`.
5. **Tests** covering: per-node allow/deny via union, inheritance from graph,
   `effects: []` override (node opts out of graph's required effects), schema
   rejection of `exec: 'spawn'` / `'script'`, full existing suite still
   green.

## Non-Goals

- **Per-transition effect enforcement.** Explicitly deferred (see "Why
  start-time union check" above).
- **Policy extension at gates / advance / step.** Out of scope.
- **Subgraph-as-node** primitive. Future assignment if generic composition
  is needed.
- **forEach / iteration primitive.** Self-edge with `when` predicate works
  today; documenting it as the official idiom is enough.
- **Implementing `exec: 'script'`** to run host processes. We are removing
  the declaration, not building the implementation.
- **Filesystem-precondition gates.** Agent's responsibility for now.
- **Phase-boundary hooks.** Agent's responsibility for now.
- **Multiple concurrent focused runs.** Matches `.specdev/.current`
  semantics by design.
- **Building specdemo itself.** This assignment delivers the primitive only.
  Specdemo is the validation case in a follow-up assignment.

## Design

### Schema change (`src/schema.ts`)

```ts
export const nodeSchema = z
  .object({
    purpose: z.string().min(1),
    instructions: z.string().min(1).optional(),
    exec: z.literal('inline').default('inline'),           // tightened
    outputSchema: jsonSchemaSchema.default({ type: 'object' }),
    gate: gateSchema.optional(),
    edges: z.array(edgeSchema).default([]),
    terminal: z.boolean().default(false),
    effects: z.array(idSchema).optional(),                 // NEW
  })
  .strict();
```

**No checkpoint schema change.** The policy is not persisted because
transition-time checks are no longer in scope.

### Runtime change (`src/coach.ts`)

A small helper, exposed for tests:

```ts
function effectsForNode(graph: Graph, node: Node): string[] {
  return node.effects ?? graph.effects;
}

function unionOfNodeEffects(graph: Graph): string[] {
  const set = new Set<string>();
  for (const node of Object.values(graph.nodes)) {
    for (const effect of effectsForNode(graph, node)) set.add(effect);
  }
  return [...set];
}
```

- **`startRun`** (`src/coach.ts:132`): replace the current
  `assertEffectsAllowed(graph.effects, opts.effectPolicy, ...)` call with
  `assertEffectsAllowed(unionOfNodeEffects(graph), opts.effectPolicy, ...)`.
  This is the only behavior change. The error code remains
  `E_EFFECT_NOT_ALLOWED`; the message lists the union of missing effects.
- **`stepRun`, `decideGate`, `suspendRun`, `resumeRun`**: unchanged.
- **`startCallableCall`** (`src/callable.ts`): callable graphs are
  constrained (no gates, restricted schemas) and not on the specdemo
  critical path. Continue using graph-level effects only. Per-node effects
  on callable nodes are explicitly out of scope.
- **`applyDispatchAction`** (`src/dispatcher.ts:190-191`): today the
  dispatcher pre-checks `assertEffectsAllowed(graph.effects,
  options.effectPolicy, ...)` against the **registry summary's**
  graph-level `effects` before delegating to `startRun`. With per-node
  effects, the registry summary doesn't reflect node-level overrides
  (e.g., a node opting out via `effects: []` would still be blocked by the
  pre-check). **Remove the dispatcher pre-check for `start_run` actions**
  and let `startRun` perform the authoritative union check. The pre-check
  for `call_graph` actions (`src/dispatcher.ts:206-207`) remains
  unchanged — callable graphs are out of scope for per-node effects in
  this assignment.

### Inheritance semantics

- `node.effects` **absent** (`undefined`): the node inherits `graph.effects`.
- `node.effects` **present** (including empty `[]`): the node's declaration
  is authoritative for that node, overriding the graph's. An empty `[]`
  means "this node requires no effects" — useful for read-only nodes in an
  otherwise write-capable graph.

Document this in the schema field's TSDoc comment and in tests.

### Effects on graph kinds other than `workflow`

- `callable`: out of scope (see above).
- `dispatcher`: graphs have one node by convention; the union equals
  whatever that node declares (or inherits). No special handling.

### Demo + tests

- `tests/effects.test.ts` gains cases for: per-node override, per-node
  inheritance, `effects: []` opt-out, union computation.
- A new compact workflow in `tests/helpers/workflows.ts` exercises per-node
  effects (one node has `effects: []` opt-out from a write-capable graph).
- The engineering-coach demo workflow stays at graph-level effects (no
  behavior change). Per-node effects are demonstrated only in tests for
  this assignment.

### Migration considerations

- **Workflows in the wild**: none exist. Ripplegraph is v0.0.1, pre-release.
- **In-flight checkpoints**: no checkpoint shape change. Existing runs
  continue working with no migration required.
- **Demo CLI**: `effectPolicy: { allowedEffects: ['read_repo'] }` continues
  to apply at `startRun` (`src/demo-cli.ts:234`). The change is purely in
  *which* set is checked at start (graph union → node union). For the
  current demo workflow (no per-node `effects` declarations), the union
  equals the graph's `effects`, so behavior is identical.

## Success Criteria

1. `pnpm test` passes (existing 45 + new tests).
2. `pnpm run build` succeeds with no type errors.
3. A workflow with two nodes — `graph.effects: ['read_repo']`, node A has
   no `effects` declaration (inherits `['read_repo']`), node B declares
   `effects: ['read_repo', 'write_repo']` — has union
   `['read_repo', 'write_repo']`. Concretely:
   - Started with policy `{ allowedEffects: ['read_repo', 'write_repo'] }`:
     `startRun` succeeds; node A advances; node B advances.
   - Started with policy `{ allowedEffects: ['read_repo'] }`: `startRun`
     fails with `E_EFFECT_NOT_ALLOWED` listing `write_repo`. No checkpoint
     is written; no run directory is created.
4. **Per-node opt-out**: a workflow with `graph.effects: ['write_repo']`
   and a single node `node.effects: []` — `startRun` with policy
   `{ allowedEffects: [] }` succeeds (the node opted out; union is empty).
5. A workflow with `exec: 'spawn'` declared in any node fails to load with
   `E_INVALID_WORKFLOW`.
6. A specdemo-shaped workflow (brainstorm/breakdown/implementation phase
   nodes, gates between phases, self-loop on implementation, per-phase
   `effects` declarations) is expressible in a single graph and validates
   against `workflowSchema`. The union of its node effects is the set the
   operator must grant at start; tests assert the expected union. (Building
   the specdemo itself is a follow-up assignment.)
7. **Dispatcher path parity**: a `start_run` dispatch action against a
   workflow that uses a per-node opt-out (`graph.effects: ['write_repo']`
   plus a single `node.effects: []`) succeeds with policy
   `{ allowedEffects: [] }` — same outcome as a direct `startRun`. Tests
   cover both start paths to lock in the parity.

## Decisions (resolved)

- **Enforcement point**: `startRun` only, via union check. No
  per-transition checks. (Resolves F2.1 by narrowing.)
- **Inheritance**: `effects: []` means "no effects required" (explicit
  override); `effects` absent means "inherit graph". Documented in schema.
- **Checkpoint shape**: no change. No policy persistence required.
- **Callable graphs**: out of scope for per-node effects.
- **`exec` enum**: tightened to `'inline'` only.
