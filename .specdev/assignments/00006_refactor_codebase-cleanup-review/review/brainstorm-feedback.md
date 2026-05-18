# Brainstorm Review Feedback

## Round 1

**Reviewer focus:** Architecture & structure — modularity, separation of concerns, API design, dependency direction.

### Verification of findings against actual codebase

All six findings in design.md were verified against source:

1. **CLI helper duplication (Finding 1)** — Confirmed. `src/cli.ts` and
   `src/demo-cli.ts` both define `ParsedArgs`, `parseArgs`, `stringFlag`,
   `workflowRoot`, required-value handling, JSON parsing, and error formatting.
   Notable intentional differences exist: demo-cli's `ParsedArgs` includes
   `positional`, its `parseOutput` supports `--file` and positional args, and
   error output goes to stderr as text vs cli.ts emitting JSON to stdout. The
   design correctly identifies the common parsing core vs. intentionally
   divergent rendering.

2. **coach.ts mixed responsibilities (Finding 2)** — Confirmed. 414 lines
   containing: public lifecycle ops (7 exported functions), graph/node lookup,
   edge selection, hand-rolled output validation, state rendering, context
   shaping, resumable-run summaries, and transition-entry construction. All
   private helpers are tightly coupled through shared `Checkpoint` state.

3. **Output validation vs Zod (Finding 3)** — Confirmed. `validateOutput` /
   `validateValue` / `matchesType` (coach.ts:347-379) implement a minimal
   JSON Schema subset. Zod is used only in schema.ts for workflow definition
   parsing. The design correctly notes the deliberate subset scope.

4. **Test fixture repetition (Finding 4)** — Confirmed. Three independent
   `makeRoot()` functions plus one additional inline workflow in the storage
   test. Workflows are similar but not identical (different edge structures,
   different graph counts) — a builder must accommodate this variation.

5. **Template/example drift (Finding 5)** — Partially confirmed.
   `templates/minimal/workflow.json` and `examples/minimal/workflow.json` are
   **identical** — no drift there. The drift is exclusively in AGENT.md:
   templates/minimal/AGENT.md is a detailed step-by-step agent guide while
   examples/minimal/AGENT.md is an abbreviated quickstart. The design says
   "agent instructions have already drifted" which is correct, but it would
   be more precise to note that workflow.json has zero drift — only the
   AGENT.md files differ.

6. **No dead source files (Finding 6)** — Confirmed. Source is exactly
   `src/cli.ts`, `src/demo-cli.ts`, `src/coach.ts`, `src/schema.ts`,
   `src/storage.ts`, `src/index.ts`. `index.ts` re-exports everything from
   all three modules via `export *`.

### Structural observations

**Public API surface is implicit.** `src/index.ts` does `export *` from
schema.ts, storage.ts, and coach.ts, making every exported symbol in those
files part of the public API — including storage internals like `stateDir`,
`runsDir`, `currentPath`, `runDir`, `checkpointPath`, `transitionLogPath`,
`artifactPath`, `ensureWorkflowRoot`, `loadWorkflow`, `readCurrent`,
`writeCurrent`, `readCheckpoint`, `writeCheckpoint`, `writeNodeOutput`,
`appendTransition`, and `listRunIds`. The design mentions "preserving the
public exports from `src/index.ts`" but does not discuss whether all of
these _should_ remain public. This matters because cleanup that splits
coach.ts into smaller modules will add or rearrange exports, and the
breakdown phase needs guidance on what's load-bearing public API vs.
incidental exposure.

**Recommendation:** The design should add a brief note clarifying which
exports are intentionally public (the coach lifecycle functions, the schema
types, `RipplegraphError`) versus which are exposed as a side effect of
`export *` and could be made internal during cleanup. This prevents the
breakdown from accidentally treating all 20+ storage helpers as frozen API.

### Assessment

**Strengths:**
- Findings are concrete, specific, and verified — no phantom issues
- Non-goals are well-chosen and protect the v0 runtime contract
- Staged risk approach (consolidate first, split second, large refactors
  only with justification) is sound
