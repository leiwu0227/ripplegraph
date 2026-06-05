# Oceanlive — Workflow Start Requirements (run-start precondition gap)

Date: 2026-05-29

> Reframed 2026-05-29 after analysis inside Ripplegraph. Earlier draft framed this
> as *dispatcher-owned ordering* enforced in `applyDispatchAction`. That is wrong:
> it would only protect dispatcher starts and miss direct/product starts. The
> correct frame is **graph-declared start requirements enforced in the generic
> run-start path** (`startRun`), so every start path is covered. The dispatcher
> stays a pure intent router.

## Background

Oceanlive is a **dispatcher + N durable workflow packages** product (see
`oceanlive_remaining_kernel_gaps.md` for the mode table). The user's front door is
`oceanlive do "<what they want>"`, which should land them in the right workflow
run: `setup-workspace`, `create-vessel`, `live-day`, `generate-report`, or the
driver-command `mockcopy`.

The pre-Ripplegraph front door was a markdown file (`_router.md`) the host agent
read. It carried three things:

1. **A catalog** — intent phrasings → which flow.
2. **Ordering / precondition rules** ("## Order matters"): if the user asks for
   `live-day` or a `mockcopy` backtest but no vessel exists yet, run
   `create-vessel` first; if the workspace dirs are missing, run
   `setup-workspace` first.
3. **A fallback** — a "which of these five?" clarifier when the ask is ambiguous.

The Ripplegraph port wants to delete `_router.md`. Auditing the cutover showed #1
(catalog) and #3 (clarifier) are already kernel-native (`activationHints` +
`ask_user`). But **#2 has no home** — not in the kernel, not in the manifests, and
consequently not enforced in the oceanlive adapter either. A `live-day` run can be
started against a workspace with no vessel and only fail mid-flow when
`session.js init` throws. That guarantee silently disappeared in the cutover.

## What the kernel provides today (accurate inventory)

From `src/dispatcher.ts` / `src/registry.ts` / `src/schema.ts` / `src/coach.ts`:

- **Registry-backed catalog.** `getDispatchRequest()` (`dispatcher.ts:162`)
  returns `availableGraphs` with `id, version, kind, title, description,
  activationHints, effects` (`dispatcher.ts:226`). `activationHints` is a
  first-class manifest field (`schema.ts:195`, `registry.ts:15`). This *is* the
  catalog; nothing else needs to hold it.
- **Agent-driven action selection.** `getDispatchRequest()` returns
  `actionSchema` (`dispatcher.ts:107`); the action enum is `start_run |
  resume_run | switch_run | list_runs | ask_user | call_graph`
  (`dispatcher.ts:58-160`). Intended model: the agent reads `availableGraphs` +
  `activationHints`, classifies, emits an action; `ask_user` is the first-class
  disambiguation path (the "fallback clarifier" is already a kernel concept).
- **The single run-start chokepoint.** `startRun(opts)` (`coach.ts:236`) is the
  *only* path that creates a run. Both start paths funnel through it:
  - `oceanlive do` → `applyDispatchAction({action:'start_run'})`
    (`dispatcher.ts:196`) → `startRun(...)`.
  - `oceanlive backtest` → `startRun({graphId:'mockcopy'})` **directly**
    (`oceanlive .../src/commands/backtest.js:41`), bypassing the dispatcher
    entirely.
  `startRun` already runs `assertGraphAndChildEffectsAllowed(...)`
  (`coach.ts:244`) — the natural sibling location for a start-requirements check.
- **Exactly-one-dispatcher structural rule.** `resolveDispatcher()` validates a
  single `kind: dispatcher` package; its **nodes are never executed**. It is a
  structural anchor, not a routing FSM.

So of `_router.md`'s three jobs, two are kernel-native already. The gap is #2.

## The gap

### Gap 1 — No graph-declared start requirements, enforced at run-start (the real one)

There is no way for a workflow package to declare "I require predicate P before I
can start; if P is unmet, block and redirect to graph Q." Grep across `src/`:
no `requires` / `preconditions` / `dependsOn` on the start path. The only
start-time guard is effect-policy.

**Why enforcement must live in `startRun`, not the dispatcher.** `oceanlive
backtest` starts `mockcopy` via a *direct* `startRun` call (`backtest.js:41`) and
never goes through `applyDispatchAction`. If requirements were enforced in the
dispatch action, the backtest path — which has the *same* vessel prerequisite —
would be completely unprotected. The dispatcher is just one caller of `startRun`;
the requirement is a property of the *target graph*, so it belongs at the
common run-start path that every caller (dispatcher start, direct/product start,
and any future caller) shares.

### Gap 2 — Classification bypassed consumer-side (symptom, not a kernel gap)

