## Round 1

### F1.1 — Dispatcher selection consistency
**Resolution:** Accepted. Picked the simpler of the two suggested options:
keep the single-dispatcher contract explicit and centralize selection.

Changes to `brainstorm/design.md`:
- Removed the "prefer `entryGraph` when multiple dispatchers are registered"
  language. Multiple registered dispatchers continue to raise
  `E_AMBIGUOUS_DISPATCHER`, exactly as today.
- Reframed `entryGraph` as a manifest-level assertion of the single
  registered dispatcher's id. Mismatch → new `E_ENTRY_GRAPH_MISMATCH` error.
- Added a shared `resolveDispatcher(workflowRoot)` helper used by both
  `getState` (no-focused-run branch) and `dispatcher.ts`
  (`getDispatchRequest`, `applyDispatchAction`). This is the structural fix
  the reviewer asked for: a single source of truth so `getState` cannot
  advertise a dispatch path that the dispatcher command would reject.
- New "Dispatcher (`src/dispatcher.ts`)" subsection in Design documents the
  change.
