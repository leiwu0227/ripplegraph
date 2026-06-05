# Oceanlive — Two Deferred Kernel Items (post A0–A6)

Date: 2026-05-28

Handoff note from the oceanlive-cli side. The ripplegraph backbone refactor
(roadmap A0–A6) is **complete** on `oceanlive-cli` (`refactor/ripplegraph-backbone`
branch): all five mode flows (setup-workspace, create-vessel, live-day,
generate-report, mockcopy) run through the generic `oceanlive do/next/decide/
step/action` commands or the dedicated `oceanlive backtest` driver-command. Full
test suite green (338 pass / 1 pre-existing skip / 0 fail).

Two items were **explicitly deferred to the ripplegraph kernel** (named in
`oceanlive-cli/docs/ripplegraph-backbone-roadmap.md` § Deferred). Neither blocks
anything we shipped; both are dormant kernel capabilities waiting on a real
product reason. Pick up from here when one of those reasons materializes.

Companion to: `oceanlive_remaining_kernel_gaps.md` (2026-05-27, which surveyed
the kernel surface before A0–A6 implementation finalized). This note narrows to
just the two items the refactor *avoided needing* by deliberate scoping.

---

## Item 1 — `workflowRef` parameterization (`inputMap` / `outputMap` runtime binding)

### What the schema already declares

The kernel's node schema accepts `workflowRef` with `inputMap` / `outputMap`
(verified `node_modules/ripplegraph/dist/schema.d.ts:431-442, 761-764`):

```ts
workflowRef: { graphId: string, version?: string, inputMap?: Record<string,string>, outputMap?: Record<string,string> }
```

The intent (per the roadmap text): a node can **call into a shared subflow** (a
different registered graph package) with parameters threaded in via `inputMap`
and the subflow's terminal outputs surfaced back via `outputMap`.

### What's already wired

The recursive call/return machinery is **already implemented and used on every
step**: `enterWorkflowRefs` (`coach.js:414`) and `exitChildWorkflow`
(`coach.js:477`) are invoked from `startRun`/`stepRun`/`decideGate`/`resumeRun`
(coach.js:121, 146, 220, 225, 281, 286, 323, 519, 524). The parent/child stack
frames are maintained on the checkpoint, scope-aware artifact paths exist, and
control correctly transfers into a referenced graph and back out on its terminal.

So calling into a shared subflow **works today** — what doesn't work is
**parameterizing** the call. A consumer can't pass anything specific into the
subflow's entry, and can't shape the subflow's terminal output back into the
parent's calling-node output for edge selection.

### What's actually missing (narrower than originally described)

`inputMap` and `outputMap` are accepted by the schema but **not consumed
anywhere in the runtime** (`rg -n "inputMap|outputMap" coach.js internal/`
returns zero hits). The narrow gap:

1. **`enterWorkflowRefs`**: at entry, project values from the parent's
   accumulated outputs into the subflow's entry input space per
   `node.workflowRef.inputMap`. (Today the subflow starts with no parameterized
   input.)
2. **`exitChildWorkflow`**: at the subflow's terminal, project the subflow's
   terminal output into the parent's output for the calling node per
   `node.workflowRef.outputMap`, **before** the parent runs edge selection.
   (Today the parent advances without a return value shaped by the consumer.)

That's the entire item: make `workflowRef` parameterized and return-mapped. The
call/return + stack machinery stays as-is.

### Practical impact today

Without `inputMap`/`outputMap`, a `workflowRef` call only works when the subflow
needs no parameters and the parent doesn't need to branch on the subflow's
output — i.e. a side-effecting reusable sequence. Anything that needs to vary
behavior per call site (e.g. `setup-contexts --copies <live|mock>`) must be
inlined. The oceanlive cross-cutting principle bakes this in: **"Inline shared
subflows; do not reach for `workflowRef` until forced."** Every shared structure
in A0–A6 was inlined.

### When oceanlive would need it

The motivating example from the roadmap: a shared `setup-contexts --copies
<live|mock>` subflow reused by both `live-day` and `mockcopy` with the `--copies`
parameter threaded via `inputMap`. Today both flows inline their own setup
nodes; the duplication is small and tolerable. The pressure to enable
`workflowRef` rises when:

- A second shared subflow appears (cost of duplication compounds).
- The subflow is non-trivial and would drift between copies if hand-maintained.
- A future kernel feature (e.g. graph-versioned policy) wants a single source of
  truth per subflow.

None of those are real today.

---

