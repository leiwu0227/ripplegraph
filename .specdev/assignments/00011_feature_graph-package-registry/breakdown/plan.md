# Graph Package Registry Foundation Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add the graph package loader and registry foundation so Ripplegraph can validate, register, and list self-contained `graph.json` package folders.

**Architecture:** Keep the current compact `workflow.json` runtime intact while adding a separate flat graph package manifest contract. Derive compact graph schemas and package manifest schemas from shared graph fields/refinement logic, then layer registry persistence and CLI commands on top. Keep modules small and direct: schema owns validation shapes, graph-package owns package-folder loading, registry owns `.ripplegraph/registry.json`, CLI only parses commands and emits payloads.

**Tech Stack:** TypeScript / Node.js, Zod, filesystem JSON state, Vitest, existing CLI helper utilities.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks. This is enough for manifest validation, registry behavior, CLI contract, and regression without bloating a foundation slice.

---

### Task 1: Package manifest schema and loader
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/schema.ts`, `src/graph-package.ts`, `src/index.ts`, `tests/graph-package.test.ts`

**Work:**
- Refactor `src/schema.ts` so graph fields and graph reference validation are shared by `graphSchema` and a new flat `graphPackageManifestSchema`.
- Keep compact `workflow.json` graph parsing behavior unchanged: graph ids still come from the `graphs` record key.
- Add `GraphPackageManifest` type export.
- Add `src/graph-package.ts` with pure helpers for `graphPackagePath`, `loadGraphPackage`, and package validation errors.
- Require package folders to contain `graph.json`; reject missing folders/files, invalid JSON, invalid ids/versions, unknown entry nodes, and unknown edge targets with `RipplegraphError` codes.
- Export the public package helpers from `src/index.ts`.

**Verify:**
- `npm test -- tests/graph-package.test.ts`
- `npm run typecheck`

**Test Budget:** +2 in `tests/graph-package.test.ts`; focused (<30s) - one valid package test and one invalid package/error-path test.

**Test Pruning:**
- Reuse existing graph fixture shapes from `tests/helpers/workflows.ts` where possible instead of duplicating large manifest objects.

**Commit:** `git commit -m "Add graph package manifest loader"`

### Task 2: Registry storage operations
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/registry.ts`, `src/storage.ts`, `src/index.ts`, `tests/registry.test.ts`

**Work:**
- Add `.ripplegraph/registry.json` path helpers without changing existing current/run/workflow paths.
- Define a small registry schema with `version: 1` and `graphs` keyed by package id.
- Implement `readRegistry`, `writeRegistry`, `listRegisteredGraphs`, and `registerGraphPackage`.
- Registration must validate the package first, create the registry when missing, store sorted deterministic entries, and preserve metadata needed for future dispatch: id, version, kind, title, description, activationHints, effects, path, registeredAt.
- Store paths relative to the workflow root when possible; otherwise store absolute paths.
- Duplicate behavior: same id and same normalized path updates; same id and different path fails unless `force` is true.

**Verify:**
- `npm test -- tests/registry.test.ts`
- `npm run typecheck`

**Test Budget:** +2 in `tests/registry.test.ts`; focused (<30s) - one create/list/update path and one duplicate conflict path.

**Test Pruning:**
- Keep registry tests at the public helper level; do not add separate tests for every private path helper.

**Commit:** `git commit -m "Add graph registry storage"`

### Task 3: JSON CLI graph commands
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/cli.ts`, `src/internal/cli-helpers.ts`, `tests/cli.test.ts`

**Work:**
- Add low-level JSON CLI support for:
  - `ripplegraph graph validate <path> [--workflow-root <path>]`
  - `ripplegraph graph register <path> [--workflow-root <path>] [--force]`
  - `ripplegraph graph list [--workflow-root <path>]`
- Keep existing commands and output unchanged.
- Emit machine-readable success payloads: `graph validate` returns status plus package summary, `graph register` returns status plus registry entry, and `graph list` returns sorted entries.
- Use existing `jsonErrorPayload` behavior for command and validation errors.
- Update help text to show graph management commands as management/debug commands.

**Verify:**
- `npm test -- tests/cli.test.ts`
- `npm run typecheck`

**Test Budget:** +1 in `tests/cli.test.ts`; focused (<30s) - one CLI flow that validates, registers, lists, and checks a conflict or invalid command path if it can be kept compact.

**Test Pruning:**
- Extend the current CLI test file rather than adding a new CLI harness.

**Commit:** `git commit -m "Add graph registry CLI commands"`

### Task 4: Documentation and compatibility pass
**Mode:** lightweight
**Skills:** []
**Files:** `README.md`, `.specdev/project_notes/big_picture.md`, `.specdev/assignments/00011_feature_graph-package-registry/implementation/progress.json`

**Work:**
- Update README architecture/command documentation to distinguish implemented registry commands from future dispatcher/callable runtime work.
- Update big picture only if implementation details materially change the current architecture note.
- Create/update implementation progress so SpecDev can track task completion.
- Do not modify `.specdev/project_notes/thoughts/ripplegraph_architecture.html` unless the implemented contract diverges from the documented architecture.

**Verify:**
- `rg "graph validate|graph register|graph list|dispatch" README.md .specdev/project_notes/big_picture.md`
- `specdev next --json`

**Test Budget:** +0; text-only.

**Test Pruning:**
- Remove stale wording instead of adding duplicate command descriptions.

**Commit:** `git commit -m "Document graph registry foundation"`

### Task 5: Final verification and implementation review
**Mode:** lightweight
**Skills:** []
**Files:** `.specdev/assignments/00011_feature_graph-package-registry/implementation/progress.json`, `.specdev/assignments/00011_feature_graph-package-registry/review/implementation-feedback.md`, `.specdev/assignments/00011_feature_graph-package-registry/review/implementation-changelog.md`

**Work:**
- Run final verification across typecheck and tests.
- Run `specdev checkpoint implementation`.
- Run `specdev reviewloop implementation --reviewer=codex --autocontinue`.
- Address review findings through `specdev check-review implementation` until approved.
- Commit any review fixes separately before moving to the next roadmap assignment.

**Verify:**
- `npm run typecheck`
- `npm test`
- `specdev checkpoint implementation`
- `specdev reviewloop implementation --reviewer=codex --autocontinue`

**Test Budget:** +0; verification-only.

**Test Pruning:**
- If review identifies duplicate tests added in earlier tasks, prune before approval rather than carrying redundant coverage.

**Commit:** `git commit -m "Approve graph package registry implementation"`
