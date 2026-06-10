# Keyword Assertion At Load Implementation Plan

> **For agent:** Minimal plan per user direction — implement directly from the approved
> brainstorm design (brainstorm/design.md is the source of truth for details).

**Goal:** Every schema the runtime hands to `validateOutput` is keyword-asserted at manifest load (zod superRefine, path-named issues); host-facing schemas stay exempt; callable call-time assertion kept as defense.

**Architecture:** Per brainstorm/design.md. Shared walker in a leaf internal module; both the zod refinement and the run-time asserter derive from one `SUPPORTED_SCHEMA_KEYWORDS` set.

**Tech Stack:** TypeScript + Zod + Vitest. No new dependencies.

**Execution Mode:** inline

**Test Budget:** ≤ 8 new tests.

---

### Task 1: Walker module + schema refinement (TDD)
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/internal/schema-keywords.ts` (new), `src/schema.ts`, `src/internal/output-validation.ts`, `tests/schema.test.ts`, `tests/graph-package.test.ts`

**Work:** Failing tests first (per-slot rejections with path assertions; host-facing exemption acceptance; loadGraphPackage rejection). Extract walker; wire superRefine on `graphPackageManifestSchema` and `graphSchema`; reimplement the callable run-time asserter on the walker.

**Verify:** `npm run typecheck`; `npm test -- tests/schema.test.ts tests/graph-package.test.ts tests/callable.test.ts`

### Task 2: Full verification + dist
**Mode:** light
**Files:** `dist/`, any fixture stragglers

**Work:** Full suite; fix any fixture using unsupported keywords; rebuild `dist/`; re-run.

**Verify:** `npm test` (before and after rebuild)
