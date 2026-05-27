# Ripplegraph Gaps For The Oceanlive Refactor

Date: 2026-05-26

Scope: the specific kernel additions Ripplegraph needs **before** `oceanlive-cli`
can be refactored to sit on top of it. This is the oceanlive-focused companion
to the generic `ripplegraph_needs_for_graph_repos.md`; it narrows that list to
what the oceanlive port actually exercises, and pins each gap to real source.

Verified against:

- `/mnt/h/oceanwave/lib/cli/oceanlive-cli/templates/.oceanlive/_scripts/session.js`
- `/mnt/h/oceanwave/lib/cli/oceanlive-cli/templates/.oceanlive/_guides/daily_execution.md`
- `/mnt/h/oceanwave/lib/cli/oceanlive-cli/knowledge/concepts/fsm-and-side-channels.md`
- `/mnt/h/ripplepulse/lib/ripplegraph/docs/backbone-fit-analysis.md`

## The Boundary (do not move these into the kernel)

Oceanlive is the strictest human-interrupt case and the only one with an
authoritative external FSM. The refactor only works if the split stays hard:

- **`oceanlive_app`'s LiveCopy FSM stays authoritative.** Ripplegraph never
  becomes the trading FSM. Its checkpoint is a *mirror*, reconciled every turn
  against the backend's `available-actions`.
- **`session.js` stays the deterministic driver.** It owns transition ordering,
  server-command logging, audit invariants, CSV read-only contracts, and
  pricer-coverage checks. Ripplegraph records its structured output; it does not
  re-implement it.
- **Ripplegraph never calls `livecopy`/`vessel`/`session` server commands, never
  parses CSV/JSONL trading artifacts, and never invents fills.**

What Ripplegraph *should* own for oceanlive: run position/history mirror, the
menu/interrupt contract, the side-channel vs transition distinction as data, the
command surface contract, and drift detection. Everything below is in service of
those five.

## P0 — Blockers (oceanlive cannot port without these)

### 1. Strong user-turn interrupt contract

The single most important rule in `daily_execution.md`:

> **HARD RULE — never batch commands across a menu pick.** After rendering any
> menu or prompt, STOP your response immediately and wait for the user's numeric
> pick. Do not run any tool calls in the same response as a menu.

A normal gate ("this node needs a decision") is not strong enough — it doesn't
forbid the host from doing *other* tool work in the same turn. Oceanlive needs a
node/gate that asserts a turn boundary.

Proposed shape:

```ts
interrupt: {
  requiresUserTurn: true
  reason?: string        // surfaced to host: why the pause exists
  scope?: 'menu' | 'confirm' | 'side_channel_prompt'
}
```

Kernel responsibility: when the served node carries `interrupt.requiresUserTurn`,
the response contract must flag that **no further advance/side-channel/call is
permitted until a new user-originated decision is submitted**. The host enforces
the actual "end the response" behavior, but the kernel must make the boundary
machine-readable so the adapter and tests can assert it.

Acceptance:
- A node can declare `requiresUserTurn`; the served contract exposes it.
- Submitting any host action other than the awaited decision against an
  interrupted run is rejected (or clearly flagged) by the kernel.
- Transition log distinguishes "interrupt opened" from "decision received".

### 2. Side-channel actions that do not move position

From `fsm-and-side-channels.md` and `session.js`:

> `load-scale-table` / `load-fill-table` prepare in-memory table state but do not
> move the FSM. Commitment happens only when the user picks a legal FSM
> transition that consumes the loaded state.

In `session.js` these are `loadScaling`, `loadFills`, `bootstrapFills`, and the
`summarize-*` reads — all of which produce/echo artifacts and mutate backend
in-memory state **without** an FSM transition. The kernel must represent these as
audited actions that append to history but leave `current` position unchanged.

Proposed shape (already sketched generically; oceanlive pins the requirements):

