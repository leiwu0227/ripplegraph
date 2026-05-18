# Implementation Review Feedback

## Round 1

**Reviewer focus:** Architecture & structure — review modularity, separation of concerns, API design, and dependency direction. Identify structural issues.

### State assessment

The assignment is currently in the `breakdown_in_progress` state. No
implementation work has been done:

- **No `breakdown/plan.md` exists.** The breakdown phase has not been
  completed, so there is no task plan to execute against.
- **No source file changes.** `git diff HEAD -- src/ tests/ templates/
  examples/ bin/ package.json tsconfig.json` shows zero changes. All six
  source files match the pre-cleanup state documented in the brainstorm
  design:
  - `src/cli.ts` — 127 lines, unchanged
  - `src/demo-cli.ts` — 201 lines, unchanged
  - `src/coach.ts` — 413 lines, unchanged
  - `src/schema.ts` — 142 lines, unchanged
  - `src/storage.ts` — 152 lines, unchanged
  - `src/index.ts` — 3 lines (`export *` from schema, storage, coach), unchanged
- **No new modules created.** No CLI helpers, validation extractors, test
  fixture builders, or coach split modules exist.
- **No test changes.** Tests are in their original state with duplicated
  inline `makeRoot()` fixtures.
- **No template/example changes.** `templates/minimal` and
  `examples/minimal` are untouched.
- **`specdev next --json` confirms** state is `breakdown_in_progress` with
  next action `breakdown.create_plan`.

### All six design findings remain unaddressed

1. **CLI helper duplication** — `cli.ts` and `demo-cli.ts` still both define
   `ParsedArgs`, `parseArgs`, `stringFlag`, workflow-root handling, required
   argument handling, JSON parsing, output emission, and error formatting.
   No shared helper module has been created.

2. **coach.ts mixed responsibilities** — Still a single 413-line module
   containing lifecycle ops, graph/node lookup, edge selection, output
   validation, state rendering, context shaping, run summaries, and
   transition-entry construction. No split has occurred.

3. **Output validation not extracted** — `validateOutput`, `validateValue`,
   and `matchesType` remain inline in coach.ts. No dedicated validation
   module exists.

4. **Test fixture repetition** — Three independent `makeRoot()` functions
   and one additional inline workflow remain across test files. No shared
   fixture builder has been created.

5. **Template/example drift** — No review or documentation of the
   intentional `AGENT.md` difference between `templates/minimal` and
   `examples/minimal`. No drift check added.

6. **Public API surface** — `src/index.ts` still does `export *` from all
   three modules. No narrowing or explicit export list has been introduced.

### Verdict

The implementation review cannot proceed because no implementation exists.
The assignment must first complete the breakdown phase (create
`breakdown/plan.md`) and then execute the implementation tasks before this
review can assess the quality, correctness, and completeness of changes.

**Verdict:** needs-changes
