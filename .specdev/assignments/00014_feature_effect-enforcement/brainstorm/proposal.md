# Proposal: effect enforcement

Ripplegraph graph packages already declare `effects`, and project notes describe effects as the guardrail that prevents pure-looking graph calls from hiding mutations. Today those declarations are informational only: dispatcher actions, direct workflow starts, and callable starts do not evaluate any runtime policy before exposing or creating executable state.

This assignment should add a small policy layer that classifies effect declarations, exposes clear permission requirements, and blocks effectful graph starts/calls unless the host explicitly allows the declared effects. The design should stay conservative: no automatic tool execution, no broad permission engine, and no workflow-node callable integration. The goal is to make side effects explicit and enforceable at the graph boundary without complicating the core coach runtime.
