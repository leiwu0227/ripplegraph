## Overview

This assignment will review and clean up the entire ripplegraph codebase,
including runtime source, CLIs, tests, templates, examples, and bin entrypoints.
The goal is not cosmetic churn; it is to find and remove real maintenance drag:
dead or unnecessary code, repeated helpers and fixtures, mixed responsibilities,
weak module boundaries, and design choices that make the v0 runtime harder to
reason about than it needs to be.

The cleanup will use a staged approach. First, it will scan the repo and produce
a prioritized set of concrete findings. Then it will implement the justified
cleanups in focused slices, preserving current behavior unless there is an
explicit reason to change it. Larger architectural refactors are allowed, but
each must explain the problem it solves, why a smaller change is insufficient,
and how tests or compatibility checks show functionality was not meaningfully
reduced.

## Non-Goals

This assignment will not redesign ripplegraph's product model or change the core
promise that deterministic graph flow controls agent execution. It will not add
new major runtime features such as registries, subgraph composition, free latch
entry nodes, external LLM SDK calls, or richer workflow authoring unless a tiny
supporting adjustment is necessary for cleanup.

It will not intentionally reduce existing public behavior in the low-level
`ripplegraph` CLI, the reference `ripplegraph-demo` CLI, filesystem state layout
under `.ripplegraph/`, packaged templates, or examples. Any behavior change must
be called out as a deliberate simplification with clear reasoning and matching
test updates. This assignment also will not treat generated build output in
`dist/` or installed dependencies in `node_modules/` as source cleanup targets,
though build output may be regenerated if the implementation phase requires it.

## Design

The cleanup will start with a repository-wide review pass that classifies
findings by impact and risk: remove, consolidate, split, tighten, or leave
alone. The current likely targets are shared CLI parsing/error/output helpers
duplicated between `src/cli.ts` and `src/demo-cli.ts`; the broad `src/coach.ts`
module, which mixes run lifecycle, graph navigation, output validation, response
shaping, and transition logging; repeated test workflow fixtures; and drift
between packaged templates and examples. Each proposed cleanup should include
the specific files affected, the behavior expected to remain stable, and the
verification command that proves it.

Implementation should proceed in slices. Low-risk consolidation can happen
first, such as shared CLI utilities and reusable test fixture builders.
Medium-risk changes can then split runtime internals into clearer modules, for
example validation/edge selection/state rendering helpers. Larger refactors are
acceptable only if the review shows they reduce coupling or simplify future
SpecDev-style workflow evolution. Tests should protect the current CLI output
contracts, run lifecycle behavior, validation failures, persistence layout, and
template/example usability.

Public API cleanup needs explicit treatment. `src/index.ts` currently uses
`export *` from `schema.ts`, `storage.ts`, and `coach.ts`, which makes storage
path helpers and low-level read/write functions public by accident as much as by
design. For this assignment, the intentionally public surface should be treated
as the coach lifecycle/query functions, schema/runtime types, and
`RipplegraphError`. Storage helpers may stay exported during this cleanup if
tests or package compatibility make that the lower-risk choice, but they should
not automatically constrain internal module splits. Any decision to keep,
remove, or narrow these incidental exports must be called out in the breakdown
and protected by typecheck/tests.

## Initial Findings

1. CLI helper duplication is visible in `src/cli.ts` and `src/demo-cli.ts`.
   Both files define their own `ParsedArgs`, `parseArgs`, `stringFlag`,
   workflow-root handling, required argument handling, JSON parsing, output
   emission, and Ripplegraph error formatting. The two CLIs intentionally render
   different user interfaces, but the parsing and error plumbing are common
   enough to justify a shared internal helper if that can be done without making
   either CLI harder to read.

2. `src/coach.ts` is carrying too many responsibilities for a runtime module.
   It currently exposes lifecycle operations while also owning focused-run
   loading, graph/node lookup, branch selection, JSON-schema-like output
   validation, response construction, previous/next context shaping, resumable
   run summaries, and transition-log entry construction. This does not appear
   broken, but it makes future changes riskier because unrelated runtime
   concepts are edited in one file. A justified cleanup would split private
   helpers into focused modules around stable boundaries: graph navigation,
   output validation, response/context shaping, and transition construction.
   Highly coupled lifecycle state transitions can remain together unless the
   review finds a clearer split.

3. Output validation is hand-rolled inside `src/coach.ts` even though workflow
   schemas are parsed with Zod in `src/schema.ts`. The current validator supports
   a deliberately small JSON-schema subset, so replacing it wholesale may be
   unnecessary. The preferred cleanup is to isolate it behind a clear internal
   module and add focused tests for current semantics. A broader validation
   replacement should only happen if the review finds a concrete defect or a
   compelling simplification.

4. Test workflows are repeated inline across `tests/cli.test.ts`,
   `tests/coach.test.ts`, and `tests/demo-cli.test.ts`. This duplication makes
   behavior contracts harder to update consistently. A small fixture builder can
   reduce repetition while keeping tests explicit about the scenario they cover.

5. `templates/minimal` and `examples/minimal` intentionally overlap. Their
   `workflow.json` files are currently identical, while their `AGENT.md` files
   differ: the template contains a detailed agent protocol and the example is an
   abbreviated quickstart. The cleanup should decide whether that documentation
   difference is intentional. It should preserve or check identical workflow
   content so accidental workflow drift is caught.

6. No obvious dead source files appeared in the first scan: source is currently
   concentrated in `src/cli.ts`, `src/demo-cli.ts`, `src/coach.ts`,
   `src/schema.ts`, `src/storage.ts`, and `src/index.ts`. The cleanup should
   still verify exported symbols and package entrypoints before declaring dead
   code absent.

## Success Criteria

The assignment is complete when the repo has a documented cleanup review, the
justified cleanup slices have been implemented, and current functionality is
preserved. The final result should make the codebase simpler to navigate without
weakening the v0 runtime contract: workflows still validate, focused runs still
start/step/suspend/resume/abandon correctly, terminal nodes still complete runs,
invalid outputs do not advance checkpoints, state remains under `.ripplegraph/`,
and both CLIs still behave as tested.

Verification should include `npm run typecheck`, `npm test`, and any focused
checks added during cleanup. Tests should be added or adjusted where cleanup
touches shared behavior, public command output, storage paths, validation
semantics, or template/example contracts. The implementation notes should
explicitly list any larger refactor, the reason it was justified, and the
evidence that it preserved behavior. Dead code or duplication findings that are
intentionally not changed should be documented with a reason so they are not
rediscovered as ambiguous leftovers.
