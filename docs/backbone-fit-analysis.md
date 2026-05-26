# Ripplegraph Backbone Fit Analysis

Date: 2026-05-24

Scope: verified against the current source trees for:

- `/mnt/h/oceanwave/lib/cli/oceanshed-cli`
- `/mnt/h/oceanwave/lib/cli/oceanlive-cli`
- `/mnt/h/oceanwave/lib/specdev-cli`
- `/mnt/h/ripplepulse/lib/ripplegraph`

Question: can Ripplegraph serve as the orchestration backbone for these CLIs
while not owning their business logic?

## Verdict

Ripplegraph is directionally aligned as the small workflow kernel: it can own
graph position, run checkpoints, transition logs, gates, schema validation,
workflow package identity, nested workflow frames, dispatcher routing, and
declared effects. The host CLIs should continue owning business execution,
artifact validation, command execution, backend calls, review subprocesses, and
domain state.

It is not yet a complete drop-in backbone for all three CLIs. The strongest
remaining gaps are first-class interaction contracts, stronger user-turn
interrupt semantics, side-channel actions that do not move the main workflow
cursor, command/tool contract metadata, backend/artifact reconciliation, richer
validation hooks, and workspace asset/update semantics.

## Current Ripplegraph Capabilities

Evidence from current Ripplegraph:

- Host-agent boundary is explicit: README says Ripplegraph keeps workflow state,
  validates outputs, enforces gates, tells a host what is allowed next, and the
  host still does the work.
- Registered package workflows execute directly from package folders. Tests
  cover starting a registered workflow package and continuing against the
  pinned package after registry replacement.
- `workflowRef` now provides nested workflow composition with durable stack
  frames. Tests cover entering a child workflow, nested/sibling frame scopes,
  frame popping, child effect collection, recovery from a ref node, and scoped
  artifacts.
- Gate decision source metadata exists as `decisionSource` with `human` and
  `tool` variants. Tests cover a `tool: reviewloop` source surfacing through the
  response contract and persisting the gate decision.
- Callable graphs are isolated under `.ripplegraph/calls` and do not mutate the
  focused run. Tests cover package pinning, typed input/output, and wrong-kind
  rejection.
- Effect checks happen at start/call boundaries and include reachable child
  workflow effects. README explicitly says there is no OS sandboxing, process
  isolation, network blocking, script execution, or automatic effect inference.

Stale older gaps:

- "Registered package workflows are not executable" is stale.
- "No subgraph composition" is stale. The implemented primitive is
  `workflowRef`, not the older proposed `ref/inputMap/outputMap` shape.
- "No gate source metadata" is stale. `decisionSource` now exists.

Still-current Ripplegraph limitations:

- `workflowRef` only names `graphId`. There is no explicit child input binding,
  output mapping, parameterization, or return mapping.
- Edge predicates are flat equality over top-level output fields.
- Callable graphs reject gates and should not be used for reusable gated phases.
- JSON Schema validation is a small subset only.
- Effect grants are command-boundary allow-lists, not persistent grants or
  runtime enforcement.
- Only one run may be focused at a time; other work must be suspended.
- Graph packages model graph metadata and execution, not full CLI template
  installation/update/preservation policies.

## Oceanshed Findings

Oceanshed is a good fit for a host/kernel split.

Source facts:

- Node CLI dispatch is thin. Runtime commands are forwarded to
  workspace-local `.oceanshed/scripts/oceanshed_runtime.py`.
- `oceanshed_runtime.py` routes `check`, `simulate`, `sweep`, `stage`,
  `report`, `group`, `mongo`, and `audit` to Python modules.
- `sweep_runner.py` imports OceanWave/oceanfarm runtime lazily and owns sweep
  execution, variant generation, simulation, save modes, runtime config, and
  metadata writes.
- `workspace_tool.py` owns candidate staging, sweep evaluation, local artifact
  writes, and pending decision records.
- `stage_candidate` is explicitly read-only in `--dry-run` and refuses writes
  without `--confirm`.
- Sweep evaluation writes `decision.toml` and `decision.md` with
  `pending_approval`.
- Agent review TOML is verified by `oceanshed_agent.py`, including required
  artifacts, provenance, target existence, path shape, input hashes, and drift.
  Reviews are recommendations, not approvals.
- Interaction blocks are real contracts. Tests validate embedded `interaction`
  JSON blocks and expected authoring-gate IDs.
- Workspace update semantics preserve user workflow/knowledge/agent areas while
  refreshing bundled files.

Implication for Ripplegraph:

- Ripplegraph should model lifecycle flow, gates, run history, and nested
  subflows such as authoring, sweep evaluation, review, staging, and promotion.
