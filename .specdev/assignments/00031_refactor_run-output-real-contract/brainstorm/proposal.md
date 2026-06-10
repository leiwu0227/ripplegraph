# Make run output a real contract

00030 wired root-run `outputSchema` enforcement, but two dishonesty remnants survive. First, the
schema's `.default({ type: 'object' })` is a contract the graph author never declared: a graph
with no `outputSchema` still rejects any non-object completing value — a gate declaring
`decisionSchema: { type: 'boolean' }` that edges into the root terminal can never complete. A
default that constrains is a declaration nobody made. Second, the validated completing value is
then thrown away: the completed response has no `output` field, completion clears the focused
run, and on the already-on-terminal path (single-node graphs) the value isn't persisted anywhere
at all. The runtime enforces a contract on a value no host can subsequently read.

This refactor finishes the thought: **absent `outputSchema` means no contract** (validation
skipped — not an empty schema that pretends to be one), and **declared `outputSchema` means
enforced and exposed** — the completing value is persisted on the checkpoint (`finalOutput`,
mirroring callables), returned on the completed response, and surfaced in `listRuns` summaries so
hosts can answer "what did that run produce". The provenance rule becomes explicit and
documented: a run's output is the value that completes it — terminal step output, gate decision,
or child result. Node-level `outputSchema` keeps its object default deliberately (outputs maps
and `when` edge-matching are built on object outputs); callable I/O defaults stay untouched
(enforced on both ends, coherent). All changes are non-breaking (a loosening plus additive
fields) and fold into the not-yet-vendored 0.1.0.