## Item 2 — Concurrent active runs

### What the kernel enforces today

A workspace has **exactly one focused run** at a time. The kernel guard
(`node_modules/ripplegraph/dist/coach.js:112-113`):

```js
if (current.focusedRunId) {
    throw new RipplegraphError('E_FOCUSED_RUN_EXISTS', `focused run already exists: ${current.focusedRunId}`);
}
```

`startRun` always writes `focusedRunId: <new run>` (`:119`); the focus is only
cleared when the run completes (`writeCurrent(rootPath, { focusedRunId: null })`
at `:300`). All `getState`/`stepRun`/`decideGate`/`recordSideChannelAction` calls
implicitly target that one focused run.

### Why oceanlive doesn't hit it

Every shipped flow is a foreground operation the user drives:

- **live-day**: one trading day per session (explicit guide rule).
- **create-vessel / setup-workspace / generate-report**: short interactive flows.
- **mockcopy**: invoked as a one-shot via the dedicated `oceanlive backtest`
  driver-command (not generic-driven; not concurrent with anything).

The single-focus model is correct for all of these. The product layer's
`needs_command` redirect for mockcopy (in `oceanlive-cli/src/commands/engine.js`
`doCmd`) keeps mockcopy from ever competing for the focus slot.

### What would change in the kernel

To support genuinely concurrent runs, the kernel would need to drop the single-
focus invariant and let callers address a specific run:

- **Multi-run state**: replace the `focusedRunId: string | null` shape in
  `current.json` with an addressable set (e.g. `runs: { [runId]: { status, ... } }`
  + an optional `foregroundRunId`).
- **API plumbing**: `getState`/`stepRun`/`decideGate`/`recordSideChannelAction`/
  `reconcileExternalState` all need to take an explicit `runId` (today they
  derive it from `focusedRunId`). The existing `listRuns`/`resumeRun` already
  enumerate/address by id — extend that to active runs too.
- **Start guard**: replace `E_FOCUSED_RUN_EXISTS` with a per-graph or
  per-category policy (e.g. "only one live-day at a time, but a background
  mockcopy is fine alongside"), or just allow N parallel runs and leave that
  policy to the product layer.
- **Side-effects / artifacts directories**: artifact paths already use `runId`
  (verified at storage.js's `nodeOutput`/`runDir` builders), so the on-disk
  layout already supports multiple runs side-by-side. The blocker is purely the
  in-memory/single-focus runtime gate.

### When oceanlive would need it

The motivating case from the roadmap: **"background backtest while driving
another mode"** — a user is mid-live-day and wants to fire off a mockcopy
backtest without disturbing the focused live run. That's the only concrete case
on the horizon. Until a user actually asks for that workflow, the current
single-focus model is the right product invariant (a focused session prevents
accidental concurrent actions on the trading FSM).

A weaker variant — letting `oceanlive backtest` run while a non-trading flow
(create-vessel, generate-report) is focused — has the same kernel requirement
and could be motivated independently.

---

## Summary

| Item | Kernel surface today | Kernel work needed | Oceanlive trigger |
|------|----------------------|--------------------|-------------------|
| `workflowRef` I/O binding | schema accepts `{graphId, inputMap, outputMap}`; **call/return already wired** (`enterWorkflowRefs`/`exitChildWorkflow`); `inputMap`/`outputMap` never consumed | wire `inputMap` projection at entry + `outputMap` projection at child terminal; that's it | a parameterized shared subflow worth not inlining |
| Concurrent active runs | single `focusedRunId` enforced by `E_FOCUSED_RUN_EXISTS` | addressable-by-`runId` mutating APIs + per-run state in `current.json` + start-policy revisit | "background backtest during a live day" as a real product requirement |

## Recommendation

**Do not implement either now.** Keep both as deferred assignments, prioritized
by which kind of pressure shows up first:

- **P1 — when duplication appears: `workflowRef` I/O runtime binding.** Narrow
  kernel change (two projection points inside the already-working call/return
  path). The trigger is a second non-trivial shared subflow worth not inlining,
  or drift between inlined copies of a shared structure.
- **P2 — when product pressure appears: concurrent active runs.** Larger kernel
  shift (multi-run addressable state). The single-focused-run design is
  intentional and still right; only revisit when a real background-work use case
  appears (e.g. "mockcopy backtest while live-day remains focused").

The oceanlive consumer (`oceanlive-cli` on `refactor/ripplegraph-backbone` and
onward) will pick up either capability when the next vendored tarball lands.
