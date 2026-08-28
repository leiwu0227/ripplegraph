---
name: shared-publication
description: Lane-independent exact approved publication for eligible shared project notes
type: core
phase: any
---

# Shared publication

Use this only for an explicit user request to publish eligible shared
`project_notes/**` content from Direct work, a Discussion, an Assignment, or a
Mission. Read the destination policy first. Knowledge continues through
evidence-bound `specdev knowledge curate`; `big_picture.md` keeps its separate
approval token; protected architecture follows `_guides/architecture_guide.md`
and uses the `proposed`, `implemented`, `drifted`, and legacy-only `deprecated`
lifecycle.

Prepare exact version-1 proposal JSON in ignored cache with a summary, optional
source identity, and changes containing destination, prior SHA-256 (or null),
and full new content. An explicitly approved active-architecture rename puts
`move_from.path` and `move_from.previous_hash` on the absent new destination;
never infer a rename from separate add/remove changes or target an existing
active note. Run `specdev publish --proposal=<path> --json`, show the exact
operations, semantic `architecture_rename` relation, and content-addressed
approval, then wait. Only after approval run the returned
`--approve=<sha256>` command. Resume an unchanged recoverable transaction with
`--status` or the same approval.

For knowledge or big-picture bytes, first complete the evidence-bound
`knowledge curate` flow, then run `specdev publish --from-curation=<KC-id>` with
an optional source identity flag. The bridge verifies the completed curation
receipt and exact current bytes; it never replaces evidence, owner, conflict,
index, or big-picture approval policy.

The publisher rechecks every baseline, applies only approved paths, archives
protected replacements atomically, and performs an explicit rename in
archive/destination/source-removal order. Its journal can converge an
interrupted transaction only from approved prior or resulting hashes. It writes
a monotonic `P…` receipt with the semantic relation, creates an exact-path
commit, rejects unrelated HEAD movement, excludes unrelated dirt, and never
changes originating phase or product-code authority.
