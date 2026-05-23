# Proposal

Enable registered workflow graph packages to be executable directly, with the
same package identity/version pinning that callable graphs already use.

This is the first implementation slice for the modular SpecDev rewrite design.
It does not add nested subgraph execution yet. It removes the current mismatch
where workflow packages can be registered and discovered by the dispatcher but
cannot be started unless duplicated into compact `workflow.json`. That package
execution foundation is needed before a later assignment can safely add
workflow-ref nodes and durable frame-stack semantics.
