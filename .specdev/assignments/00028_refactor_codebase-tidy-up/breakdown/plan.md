# Codebase Tidy-Up Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Consolidate verified duplication (four shared helpers), fix the `advanceRun()` double-load, remove stale tarballs, consolidate test scaffolding, and add direct tests for `storage.ts` and `schema.ts` — with zero behavior or public-API changes.

**Architecture:** Extract file-private duplicated helpers into focused `src/internal/` modules (`json-io.ts`, `json-utils.ts`, `zod-issues.ts`; `exampleOutput` exported from existing `coach-responses.ts`). Fix `advanceRun()` via private `stepRunWith`/`decideGateWith` variants that accept pre-loaded state while public signatures stay unchanged. Shared test scaffolding moves to `tests/helpers/setup.ts`.

**Tech Stack:** TypeScript (Node ESM), vitest, zod.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks (default ceiling; sum below is exactly 5).

---

### Task 1: Remove stale tarballs and ignore future ones
**Mode:** lightweight
**Skills:** []
**Files:** `ripplegraph-0.0.1.tgz` (delete), `ripplegraph-0.0.2.tgz` (delete), `.gitignore`

**Work:**
- `git rm ripplegraph-0.0.1.tgz ripplegraph-0.0.2.tgz`
- Append `*.tgz` to `.gitignore`

**Verify:**
- `git ls-files '*.tgz'` prints nothing; `git check-ignore ripplegraph-x.tgz` exits 0 (text-only scan)

**Test Budget:** +0; text-only

**Test Pruning:**
- none — no test surface

**Commit:** `git commit -m "Remove stale package tarballs and gitignore *.tgz"`

### Task 2: Extract json-io.ts (readJson/writeJson)
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/internal/json-io.ts` (new), `src/storage.ts`, `src/registry.ts`, `src/graph-package.ts`

**Work:**
- Create `src/internal/json-io.ts` exporting `readJson(filePath)` (throws `RipplegraphError('E_BAD_JSON', ...)` with the existing message format) and `writeJson(filePath, payload)` (mkdir + tmp file `.tmp.${pid}.${Date.now()}` + atomic rename) — byte-for-byte the existing logic
- Delete the local copies: `storage.ts:111-124`, `registry.ts:46-59`, `graph-package.ts:19-25` (readJson only); import from `./internal/json-io.js`
- `RipplegraphError` is defined in `src/schema.ts:3` — `json-io.ts` imports it from `../schema.js` (same edge the three current copies already use; no cycle)

**Verify:**
- `npx vitest run tests/registry.test.ts tests/graph-package.test.ts tests/dispatcher.test.ts tests/coach.test.ts` (existing suites covering all three importers; <30s) — `tests/storage.test.ts` does not exist until Task 6
- `grep -rn "function readJson\|function writeJson" src/ | wc -l` → 2 (both in json-io.ts)

**Test Budget:** +0 in existing tests; focused (<30s)

**Test Pruning:**
- none — behavior-preserving move

**Commit:** `git commit -m "Extract shared readJson/writeJson into internal/json-io"`

### Task 3: Extract zod-issues.ts, json-utils.ts, and share exampleOutput
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/internal/zod-issues.ts` (new), `src/internal/json-utils.ts` (new), `src/internal/coach-responses.ts`, `src/registry.ts`, `src/dispatcher.ts`, `src/graph-package.ts`, `src/coach.ts`, `src/graph/diagram.ts`, `src/demo-cli.ts`

**Work:**
- `src/internal/zod-issues.ts`: export `formatIssues()`; delete copies at `registry.ts:61`, `dispatcher.ts:254`, `graph-package.ts:15`; import at all three
- `src/internal/json-utils.ts`: export `stableValue()` using the diagram.ts conditional style (`value && typeof value === 'object'`); delete copies at `coach.ts:622`, `graph/diagram.ts:66`; import at both
- `src/internal/coach-responses.ts`: add `export` to existing `exampleOutput()` (keep structural param type); delete the copy at `demo-cli.ts:129`; import in demo-cli.ts

**Verify:**
- `npx vitest run` full suite (<2 min — broad touch across modules justifies it)
- `grep -rn "function formatIssues\|function stableValue\|function exampleOutput" src/ | wc -l` → 3 (one each)

**Test Budget:** +0 in existing tests; full suite justified by 7-file blast radius

**Test Pruning:**
- none — behavior-preserving move

**Commit:** `git commit -m "Consolidate formatIssues, stableValue, exampleOutput into shared internal modules"`

