## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] The frame-counter migration can reuse `f1` for existing runs whose prior child frame has already exited. The design replaces `nextFrameScope`'s scan of both `checkpoint.stack` and `checkpoint.outputs` with a persisted counter, then backfills missing counters only from live stack frames (`design.md:91-99`) and explicitly avoids scanning outputs (`design.md:102-105`). In the current runtime, `nextFrameScope` scans `checkpoint.outputs` as well as `checkpoint.stack` (`src/coach.ts:532-542`) because exited child frames leave their scoped artifacts/output keys behind after the stack is popped. An old valid checkpoint with no `frameCounter`, an empty `stack`, and existing `f1/...` outputs will therefore backfill to `0` and allocate `f1` again on the next sibling workflow-ref entry, violating the stated success criterion that the second sibling scope is `f2` (`design.md:136-148`). Either keep a one-time migration scan of `outputs` when `frameCounter` is absent/zero, or narrow the compatibility claim and tests to exclude these already-exited child-frame checkpoints.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- [F1.1] Addressed. `design.md` now backfills `frameCounter` from both live
  `checkpoint.stack` scopes and persisted `checkpoint.outputs` keys with an
  `f<N>/` prefix before allocating the next scope. That matches the current
  runtime reason `nextFrameScope` scans both collections in `src/coach.ts`:
  exited child frames are popped from `stack`, while scoped outputs remain.
