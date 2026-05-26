## Round 1

- Addressed [F1.1] by adding an explicit focus/storage decision to the
  brainstorm proposal and design.
- The design now says Ripplegraph keeps one primary focused workflow; a frozen
  origin remains focused rather than becoming suspended.
- Added a workspace-level activity log as the cross-cutting audit sequence,
  separate from per-run transition logs and per-call logs.
- Clarified that support graph work in the initial roadmap should use
  callable-style execution or activity records pointing at callable logs, not a
  second focused workflow run.
- Added an optional deferred follow-up for true multi-workflow support/focus
  stacks if a later product proves callable-style support graphs are
  insufficient.
