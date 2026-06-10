# Design: Codebase Tidy-Up

## Overview

Tidy-up refactor consolidating duplication verified by three independent scan passes. Extract four duplicated helpers into focused `src/internal/` modules, delete two stale git-tracked tarballs, eliminate the `advanceRun()` double-load, consolidate duplicated test scaffolding, and add direct test coverage for `storage.ts` and `schema.ts`. Strictly no behavior changes; no public API changes.

## Non-Goals

- **No merge of `stepRun()`/`decideGate()`** in `coach.ts`. Verified: ~75% structural overlap but the differences (opposite gate preconditions, different schemas, different transition shapes, extra `gateDecisions` checkpoint field) mean a shared helper would need 4–5 parameters and obscure intent.
- **No public API changes.** The 7 unused storage path-builder exports (`stateDir`, `runsDir`, `callsDir`, `runDir`, `callDir`, `transitionLogPath`, `artifactPath`) stay exported — owner decision: they are intentional API for downstream consumers that inspect workflow state files on disk.
- **No touching** `examples/` (intentional dual-copy with templates/, enforced by `demo-cli.test.ts`), `AGENTS.md` (intentional CLAUDE.md mirror for other agents), or `.codex/skills/` (intentional dual-tooling copies).
- **No new validation capabilities** in `internal/output-validation.ts`; it intentionally supports a subset of JSON Schema.

## Design

### 1. Shared helper extraction (focused modules, one concern per file)

| New/changed module | Contents | Importers |
|---|---|---|
| `src/internal/json-io.ts` (new) | `readJson()`, `writeJson()` (atomic tmp+rename, `E_BAD_JSON` on parse failure) | `storage.ts`, `registry.ts`, `graph-package.ts` (readJson only) |
| `src/internal/json-utils.ts` (new) | `stableValue()` — converge on the clearer `diagram.ts` conditional style (`value && typeof value === 'object'`) | `coach.ts`, `graph/diagram.ts` |
| `src/internal/zod-issues.ts` (new) | `formatIssues()` | `registry.ts`, `dispatcher.ts`, `graph-package.ts` |
| `src/internal/coach-responses.ts` (existing) | export the existing `exampleOutput()`; keep the structural parameter type `{ properties?: Record<string, { enum?: unknown[]; type?: string }> }` so both call sites compile without casts | `demo-cli.ts` drops its copy and imports |

Duplicate definitions are deleted at all original sites. All four were file-private, so extraction cannot change the public API.

### 2. `advanceRun()` double-load fix (`src/coach.ts`)

Currently `advanceRun()` (coach.ts:434-440) loads checkpoint + active context to check whether the node is gated, then delegates to `decideGate()`/`stepRun()` which reload workflow + checkpoint + active context from disk (5–8 file reads total, no caching).

Fix: introduce private `stepRunWith(loaded, opts)` / `decideGateWith(loaded, opts)` that accept already-loaded `{ workflow, checkpoint, active }`. Public `stepRun()`/`decideGate()` keep their exact signatures and load state then delegate; `advanceRun()` loads once (including `loadWorkflow()`) and calls the `*With` variants. Each state file is read at most once per `advanceRun` call.

### 3. Test scaffolding consolidation

Extract into `tests/helpers/setup.ts` (or extend existing `tests/helpers/`):
- `makeRoot(prefix)` — mkdtemp wrapper (variants exist in callable/dispatcher/registry/coach/graph-package tests)
- `writeGraphPackage(root, folder, manifest, now?)` — identical in callable.test.ts:26 and coach.test.ts:68 except the `now` timestamp, which becomes a parameter with per-test values preserved
- `errorCode(fn)` — identical in callable.test.ts and dispatcher.test.ts (and coach.test.ts)

Keep the existing per-test `try/finally` rmSync pattern (explicit, safe); do not introduce a global afterEach. `cli.test.ts` `run`/`runRaw`/`runBuilt` stay as-is (test-local, tightly coupled — verified not worth merging).

### 4. New direct tests

- `tests/storage.test.ts` — checkpoint write/read round-trip; atomic write behavior (no partial file on success path); `E_BAD_JSON` error code on corrupt JSON; current-run focus read/write.
- `tests/schema.test.ts` — manifest/graph validation: representative accept cases and reject cases (bad node refs, malformed schema fields) asserting error codes/messages.

### 5. Cruft removal

- `git rm ripplegraph-0.0.1.tgz ripplegraph-0.0.2.tgz` (verified: zero references repo-wide)
- Add `*.tgz` to `.gitignore`

## Key Decisions

1. **Focused modules over a single utils.ts** — matches the repo's existing one-concern-per-file pattern in `src/internal/`; avoids a grab-bag that grows. (User-selected.)
2. **Keep storage path builders public** — intentional downstream API. (User-selected.)
3. **All optional cleanups in scope** — test helper consolidation + storage/schema direct tests. (User-selected.)
4. **`*With` variants for the advanceRun fix** — preserves public signatures and keeps the change minimal and test-covered.
5. **Skip stepRun/decideGate merge and cli.test.ts helper merge** — verified not worth the abstraction cost.

## Success Criteria

- Full vitest suite passes (`npm test` / `vitest run`).
- `src/index.ts` export surface unchanged (public API identical before/after).
- Grep finds exactly one definition each of `formatIssues`, `readJson`, `writeJson`, `stableValue`, `exampleOutput` in `src/`.
- `advanceRun()` reads each state file (current, checkpoint, graph package, workflow) at most once per call.
- `tests/storage.test.ts` and `tests/schema.test.ts` exist with meaningful accept/reject assertions and pass.
- `*.tgz` files removed from git; `.gitignore` covers `*.tgz`.
- `npm run build` (tsc) succeeds; dist/ regenerates cleanly.

## Testing Approach

TDD per task: for extractions, existing tests are the safety net — run the affected test file before and after each move; for the advanceRun fix, coach tests cover both gate and step paths; new storage/schema tests are written test-first against current behavior (they must pass against the pre-refactor code too, since this is behavior-preserving).
