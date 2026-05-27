# What Ripplegraph Needs For Graph/Business-Logic Repos

Date: 2026-05-24

Question: if new repos sit on top of Ripplegraph and own graph packages,
business prompts, validators, scripts, templates, and host adapters, what does
Ripplegraph itself still need?

## Architecture Assumption

The right split is:

- `ripplegraph`: small kernel only.
- Graph/business repos: domain graph packages, prompts, guides, validators,
  scripts, assets, templates, and host adapters.
- Existing runtimes: stay authoritative for business logic and external state.

Ripplegraph should not absorb Oceanshed signal logic, Oceanlive trading logic,
SpecDev reviewloop behavior, Python scripts, backend calls, or domain artifact
validation. It should make those host-owned pieces safe and deterministic to
orchestrate.

## What Ripplegraph Already Has

Current capabilities that are enough for a first pilot:

- Durable workflow runs with checkpoint, focused run, transition log, outputs,
  and gate decisions.
- Registered graph packages that execute from package folders and pin package
  path/version for in-flight runs.
- `workflowRef` nested workflows with durable stack frames and scoped child
  artifacts.
- External decision gates with `decisionSchema`.
- `decisionSource` metadata for human/tool-sourced decisions.
- Dispatcher routing for start/resume/list/ask/call actions.
- Callable graphs for isolated typed helper work.
- Declared effects and start/call allow-list checks.

Older gaps that are now stale:

- Registered workflow packages are executable.
- Subgraph composition exists via `workflowRef`.
- Gate source metadata exists via `decisionSource`.

## P0 Kernel Needs

### 1. First-class interaction metadata

The graph needs to carry interaction contracts, not just prose in
`instructions` or a bare `decisionSchema`.

Minimum shape:

```ts
interaction?: {
  id: string
  kind: 'choice' | 'free_text' | 'confirm' | 'form'
  prompt: string
  renderVia: string
  choices?: Array<{
    label: string
    value: string
    description?: string
  }>
  followUp?: {
    when: string
    id: string
    kind: string
    source?: string
  }
}
```

Why:

- Oceanshed has `interaction` JSON blocks with stable IDs, labels, values,
  `render_via`, and follow-up questions.
- Oceanlive menus require exact numbered choices.
- SpecDev has manifest-driven checkpoint/reviewer choices with exact
  labels/order and reviewer-source expansion.

The host still renders the UI. Ripplegraph should serve and validate the
interaction contract.

### 2. Strong user-turn interrupt semantics

Add an explicit way for a node/gate to say:

> render this prompt/menu, then stop; no further host tool calls until the next
> user response.

Possible field:

```ts
interrupt: {
  requiresUserTurn: true
  reason?: string
}
```

Why:

- Oceanlive requires hard stops after every menu or prompt.
- Oceanshed promotion and staging gates require explicit approval before writes.
- SpecDev continuation blocks distinguish interrupting vs non-interrupting
  next actions.

This is stronger than "this node is gated." It constrains host behavior around
turn boundaries.

### 3. Side-channel action model

Ripplegraph needs an audited action type that does not advance graph position.

Possible shape:

```ts
sideChannelActions?: Array<{
  id: string
  purpose: string
  commandRef?: string
  effects?: string[]
  outputSchema?: JsonSchema
}>
```

Why:

- Oceanlive scaling/fill table loads update backend in-memory state but do not
  move the LiveCopy FSM.
- Oceanshed dry-runs and reports produce evidence without approving or
  advancing promotion.
- SpecDev review/check commands can produce evidence before an approval gate.

These should be logged and validated without pretending the main graph moved.

## P1 Kernel Needs

### 4. `workflowRef` input/output mapping

Current `workflowRef` only names a child graph ID. Add explicit data binding:

```ts
workflowRef: {
  graphId: string
  inputMap?: Record<string, string>
  outputMap?: Record<string, string>
}
```

Why:

- Reusable phase graphs need parameters.
- Parent workflows need a stable way to consume child output.
- Graph packages become portable when their inputs/outputs are explicit.

Without this, host adapters must rely on conventions or repeat graph variants.

### 5. Command/tool contract metadata

Graph nodes should be able to declare the host command/tool they expect without
Ripplegraph executing it.

Possible shape:

