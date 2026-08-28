---
name: specdev-discussion
description: Start or resume concurrent code-read-only exploration
---

Run `specdev discussion "<topic>"`. Treat product code as read-only and write
bounded eligible UTF-8 text artifacts recursively inside only the returned
Discussion's `brainstorm/**` tree. Keep `proposal.md` and `design.md` as
required canonical syntheses, cite material support files, and never write
`review/**`, runtime state, shared notes, provider logs, caches, dependencies,
symlinks, binaries, or product files. Resume with `specdev discussion D00001`.

Optional review: `specdev reviewloop discussion --discussion=D00001`.
Complete only when the user is satisfied: `specdev discussion D00001
--complete`. Completion binds a versioned manifest and terminal bundle digest.
Promotion verifies it and copies immutable source context; the fresh contract is
the sole implementation authority. Shared knowledge still uses `knowledge
curate`; exact approved project-note publication uses lane-independent
`specdev publish` and never advances the Discussion.

Announce meaningful phases, plan changes, failed verification, and blockers
with "Specdev: <action>"; repeated read-only probes need no separate announcement.
