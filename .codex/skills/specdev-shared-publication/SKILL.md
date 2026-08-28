---
name: specdev-shared-publication
description: Publish exact approved shared project notes without changing workflow phase
---

Use this only for an explicit user request to publish eligible shared
`project_notes/**` content from Direct work, a Discussion, an Assignment, or a
Mission. Read the exact destination and destination-specific policy first.
Knowledge must continue through evidence-bound `specdev knowledge curate`;
`big_picture.md` keeps its separate approval token; protected architecture
must follow `.specdev/_guides/architecture_guide.md` and use the `proposed`,
`implemented`, `drifted`, and legacy-only `deprecated` lifecycle.

Write a bounded version-1 proposal JSON in ignored cache with a summary, optional
source identity, and exact changes containing destination, prior SHA-256 (or
null), and full new content. An explicitly approved active-architecture rename
puts `move_from.path` and `move_from.previous_hash` on the absent new
destination; never infer a rename from separate add/remove changes or target an
existing active note. Run `specdev publish --proposal=<path> --json`. Show the
exact operations, semantic `architecture_rename` relation, conflicts, and
content-addressed approval. Only after the user approves those exact bytes run
the returned `--approve=<sha256>` command. Resume with `--status` or the
unchanged approval after a recoverable failure.

For knowledge or big-picture bytes, first complete the existing evidence-bound
`knowledge curate` flow, then run `specdev publish
--from-curation=<KC-id>` with an optional source identity flag. This thin bridge
verifies the completed curation receipt and exact current bytes; it never
replaces curation policy.

The publisher rechecks every baseline, applies only the approved paths,
archives protected replacements atomically, and performs an explicit rename in
archive/destination/source-removal order. Its journal converges interrupted
work only from approved prior or resulting hashes. It writes a monotonic `P…`
receipt with the semantic relation, creates an exact-path Git commit, rejects
unrelated HEAD movement, excludes unrelated dirt, and leaves the originating
workflow phase and product-code authority unchanged.

Announce meaningful phases, plan changes, failed verification, and blockers
with "Specdev: <action>"; repeated read-only probes need no separate announcement.