The kernel delegates intent→graph classification to the agent
(`getDispatchRequest` + `actionSchema`). Oceanlive bypassed it: `doCmd` does
substring matching — `graphTokens(...).some(t => intent.toLowerCase().includes(t))`
(`oceanlive .../src/commands/engine.js:172-187`) — and calls `start_run`
directly. `includes` misroutes the router's own phrases ("**trade** these
signals" → live-day; "oceanlive init" → live-day via the `live` substring).
This is a consumer fix (use the kernel's classification contract / `ask_user`),
recorded here only because it is the symptom that surfaced the audit and because
a start-requirement redirect only helps once the *right* graph was selected.

## Why it matters

Rules with no enforcement point today, now expressible as start requirements:

- `live-day` requires a created+saved vessel → unmet redirects to `create-vessel`.
- `mockcopy` has the same vessel prerequisite → and is reachable only via the
  direct `oceanlive backtest` path, which dispatcher-level enforcement misses.
- All flows require a scaffolded workspace → unmet redirects to `setup-workspace`.

These generalize beyond oceanlive: any multi-package product has graphs that
depend on earlier graphs having run.

## Proposed kernel contract

Boundary constraint (from `oceanlive_remaining_kernel_gaps.md`): **the kernel must
not evaluate domain predicates.** "Does a vessel exist" means reading
`workspace.toml` + `storage/` — domain/filesystem state the kernel must not
parse. So the kernel owns the **declaration**, the **enforcement**, and the
**redirect contract**; the host owns **predicate evaluation**.

### 1. Declare requirements on the target workflow manifest (graph level)

```ts
// schema.ts — manifest
requires?: Array<{
  id: string                 // host-evaluable predicate key, e.g. "vessel_present"
  describe: string           // human text, e.g. "a created vessel"
  unmetRedirect?: string     // graphId to start instead, e.g. "create-vessel"
  unmetMessage?: string      // e.g. "No vessel yet — create one first."
}>
```

Surface `requires` in `RegisteredGraphSummary` so `getDispatchRequest` exposes it
(an agent can then see prerequisites before it even picks a graph).

### 2. Enforce in the generic run-start path

The host evaluates each predicate (it alone knows how) and passes the results
into `startRun`:

```ts
// coach.ts — StartRunOptions
interface StartRunOptions {
  workflowRoot: string
  graphId: string
  runId?: string
  effectPolicy?: EffectPolicy
  requirementState?: Record<string, boolean>   // { vessel_present: false }
}
```

In `startRun`, alongside `assertGraphAndChildEffectsAllowed` (`coach.ts:244`), add
`assertStartRequirementsMet(manifest, opts.requirementState)`: for each
`manifest.requires[]` entry whose predicate is `false` or absent, **do not create
the run** — fail with a structured, recoverable error:

```ts
throw new RipplegraphError('E_START_REQUIREMENTS_UNMET', message, {
  graphId,
  unmet: [{ id, describe, redirectTo: unmetRedirect, message: unmetMessage }],
})
```

(Or return a structured result if `startRun`'s contract prefers values over
throws — match the existing effect-policy failure style at `coach.ts:194`.)

Because this is in `startRun`, **both** `applyDispatchAction`'s start_run *and*
`oceanlive backtest`'s direct `startRun({graphId:'mockcopy'})` are protected with
no extra work at either call site beyond passing `requirementState`.

### 3. Dispatcher stays a pure intent router

`applyDispatchAction` does **not** enforce requirements. It routes to the intended
graph and calls `startRun`; the run-start path blocks or surfaces the redirect.
The dispatcher's only job is "which graph did the user mean." This keeps the
dispatcher and the requirement concern cleanly separated — the dispatcher need
not know *why* a start was refused.

### Host responsibilities (oceanlive adapter)

- Evaluate predicate keys from domain state (`vessel_present` ← `workspace.toml
  [vessel]` + `storage/vessel/`; `workspace_ready` ← dirs exist). The engine layer
  does not currently parse `workspace.toml` — this adds that.
- Pass `requirementState` into every `startRun` call (`doCmd` and `backtestCmd`).
- Translate `E_START_REQUIREMENTS_UNMET` into the product redirect ("run
  `create-vessel` first").

## Boundary / non-goals

- **Kernel evaluates no predicates.** Keys are opaque strings; the host supplies
  booleans. No `workspace.toml` / `storage/` / `/health` reads in the kernel.
- **Classification is not the kernel's job.** Gap 2 is a consumer fix (use
  `getDispatchRequest` + agent classification / `ask_user`), not a kernel matcher.
- **The dispatcher graph stays a structural anchor.** This adds declarative data
  to *workflow* manifests + a guard in `startRun`; it does not make the kernel
  execute dispatcher nodes, and it does not move ordering logic into the
  dispatcher.

## Relationship to existing notes

- `specdev_rewrite_backbone_analysis.md` **Gap B** proposes `step.requires` —
  filesystem-existence preconditions at the *node* level. This note is the
  *run-start* analog. Same primitive at two scopes: one host-evaluated `requires`
  declaration, enforced by the kernel at `startRun` (graph entry) or `stepRun`
  (node entry). Design them together — one predicate model, two enforcement
  points — to avoid two divergent precondition mechanisms.
- `oceanlive_remaining_kernel_gaps.md` — supplies the boundary rule (routing /
  durability is the kernel's job; domain-state evaluation is not) and confirms
  the dispatcher/registry/`activationHints` surface already exists.
- `oceanlive_operator_context_contract.md` — same passive-metadata pattern if a
  metadata-only interim is wanted before the enforcing version lands.

## Acceptance criteria

- A workflow manifest can declare `requires: [{ id, describe, unmetRedirect?,
  unmetMessage? }]`; validation preserves it; `getDispatchRequest().availableGraphs`
  surfaces it.
- `startRun({ graphId, requirementState })` with a declared predicate unmet (false
  or absent) **creates no run** and fails with `E_START_REQUIREMENTS_UNMET`
  carrying the unmet list + redirect target.
- Both start paths are covered by the same guard: `applyDispatchAction` start_run
  **and** a direct `startRun` (e.g. the product/backtest path).
- With all declared predicates met (or none declared), `startRun` behaves exactly
  as today.
- The kernel reads no domain/filesystem state to make this decision.

## Bottom line

Catalog and clarifier are already kernel-native; oceanlive just needs to consume
them. The one missing kernel primitive is **graph-declared, host-evaluated,
kernel-enforced start requirements** — enforced in `startRun` (beside the
effect-policy check), not in the dispatcher, so direct/product starts like
`oceanlive backtest` are protected too. The dispatcher remains only the intent
router. Build it once, share the predicate model with Gap B's step-level
`requires`, and keep predicate evaluation on the host side of the boundary.
