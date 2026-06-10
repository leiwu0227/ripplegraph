# Run Output Real Contract Implementation Plan

> **For agent:** Minimal plan per user direction — implement directly from the approved
> brainstorm design (brainstorm/design.md is the source of truth for details).

**Goal:** Absent workflow `outputSchema` means no completion contract; declared means enforced and exposed (checkpoint `finalOutput`, completed response `output`, `listRuns` summaries).

**Architecture:** Per brainstorm/design.md. All changes non-breaking; ships inside 0.1.0.

**Tech Stack:** TypeScript + Zod + Vitest. No new dependencies.

**Execution Mode:** inline

**Test Budget:** ≤ 8 new tests.

---

### Task 1: Schema — optional workflow outputSchema + checkpoint finalOutput
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `tests/schema.test.ts`, `tests/storage.test.ts`

**Work:** Workflow variant `outputSchema` becomes optional (callable keeps its default; node-level default kept with a deliberate-convention comment); `checkpointSchema` gains optional `finalOutput`.

**Verify:** `npm run typecheck`; `npm test -- tests/schema.test.ts`

### Task 2: Runtime — skip absent contracts, persist and expose run output
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/internal/coach-responses.ts`, `tests/coach.test.ts`

**Work:** Skip root/child completion validation when no `outputSchema` is declared; `completeRun` persists `finalOutput` and returns `output`; `runSummary` exposes `output` for completed runs. Provenance rule comment.

**Verify:** `npm test -- tests/coach.test.ts`

### Task 3: Docs, dist, full verification
**Mode:** light
**Files:** `README.md`, `dist/`

**Work:** README notes for the output contract and provenance rule; rebuild `dist/`; full suite.

**Verify:** `npm test` (full suite before and after rebuild)
