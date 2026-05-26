# Kernel Gap Design Roadmap

Design the next Ripplegraph kernel roadmap for strict product-CLI ports, using
Oceanlive as the primary acceptance case. The goal is to pin down the remaining
kernel design questions before implementation, especially around workflow
freeze semantics, graph switching, ad hoc support actions, evidence, dispatcher
routing, and reconciliation.

The recommended direction is to stop treating "side channel" as the core
abstraction. Instead, Ripplegraph should model an audited activity sequence.
Activities may be graph runs, commands, validators, reconciliation checks,
decisions, status reads, or notes. Each activity records how it relates to an
origin workflow through explicit origin, origin policy, return policy, evidence
policy, and human-readable objective fields. A former side channel becomes a
derived pattern: an activity that keeps the origin workflow frozen and may attach
evidence back to it.

The roadmap should preserve one primary focused workflow run. Frozen-origin
support activity should not start a second focused workflow in the initial
kernel path. Instead, Ripplegraph should add a workspace-level activity log that
can reference the focused run, callable calls, commands, validators, and
reconciliation records. True top-level task switches continue to use
suspend/resume focus semantics.