- Python scripts remain the business logic and artifact validators.
- The host adapter should run commands, inspect artifacts, call verifier
  scripts, and submit structured node outputs or gate decisions to Ripplegraph.
- Ripplegraph should not parse Oceanshed TOML/CSV/domain artifacts directly.

Oceanshed-specific gaps:

- Needs structured interaction blocks beyond simple `ask_user` string choices:
  stable IDs, labels, values, `render_via`, and follow-up questions.
- Needs approval/write separation modeled clearly: dry-run output is evidence,
  not approval; agent reviews are evidence, not approval.
- Needs command/tool metadata so graph nodes can declare allowed host commands
  such as `oceanshed sweep evaluate` or `oceanshed agent verify` without
  Ripplegraph executing them.
- Needs asset/update policy outside Ripplegraph or a package asset layer,
  because Oceanshed manages scripts, workflows, agents, knowledge, and
  preservation rules.

## Oceanlive Findings

Oceanlive is the strictest human-interrupt case.

Source facts:

- `oceanlive-cli` scaffolds `.oceanlive/`; it does not execute trades or call
  the server.
- `.oceanlive/_main.md` requires guide-following, explicit numeric picks, no
  inferred acceptance from "ok/continue/go", no invented fills, and one live
  day per session.
- `daily_execution.md` says every user decision is an explicit numbered pick.
  It has a hard rule: after rendering any menu or prompt, stop immediately and
  wait for the user's numeric pick; no tool calls in the same response.
- `session.js` is the deterministic driver around the backend. It wraps
  allowed FSM transitions, logs server commands, persists audit artifacts,
  queries available actions, and writes session artifacts.
- `session.js` enforces read-only CSV column contracts before applying scaling,
  fills, or skips.
- Knowledge explicitly separates FSM transitions from side-channel table loads:
  side-channel loads prepare in-memory table state but do not move the FSM.
- Tests pin daily guide invariants, no raw `livecopy step` instructions,
  driver/server command parity, server handler parity, side-channel docs, and
  read-only CSV protections.

Implication for Ripplegraph:

- Ripplegraph can be the high-level run/gate history around the session, but
  it must not replace `oceanlive_app`'s FSM. The backend remains authoritative.
- A Ripplegraph host adapter must reconcile every turn with `session.js`
  outputs and backend `available-actions`, not assume its checkpoint alone is
  authoritative.
- Oceanlive requires a stronger interrupt primitive than a normal gate:
  "render this menu and do not run another tool until the next user turn."

Oceanlive-specific gaps:

- Native `requires_user_turn` / `interrupt` semantics are needed for menus and
  side-channel prompts.
- Side-channel actions need a first-class representation: audited host actions
  that do not advance the main graph position.
- Backend-state reconciliation is required. Ripplegraph position can drift if
  the backend FSM changes or a session resumes from existing artifacts.
- Command manifests are important. Oceanlive tests compare driver command
  manifests against backend handlers and docs; Ripplegraph lacks a similar
  command surface contract.

## SpecDev Findings

SpecDev is closest to Ripplegraph conceptually, but its current runtime is not
fully generic.

Source facts:

- `workflow-runtime.js` hard-codes canonical phases
  `brainstorm`, `breakdown`, and `implementation`, plus canonical gate fields
  and artifact paths.
- `workflow.yaml` is still validated against those canonical slots. Current
  modularity is manifest/plugin content at fixed positions, not arbitrary DAG
  workflows.
- `state.js` derives assignment state from filesystem artifacts and
  `status.json`; it does not persist a workflow cursor.
- `checkpoint.js` validates required artifacts, markdown content length,
  required brainstorm sections, and implementation `progress.json` tasks.
- `approve-phase.js` revalidates gate requirements and writes the manifest
  gate field into `status.json`.
- `reviewloop.js` owns external reviewer subprocesses, configs, timeouts,
  env vars, log files, JSONL translation, verdict parsing, stdout salvage,
  max-round behavior, chained reviewers, approval, and autocontinue prompts.
- Tests pin manifest-as-truth behavior, interaction blocks, continuation
  contracts, sticky session state, and drift sweeps. Full real reviewer
  subprocess behavior is intentionally not end-to-end tested.

Implication for Ripplegraph:

- A Ripplegraph-backed SpecDev rewrite would intentionally move from
  filesystem-derived phase position to checkpoint-derived position.
- Artifact production and validation should remain SpecDev host/package logic.
- Reviewloop should remain a reusable host/tool package, not a Ripplegraph
  subprocess primitive.
- `workflowRef` is now sufficient for reusable gated sub-workflows, provided
  the missing input/output mapping is acceptable or added.

