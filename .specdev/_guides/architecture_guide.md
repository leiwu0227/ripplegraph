# Protected architecture guide

Active Markdown directly under `project_notes/architecture/` is sparse,
user-approved project authority. `project_notes/architecture/legacy/` is
superseded history and must never be treated as binding. Living notes under
`knowledge/codebase/` are verified, revisable implementation facts; they cannot
authorize a conflict with active protected architecture.

Ordinary Brainstorms read only relevant active notes and conform to them or
surface a conflict. They do not create an architecture note. Load this guide
only when the user explicitly requests a new or replacement protected note, or
when current work may conflict with an active note.

## Publication workflow

1. Classify the request as either adopting a binding target during Brainstorm or
   capturing architecture verified in current code.
2. Read the relevant active notes directly under `project_notes/architecture/`.
   Exclude `legacy/` from authority. Search `knowledge/codebase/` only as
   revisable evidence and verify relevant facts in current code.
3. For a current-code capture, inspect a bounded set of relevant source files
   and record the verified Git revision and source paths in the draft.
4. Compare the request and verified evidence with active protected notes. If a
   conflict exists, stop and show the existing standard, requested standard,
   and explicit choices to keep the active standard, replace it, or revise or
   cancel the request. Observed code drift cannot silently legitimize itself.
5. After conflicts are resolved, show the exact active destination and the full
   draft. Wait for explicit user approval of both. If any draft byte or the
   destination changes, show the complete revised draft and ask again.
6. Publish only the approved paths. Never seed, infer, bulk-promote, or generate
   a protected note merely because a Brainstorm or knowledge curation occurred.

## Status lifecycle and replacement

Every protected note contains exactly one visible status line:

- `Status: proposed` is an approved, immediately binding target whose current
  code conformance has not yet passed authorized evidence.
- `Status: implemented` is a binding decision whose current code conformance
  has passed authorized evidence.
- `Status: drifted` is a binding alarm that verified current code conflicts with
  the decision. It is a remediation target, never permission to preserve or
  deepen the divergence.
- `Status: deprecated` is non-binding history and is valid only under
  `project_notes/architecture/legacy/`.

New active notes may start only as `proposed` or `implemented`. A failed or
blocked implementation leaves `proposed` in force. After authorized evidence,
an exact approved status-only publication may move `proposed -> implemented`,
`implemented -> drifted`, or `drifted -> implemented`; it creates no legacy
copy. Existing active `binding-proposed` and `binding-aligned` statuses remain
readable aliases for `proposed` and `implemented`. Their exact approved
normalization is also status-only and creates no legacy copy. New publications
must use the current vocabulary.

For a substantive replacement, hash the exact prior active file bytes with
SHA-256 and archive them as
`project_notes/architecture/legacy/<stem>--<first-12-hex>.md`, changing only the
single status line to `Status: deprecated`. The receipt, Git parent, and path
retain provenance to the exact prior bytes. If that archive already exists with
the deterministic deprecated bytes, treat the retry as converged. An exact
untransformed archive written by the legacy publisher is also compatible and
remains unchanged. Any other collision stops publication without overwrite.
Publish the approved replacement as `proposed` or `implemented`; never author a
replacement as `drifted` or an active note as `deprecated`.

An explicitly approved rename is a protected replacement with a new active
identity. Put `move_from.path` and `move_from.previous_hash` on the absent new
destination in the version-1 publication proposal. The source and destination
must be distinct active Markdown paths, and no proposal path may participate in
another semantic change. If only the leading Markdown heading and an equivalent
legacy status alias change, preserve the source's semantic `proposed`,
`implemented`, or `drifted` status. Otherwise apply the substantive-replacement
status rules above. The publisher binds one `architecture_rename` relation,
then creates or reuses the clean compatible archive before writing the new
active path and removing the old one. Resume only from exact approved prior or
resulting hashes; unknown bytes or unrelated Git movement require explicit
recovery.

## Durable Git boundary

Repository instructions remain authoritative. After exact content approval,
stage only the approved active destination and, for replacement, its exact
legacy archive path. Inspect the staged diff and refuse the checkpoint if it
contains product code or any unrelated path. Commit this architecture-only
change before related implementation begins so a binding target survives a
blocked or failed implementation. A later approved status-only conformance
change is another architecture-only checkpoint after conformance evidence; it
must not be folded silently into product changes.

Implementation and review compare behavior with the active note. They report
implemented, still proposed, or drifted; they never weaken or replace the
binding target without returning to the exact conflict and approval flow.
