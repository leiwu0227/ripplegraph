## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] Callable metadata semantics are under-specified. The design says nodes can declare interaction, interrupt, side-channel action, tool contract, and validator metadata, while also saying callable workflows should keep rejecting gates and the new metadata must not make callable execution depend on host commands (`brainstorm/design.md:7`, `brainstorm/design.md:56`). In the current runtime, callable validation only rejects gates and validates schemas, and `CallableState.node` exposes only purpose/instructions/exec/outputSchema (`src/callable.ts:263`, `src/callable.ts:287`). The implementation plan needs to state whether callable packages reject host-interaction metadata, ignore it, or expose a supported subset through callable state. Without that decision, a callable package can load metadata the host cannot observe or honor, directly conflicting with the compatibility requirement.
2. [F1.2] `form` interactions are not actually renderable from the proposed contract. The schema shape lists `interaction: { id, kind, prompt, renderVia?, choices?, followUp? }` and includes `form` as a kind, but it defines no fields, field schema, submit payload schema, or reference to a node output schema for form rendering (`brainstorm/design.md:35`). Since the goal is for hosts to render prompts consistently (`brainstorm/design.md:13`) and invalid interaction metadata should be rejected (`brainstorm/design.md:61`), the brainstorm artifact should either remove `form` from this first contract or define the minimal validated form shape and tests for it.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. (none)

### Addressed from changelog
- Fixed [F1.1]: callable host-interaction metadata is now explicitly rejected for callable packages, which matches the current callable runtime shape in `src/callable.ts` and avoids hidden metadata that `CallableState.node` cannot expose.
- Fixed [F1.2]: form interactions now require an object JSON schema in `interaction.schema`, giving hosts a renderable contract and giving the implementation a concrete validation target.
