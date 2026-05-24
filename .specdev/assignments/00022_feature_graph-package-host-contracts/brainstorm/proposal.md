# Proposal

Ripplegraph needs a host-facing contract surface that lets graph/business packages declare the interaction and validation semantics a consumer CLI must render, without moving host-owned execution into Ripplegraph core. The immediate gap is that gates, workflow refs, and executable nodes can express flow, but not enough structured metadata for graph packages to own user prompts, required user turns, side-channel actions, validator expectations, or package boundary input/output mapping.

This assignment adds the first declarative contract layer to graph packages: interaction metadata, user-turn interrupt metadata, side-channel action declarations, workflowRef input/output mapping metadata, host tool contracts, and validator metadata. Ripplegraph will validate these shapes and expose them through state responses so hosts can render and audit them consistently while still executing commands, tools, reviewers, and business logic outside the runtime.
