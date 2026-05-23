# Kernel Cleanups

Three small, focused cleanups to the Ripplegraph kernel surface that landed
across assignments 00017 and 00018, identified during the backbone-readiness
review for the SpecDev CLI rewrite.

1. **Simplify `gate.decisionSource`** by removing the `system` variant. The
   discriminated union currently has three variants (`human`, `tool`, `system`)
   but `human` and `system` are structurally identical (`kind` + optional
   `label`). The third variant adds a code path every host has to branch on
   without carrying any distinct payload. Keep `human` and `tool` only.

2. **Replace the frame-scope allocation regex scan with a monotonic counter.**
   Today `nextFrameScope` reads every existing stack frame and every key in
   `checkpoint.outputs` and runs a regex (`^f(\d+)`) to find the highest
   number used. A monotonic counter persisted on the checkpoint avoids the
   scan, removes a per-call regex over arbitrary user data, and gives a
   straightforward durable invariant ("frames are numbered in order").

3. **Add a Zod refinement that asserts checkpoint stack/position consistency.**
   `Checkpoint` carries four overlapping "where am I" pieces (`rootGraph`,
   `graphSource`, `position.graph`, `stack[].child.graphId`) and the
   active-context helper is the only thing tying them together. A `superRefine`
   that requires `position.graph === stack.at(-1).child.graphId` when `stack`
   is non-empty (and `position.graph === graphSource.graphId || rootGraph`
   otherwise) catches a whole class of corrupted-checkpoint bugs at load time
   instead of misrouting silently.

All three are pure simplifications: no new capability, no breaking change to
external consumers, and the resulting kernel is smaller in lines and stricter
in invariants. Tests stay green.
