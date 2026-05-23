# Proposal

Add optional `decisionSource` metadata to external decision gates. A workflow
author should be able to say that a gate is normally satisfied by a human,
reviewloop, or another host-managed decision source without changing how
Ripplegraph validates decisions or routes edges.

This closes the self-description gap for modular SpecDev workflows: Ripplegraph
continues to own durable gate position, validation, decisions, and transition
logs, while the host layer can inspect gate metadata to decide which external
tool or person should produce the decision.
