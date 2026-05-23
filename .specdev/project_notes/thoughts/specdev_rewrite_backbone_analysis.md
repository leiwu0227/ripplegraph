# Can Ripplegraph back a SpecDev CLI rewrite (with modular workflows)?

**Date:** 2026-05-23
**Context:** After landing assignment 00015_feature_workflow-composition (per-node
effects), we asked whether Ripplegraph at its current state can serve as the
backbone for a full rewrite of `@specdev/cli`, where workflows must be modular.
This note records the full analysis.

## TL;DR

**No at current state — yes with one structural addition (subgraph-as-node).**

- Gap A (modularity / subgraph composition) is the blocker. Ripplegraph today
  has no node-level reference to another graph; only the dispatcher and
  `startCallableCall` can invoke registered graphs, and neither composes
  inside a parent workflow run.
- Gap B (filesystem precondition checks / command execution) is real but can
  be solved by moving the responsibility to the agent or by re-introducing a
  small primitive — choose one.
- Gap C (reviewloop / external process orchestration) should **not** go into
  Ripplegraph. It belongs in the host CLI. Optional small schema bump on the
  gate node makes workflows self-describing.

The earlier narrowing in assignment 00015 (per-node effects only) was right
for specdemo's validation case but **wrong for the rewrite case**. The
structural primitive originally designed in assignment 00001 (subgraph-as-node)
needs to come back as a follow-up assignment if the rewrite is committed to.

## 1. SpecDev's actual architecture (after reading the source)

After reading ~9000 lines of `@specdev/cli` source — full `workflow-runtime.js`,
`state.js`, `scan.js`, `checkpoint.js`, `approve.js`, `approve-phase.js`, the
head of `reviewloop.js`, and the CLI entry — SpecDev is **not a workflow
executor**. It is four things:

1. **State inspector.** `detectAssignmentState` (`state.js:166-355`) re-derives
   position every call by walking declared phases, checking artifact existence
   on disk and gate flags in `status.json`. There is no persistent "current
   step" stored anywhere — the filesystem IS the state.