```ts
sideChannelActions?: Array<{
  id: string                 // e.g. "load-scale-table"
  purpose: string
  commandRef?: string        // points at session.js subcommand (see #5)
  effects?: string[]         // e.g. ["backend_in_memory_write", "write_files"]
  outputSchema?: JsonSchema  // validated, recorded as evidence
}>
```

Acceptance:
- Recording a side-channel action appends a `side_channel` transition whose
  `from` and `to` positions are identical.
- It does **not** satisfy or advance any pending gate/transition.
- Output is validated and stored as evidence, retrievable in history.

This is the gap oceanlive needs *most* and that the other two CLIs use least —
prioritize it.

### 3. External-state reconciliation against the backend FSM

`session.js step` calls `available-actions` after **every** FSM move and logs it;
the guide says: *"If the response disagrees with the menu in this guide, STOP."*
A resumed session (`session.js init` can report `phase=done` carried over from
yesterday) means Ripplegraph's mirrored position can be stale before the first
turn.

The kernel needs a way for the host to report authoritative backend state and get
back a drift verdict — without the kernel deciding policy.

Proposed shape:

```ts
reconcileExternalState({
  workflowRoot,
  source: 'livecopy-fsm',
  observedAt: string,
  snapshot: { phase: string, availableActions: string[] },
  expected:  { phase: string }
}) -> { aligned: boolean, source: string }
```

Acceptance:
- Host can submit observed backend phase + `available-actions` each turn.
- Kernel returns `aligned: false` when its mirror disagrees, and records the
  reconciliation in history.
- Kernel does **not** auto-advance or auto-repair — the oceanlive adapter owns
  what to do on drift (typically: STOP and surface the mismatch).
- Cross-day `done → live_step` resume is expressible (mirror re-anchors from a
  reconciliation, not from a blind checkpoint trust).

### 4. First-class interaction metadata (numbered menus)

Every oceanlive decision is *an explicit numbered pick rendered verbatim in a
fenced block*; "ok/continue/go" must not count as acceptance. The menu choices
and their order are contractual (tests pin them). Prose in `instructions` is not
enough — the kernel must carry the choice contract.

Proposed shape:

```ts
interaction?: {
  id: string
  kind: 'choice' | 'confirm' | 'free_text'
  prompt: string
  renderVia?: string                 // e.g. "fenced_menu"
  choices?: Array<{ label: string; value: string; description?: string }>
}
```

Notes specific to oceanlive:
- `value`s map to `session.js` transitions/side-channels (e.g. `advance`,
  `load-scale-table`). Stable values let the adapter route a numeric pick.
- The decision schema must reject free-text acceptance — only an enumerated
  `value` (or `done` in a pick-3 sub-wait) is valid.

Pairs with #1: a `choice` interaction with `interrupt.requiresUserTurn` is the
canonical oceanlive menu.

## P1 — Strongly wanted (port is awkward/unsafe without them)

### 5. Command/tool contract metadata

`session.js` already exports a `MANIFEST` mapping each subcommand to the exact
`server_commands` it is allowed to issue, and oceanlive tests assert
driver/server/docs parity against it (e.g. `MANIFEST.mtm.server_commands` deep-
equals `['livecopy mtm']`). The graph should declare, per node, which host
command it expects — without executing it.

Proposed shape:

```ts
toolContract?: {
  id: string                  // e.g. "session-step-allocate"
  command?: string            // e.g. "session.js step allocate"
  expectedArtifacts?: string[]// e.g. ["server/06_validation.json"]
  validator?: string          // see #6
  effects?: string[]
}
```

Acceptance:
- A node names the `session.js` subcommand it drives; the kernel records the
  declared command + returned structured output, and never runs it.
- The contract is introspectable so the adapter can keep manifest-parity tests.

### 6. Host validator interface

