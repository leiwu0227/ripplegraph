# Engineering playbook

## Change types

- `bugfix`: The current behavior is wrong, throws an error, loses data, or
  blocks a documented workflow.
- `feature`: The request asks for a new behavior or capability.
- `refactor`: The request asks to simplify, deduplicate, or improve structure
  while preserving behavior.
- `question`: The request asks for explanation, diagnosis, or tradeoff
  guidance rather than a code change.

## Risk

- `high`: Public API, persistence, security, data migration, or broad runtime
  behavior changes.
- `medium`: Shared code paths, CLI contracts, or behavior that needs focused
  tests.
- `low`: Docs, examples, narrow templates, or isolated internal cleanup.

## Routing

- Bugfixes need a reproduction path, expected behavior, and regression test.
- Features need a small scope, explicit non-goals, and user-visible acceptance
  criteria.
- Refactors need a simplification target, preserved behavior, and verification
  plan.
- Questions need a direct answer plus any uncertainty or follow-up evidence.
