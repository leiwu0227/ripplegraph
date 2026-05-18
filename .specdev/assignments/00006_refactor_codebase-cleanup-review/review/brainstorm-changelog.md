# Brainstorm Changelog

Tracks changes made in response to review feedback.

(No prior rounds — this is the initial review.)

## Round 1

- Added explicit public API guidance to `brainstorm/design.md`: coach
  lifecycle/query functions, schema/runtime types, and `RipplegraphError` are
  treated as intentional public surface, while storage helpers exposed through
  `export *` should not automatically freeze internal cleanup decisions.
- Clarified the expected `coach.ts` split boundaries around graph navigation,
  output validation, response/context shaping, and transition construction,
  while allowing tightly coupled lifecycle state transitions to remain together.
- Made output validation guidance more concrete: prefer extracting the current
  minimal validator behind an internal module with tests; only replace it if a
  concrete defect or simplification justifies broader change.
- Corrected the template/example finding to state that `workflow.json` files are
  identical and only `AGENT.md` differs.
