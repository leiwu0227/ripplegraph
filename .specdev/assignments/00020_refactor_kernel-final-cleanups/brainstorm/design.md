# Kernel Final Cleanups

## Overview

Two small cleanups to close out the backbone-readiness review:

1. Extract a `buildInitialCheckpoint` helper used by both `startRun` and
   `startRegisteredWorkflowRun`.
2. Annotate the dispatcher's dual action-schema (Zod + JSON Schema) and add
   a drift-detection test that asserts both schemas declare the same action
   discriminator values.

No runtime semantics change; full test suite stays green.

## Goals

- Reduce duplication between the two workflow start APIs without changing
  externally observable behavior or call signatures.
- Make the dual-schema arrangement in `dispatcher.ts` legible and detectable
  if it drifts.

## Non-Goals

- Adding a Zod-to-JSON-Schema converter dependency.
- Touching callable runtime (`startCallableCall`) — it has a different
  checkpoint shape (`CallableCheckpoint`) and benefits from staying separate.
- Touching the dispatcher's action *behavior*, just its schema documentation
  and drift test.
- Implementing `workflowRef` input/output mapping. Out of scope; deferred
  pending a concrete use case the SpecDev rewrite produces.

## Design

### 1. `buildInitialCheckpoint`

In `src/coach.ts`, add:

```ts
function buildInitialCheckpoint(args: {
  runId: string;
  rootGraph: string;
  entryNode: string;
  workflow: Workflow;
  graphSource?: GraphSource;
}): Checkpoint {
  const now = new Date().toISOString();
  return {
    runId: args.runId,
    status: 'active',
    rootGraph: args.rootGraph,
    workflow: { id: args.workflow.id, version: args.workflow.version },
    position: { graph: args.rootGraph, node: args.entryNode },
    createdAt: now,
    updatedAt: now,
    outputs: {},
    gateDecisions: {},
    stack: [],
    frameCounter: 0,
    ...(args.graphSource ? { graphSource: args.graphSource } : {}),
  };
}
```

`startRun` and `startRegisteredWorkflowRun` each call it with their own
parameters. Net change: ~25 lines removed across the two functions, ~15
lines added for the helper. Behavior is byte-identical (same now-timestamp
semantics, same fields).

### 2. Dispatcher dual-schema drift detection

Add a leading comment block above the Zod `dispatcherActionSchema` in
`src/dispatcher.ts` explaining:

- Zod schema is the server-side validator; agents submit `action` JSON and
  it's parsed via this schema.
- The JSON Schema literal below is the agent-facing contract surface,
  rendered in `getDispatchRequest().actionSchema`.
- They MUST list the same `action` values. Drift is caught by the test
  added below.

Add `tests/dispatcher.test.ts`:

```ts
it('keeps the Zod and JSON Schema dispatcher actions in sync', () => {
  // Extract action discriminator values from both sources
  const zodActions = new Set<string>();
  // dispatcherActionSchema is a discriminated union; iterate its options
  // and read each option's `shape.action` literal.
  for (const option of dispatcherActionSchema.options) {
    const literal = option.shape.action;
    // For z.literal: literal.value; for z.enum: literal.options
    if ('value' in literal) zodActions.add(literal.value as string);
    else for (const v of literal.options) zodActions.add(v as string);
  }
  const jsonActions = new Set<string>();
  for (const variant of (dispatchActionSchema.oneOf ?? [])) {
    const actionProp = variant.properties?.action as { const?: string; enum?: string[] };
    if (actionProp?.const) jsonActions.add(actionProp.const);
    else if (actionProp?.enum) for (const v of actionProp.enum) jsonActions.add(v);
  }
  expect([...zodActions].sort()).toEqual([...jsonActions].sort());
});
```

Export `dispatcherActionSchema` and `dispatchActionSchema` from `dispatcher.ts`
(test-only export, but no real harm — both are inert data). Or, expose just
enough indirectly through a `_internal` test helper. Simpler: export both
named.

## Success Criteria

1. `pnpm test` passes (62 + 1 new test).
2. `pnpm run build` succeeds; dist artifacts regenerated.
3. `startRun` and `startRegisteredWorkflowRun` share `buildInitialCheckpoint`;
   no duplicated checkpoint-construction blocks remain.
4. `dispatcher.ts` has a comment above `dispatcherActionSchema` explaining
   the dual-schema role, and the new test fails if a new action variant is
   added to one schema but not the other.

## Decisions

- **Helper signature** mirrors the fields that vary between the two start
  paths; `graphSource` is the only optional field.
- **No new dep**: rejected `zod-to-json-schema`. Explicit dual schemas +
  drift test is cheaper and clearer.
- **Test-only exports** are acceptable; both schemas are immutable data.
