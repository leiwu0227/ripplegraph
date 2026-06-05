# Oceanlive operator context contract

Date: 2026-05-29

## Background

Oceanlive is moving its live-day execution flow onto Ripplegraph as the workflow backbone. The live-day operator UI needs a stable way to show the user where they are in the execution FSM, what business object is active, what file/table should be inspected, and what the next safe command is.

During the Oceanlive assignment `00043_feature_live-day-operator-presentation`, I incorrectly patched Oceanlive's vendored Ripplegraph package directly to allow this metadata. That should instead be implemented in Ripplegraph upstream, then Oceanlive can consume a released or repacked Ripplegraph artifact and revert the local vendored patch.

## Needed contract

Ripplegraph graph nodes should support passive operator-facing metadata on each node:

```ts
operatorContext?: Record<string, unknown>
```

The field is intended to be:

- Passive metadata only.
- Optional on every node.
- Preserved by graph validation and parsing.
- Returned in the node section of state/explain-style responses where the current node is already described.
- Ignored by runtime transition logic, validators, gates, side-channel execution, and effect handling.

This is not meant to become a Ripplegraph domain concept. It is a generic extension point for downstream operator presentation layers that need structured node-local display context.

## Why Oceanlive needs it

Oceanlive's live-day graph now has nodes such as:

- `intents_pending`
- `intents_scaled`
- `intents_filled`
- `validated`
- `executed`
- `save_gate`

Each node has operator presentation metadata like table/file identity, relevant columns, edit surface, decision category, or date context. Oceanlive's adapter reads:

```js
state.node.operatorContext
```

and maps it into:

```js
operator.context
```

The CLI/UI then renders the operator view from `operator`, while keeping older `presentation` fields as compatibility output.

## Expected Ripplegraph behavior

A minimal graph like this should validate and round-trip through state:

```json
{
  "id": "operator-context-graph",
  "version": "1",
  "kind": "workflow",
  "entry": "review_fills",
  "nodes": {
    "review_fills": {
      "purpose": "Review fills",
      "operatorContext": {
        "table": "fills",
        "csv": "05_fills.csv",
        "columns": ["intent_id", "execution_price"],
        "editSurface": "05_fills.csv"
      },
      "terminal": true
    }
  }
}
```

After registering the graph package and starting a run, `getState()` should include:

```js
state.node.operatorContext === {
  table: 'fills',
  csv: '05_fills.csv',
  columns: ['intent_id', 'execution_price'],
  editSurface: '05_fills.csv'
}
```

## Likely implementation points

The Oceanlive-local vendored patch touched these built files:

- `dist/schema.js`: added `operatorContext: z.record(z.string(), z.unknown()).optional()` to the node schema.
- `dist/schema.d.ts`: regenerated or updated the node schema/type declarations.
- `dist/internal/coach-responses.js`: included `operatorContext: node.operatorContext` inside the returned `node` object.

In Ripplegraph source, the equivalent change should happen in the real source files, then generated build artifacts should be produced through the normal build process.

## Acceptance tests

Add a Ripplegraph test that:

1. Creates or registers a graph containing a node with `operatorContext`.
2. Starts a run at that node.
3. Calls the public state API.
4. Asserts that `state.node.operatorContext` deeply equals the graph metadata.
5. Confirms ordinary runtime behavior is unchanged.

The test should cover unknown nested values enough to prove the field is a generic record, not a narrow Oceanlive-specific schema.

The target end state is: Ripplegraph owns the passive metadata contract, and downstream projects only consume it.