`session.js` enforces domain validators the kernel must not absorb:
read-only CSV column contracts (`assertReadOnlyColumnsUnchanged` over
`01_intents.csv` / `02_scaling.csv` / `05_fills.csv`), pending-skip gating before
`scale-intents`/`fill-intents`/`validate`/`execute`, pricer-coverage
(`verifyPricerCoverage`), and the audit required-artifact set. The kernel should
let a node *name* a validator the host resolves, and treat its output as
evidence.

```ts
validate({ validator, runId, nodeId, input })
  -> { ok: boolean, output?: unknown, issues?: Array<{ code; message; path? }> }
```

Acceptance:
- A node can require a named validator to pass before a gate/transition closes.
- Validator output (pass/fail + issues) is stored as evidence in history.
- No CSV/JSON/domain parsing is added to the kernel.

### 7. `workflowRef` input/output mapping

Lower priority for oceanlive than for SpecDev, but the daily run is naturally a
parent flow that could compose a reusable "edit + reload + recascade" sub-flow
(the `intents_stale` branch). Current `workflowRef` only names `graphId`; without
input/output mapping the adapter has to rely on conventions.

```ts
workflowRef: { graphId: string; inputMap?: Record<string,string>; outputMap?: Record<string,string> }
```

## Graph-modeling notes (no kernel change, but design now)

These shape the oceanlive graph package; flag them so the kernel design doesn't
accidentally preclude them:

- **Linear 9-phase chain with one branch.** Main flow:
  `last_step → live_step → context_ready → signals_ready → allocations_ready →
  intents_pending → intents_scaled → intents_filled → done`, plus the
  `intents_stale` side branch that recascades back to `intents_pending`. Edge
  predicates must express "go to stale vs forward" — current flat top-level
  equality predicates are probably sufficient; confirm.
- **Cross-day resume.** `advance` must accept `last_step | done` and land at
  `live_step`. The graph entry/resume must model "yesterday carried over".
- **Audit as terminal gate.** `session.js audit --save` verifies a required
  artifact set and only then saves the vessel. This is the run's terminal gate;
  its required-artifact check is a host validator (#6), not kernel logic.
- **One live day per session.** Multi-day catch-up is unsupported — the run is
  single-day-scoped. Concurrent active runs (P2 in the generic doc) are not
  needed here.

## Effects / safety

Declarative effects only; the kernel does not sandbox. The CSV write-target
boundary (`assertWriteTarget`, workspace-root enforcement in
`resolveSessionDir`) stays host-owned. Don't add OS/process/network enforcement
to the kernel for oceanlive — the analysis doc is explicit that there is none and
oceanlive doesn't need it added.

## Suggested implementation order in ripplegraph

1. **#2 side-channel actions** — most oceanlive-specific, least covered today.
2. **#1 interrupt contract** — the menu hard-stop; pairs with #4.
3. **#4 interaction metadata** — numbered-menu contract.
4. **#3 reconciliation** — backend-FSM drift, required before any live port.
5. **#5 tool contract + #6 host validator** — preserve manifest-parity and CSV
   read-only / pricer / audit invariants as evidence.
6. **#7 workflowRef mapping** — only if the stale-branch sub-flow is modeled as a
   child graph.

## Done-criteria before starting the oceanlive port

Mirror of the analysis doc's completion criteria, narrowed:

- Every `daily_execution.md` menu is expressible as an `interaction` +
  `interrupt.requiresUserTurn` node, and a test asserts no host tool call is
  allowed in the same turn as a served menu.
- `load-scale-table` / `load-fill-table` / `bootstrap-fills` / `summarize-*` map
  to side-channel actions that provably do not advance position.
- A turn-loop test reconciles a mismatched backend phase and the kernel reports
  `aligned: false` without auto-advancing.
- `session.js` subcommands are expressible as `toolContract`s and the MANIFEST
  parity tests have an equivalent at the graph layer.
- CSV read-only, pending-skip, pricer-coverage, and audit-artifact checks run as
  host validators whose results are recorded as evidence.
- No `livecopy`/`vessel`/`session` server call and no trading-artifact parsing
  has been moved into the kernel.
</content>
</invoke>
