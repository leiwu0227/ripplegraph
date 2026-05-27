# Oceanlive — Remaining Ripplegraph Kernel Gaps

Date: 2026-05-27

Post-implementation reassessment of `oceanlive_backbone_gaps.md`. That earlier
note listed the gaps *before* assignments 00022 (host contracts), 00023
(side-channel + reconciliation runtime), and 00024 (kernel-gap design roadmap)
landed. This note records what is **actually still missing** after verifying the
implemented kernel against the **multi-mode** reality of oceanlive — not just the
live trading FSM.

## Key reframing

Oceanlive is not a single live-FSM driver. It is a **dispatcher + N durable
workflow graphs** product:

| Mode | Shape | Human gates | Authoritative external state |
|------|-------|-------------|------------------------------|
| live (livecopy) | one trading day, step-by-step | yes — numeric pick per transition | backend FSM, per turn |
| mockcopy | fire-and-poll backtest, no gates between steps, polls `mockcopy status` to terminal | no | async job status |
| shadowcopy | replay/comparison, reserved/scaffolded separately | TBD | TBD |

Plus create-vessel, setup-workspace, generate-report as their own flows.

This is exactly what ripplegraph's dispatcher + registry + multiple workflow
packages is for. Ripplegraph's real contribution to oceanlive is **routing,
durable run history, and reconciliation across modes** — not safety enforcement
(the live mode's safety stays in `session.js` + the backend FSM; mockcopy has no
gates to enforce). An earlier "kernel is just an auditor" take was a live-only
observation and does not generalize.

Verified implemented and sufficient:

- Multi-package start/route: `startRun({ graphId, runId })` starts any registered
  package; dispatcher `getDispatchRequest` / `applyDispatchAction` /
  `resolveDispatcher` route intent. (`coach.ts`, `dispatcher.ts`)
- Side-channel actions: `recordSideChannelAction` appends a `side_channel`
  transition with `from == to`, never advances. (`coach.ts:526`)
- Reconciliation: `reconcileExternalState` records observed vs expected, returns
  `aligned`, never auto-repairs. (`coach.ts:547`)
- Interaction + gated freeze: gate nodes throw `E_GATE_DECISION_REQUIRED` on
  step; `decideGate` validates the decision against the gate's `decisionSchema`
  (an `enum` schema rejects "ok"/"continue"/"go"). (`coach.ts:365,430`)
- Tool-contract metadata with effect preflight. (`schema.ts`, `coach.ts:178`)

## Genuinely missing gaps

### 1. `workflowRef` input/output runtime binding — P1

The schema accepts `inputMap` / `outputMap`, but the runtime ignores them (no
non-schema consumers in `src`). This is the only "shipped as metadata, not
behavior" gap.

Why it matters for oceanlive: the modes share parameterized building blocks —
`vessel load`, `setup-contexts --copies {live|mock}`, `init-dates --copies mock`,
and the results/report step recur across live, mockcopy, and (later) shadowcopy.
Factoring those into reusable sub-graphs needs a parameter binding, and
`--copies live` vs `--copies mock` is precisely an `inputMap` value.

Not a v1 blocker — you can inline or duplicate the sub-flow nodes per mode at
first. It becomes load-bearing the moment you stop copy-pasting shared sub-flows.

Acceptance: a parent node with `workflowRef.inputMap` passes mapped values into
the child run's input; `outputMap` projects named child outputs back to the
parent. Covered by roadmap follow-up #6 ("WorkflowRef I/O Runtime Binding").

### 2. Concurrent active runs — P2, consciously deferred

One focused run + suspendable others. Fine for v1 because mockcopy's poll loop is
host-side in `mockcopy.js` (the kernel sees one terminal report, not the polling).
Becomes a real gap only if "kick off a long backtest and meanwhile drive another
mode/session" becomes a product requirement. Already parked as roadmap
follow-up #7.

## Explicitly NOT gaps (do not build for oceanlive)

- **Interrupt / freeze enforcement.** Gates already enforce the freeze. The
  turn-boundary rule ("no other tool calls in the same response as a menu") is a
  host-agent behavioral contract the kernel cannot observe in principle — the
  kernel only sees calls made to itself, never the host's other tool use, and it
  never sits between the agent and `session.js`/the backend. `interrupt`
  metadata as a render hint is enough; kernel enforcement adds nothing real.
- **Host validator runtime.** Running validators in the kernel would relocate
  domain logic across the boundary. Each mode's validators (live: CSV read-only
  columns, pricer coverage, audit set; mockcopy: `/health` preflight, step-dates
  calendar completeness, terminal state) stay in their drivers, where they
  already run authoritatively. Declarative `validators[]` naming + recording
  results through `recordSideChannelAction`'s `output` field covers the evidence
  need.
- **Async long-running job primitive (mockcopy poll).** No new primitive needed.
  The driver polls internally and reports once at terminal state via
  `reconcileExternalState` + a status-keyed edge (`done` → next, `error` →
  handler).

## Bottom line

Ripplegraph is **start-ready** for the oceanlive port today. The only true
outstanding kernel item you are likely to hit is `workflowRef` I/O binding, and
only once shared parameterized sub-flows across live/mockcopy/shadowcopy are
factored out. Concurrency is the back-pocket item if background backtests become
a real requirement.

The boundary still holds: no `livecopy`/`vessel`/`mockcopy` server call and no
CSV/JSONL/domain-artifact parsing belongs in the kernel.
</content>
