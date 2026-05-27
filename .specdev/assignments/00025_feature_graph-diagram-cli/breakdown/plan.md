# Graph Diagram CLI Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add `ripplegraph graph diagram <packageRoot> [--format=mermaid|dot]` as a text schematic exporter for graph packages.

**Architecture:** Add a reusable formatter module that renders a validated `GraphPackageManifest` to Mermaid or DOT. Wire it into the existing `graph` CLI command family with raw text stdout for successful diagram output while retaining JSON error handling. Document the command and text-first rendering stance.

**Tech Stack:** TypeScript / Node.js, Zod-validated graph package manifests, Vitest.

**Execution Mode:** inline

**Test Budget:** ≤ 3 new tests across all tasks.

---

### Task 1: Add Diagram Formatter
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/graph/diagram.ts`, `src/index.ts`, `tests/graph-diagram.test.ts`

**Work:**
- Add `renderGraphDiagram(manifest, format)` supporting `mermaid` and `dot`.
- Include graph header, entry/gate/terminal annotations, side-channel action IDs, and edge `when` labels.
- Escape labels deterministically and generate stable diagram node IDs from graph node IDs.
- Export the formatter from `src/index.ts`.

**Verify:**
- `npx vitest run tests/graph-diagram.test.ts`

**Test Budget:** +2 in `tests/graph-diagram.test.ts`; focused (<30s) — one Mermaid contract test and one DOT contract test.

**Test Pruning:**
- No nearby diagram tests exist; add focused contract tests only.

**Commit:** `git commit -m "Add graph diagram formatter"`

### Task 2: Wire CLI Command
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** `src/cli.ts`, `tests/cli.test.ts`

**Work:**
- Add `graph diagram <packageRoot> [--format=mermaid|dot]`.
- Default to Mermaid when `--format` is omitted.
- Emit raw diagram text to stdout on success, not JSON.
- Return a clear `RipplegraphError` for invalid formats.
- Update CLI help text.

**Verify:**
- `npx vitest run tests/cli.test.ts`

**Test Budget:** +1 in `tests/cli.test.ts`; focused (<30s) — cover raw stdout for Mermaid and DOT plus invalid format in one CLI test.

**Test Pruning:**
- Reuse existing CLI helper patterns; do not add redundant validate/register coverage.

**Commit:** `git commit -m "Expose graph diagram CLI"`

### Task 3: Document And Verify
**Mode:** lightweight
**Skills:** []
**Files:** `README.md`, `.specdev/assignments/00025_feature_graph-diagram-cli/implementation/progress.json`

**Work:**
- Document `graph diagram`, `--format=mermaid|dot`, and the no-image-rendering stance in README.
- Run final focused verification and implementation checkpoint.
- Record SpecDev implementation progress.

**Verify:**
- `npm run typecheck`
- `npm test`
- `specdev checkpoint implementation`

**Test Budget:** +0; final verification only

**Test Pruning:**
- No new tests for documentation.

**Commit:** `git commit -m "Document graph diagram CLI"`
