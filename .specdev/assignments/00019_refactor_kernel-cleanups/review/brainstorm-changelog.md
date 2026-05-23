## Round 1

- [F1.1] Addressed. Updated `design.md` so `ensureFrameCounter` backfills the
  counter from both `checkpoint.stack` and `checkpoint.outputs` keys (`f<N>/`
  prefix) when the persisted counter is missing/zero. This preserves the
  invariant for in-flight checkpoints whose only evidence of past frames is
  scoped output keys. The regex remains, but is now confined to a one-shot
  migration helper; the hot path in `enterWorkflowRefs` is a pure counter
  increment.
