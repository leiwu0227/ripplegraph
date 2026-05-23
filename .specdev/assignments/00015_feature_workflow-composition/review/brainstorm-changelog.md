## Round 1

### F1.1 — Legacy checkpoint compatibility — [ADDRESSED]

Added an explicit "missing-policy rule" table to `brainstorm/design.md` under
the runtime-change section. Three cases:

| Checkpoint policy | Node declares `effects?` | Behavior |
|---|---|---|
| present | — | Assert `effectsForNode` against policy. |
| absent (legacy) | no | Permissive — no per-transition check. Today's behavior. |
| absent (legacy) | yes | Hard error `E_LEGACY_CHECKPOINT_NO_POLICY`; operator restarts the run. |

This is documented as an intentional, surfaced break — not silent behavior
change. Removed the conflicting claim from the migration notes. Added Success
Criterion 6 to lock in the behavior with tests.

### F1.2 — Effect check must precede artifact writes — [ADDRESSED]

Rewrote the `stepRun` / `decideGate` runtime-change section with an explicit
ordered sequence: validate → resolve edge → look up next node → assert
effects → only then write artifact, mutate checkpoint, append transition.

Added Success Criterion 4 ("No-write-on-deny invariant"): denied transitions
must leave no artifact on disk, no checkpoint mutation, and no successful
transition log entry. Tests assert this for both `stepRun` and `decideGate`.

## Round 2

### F2.1 — Policy-extension contradiction — [ADDRESSED by narrowing]

Reviewer correctly identified an internal contradiction: persisting one
`EffectPolicy` at `startRun` and then checking node effects at every
transition gives the appearance of phase-local scoping without the
substance, because no API surface extends the policy mid-run. Any
specdemo-shaped run would either over-grant `write_repo` at start
(defeating the per-phase narrative) or fail to enter implementation after
the brainstorm gate.

Chose narrowing (codex's option B) over adding a policy-extension point
(option A). Rationale: mid-run policy mutation is a meaningful new surface
(new gate decision shape, new CLI flags, checkpoint state for granted
effects) that goes beyond "simplest extension." Specdemo's actual effect
needs are largely uniform across phases (read + write throughout), so the
value of phase-local enforcement is theoretical, not measured.

Concrete changes to the design:

- Per-node effects are now a **declaration** primitive checked at
  `startRun` as a **union** of all nodes' effective effects against the
  caller's policy.
- `stepRun` / `decideGate` are unchanged with respect to effects (no
  transition-time check). F1.2's no-write-on-deny invariant becomes
  unnecessary and is removed from Success Criteria.
- No checkpoint shape change. F1.1's legacy-checkpoint missing-policy rule
  becomes unnecessary and is removed.
- The earlier Round 1 fixes that depended on transition-time checks are
  superseded by this narrowing. F1.1 and F1.2 are now moot for the
  current design.
- Proposal and design updated with an explicit "Why start-time union check
  (not per-transition enforcement)" section that names the F2.1 finding
  and the option-A vs option-B choice, so future readers see the reasoning.

Net effect: the design is smaller (no checkpoint changes, no transition-
time logic) and internally consistent. Phase-local effect escalation is
explicitly deferred to a future assignment if a real use case emerges.

## Round 3

### F3.1 — Dispatcher pre-check bypasses node union — [ADDRESSED]

Reviewer pointed out that `applyDispatchAction` (`src/dispatcher.ts:190-191`)
performs a graph-level effect check against the registry summary's
`effects` before delegating to `startRun`. The registry summary does not
reflect node-level overrides, so a node that opts out via `effects: []`
would still be blocked by the dispatcher pre-check even though the
authoritative `startRun` union check would allow it.

Updated the design's `applyDispatchAction` bullet to **remove the
dispatcher pre-check for `start_run` actions** and rely on `startRun` for
the authoritative union check. The pre-check for `call_graph` actions
remains because callable graphs are out of scope for per-node effects in
this assignment.

Added Success Criterion 7 to lock in dispatcher-path parity: a `start_run`
dispatch action against a workflow with a per-node opt-out behaves
identically to a direct `startRun`. Tests cover both paths.
