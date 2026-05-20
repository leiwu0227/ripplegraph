# External Decision Gates Implementation Plan

> **For agent:** Implement this plan task-by-task. Match verification effort to task mode.

**Goal:** Add a generic external-decision gate primitive so workflows can require a separate validated decision before crossing selected graph boundaries.

**Architecture:** Nodes may declare `gate.type: "external_decision"` with a `decisionSchema`; active state exposes `node.gate` and switches `responseContract.command` from `step` to `decide` for gated nodes. Normal `stepRun` refuses gated nodes, while a new `decideGate` runtime path validates the gate decision, stores it separately from agent outputs, records a distinct transition, and advances through existing edge selection. CLI and demo rendering expose generic `decide` commands; consumer CLIs can wrap them with domain-specific language.

**Tech Stack:** TypeScript/Node.js, Zod schemas, filesystem JSON checkpoints/artifacts/logs, existing JSON-schema subset validator, Vitest.

**Execution Mode:** inline

**Test Budget:** ≤ 5 new tests across all tasks.

---

### Task 1: Gate schema and active state contract
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/schema.ts`, `src/internal/coach-responses.ts`, `src/coach.ts`, `tests/helpers/workflows.ts`, `tests/coach.test.ts`

**Work:**
- Add a `gate` schema/type on nodes supporting only `{ type: "external_decision", decisionSchema }`.
- Add `gateDecisions` to checkpoints with a default empty object.
- Extend `StateOk.node` to include optional `gate`, and extend `responseContract` to be `step` for normal nodes or `decide` with schema for gated nodes.
- Update state construction so gated nodes expose `responseContract.command: "decide"` and the gate decision schema.
- Add a gated workflow helper and focused state test.

**Verify:**
- `npm test -- --run tests/coach.test.ts`

**Test Budget:** +1 in `tests/coach.test.ts`; focused (<30s)

**Test Pruning:**
- Reuse existing coach workflow helpers; avoid duplicating complete graph fixtures inline.

**Commit:** `git commit -m "Add gate state contract"`

### Task 2: Runtime decision path
**Mode:** full
**Skills:** test-driven-development
**Files:** `src/coach.ts`, `src/storage.ts`, `src/internal/transitions.ts`, `tests/coach.test.ts`

**Work:**
- Add `decideGate({ workflowRoot, decision })`.
- Refuse `stepRun` at gated nodes with `E_GATE_DECISION_REQUIRED`.
- Validate decisions with the existing schema validator against `node.gate.decisionSchema`.
- On invalid decisions, return validation errors without advancing.
- On valid decisions, write a decision artifact, store `checkpoint.gateDecisions[nodeId]`, select the next edge from the decision payload, log `op: "decide"` with `gateDecision`, and advance or complete the run.
- Fail clearly when `decideGate` is called on a non-gated node.

**Verify:**
- `npm test -- --run tests/coach.test.ts`

**Test Budget:** +2 in `tests/coach.test.ts`; focused (<30s) -- one test covers valid gate branching/storage/logging, the second covers blocked step and invalid/non-gated decision errors.

**Test Pruning:**
- Extend nearby coach operation tests rather than adding broad end-to-end duplicates.

**Commit:** `git commit -m "Add external decision runtime"`

### Task 3: Low-level and demo CLI decide commands
**Mode:** standard
**Skills:** test-driven-development
**Files:** `src/cli.ts`, `src/demo-cli.ts`, `tests/cli.test.ts`, `tests/demo-cli.test.ts`

**Work:**
- Add `ripplegraph decide --decision <json> [--workflow-root <path>]`.
- Add `ripplegraph-demo decide <json> [--file <path>] [--workflow-root <path>]`.
- Update demo active-state rendering: normal nodes show required output and `submit`; gated nodes show "External decision required", render `decisionSchema`, and print a `decide` command.
- Render validation errors from `decide` consistently with existing submit errors.
- Add focused CLI tests for a gated node state and decide command path.

**Verify:**
- `npm test -- --run tests/cli.test.ts tests/demo-cli.test.ts`

**Test Budget:** +2 across `tests/cli.test.ts`, `tests/demo-cli.test.ts`; focused (<30s) -- low-level JSON CLI and host-facing demo rendering are distinct public contracts.

**Test Pruning:**
- Replace obsolete demo assertions when the template changes; do not add duplicate branch tests.

**Commit:** `git commit -m "Expose external decision commands"`

### Task 4: Update support-triage demo to use a gate
**Mode:** lightweight
**Skills:** none
**Files:** `templates/minimal/workflow.json`, `templates/minimal/AGENT.md`, `examples/minimal/workflow.json`, `examples/minimal/AGENT.md`

**Work:**
- Insert a gated review node between `classify-ticket` and the branch execution nodes.
- Make the gate decision schema branch with `approved`, `rejected-bug`, `rejected-feature`, or `rejected-question` or an equivalent compact decision enum that keeps edge matching simple.
- Update AGENT guidance to tell Claude/Codex that `submit` is blocked at the gate and `decide` is required.
- Mirror `templates/minimal` and `examples/minimal`.

**Verify:**
- `diff -ru templates/minimal examples/minimal`

**Test Budget:** +0; text-only

**Test Pruning:**
- No direct tests; final demo CLI tests and smoke cover packaged behavior.

**Commit:** `git commit -m "Add gate to support triage demo"`

### Task 5: Final verification and smoke
**Mode:** lightweight
**Skills:** verification-before-completion
**Files:** `dist/cli.js`, `dist/demo-cli.js`, `dist/schema.js`, `dist/coach.js`, `dist/storage.js`, `dist/internal/coach-responses.js`, `dist/internal/transitions.js`, `.specdev/assignments/00009_feature_human-approval-gates/implementation/progress.json`

**Work:**
- Run assignment-level verification.
- Run the tarball/global install smoke.
- In the initialized test folder, start `support-triage`, submit classification, confirm status shows the gate and `decide`, then decide approved to advance.

**Verify:**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack --dry-run`
- `./build-and-local-setup.sh /mnt/h/ripplepulse/tests/ripplegraph`
- `cd /mnt/h/ripplepulse/tests/ripplegraph && ripplegraph-demo start support-triage --run gate-smoke --workflow-root . && ripplegraph-demo submit '{"category":"bug","priority":"urgent","rationale":"checkout is blocked"}' --workflow-root . && ripplegraph-demo status --workflow-root . && ripplegraph-demo decide '{"decision":"approved","reason":"classification is correct"}' --workflow-root .`

**Test Budget:** +0; final verification only

**Test Pruning:**
- No new tests; this task verifies integrated package behavior.

**Commit:** `git commit -m "Verify external decision gates"`
