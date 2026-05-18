# Codebase Cleanup Review

## Verified Findings

1. `src/cli.ts` and `src/demo-cli.ts` duplicate argument parsing, flag lookup,
   workflow-root handling, required-value checks, JSON parsing, and Ripplegraph
   error formatting. Their rendering contracts differ and should remain local to
   each CLI.
2. `src/coach.ts` mixes public lifecycle operations with graph lookup, branch
   selection, output validation, state response construction, resumable run
   summaries, and transition-log entry construction.
3. Output validation is a small hand-rolled JSON-schema subset. It should be
   isolated and tested rather than replaced without a concrete reason.
4. Tests repeat workflow JSON setup across CLI, coach, and demo CLI coverage.
5. `templates/minimal/workflow.json` and `examples/minimal/workflow.json` are
   identical. Their `AGENT.md` files differ intentionally in depth: the template
   is a reusable agent protocol and the example is a quickstart.
6. No obvious dead source files were found in the first scan. Source is
   concentrated in `src/cli.ts`, `src/demo-cli.ts`, `src/coach.ts`,
   `src/schema.ts`, `src/storage.ts`, and `src/index.ts`.

## Public API decision

Keep current package exports compatible during this cleanup. `src/index.ts`
currently re-exports schema, storage, and coach modules with `export *`; this
means storage helpers are externally reachable today. This assignment will not
remove those existing exports, but newly extracted internal helper modules must
remain internal and must not be exported from `src/index.ts`.

The intentionally public surface for future API design is the coach lifecycle
and query functions, schema/runtime types, and `RipplegraphError`. Existing
storage exports are retained as compatibility surface for this cleanup, not as a
signal that every future storage helper should become public.

## Deferred

- Narrowing `src/index.ts` to only intentional public exports is deferred. It is
  a breaking API decision and should be handled in a dedicated assignment with
  migration notes if desired.
- Replacing the JSON-schema subset validator with a third-party validator is
  deferred. The current cleanup will isolate and test existing semantics first.
- Unifying the template and example `AGENT.md` files is deferred unless later
  implementation finds accidental inconsistency. Their different depth appears
  useful: one is an installable protocol, the other is a quickstart.

## Final scan notes

- No dead source files were found after cleanup. All files under `src/` are
  either package entrypoints, public runtime/schema/storage modules, or internal
  helpers imported by those entrypoints.
- New internal helper modules are not re-exported from `src/index.ts`.
- `templates/minimal/workflow.json` and `examples/minimal/workflow.json` remain
  intentionally identical and are covered by a test.
- `process.exit(1)` remains in CLI entrypoints and bin wrappers as expected
  command-line failure behavior.
