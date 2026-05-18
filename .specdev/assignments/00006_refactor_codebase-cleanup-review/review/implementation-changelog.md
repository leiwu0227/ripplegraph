# Implementation Changelog

Tracks changes made in response to implementation review feedback.

(No prior rounds — this is the initial implementation review.)

## Round 1

- Addressed the premature review state issue by completing
  `breakdown/plan.md` and executing all six implementation tasks.
- Created shared CLI helpers in `src/internal/cli-helpers.ts` and updated both
  CLIs while preserving their output contracts.
- Split `src/coach.ts` helpers into internal graph, validation, response, and
  transition modules.
- Added shared test workflow builders in `tests/helpers/workflows.ts`.
- Added a template/example workflow drift test and recorded final scan notes in
  `implementation/cleanup-review.md`.
- Ran and passed `npm run typecheck`, `npm test`, `npm run build`, and
  `npm pack --dry-run`.
