# Per-Node Effects Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add `node.effects?` declarations that are checked as a union at `startRun`, with the dispatcher start path delegating to that authoritative check.

**Architecture:** Three small surfaces change. (1) `src/schema.ts` gains `nodeSchema.effects?` and tightens `nodeSchema.exec` to a literal `'inline'`. (2) `src/coach.ts` adds `unionOfNodeEffects(graph)` and replaces `startRun`'s graph-level `assertEffectsAllowed` with the union variant. (3) `src/dispatcher.ts` drops the pre-check for `start_run` actions so the registry summary's graph-level effects no longer override per-node opt-outs.

**Tech Stack:** TypeScript + Zod + Vitest. No new dependencies.

**Execution Mode:** inline

**Test Budget:** +3 new tests across all tasks (one per task). All under 30s focused runtime.

---

### Task 1: Schema — add `node.effects?` and tighten `exec` to `'inline'`
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `tests/coach.test.ts`

**Work:**
- Add `effects: z.array(idSchema).optional()` to `nodeSchema` (`src/schema.ts:48`).
- Tighten `exec` from `z.enum(['inline', 'spawn', 'script']).default('inline')` to `z.literal('inline').default('inline')`.
- Update the TSDoc/comment on `nodeSchema.effects` (inline alongside the field) to document inheritance: `undefined` inherits graph; `[]` overrides to no effects required; non-empty array overrides with that set.
- No runtime changes in this task — only the schema field appears and the exec values are restricted.

**Verify:**
- `pnpm run typecheck` passes.
- `pnpm test -- tests/coach.test.ts` passes including the new test.
- Existing 45 tests still green: `pnpm test`.

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s). Single test with two assertions: a workflow.json declaring `node.effects: ['write_repo']` parses successfully via `validateWorkflowRoot`; a workflow.json declaring `exec: 'spawn'` fails to load with `E_INVALID_WORKFLOW`.

**Test Pruning:** None — these are net-new assertions on a previously untested boundary.

**Commit:** `git commit -m "Add node.effects schema field and tighten exec enum"`

---

### Task 2: Runtime — union check at `startRun`
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `tests/effects.test.ts`

**Work:**
- In `src/coach.ts`, add two helpers (module-scoped, not exported):
  - `effectsForNode(graph, node)` → `node.effects ?? graph.effects`
  - `unionOfNodeEffects(graph)` → deduped concatenation of `effectsForNode(graph, n)` for all `n` in `graph.nodes`.
- In `startRun` (`src/coach.ts:135`), replace `assertEffectsAllowed(graph.effects, opts.effectPolicy, ...)` with `assertEffectsAllowed(unionOfNodeEffects(graph), opts.effectPolicy, \`graph \${opts.graph}\`)`.
- The error code stays `E_EFFECT_NOT_ALLOWED`; the message will list the union of missing effects (already handled by `assertEffectsAllowed` in `src/effects.ts:28`).
- No checkpoint schema change. No transition-time logic.

**Verify:**
- `pnpm run typecheck` passes.
- `pnpm test -- tests/effects.test.ts tests/coach.test.ts` passes.
- Existing 45 tests still green: `pnpm test`.

**Test Budget:** +1 in `tests/effects.test.ts`; focused (<30s). Single test exercises three cases in one workflow:
  - Node A has no `effects` declaration and inherits `graph.effects: ['read_repo']` — allowed under policy granting `read_repo`.
  - Node B declares `effects: ['read_repo', 'write_repo']` — requires `write_repo` in policy.
  - Node C declares `effects: []` — explicit opt-out, contributes nothing to the union.
  Asserts: `startRun` with `{ allowedEffects: ['read_repo'] }` fails with `E_EFFECT_NOT_ALLOWED` listing `write_repo`; `startRun` with `{ allowedEffects: ['read_repo', 'write_repo'] }` succeeds. Also: the same workflow without node B starts under `{ allowedEffects: [] }` because node A's inheritance is the only contributor and node C opts out — but wait, node A still inherits `read_repo`. Refine: use a graph with `effects: ['write_repo']` and only nodes A (no declaration → inherits write_repo) and C (`effects: []` → opt-out). Union = `['write_repo']`. With policy `{ allowedEffects: ['write_repo'] }`: succeeds. Strip A so only C remains: union = `[]`, `{ allowedEffects: [] }` succeeds — that locks in the opt-out semantics.

  To keep this in one test cleanly: use `assertEffectsAllowed`/`checkEffects` directly to assert union computation on the workflow (no `startRun` call needed for the opt-out leg), and use one `startRun` call to assert end-to-end deny + an `expect.toThrow` for the missing-effect path. Goal is one test, multiple assertions, < 30s.

**Test Pruning:** None.

**Commit:** `git commit -m "Check union of node effects at startRun"`

---

### Task 3: Dispatcher — remove `start_run` pre-check, delegate to `startRun`
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/dispatcher.ts`, `tests/dispatcher.test.ts`

**Work:**
- In `applyDispatchAction` (`src/dispatcher.ts:189-204`), remove the `assertEffectsAllowed(graph.effects, options.effectPolicy, ...)` line that runs before `startRun`. The authoritative union check now happens inside `startRun` (per Task 2).
- Keep the `call_graph` pre-check (`src/dispatcher.ts:206-207`) — callable graphs are out of scope for this assignment.
- No other changes in dispatcher.

**Verify:**
- `pnpm run typecheck` passes.
- `pnpm test -- tests/dispatcher.test.ts` passes including the new test.
- Existing 45 tests still green: `pnpm test`.
- `pnpm run build` succeeds.

**Test Budget:** +1 in `tests/dispatcher.test.ts`; focused (<30s). Single test: register a workflow with `graph.effects: ['write_repo']` and a single node `effects: []` (opt-out). Apply a `start_run` dispatcher action with policy `{ allowedEffects: [] }`. Today this would fail at the dispatcher pre-check; after the change it must succeed (the union is empty). Asserts the resulting active run exists and `startRun` was reached.

**Test Pruning:** None.

**Commit:** `git commit -m "Drop dispatcher start_run pre-check to honor node-level effects"`

---

## Final verification

After all three tasks land:

```
pnpm run build
pnpm test
```

Expected: 0 type errors, 48 tests passing (45 existing + 3 new).