### Task 4: Fix advanceRun double-load
**Mode:** full
**Skills:** [test-driven-development]
**Files:** `src/coach.ts`, `tests/coach.test.ts`

**Work:**
- Write failing test first: in `tests/coach.test.ts`, spy on `fs.readFileSync` around one `advanceRun()` call and assert each state file path (current, checkpoint, graph package manifest, workflow) is read at most once
- Introduce private `stepRunWith(loaded, opts)` / `decideGateWith(loaded, opts)` taking `{ workflow, checkpoint, active }`; public `stepRun()`/`decideGate()` keep exact signatures, load state, delegate
- `advanceRun()` loads workflow + checkpoint + active context once and calls the `*With` variant; status/gate precondition checks preserved exactly (same error codes `E_RUN_NOT_ACTIVE`, `E_NODE_NOT_GATED`, and stepRun's checks)

**Verify:**
- `npx vitest run tests/coach.test.ts` (<30s)

**Test Budget:** +1 in tests/coach.test.ts; focused (<30s)

**Test Pruning:**
- check for existing advanceRun I/O assertions first; none expected

**Commit:** `git commit -m "Load run state once per advanceRun call"`

### Task 5: Consolidate test scaffolding into tests/helpers/setup.ts
**Mode:** standard
**Skills:** []
**Files:** `tests/helpers/setup.ts` (new), `tests/callable.test.ts`, `tests/coach.test.ts`, `tests/dispatcher.test.ts`, `tests/registry.test.ts`, `tests/graph-package.test.ts`

**Work:**
- Create `tests/helpers/setup.ts` exporting `makeRoot(prefix)` (mkdtemp wrapper), `writeGraphPackage(root, folder, manifest, now)` (timestamp as required param so per-test values are preserved), `errorCode(fn)`
- Replace the local definitions in the five test files with imports; keep dispatcher.test.ts's extra workflow.json bootstrap local to that file
- Keep per-test `try/finally` rmSync cleanup unchanged; do NOT add global afterEach

**Verify:**
- `npx vitest run` full suite (<2 min — all five suites touched)

**Test Budget:** +0; test-refactor only

**Test Pruning:**
- delete the now-unused local helper definitions entirely

**Commit:** `git commit -m "Consolidate shared test scaffolding into tests/helpers/setup"`

### Task 6: Add direct storage.ts tests
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `tests/storage.test.ts` (new)

**Work:**
- Test 1 (happy path): checkpoint write → read round-trip via the public storage functions, plus current-run focus read/write in one test
- Test 2 (error path): corrupt JSON on disk → reading throws `RipplegraphError` with code `E_BAD_JSON`

**Verify:**
- `npx vitest run tests/storage.test.ts` (<30s)

**Test Budget:** +2 in tests/storage.test.ts; focused (<30s) — error path cannot be combined with the happy-path round-trip

**Test Pruning:**
- confirm coach/dispatcher tests don't already assert E_BAD_JSON directly; if one does, reference rather than duplicate

**Commit:** `git commit -m "Add direct tests for storage checkpoint persistence"`

### Task 7: Add direct schema.ts tests
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `tests/schema.test.ts` (new)

**Work:**
- Test 1 (accept): a representative valid graph/manifest parses through the exported zod schemas
- Test 2 (reject): malformed input (e.g. bad node edge ref or invalid schema field) fails with the expected issue path/message

**Verify:**
- `npx vitest run tests/schema.test.ts` (<30s)

**Test Budget:** +2 in tests/schema.test.ts; focused (<30s) — accept and reject paths are distinct contracts

**Test Pruning:**
- graph-package.test.ts already covers manifest-level validation; target schema.ts exports not covered there

**Commit:** `git commit -m "Add direct tests for schema validation"`

### Task 8: Final verification
**Mode:** lightweight
**Skills:** []
**Files:** none (verification only; `dist/` if build output drifts)

**Work:**
- `npx vitest run` (full suite)
- `npm run build` (tsc) — confirm clean compile; regenerate dist/ if the repo convention is to commit it alongside src changes
- `git diff <pre-assignment>..HEAD -- src/index.ts` and compare `dist/index.d.ts` export list — public API unchanged except nothing removed/added
- grep checks from Tasks 2-3 still hold

**Verify:**
- `npx vitest run && npm run build` (<2 min)

**Test Budget:** +0; verification only

**Test Pruning:**
- none

**Commit:** `git commit -m "Rebuild dist after tidy-up refactor"` (only if dist/ changed)
