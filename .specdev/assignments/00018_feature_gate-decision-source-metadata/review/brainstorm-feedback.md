## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] `kind: 'tool'` needs a required tool identifier. The design says this metadata closes the gap where a host cannot tell whether a gate is for a human, reviewloop, or another mechanism, and the host contract example depends on `kind: 'tool', tool: 'reviewloop'` (`brainstorm/design.md:7`, `brainstorm/design.md:77`). However, the proposed schema makes `tool` optional for all kinds and states that only `kind` is required (`brainstorm/design.md:47`, `brainstorm/design.md:54`). With that shape, a valid `decisionSource: { kind: 'tool' }` still leaves the host unable to choose which tool-managed process should supply the decision, so the new API can preserve the current out-of-band convention for exactly the reviewloop case it is meant to describe. Make the schema a discriminated union or add a refinement requiring a non-empty `tool` when `kind === 'tool'` (and test that omission is rejected).

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
- (none)

### Addressed from changelog
- [F1.1] Addressed. The revised schema is now a discriminated shape where
  `kind: 'tool'` requires a non-empty `tool` identifier, and the testing plan
  explicitly covers rejection of a tool source with no tool id.