- Success criteria include specific verification commands (`npm run typecheck`,
  `npm test`) and behavioral contracts

**Minor notes (non-blocking):**
- Finding 5 should clarify that workflow.json has zero drift — drift is
  AGENT.md only
- The validation extraction direction (Finding 3) is left as an either/or
  — a recommendation would help the breakdown, though both directions are
  viable
- coach.ts split (Finding 2) doesn't discuss the risk of splitting tightly
  coupled private functions (e.g., `focusedCheckpoint`, `completeRun`,
  `stateForCheckpoint` all share `Checkpoint` state) — worth a sentence on
  expected module boundaries

**Blocking:**
- The design should address the `export *` / public API surface question
  before the breakdown phase. Without it, the implementer won't know which
  exports are frozen and which can be internalized during module splits.

**Verdict:** needs-changes

## Round 2

**Reviewer focus:** Verify round 1 fixes, re-check accuracy against current source, assess readiness for breakdown.

### Round 1 fix verification

All four changelog items verified against design.md and source:

1. **Public API guidance (blocking fix)** — Lines 55-64 now explicitly name
   coach lifecycle/query functions, schema/runtime types, and
   `RipplegraphError` as intentional public surface. Storage helpers are
   acknowledged as incidentally exported via `export *` and explicitly noted
   as not constraining internal module splits. Cross-checked against
   `src/index.ts` (`export *` from schema/storage/coach) and the full
   storage.ts export list (14 exported symbols). The guidance is sufficient
   for the breakdown phase to make import/export decisions without guessing.

2. **coach.ts split boundaries (minor fix)** — Lines 83-86 now specify four
   boundary candidates: graph navigation, output validation, response/context
   shaping, and transition construction. The caveat that tightly coupled
   lifecycle state transitions should stay together is present. Verified
   against coach.ts: `focusedCheckpoint`, `completeRun`, `stateForCheckpoint`
   do share `Checkpoint` state and call each other — keeping them together is
   the right call.

3. **Validation guidance (minor fix)** — Lines 91-94 now recommend extracting
   behind an internal module first, replacing only if a concrete defect
   justifies it. No longer ambiguous.

4. **Template/example drift (minor fix)** — Lines 101-104 correctly state
   `workflow.json` is identical (confirmed via diff) and only `AGENT.md`
   differs.

### Re-verification of findings against current source

All six findings re-confirmed against the current codebase state. No source
changes since round 1 that would invalidate any claim.

- CLI duplication: `cli.ts` (127 lines) and `demo-cli.ts` (202 lines) still
  share `ParsedArgs`, `parseArgs`, `stringFlag`, `workflowRoot` with
  intentional divergence in output rendering (JSON vs text) and argument
  handling (positional args, `--file`).
- coach.ts: 414 lines, 8 exported functions, 7 exported interfaces, 3
  exported type aliases, 9 private helpers. Responsibilities unchanged.
- Output validation: `validateOutput`/`validateValue`/`matchesType` at lines
  347-380 of coach.ts. Zod still confined to schema.ts.
- Test fixtures: Three independent `makeRoot()` functions (coach.test.ts,
  cli.test.ts, demo-cli.test.ts) plus one inline workflow in the storage
  test block. Workflows are similar but not identical — the design correctly
  notes this variation.
- Template/example: `workflow.json` identical, `AGENT.md` differs (template
  is a detailed step-by-step protocol; example is an abbreviated quickstart).
- No dead source files. Six source files, all active.

### Assessment

The round 1 blocking issue (public API surface guidance) has been resolved.
All three minor notes have been addressed. The design is accurate against the
current codebase, provides clear direction for each finding, and the staged
approach (consolidate → split → larger refactors only with justification)
gives the breakdown phase enough structure without over-prescribing.

One observation for the breakdown phase (non-blocking): coach.ts exports 8
functions plus 10 interface/type definitions. The design's "coach
lifecycle/query functions" language implicitly includes the option and
response types (`WorkflowRootOptions`, `StateOk`, `RunList`, etc.) since
callers need them. The breakdown author should treat these as load-bearing
public surface alongside the functions themselves.

**Verdict:** approved
