# Proposal: callable graph runtime

Ripplegraph now has a graph package registry and a dispatcher that recognizes `call_graph`, but callable packages are still catalog entries only. The next step is to make registered `kind: "callable"` graph packages invokable as typed calls with isolated state, validated inputs/outputs, and no mutation of the caller workflow focus.

The recommended shape is an explicit call lifecycle rather than a fake one-shot executor. Ripplegraph still does not own an LLM loop; the host agent executes callable nodes and submits node outputs. Ripplegraph owns package lookup, input/output validation, internal callable transitions, call checkpointing, and safe completion. This creates a clean foundation for dispatcher `call_graph` and later workflow nodes that call tools without giving the host agent unchecked flow control.
