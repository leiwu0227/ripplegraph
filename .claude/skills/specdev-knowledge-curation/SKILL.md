---
name: specdev-knowledge-curation
description: Propose, approve, publish, and reindex bounded living-knowledge updates
---

Run `specdev knowledge curate --json` for a mutation-free bounded scan. Inspect
only relevant eligible sources and owner candidates. Draft the exact JSON
manifest from `proposal_template` under ignored
`.specdev/cache/knowledge-curation/`; include durable citations, current
verification, exact `owner_queries`, the complete untruncated
`scoped_owners`, and one retain/update/delete decision for every matched
owner. New proposals never supersede. Delete only with an exact baseline,
reason, proportional evidence, and a projected tree with no dangling live
reference. A non-empty all-retain review still produces a durable receipt.

Scopes above the mutation bound use the returned immutable `KCS` scope
manifest and separately approved batches; never narrow a query to evade an
owner decision. Existing active v1 journals resume with their frozen v1
semantics, but new proposal preparation is v2-only. Installed update reports
legacy superseded candidates and blockers without deleting or resurrecting
project-owned knowledge.

When direct code inspection establishes a reusable constraint absent from the
durable source, rerun the scan with bounded
`--repo-evidence=project/path#Lstart-Lend`. Keep the returned content-addressed
`repository_evidence` unchanged and reference it from each supported change.
Repository evidence verifies current code bytes and location; it never replaces
an eligible durable source, owner decisions, current verification, or exact user
approval, and source code is never bulk-indexed.

Run `specdev knowledge curate --proposal=<path> --json` to validate and bind
the unchanged proposal. Show its exact paths and proposal ID. Only after user
approval run the displayed `--approve=<proposal-id>` command. A big-picture
proposal has a separate `--approve-big-picture=<id>` token and must never be
inferred from ordinary knowledge approval.

Resume with `specdev knowledge curate --status` or the unchanged approval
command. Publication and its receipt are idempotent. If the index is stale, use
the exact `specdev knowledge rebuild` recovery command and do not roll back
authoritative Markdown. To finish the lane-independent durable Git boundary,
run the returned `specdev publish --from-curation=<KC-id>` command, show its
exact paths and content-addressed approval, and wait for user approval before
running the returned `--approve=<sha256>` command.

Announce meaningful phases, plan changes, failed verification, and blockers
with "Specdev: <action>"; repeated read-only probes need no separate announcement.