```ts
toolContract?: {
  id: string
  command?: string
  expectedArtifacts?: string[]
  validator?: string
  effects?: string[]
}
```

Why:

- Oceanshed graph nodes need to point at commands such as
  `oceanshed sweep evaluate`, `oceanshed stage candidate`, and
  `oceanshed agent verify`.
- Oceanlive nodes need to point at `session.js` driver subcommands, not raw
  backend commands.
- SpecDev nodes need to point at checkpoint/reviewloop/artifact validators.

The host executes commands and returns structured output. Ripplegraph validates
and records the returned output.

### 6. Host validator interface

Do not add generic filesystem parsing to Ripplegraph core. Instead, define a
contract for host validators named by graph packages.

Possible host-side protocol:

```ts
validate({
  validator: string
  runId: string
  nodeId: string
  input: unknown
}) -> {
  ok: boolean
  output?: unknown
  issues?: Array<{ code: string; message: string; path?: string }>
}
```

Why:

- Oceanshed validates TOML, JSON, generated artifacts, hashes, drift, and
  signal packages.
- Oceanlive validates CSV read-only columns, backend available actions, session
  artifacts, and pricer coverage.
- SpecDev validates assignment artifacts, `progress.json`, review verdicts,
  and status gates.

Ripplegraph should treat validator output as evidence, not own the domain
rules.

### 7. External state reconciliation

Add a way for host adapters to report authoritative external state and detect
drift against the Ripplegraph checkpoint.

Possible shape:

```ts
externalState?: {
  source: string
  observedAt: string
  state: unknown
  fingerprint?: string
}
```

Why:

- Oceanlive's backend FSM is authoritative.
- Oceanshed workspaces can change through generated artifacts and external
  runtime runs.
- SpecDev existing assignments are filesystem-derived and need migration or
  recovery into graph checkpoints.

This should be explicit so agents do not trust stale graph position when the
backend or artifact state disagrees.

## P2 Kernel Needs

### 8. Richer schema support or pluggable schemas

Current JSON Schema support is intentionally small. That is fine for v0, but
graph/business repos will want stricter contracts:

- string patterns
- numeric bounds
- date/time formats
- object variants with discriminators
- richer arrays
- reusable schema references

This can be either an expanded internal validator or a pluggable validator
boundary.

### 9. Asset/update package policy

Graph packages currently model graph execution, not full workspace asset
lifecycle.

Domain repos may need to ship:

- graph packages
- prompt files
- scripts
- templates
- agents
- knowledge/docs
- update/preserve/prune rules

This can stay host-owned, but Ripplegraph should decide whether its package
format will support asset metadata/checksums or intentionally leave this to
domain CLIs.

### 10. Better multi-run orchestration

Current one-focused-run semantics are good for agent discipline. They may be
too narrow for workspaces that want multiple active long-running domain flows.

Likely stance:

- keep one focused run for the normal host-agent loop
- allow many suspended/completed runs
- defer true concurrent active stepping until a real domain repo proves it is
  necessary

This is not a blocker for the first pilot.

## Suggested Pilot Order

1. **SpecDev or Oceanshed first.**
   - SpecDev proves reusable phase/review graphs and artifact validators.
   - Oceanshed proves domain workflows, dry-run/apply boundaries, and
     verifier-backed evidence.
2. **Oceanlive last.**
   - It is the strictest case because live backend state and hard user-turn
     interrupts are non-negotiable.

## Non-Goals For Ripplegraph Core

Ripplegraph should not:

- run OceanWave/oceanfarm simulations
- call `oceanlive_app` directly
- spawn SpecDev reviewers directly
- parse Oceanshed TOML or Oceanlive CSVs as domain logic
- own promotion, trading, or assignment-review business decisions
- become a generic shell/process runner
- replace existing domain validators

## Practical Readiness Checklist

Before creating the new graph/business repos, Ripplegraph should have at least:

- interaction metadata
- interrupt semantics
- side-channel actions
- `workflowRef` input/output mapping
- command/tool contract metadata
- host validator interface

Before migrating Oceanlive, additionally require:

- external state reconciliation
- explicit backend-FSM drift handling
- audited side-channel logs that preserve graph position

The architecture is feasible if the boundary stays strict: Ripplegraph owns
flow; the graph/business repos own domain behavior.
