# Implementation review changelog

## Round 3

- **[F3.1] addressed — root-completion validation now happens at the original step site,
  before the child terminal step is persisted.** Added `rootCompletionGraph`
  (src/coach.ts, above `rootCompletionValidationError`): when a step lands on a terminal node,
  it walks the pending child-exit cascade with pure reads (parent graph source → parent edge →
  next node) and returns the root graph iff the cascade ends at a root terminal. `stepRunWith`
  and `decideGateWith` use it before any write — so the child-exit-to-root-terminal case is now
  validated before the child node artifact, position mutation, and child `step` transition are
  persisted. The walk returns null (deferring to the commit path's own semantics) for
  intermediate child outputSchema rejections, missing graph sources, and missing edges, so all
  pre-existing failure behavior is unchanged.
- **Simplification, not stacking:** the round-1 hoisted check inside `exitChildWorkflow` was
  **removed** — its call sites are now always pre-validated at the original step site, and
  `completeRun`'s internal check (shared helper) remains the single backstop. Net: one walker +
  one validator, called from two step sites and `completeRun`.
- **New test** (tests/coach.test.ts): parent workflow whose `workflowRef` child exit lands on
  the root terminal with a strict root `outputSchema` — a violating child result returns
  `validation_error` with response position equal to the durable position (child's work node),
  the transition log contains no successful step into either terminal node, and a conforming
  result then completes the run through the same cascade.
- Verification: `tsc --noEmit` clean; full suite 102/102 before and after `dist/` rebuild.

## Round 1

- **[F1.1] addressed — root completion now validates before any persistence.** Added
  `rootCompletionValidationError` (src/coach.ts, above `completeRun`): validates the completing
  value against the root graph's `outputSchema` and, on failure, appends only a
  failed-validation transition at the current (still-durable) position and returns
  `validation_error` with `position` equal to that durable position. All three commit paths now
  call it **before** any artifact write, checkpoint mutation, or success transition:
  - `stepRunWith`: edge selection and `nextNode` lookup hoisted above `writeNodeOutput`; the
    root-terminal check runs before the node artifact/`step` transition are persisted.
  - `decideGateWith`: same hoist for the gate path (`op: 'decide'`, `gateDecision` logged on the
    failure entry).
  - `exitChildWorkflow`: parent edge selection and `nextNode` lookup hoisted above the parent
    artifact/transition writes, so a root-terminal rejection after a child exit persists nothing.
  `completeRun` keeps the same check via the shared helper as its first statement — it remains
  the primary (and consistent) validation for the already-on-terminal path, where
  `checkpoint.position` is both the durable and reported position, and is a no-op re-check on
  the hoisted paths.
- **Tests strengthened** (tests/coach.test.ts, "root run outputSchema enforcement"): the
  rejection response's `position` is now asserted to match the durable `getState` position, and
  the transition log is read after rejection to assert no successful `step` into the terminal
  node was persisted.
- Verification: `tsc --noEmit` clean; full suite 101/101 before and after `dist/` rebuild.
- Reviewer note about missing `breakdown/plan.md`: the breakdown phase was intentionally
  skipped at the user's direction for this assignment (implemented directly from the approved
  brainstorm design).
