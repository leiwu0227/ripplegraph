Add a first-class gate primitive to Ripplegraph so workflows can require an
external decision before crossing selected graph boundaries. This should solve
the human-in-the-loop gap revealed by the support-triage demo without baking a
single product's approval UX into the framework.

The design should treat Ripplegraph as a backbone: the core runtime enforces
that normal agent output cannot advance gated nodes, validates and records a
separate decision payload, and then follows deterministic graph edges.
Consumer CLIs remain responsible for presenting the gate, authorizing humans or
systems, and choosing domain-specific labels such as approve/reject,
promote/drop, or execute/cancel.
