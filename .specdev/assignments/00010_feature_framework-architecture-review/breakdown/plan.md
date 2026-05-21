# Framework Architecture Review Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Make Ripplegraph's long-term framework architecture explicit, easier for future CLIs to adopt, and simpler to drive from host agents.

**Architecture:** This is a schema-and-contract foundation, not a full registry/dispatcher implementation. Keep current `workflow.json` compatibility while adding graph package metadata, clearer runtime re-anchoring fields, and canonical command aliases that reduce the normal host-agent loop to `status`/`dispatch`/`explain`/`advance` conceptually.

**Tech Stack:** TypeScript / Node.js, Zod schemas, filesystem JSON state, Vitest.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks.

---

### Task 1: Align Public Architecture Notes
**Mode:** lightweight
**Skills:** []
**Files:** `.specdev/project_notes/big_picture.md`, `README.md`

**Work:**
- Update `big_picture.md` to replace stale subgraph/latch-first language with the approved graph repository model.
- Document graph kinds: `dispatcher`, `workflow`, `callable`.
- Document graph package folders, `activationHints`, effect declarations, durable runs, callable graph purity boundary, and dispatcher invocation.
- Update README quick start to match the current support-triage demo and describe the canonical command model without claiming unsupported registry behavior is already implemented.

**Verify:**
- `rg -n "daily-execution|mockcopy-backtest|subgraph-as-node|Free latch|\\.xxx/subgraphs" README.md .specdev/project_notes/big_picture.md`
- `rg -n "activationHints|dispatcher|callable|advance|dispatch" README.md .specdev/project_notes/big_picture.md`

**Test Budget:** +0; text-only

**Test Pruning:**
- No tests for docs-only edits.

**Commit:** `git commit -m "Align framework architecture notes"`

### Task 2: Add Backward-Compatible Graph Package Metadata Schema
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `tests/coach.test.ts`, `tests/helpers/workflows.ts`

**Work:**
- Add optional workflow-level package metadata: `entryGraph`, `title`, `description`.
- Add graph-level metadata with backward-compatible defaults: `kind: "workflow"`, `title`, `description`, `activationHints`, `inputSchema`, `outputSchema`, `effects`.
- Keep existing `graphs.<id>.entry` and `nodes` valid without requiring any metadata.
- Reject invalid graph kinds and invalid effect declarations through the existing Zod parse path.
- Add focused schema coverage proving old demo workflows still parse and metadata-rich graphs parse with the expected defaults/fields.

**Verify:**
- `npm run typecheck`
- `npm test -- --run tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Extend existing workflow/schema tests rather than adding a new test file.

**Commit:** `git commit -m "Add graph package metadata schema"`

### Task 3: Add Runtime Re-Anchoring Fields
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/internal/coach-responses.ts`, `src/demo-cli.ts`, `tests/coach.test.ts`, `tests/demo-cli.test.ts`

**Work:**
- Add canonical runtime fields for drift recovery: `orientation`, `nextAllowedCommand`, and `helpCommand`.
- Populate active states from current node, response contract, and current run position.
- Populate no-focused state with dispatcher-ready guidance only when the loaded workflow declares an `entryGraph`; otherwise keep current available-graphs fallback.
- Render the new fields in `ripplegraph-demo` without removing the existing purpose, instructions, recent context, and route details.
- Keep output concise; avoid duplicating long instructions.

**Verify:**
- `npm run typecheck`
- `npm test -- --run tests/coach.test.ts tests/demo-cli.test.ts`

**Test Budget:** +2 in `tests/coach.test.ts`, `tests/demo-cli.test.ts`; focused (<30s) — one contract test and one rendered-output test cover different surfaces.

**Test Pruning:**
- Update current status/render assertions instead of adding parallel tests when possible.

**Commit:** `git commit -m "Add runtime reanchoring fields"`

### Task 4: Introduce Canonical `advance` and `explain` Commands
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/cli.ts`, `src/demo-cli.ts`, `tests/cli.test.ts`, `tests/demo-cli.test.ts`, `README.md`

**Work:**
- Add low-level `advance --input <json>` that inspects the focused node and routes to `stepRun` or `decideGate` as appropriate.
- Add demo `advance <json> [--file <path>]` with the same behavior.
- Add `explain` as an alias for richer current state rendering; for now it may share the same renderer as `status` because Task 3 makes status self-anchoring.
- Keep `step`, `submit`, and `decide` as compatibility aliases.
- Update help text to group canonical commands first and compatibility/debug commands second.

**Verify:**
- `npm run typecheck`
- `npm test -- --run tests/cli.test.ts tests/demo-cli.test.ts`

**Test Budget:** +2 in `tests/cli.test.ts`, `tests/demo-cli.test.ts`; focused (<30s) — one JSON CLI advance test and one demo CLI advance/explain test.

**Test Pruning:**
- Reuse existing submit/decide test setup and add only the assertions needed for canonical aliases.

**Commit:** `git commit -m "Add canonical advance and explain commands"`

### Task 5: Final Verification and Architecture Consistency Pass
**Mode:** lightweight
**Skills:** []
**Files:** `.specdev/assignments/00010_feature_framework-architecture-review/implementation/progress.json`

**Work:**
- Run the focused test commands from prior tasks plus a final full test pass if focused tests do not cover all changed executable surfaces.
- Run `npm run build` to ensure generated dist output is valid.
- Smoke the current demo gate flow with `advance` and `explain`.
- Record task completion in implementation progress.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `tmp=$(mktemp -d) && node ./node_modules/tsx/dist/cli.mjs src/demo-cli.ts init "$tmp" && node ./node_modules/tsx/dist/cli.mjs src/demo-cli.ts start support-triage --run arch-smoke --workflow-root "$tmp" && node ./node_modules/tsx/dist/cli.mjs src/demo-cli.ts advance '{"category":"bug","priority":"urgent","rationale":"checkout is blocked"}' --workflow-root "$tmp" && node ./node_modules/tsx/dist/cli.mjs src/demo-cli.ts explain --workflow-root "$tmp"`

**Test Budget:** +0; verification-only

**Test Pruning:**
- No new tests in final verification.

**Commit:** `git commit -m "Verify framework architecture foundation"`
