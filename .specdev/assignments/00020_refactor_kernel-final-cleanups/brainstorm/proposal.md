# Kernel Final Cleanups

Two small follow-on cleanups identified by the backbone-readiness review,
applied as the final pass on the kernel before the `specdev-cli` rewrite
takes a dependency on it.

1. **Extract shared initial-checkpoint construction.** `startRun` and
   `startRegisteredWorkflowRun` each build a fresh `Checkpoint` with the
   same fields, differing only in `rootGraph`, `position`, and the optional
   `graphSource`. Factor a single helper so the boilerplate isn't restated.

2. **Document the dispatcher's dual action-schema contract.** `dispatcher.ts`
   keeps both a Zod `dispatcherActionSchema` (for server-side validation) and
   a `dispatchActionSchema` JSON Schema (for the agent-facing
   `actionSchema` field in `getDispatchRequest`). The two are semantically
   identical but serve different audiences. Auto-deriving one from the other
   would require a new dependency (`zod-to-json-schema`) and obscure the
   agent contract; the right cleanup is a short comment explaining the
   intent and a runtime test that locks both schemas to the same set of
   action names.

Neither change is intended to alter runtime semantics. The kernel surface
gets smaller (start APIs share construction) and easier to maintain
(dispatcher's two schemas are now linked by an explicit test).

Kernel-side gaps from the review (`inputMap`/`outputMap`, migration story,
host validator contract, reviewloop) are intentionally not included: the
first is speculative (SpecDev phases-as-leaves don't need it), and the rest
are host-side concerns that don't belong in the kernel.