SpecDev-specific gaps:

- Migration/recovery is a product gap: existing assignments may be mid-phase,
  approved, completed, or in reviewloop/autocontinue state.
- Interactions and continuation blocks are richer than Ripplegraph gates:
  reviewer source expansion, exact labels/order, follow-ups, sticky state, and
  interrupt/non-interrupt continuation.
- SpecDev artifact validators need a host-side validator interface. Do not add
  generic filesystem checks to Ripplegraph core.

## Cross-CLI Requirement Matrix

| Requirement | Current Ripplegraph fit | Notes |
|---|---|---|
| Durable run position/history | Good | Checkpoints and transition logs fit all three. |
| Human/tool approval gates | Good but incomplete | Gate decisions work; interaction rendering is thin. |
| Nested reusable workflows | Good baseline | `workflowRef` exists; lacks input/output mapping. |
| Business command execution | Host-owned | Keep outside Ripplegraph. Add command metadata only. |
| Artifact validation | Host-owned | Keep TOML/CSV/Markdown/domain checks in CLI packages. |
| External reviewer orchestration | Host-owned | Reviewloop remains outside kernel. |
| Live backend FSM authority | Host-owned | Ripplegraph must reconcile with backend state for oceanlive. |
| Side-channel non-transition actions | Gap | Needed most by oceanlive, useful for dry-run/apply flows. |
| Rich MCQ/follow-up interactions | Gap | Needed by all three. |
| Strong user-turn interrupts | Gap | Required by oceanlive and useful for approval safety. |
| Concurrent active workflows | Partial | One focused run; multiple suspended runs. |
| Asset/template update semantics | Gap or host-owned | Current CLI update logic is richer than graph package registry. |
| Rich schemas/validators | Partial | JSON subset only; host validators needed. |
| Effect enforcement/sandboxing | Partial | Declarative only; not sandboxed. |

## Recommended Architecture

Keep the split strict:

1. Ripplegraph kernel
   - Graph/package validation.
   - Dispatcher routing.
   - Workflow and callable checkpoints.
   - `workflowRef` frame stack.
   - Gate/output schema validation.
   - Transition logs and current focused run.
   - Declared effects and allow-list checks.

2. CLI host adapters
   - Run existing scripts and backend commands.
   - Render host-specific UI interactions.
   - Enforce "stop and wait" behavior.
   - Validate artifacts through existing CLI validators.
   - Reconcile external state before advancing Ripplegraph.
   - Submit structured node outputs/gate decisions.

3. Domain packages
   - Oceanshed sweep/stage/report/review packages.
   - Oceanlive session/side-channel/backend adapters.
   - SpecDev reviewloop/artifact-validator/phase packages.

## Kernel Additions To Consider

P0:

- First-class interaction metadata on nodes/gates:
  `id`, `kind`, `prompt`, `render_via`, ordered choices with stable values,
  optional follow-up/source metadata.
- Strong interrupt/freeze contract:
  a node/gate can freeze the focused workflow cursor until the expected user
  decision arrives, while explicitly allowed support activity may still run.
- Activity audit model:
  the current `side_channel` runtime primitive records non-position-changing
  work on a run. The roadmap direction is broader: a workspace-level activity
  log with origin policy, return policy, and evidence policy. See
  `docs/kernel-gap-design-roadmap.md`.

P1:

- `workflowRef` input/output mapping.
- Command/tool contract metadata:
  declare command IDs, expected artifacts, effects, and validators without
  executing commands in the kernel.
- Host validator interface:
  allow graph packages to name validators that the host resolves.
- State reconciliation hook:
  host can report external authoritative state and detect graph/backend drift.

P2:

- Richer JSON Schema or pluggable schema validation.
- Asset/package update policy if graph packages are expected to carry managed
  workflows, scripts, agents, and knowledge.
- Better multi-run orchestration if concurrent active workflows become a real
  requirement. The initial activity roadmap deliberately keeps one primary
  focused workflow and uses callable-style support graph activity for
  frozen-origin work.

## Completion Criteria For A Real Migration

Before declaring any of these CLIs migrated to Ripplegraph, verify:

- Every existing approval gate has an equivalent Ripplegraph gate or
  interaction contract.
- Existing dry-run/apply/review-not-approval boundaries are preserved.
- Existing CLI validators still run and their outputs are captured as evidence.
- Existing tests for interaction blocks, guide invariants, command manifests,
  artifact validation, and update preservation still have equivalent coverage.
- Oceanlive sessions reconcile with backend `available-actions` every turn.
- SpecDev existing assignment states have a migration/recovery path.
- No business runtime imports are moved into Ripplegraph core.