2. **Artifact validator.** `specdev checkpoint <phase>` (`checkpoint.js`) reads
   `step.requires`, checks file existence + content sanity (e.g., proposal.md
   must be >20 chars; design.md must have required H2 sections per assignment
   type; progress.json's `tasks: []` must all have `status: 'completed'`).

3. **Gate-flag recorder.** `approvePhase` (`approve-phase.js`) re-validates
   then writes `status.json[gateField] = true`. The "gate" is a JSON flag, not
   a position in a graph.

4. **External-process orchestrator.** `reviewloop` (`reviewloop.js`, 720 lines)
   spawns reviewer subprocesses (claude/codex/cursor) with env vars
   (`SPECDEV_PHASE`, `SPECDEV_FEEDBACK_FILE`, `SPECDEV_FOCUS`, …), streams
   stdout to log files, captures jsonl, parses verdict from a markdown file,
   supports max-rounds with state across runs, salvages crashed reviewers from
   stdout, and autocontinues across phases via sticky session-state.

**The agent does the work; SpecDev tells you where you are, validates that
what you produced is shaped right, and shells out to reviewers.** Ripplegraph,
by contrast, is a workflow executor that TRACKS position via checkpoint and
ADVANCES via agent-submitted outputs. The two models are different.

## 2. What "modular" means in SpecDev today

There is no user-configurable phase structure. `workflow-runtime.js:11`
hardcodes `CANONICAL_PHASES = ['brainstorm', 'breakdown', 'implementation']`,
and `validateWorkflowPhases` enforces them with required steps + literal gate
field names (lines 355-361). A drift test
(`tests/test-workflow-contract-drift.js`) asserts `workflow.yaml` matches the
literals.

What IS modular today (filesystem-pluggable at fixed slots, not structure):
- **Skills** — `.specdev/skills/<name>/SKILL.md` referenced from `step.guide:`
- **Reviewers** — `.specdev/skills/core/reviewloop/reviewers/<name>.json`
- **Agents** — `.specdev/agents/`
- **Hooks** — declared in workflow.yaml but **not executed by the runtime**
  (`workflow-runtime.js:603-607` reports them as `skipped` or `not_applicable`)

So "modular" today = pluggable content at fixed slots. For a rewrite where
"workflows have to be modular," we read it as a stronger claim: user-defined
phase structures, sub-workflow composition, reusable phase building blocks.

## 3. Capability map: SpecDev → Ripplegraph

| SpecDev concept | Ripplegraph primitive | Status |
|---|---|---|
| Phase (multi-step container with gate) | Graph nodes + `external_decision` gate + edges with `when` | Direct fit |
| Step ordering within a phase | Edges | Direct fit |
| Gate approval flag | Gate node's `decisionSchema` enum + edge selection on decision | Direct fit |
| Phase branching on rejection | Edge `when` predicate | Direct fit |
| Per-task self-loop in implementation | Self-edge with `when` predicate on agent's reported output | Direct fit |
| Per-phase effect scoping | `node.effects?` declared, union checked at `startRun` (00015) | Just landed |
| Persistent state across sessions | `checkpoint.json` + `transition-log.jsonl` | Direct fit |
| Single active assignment | `current.json` + `focusedRunId` | Direct fit |
| Multiple suspended assignments | suspend/resume | Direct fit |
| Schema-validated agent outputs | `nodeSchema.outputSchema` + `validateOutput` | Direct fit |
| Filesystem artifact validation (`step.requires`) | None — output validation is JSON schema only | **Gap B** |
| Command step execution (`step.run`) | `exec` enum was tightened to `'inline'` only in 00015 | **Gap B** |
| Reviewer subprocess spawn + stream capture | None | **Gap C** |
| `phase:end` hooks (advisory or executed) | None (specdev itself doesn't execute them either) | Partial / not blocking |
| Choice interaction with conditional follow-up | Gate `decisionSchema` with enum; follow-up is agent's job | Partial / acceptable |
| Sticky session-state (`reviewer`, `autocontinue`) | `checkpoint.outputs` could carry it, no first-class concept | Partial / acceptable |
| **Modular sub-workflow composition** | Graph package registry exists; **workflow nodes cannot reference registered graphs** — only the dispatcher and `startCallableCall` can | **Gap A — the big one** |
| Dispatcher routing to start a workflow/callable | `applyDispatchAction` | Direct fit |

## 4. The three gaps in detail

### Gap A — Subgraph-as-node (modularity blocker)

`src/schema.ts:48-65` — `nodeSchema` has no `ref` field. A workflow node
cannot say "execute graph X here." Today's ways to invoke another graph:

- `startCallableCall` — agent-orchestrated by `callId`, parallel object
  (`src/callable.ts:97`). Constrained: no gates allowed inside callable nodes
  (`callable.ts:267`), restricted schemas (`assertSupportedCallableSchema`).
- `applyDispatchAction` with `start_run` — replaces the focused run
  (`src/dispatcher.ts:189-204`). Doesn't compose inside a parent run.

Neither composes graphs as **nested execution within a parent run**. Without
this primitive, "modular workflows" can only mean "different top-level
workflow.json files." That is not true composition.

The original 00001 brainstorm
(`.specdev/assignments/00001_feature_runtime-core/brainstorm/design.md`)
explicitly designed subgraph-as-node as the composition primitive
("Modal entry pushes a stack frame; pops back to the original position"), then
it was dropped during implementation. It needs to come back if modularity is
the rewrite goal.

**Shape of the addition:**
- `nodeSchema` gains `{ ref, inputMap, outputMap }`.
- `checkpoint.position` becomes `stack: Position[]` (or
  `{ position, stack: Position[] }` for backward compat — likely a breaking
  change worth taking pre-release).
- When the agent's `advance` reaches a subgraph node, the runtime pushes a
  frame and execution continues inside the referenced registered graph. When
  the subgraph hits a terminal node, the frame pops and the parent's node
  completes with the threaded output.

**Effort estimate:** ~400-600 lines including schema, runtime, storage shape
change, and tests.

### Gap B — Filesystem-precondition checks and command-step execution

SpecDev's `step.kind === 'command'` with `run: 'specdev checkpoint brainstorm'`
(plus matching `requires: [files]`) is two things Ripplegraph can't do:

1. **`step.requires`**: file-existence check at the runtime layer. Ripplegraph's
   gate validates JSON only.
2. **`step.run`**: the runtime invokes a host command and uses its result.
   Ripplegraph's `exec` enum was *tightened* to `'inline'` only in 00015 — we
   removed `'spawn'` / `'script'` because they were dead. For a SpecDev
   rewrite, you'd want them back, **actually implemented this time**.

**Two ways to close it:**

- **Runtime owns it:** re-introduce `exec: 'script'` with an actual
  implementation, OR add a `kind: 'precondition'` node that runs a
  file-existence check and emits a typed pass/fail.
- **Agent owns it:** the agent reads files and submits `{ artifactsReady:
  true }`; the agent runs the command and submits its result. No Ripplegraph
  change.

For a rewrite, host-as-agent is the more honest path — it preserves
Ripplegraph's separation of concerns (graph execution vs side effects). The
runtime route is more deterministic but adds a primitive Ripplegraph
deliberately avoided.

**Effort estimate (runtime route):** ~150 lines.

### Gap C — External process orchestration (reviewloop)

Recommendation: **do not bring reviewloop into Ripplegraph.** It's
orchestration code (spawn subprocess, stream logs, parse markdown, track
rounds), not workflow code. Adding a "spawn process" primitive would
re-introduce the `exec: 'spawn'` ambition we just deleted in 00015 and is the
wrong fit for a graph executor.

#### Concrete shape

Three pieces:

**1. Workflow side (zero Ripplegraph change).** A review gate is just a normal
`external_decision` gate with a decision schema like:

```json
{ "verdict": "approved | needs-changes", "round": "integer", "feedback_path": "string" }
```

Ripplegraph doesn't know or care that the decision came from a subprocess vs a
human. It just records and routes.

**2. Host side.** The new specdev CLI keeps a
`specdev reviewloop <phase> --reviewer=<name>` subcommand that contains
today's 720 lines of orchestration (subprocess spawn, log streams, env vars,
max-rounds, salvage, sticky session-state, autocontinue). When the loop
produces a verdict, the host calls `ripplegraph advance --input
'{"verdict":"approved",...}'`. The connection between "this gate" and
"reviewloop" lives in the host's command name, not in the workflow.

**3. Packaging — where modularity matters.** Two options:

- **`@specdev/reviewloop` as a standalone package** that the new specdev-cli
  depends on. Other Ripplegraph workflows can reuse it. Strongest modularity
  story.
- **Bundle reviewloop inside the new specdev-cli host.** Simpler. Other
  workflows would have to copy logic if they want a reviewer loop.

We chose the **standalone package route** for the "modular workflows" goal.

#### Optional schema bump (5 lines) to make workflows self-describing

If we want the **workflow definition** to declare "this gate's verdict should
come from a tool, not the human-typing-into-a-decide-command," add an optional
field to the gate schema:

```ts
export const gateSchema = z.object({
  type: z.literal('external_decision'),
  decisionSchema: jsonSchemaSchema,
  decisionSource: z.object({
    kind: z.enum(['agent', 'tool']),
    tool: z.string().optional(),  // e.g., "reviewloop"
  }).optional(),  // defaults to { kind: 'agent' }
}).strict();
```

- **Runtime impact:** none. Ripplegraph still just validates and routes. The
  field is metadata for the host.
- **Host impact:** reads `decisionSource.tool` to know which tool to dispatch
  when the workflow is at this gate.
- **Modularity payoff:** a workflow.json becomes portable. Any host that
  supports `reviewloop` gets the right behavior; hosts that don't can fall
  back to agent prompting.

**Tradeoff:** without `decisionSource`, the workflow is less self-describing —
you have to know that `specdev reviewloop` is the right tool for the
specdev-flavored review gate. With it, you couple the workflow to a tool name
vocabulary, but the workflow becomes self-describing and reusable across hosts.
The 5-line cost is small; the modularity payoff is real.

**Net answer to Gap C:** no Ripplegraph runtime work, optional 5-line schema
bump, all real work happens in the new specdev-cli host plus a
`@specdev/reviewloop` package.

## 5. What's NOT a gap (despite earlier worries)

- **Hardcoded canonical phases.** A Ripplegraph-backed rewrite *escapes* this
  constraint by design. It's a feature, not a regression.
- **`phase:end` hooks.** SpecDev itself doesn't execute them — they're
  reported but skipped. For the rewrite, keep them advisory (same as today),
  or add a hook node primitive later if execution becomes important.
- **Interaction blocks with follow-ups.** The host handles the choice
  rendering; the gate just records the chosen decision. Current `decideGate`
  is enough.
- **Sticky session-state.** `checkpoint.outputs` can carry it. No new
  primitive needed.
- **Per-task progress.json.** Agent-managed today, can stay agent-managed.
  Self-edge with `when` handles the loop.
- **Single focused run / multi-assignment suspend.** Already matches SpecDev's
  `.current` model.

## 6. Minimum extension plan

**To make Ripplegraph a credible SpecDev backbone for a rewrite where
workflows are modular:**

1. **Add subgraph-as-node** (Gap A). The substantial work. Schema + checkpoint
   shape + runtime stack semantics + tests. ~400-600 lines. This is the
   primitive designed in 00001 that got dropped.
2. **Decide Gap B's owner.** Either reintroduce `exec: 'script'` /
   `kind: 'precondition'` (~150 lines, runtime owns side effects) or accept
   agent-owns-side-effects (zero Ripplegraph code, more host responsibility).
   For a clean rewrite, host-as-agent is the more honest path.
3. **Document the host/Ripplegraph split for Gap C.** Reviewloop stays a
   separate `@specdev/reviewloop` package. Optionally add `gate.decisionSource`
   (5-line schema bump) so workflows declare who delivers the verdict.

If the user accepts the host-as-agent split (host owns process spawning,
reviewer orchestration, filesystem-derived hooks, choice menus) and Ripplegraph
owns workflow position + node validation + gate decisions + modular composition,
**the real Ripplegraph work is subgraph-as-node alone.**

## 7. Honest acknowledgment about 00015

The brainstorm/00015 narrowing (per-node effects only) was right for the
**specdemo validation case** but **wrong for the SpecDev CLI rewrite case**.
Codex's pushback on the original transition-time enforcement design was
correct; the resolution by narrowing was right given the brainstorm-stated
scope, but it deferred the structural primitive (subgraph-as-node) that the
rewrite actually needs. That's a follow-up assignment worth doing if the
rewrite is committed to.

The dead `exec: 'spawn' | 'script'` cleanup in 00015 also looks slightly
different in retrospect: we removed them as "dead enums that lie about
capability," but if Gap B's resolution is to re-introduce a real `script` exec
mode, we'd be re-adding what we just removed. That's not wasted work (the
enums *were* dead at the time), but it's worth noting that the cleanup was
conservatively-scoped, not architecturally-final.

## 8. References (file:line)

### Ripplegraph (this repo)
- `src/schema.ts:48-65` — current `nodeSchema` (no `ref` field)
- `src/coach.ts:132-159` — `startRun` (where union check now lives)
- `src/callable.ts:97-143`, `:267` — callable graphs and the no-gates restriction
- `src/dispatcher.ts:189-217` — dispatcher `start_run` / `call_graph` actions
- `src/effects.ts:28-35` — effect policy enforcement
- `.specdev/assignments/00001_feature_runtime-core/brainstorm/design.md` —
  the original subgraph-as-node design (dropped)
- `.specdev/assignments/00015_feature_workflow-composition/brainstorm/design.md` —
  per-node effects (current)

### SpecDev CLI (installed at `/home/pachao/.nvm/versions/node/v22.19.0/lib/node_modules/@specdev/cli`)
- `src/utils/workflow-runtime.js:11` — `CANONICAL_PHASES` hardcoded
- `src/utils/workflow-runtime.js:130-231` — `DEFAULT_WORKFLOW` (contract source of truth)
- `src/utils/workflow-runtime.js:272-332` — `validateWorkflowDefinition`
- `src/utils/workflow-runtime.js:525-583` — `computeNextAction`
- `src/utils/workflow-runtime.js:585-621` — hook handling (reports as skipped)
- `src/utils/state.js:166-355` — `detectAssignmentState` (filesystem-derived state)
- `src/commands/checkpoint.js` — artifact validation
- `src/utils/approve-phase.js` — gate-flag recording
- `src/commands/reviewloop.js` (720 lines) — subprocess orchestration
