# Kernel Cleanups

## Overview

Bundle three small kernel simplifications identified in the backbone-readiness
review:

1. Drop the `system` variant from `gate.decisionSource` so the discriminated
   union has two structurally distinct shapes.
2. Replace `nextFrameScope`'s regex scan over stack frames and output keys
   with a monotonic counter persisted on the checkpoint.
3. Add a Zod refinement on `checkpointSchema` that ties `position.graph` to
   either the top stack frame's `child.graphId`, the optional `graphSource`,
   or `rootGraph`.

None of these change runtime semantics. They reduce surface area, remove a
weak invariant maintained only by helper code, and prevent a corrupted
checkpoint from being silently routed.

## Goals

- Remove `decisionSource: { kind: 'system' }` from the schema and every
  consumer (state contract, response contract, tests, dist artifacts).
- Add `checkpoint.frameCounter: number` (default `0`) and have
  `enterWorkflowRefs` allocate the next scope as
  `` `f${++checkpoint.frameCounter}` ``. Remove `nextFrameScope` and its
  regex.
- Add a `superRefine` on `checkpointSchema` rejecting checkpoints where
  `position.graph` doesn't match the active graph derivable from
  `stack`/`graphSource`/`rootGraph`.
- Keep all 60 existing tests green; add focused tests for the new invariant
  and counter behavior.

## Non-Goals

- Do not redesign `decisionSource` semantics; `human` and `tool` remain
  exactly as they are.
- Do not change the on-disk representation of existing valid checkpoints.
  In-flight runs have `frameCounter` defaulted via Zod (`default(0)`) and
  remain readable.
- Do not touch `workflowRef`, package pinning, or effect aggregation.
- Do not extract or refactor the dispatcher action schema duplication or the
  two start APIs — those are stylistic and out of scope for this assignment.

## Design

### 1. `decisionSource` — drop `system`

`src/schema.ts` `decisionSourceSchema` becomes a two-variant
discriminated union:

```ts
export const decisionSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('human'), label: z.string().min(1).optional() }).strict(),
  z.object({
    kind: z.literal('tool'),
    tool: idSchema,
    label: z.string().min(1).optional(),
  }).strict(),
]);
```

Tests in `tests/coach.test.ts` covering the `system` variant (if any) are
removed; the existing `human` and `tool` coverage stays. The README and any
dist `.d.ts` snapshot is regenerated via `npm run build`.

### 2. Frame scope monotonic counter

Add `frameCounter` to `checkpointSchema`:

```ts
frameCounter: z.number().int().nonnegative().default(0),
```

In `enterWorkflowRefs` (`src/coach.ts:486`), replace the call to
`nextFrameScope(checkpoint)` with:

```ts
checkpoint.frameCounter += 1;
const frameScope = `f${checkpoint.frameCounter}`;
```

Delete `nextFrameScope`. The counter is persisted in the checkpoint, so
suspended runs resume with the right next number. Existing checkpoints with
no `frameCounter` field default to `0` via Zod's `default(0)`; if those
checkpoints already have stack frames, the counter is bumped past the highest
existing `f<N>` on the first re-enter (one-time migration). To make this
fully deterministic, the runtime initializes the counter on resume:

```ts
function ensureFrameCounter(checkpoint: Checkpoint): void {
  if (checkpoint.frameCounter > 0) return;
  let max = 0;
  for (const frame of checkpoint.stack) {
    const m = /^f(\d+)$/.exec(frame.scope);
    if (m) max = Math.max(max, Number(m[1]));
  }
  checkpoint.frameCounter = max;
}
```

This is called once at start of `enterWorkflowRefs` (a no-op for fresh runs
where the counter is already non-zero after first allocation). It must also
scan `checkpoint.outputs` keys for any `f<N>/` prefix, because exited child
frames are popped from `stack` but their scoped outputs remain in
`checkpoint.outputs`. Without that, an in-flight checkpoint from before this
change with one popped child would have `stack: []` plus outputs like
`f1/done`, and the next sibling ref would allocate `f1` again. The full
backfill helper:

```ts
function ensureFrameCounter(checkpoint: Checkpoint): void {
  if (checkpoint.frameCounter > 0) return;
  let max = 0;
  for (const frame of checkpoint.stack) {
    const m = /^f(\d+)$/.exec(frame.scope);
    if (m) max = Math.max(max, Number(m[1]));
  }
  for (const key of Object.keys(checkpoint.outputs)) {
    const m = /^f(\d+)\//.exec(key);
    if (m) max = Math.max(max, Number(m[1]));
  }
  checkpoint.frameCounter = max;
}
```

The regex still exists, but it is now confined to a one-shot migration helper
that runs at most once per checkpoint (subsequent allocations are pure
increments on the persisted counter). The hot path (`enterWorkflowRefs`)
becomes a simple `++` with no scan.

### 3. Checkpoint stack/position invariant

Add a `superRefine` to `checkpointSchema`:

```ts
.superRefine((checkpoint, ctx) => {
  const expected = checkpoint.stack.at(-1)?.child.graphId
    ?? checkpoint.graphSource?.graphId
    ?? checkpoint.rootGraph;
  if (checkpoint.position.graph !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['position', 'graph'],
      message: `position.graph (${checkpoint.position.graph}) must match active graph (${expected})`,
    });
  }
})
```

This catches any code path that writes `position.graph` without going through
the active-context helper. It also defends against tampered on-disk
checkpoints.

### Test plan

- Drop any `system` decisionSource test; keep `human` + `tool` coverage as-is.
- Add a `tests/coach.test.ts` case that loads a hand-built checkpoint with a
  mismatched `position.graph` and asserts `readCheckpoint` throws the schema
  error.
- Add a `tests/coach.test.ts` case that drives two sibling workflow-ref
  entries (frame `f1` exits, then a second ref enters as `f2`) and asserts
  `checkpoint.frameCounter === 2` and the scope of the second frame is `f2`.

## Success Criteria

1. `pnpm test` passes (existing 60 + small adjustments).
2. `pnpm run build` succeeds; dist artifacts regenerated.
3. `gate.decisionSource` accepts only `kind: 'human' | 'tool'`. A workflow
   declaring `kind: 'system'` fails to load with a schema error.
4. After a parent workflow enters a child ref, exits, and enters another
   child ref, the second frame's `scope` is `f2` and `checkpoint.frameCounter
   === 2`. No regex scan over `checkpoint.outputs` happens during allocation.
5. A checkpoint on disk with `stack: [{ child: { graphId: 'a', ... }, ... }]`
   and `position.graph: 'b'` fails `readCheckpoint` with a schema validation
   error.

## Decisions

- **`system` removal**: no compatibility shim. `decisionSource` is brand-new
  in 00018; no production workflows use `system`.
- **`frameCounter` default**: `0`; runtime one-time backfill from existing
  stack frames at first enter post-load (handles in-flight nested runs from
  prior versions).
- **Invariant location**: on `checkpointSchema` itself, so reads via
  `readCheckpoint` and any future direct callers are protected.
