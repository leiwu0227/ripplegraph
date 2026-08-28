---
name: discussion
description: Concurrent code-read-only exploration through a RippleGraph callable
type: core
phase: any
---

# Discussion

Run `specdev discussion "<topic>"`. Inspect code when useful but do not modify
product files. Write bounded eligible UTF-8 text artifacts recursively inside
the returned Discussion's `brainstorm/**` tree. `brainstorm/proposal.md` and
`brainstorm/design.md` remain required canonical syntheses; cite materially
relied-on support files from them. Never write `review/**`, runtime state, shared
notes, provider logs, caches, dependencies, symlinks, binaries, or product files.
Then run `specdev discussion D00001`.

Review is optional: `specdev reviewloop discussion --discussion=D00001`.
Complete when the user is satisfied: `specdev discussion D00001 --complete`.
Completion writes a versioned manifest and terminal bundle digest. Later bundle
mutation must be restored or continued in a new Discussion. Promotion verifies
the digest, copies immutable proposal/design/manifest context, and creates a
fresh Assignment or Mission contract as the sole implementation authority. Use
`--copy-support=<path,...>` only for an explicitly selected bounded subset.

Shared notes are not Discussion-owned. Knowledge still goes through
evidence-bound `specdev knowledge curate`. Exact user-requested project-note or
protected-architecture publication goes through `specdev publish`; it has its
own baseline, approval, receipt, exact-path commit, and never advances or changes
the Discussion.
