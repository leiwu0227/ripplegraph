Review and clean up the entire ripplegraph codebase, including runtime source,
CLIs, tests, templates, examples, and bin entrypoints. The goal is to remove
real maintenance drag: dead or unnecessary code, repeated helpers and fixtures,
mixed responsibilities, weak module boundaries, and design choices that make the
v0 runtime harder to reason about than necessary.

The cleanup will use a staged approach: first scan the repository and document
prioritized findings, then implement justified cleanup slices while preserving
existing functionality. Larger architectural refactors are allowed only when
they include clear reasoning, a compatibility story, and verification evidence.

Initial scan findings already justify the assignment: `src/cli.ts` and
`src/demo-cli.ts` duplicate argument parsing, flag extraction, required-value
checks, JSON parsing, and error formatting; `src/coach.ts` combines public
runtime operations, graph lookup, edge matching, output validation, state
rendering, previous-node context shaping, and transition entry construction in a
single module; tests repeat inline workflow fixtures instead of sharing small
builders; and `templates/minimal` and `examples/minimal` contain intentionally
similar workflow packages whose drift should be reviewed and either documented
or reduced.
