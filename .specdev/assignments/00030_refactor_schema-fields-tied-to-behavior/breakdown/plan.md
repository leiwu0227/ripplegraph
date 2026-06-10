# Schema Fields Tied To Behavior Implementation Plan

> **For agent:** Backfilled after the fact — the breakdown phase was skipped at the user's
> direction and this assignment was implemented directly from the approved brainstorm design.
> This plan records the executed task structure so the workflow gates reflect reality.

**Goal:** Every declared graph-package schema field is runtime-enforced, host-exposed, or deleted: drop workflow `inputSchema`, callable `requires`, dispatcher `effects`, and `workflowRef.inputMap`/`outputMap`; enforce the graph `outputSchema` at root-run completion.

**Architecture:** Extend 00029's discriminated-union approach to three kind-specific strict manifest variants (dispatcher / workflow / callable), with `ManifestForKind` resolver narrowing keeping kind-guarded call sites compiling unchanged. Root completion validates through a single shared helper before any artifact/transition is persisted.

**Tech Stack:** TypeScript + Zod + Vitest. No new dependencies.

**Execution Mode:** inline

**Test Budget:** ≤ 10 new tests. Actual: +9 (5 schema, 1 graph-package, 3 coach).

---

### Task 1: Schema — three kind-specific manifest variants
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `tests/schema.test.ts`

**Work:**
- TDD: per-kind rejection cases for each deleted field; missing-`kind` rejection; callable `inputSchema` acceptance; `workflowRef` map rejection — written first and watched fail.
- Split the union into `dispatcherGraphManifestSchema` / `workflowGraphManifestSchema` / `callableGraphManifestSchema`; drop `inputMap`/`outputMap` from `workflowRefSchema`; `graphSchema`/`Graph` become the executable two-variant union; export `WorkflowGraphManifest`/`CallableGraphManifest`.

**Verify:** `npm run typecheck`; `npm test -- tests/schema.test.ts`

### Task 2: Knock-on consumers
**Mode:** standard
**Files:** `src/registry.ts`, `src/cli.ts`, `src/callable.ts`, `src/graph/diagram.ts`

**Work:**
- `ManifestForKind` maps each kind to its own variant; `registerGraphPackage` sources `requires` only from workflow and `effects` only from executable manifests.
- `packageSummary` populates `requires`/`effects` per kind; callable.ts helpers retyped to `CallableGraphManifest`; diagram.ts uses a local executable-union alias.

**Verify:** `npm run typecheck` (compiler enumerates all consumers of deleted fields)

### Task 3: Root-run outputSchema enforcement
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Validate the completing value against the root graph `outputSchema` at every root-completion path (`stepRunWith`, `decideGateWith`, `exitChildWorkflow`, `completeRun`), via the shared `rootCompletionValidationError` helper, **before** any artifact/transition persistence (ordering fixed in review round 1).
- Tests: violating output → `validation_error`, run stays active, response position matches durable state, no successful terminal transition logged; conforming output completes; default-schema runs unaffected.

**Verify:** `npm test -- tests/coach.test.ts`

### Task 4: Template, fixtures, docs, dist
**Mode:** light
**Files:** `templates/minimal/`, `tests/helpers/workspace.ts`, `tests/helpers/workflows.ts`, remaining test fixtures, `README.md`, `docs/building-product-clis-on-ripplegraph.md`, `dist/`

**Work:**
- Template dispatcher drops `effects`; helper input types follow the three-way split; fixtures migrated (including the graph-package round-trip test converted to a strict-reject case); stale doc references to `inputMap`/`outputMap` removed; `dist/` rebuilt.

**Verify:** `npm test` (full suite, including built-CLI tests against rebuilt `dist/`)
