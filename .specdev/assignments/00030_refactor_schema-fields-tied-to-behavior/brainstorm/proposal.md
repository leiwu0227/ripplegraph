# Tie every declared graph schema field to runtime behavior

Assignment 00029 deleted the dispatcher's dead executable body, but it fixed the instance, not
the class: the drift happened because nothing tied a declared schema field to actual behavior,
and other fields share that failure mode. An audit of every graph-package schema field against
the runtime found the surviving class members: workflow `inputSchema` is never read (runs take
no input) and never exposed to hosts; workflow `outputSchema` is enforced only on the child
(`workflowRef`) completion path (coach.ts:696) while a root run's final output is never checked;
`workflowRef.inputMap`/`outputMap` are parsed and dropped — neither applied (00017 explicitly
deferred their semantics) nor surfaced in state responses (unlike the 00022 host-contract fields
that are); the dispatcher's own `effects` is never asserted (dispatch is read-only); and callable
`requires` is shown in dispatch summaries but never enforced at call-start.

This refactor adopts the class-level rule: every declared schema field must be runtime-enforced,
host-exposed via an API response, or deleted. Per-field decisions (all user-validated): delete
workflow `inputSchema`, wire root-run `outputSchema` validation, delete `inputMap`/`outputMap`,
delete dispatcher `effects`, delete callable `requires`. The manifest union becomes three
kind-specific variants — dispatcher, workflow, callable — each declaring exactly the fields its
runtime path reads or its hosts see, with strict rejection of the deleted fields, consistent
with 00029's posture. Callable I/O schemas (enforced both ends) and workflow `requires`
(enforced at startRun) are the counterexamples that stay untouched.
