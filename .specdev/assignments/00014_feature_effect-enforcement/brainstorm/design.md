# Design: effect enforcement

## Overview

Ripplegraph now has the package repository, registry, dispatcher runtime, and callable runtime pieces needed for a graph-backed coach backbone. The next architectural gap is effect enforcement. Graph package manifests can declare `effects`, and the big-picture notes explicitly say callable graphs, script nodes, and future tool integrations should declare effects such as `read_repo`, `write_files`, and `network`. But the current runtime treats `effects` as display metadata only.

Real findings from the current codebase:

- `src/schema.ts` accepts `effects: z.array(idSchema).default([])` on graphs and graph packages, so effect names are already part of the public manifest contract.
- `src/registry.ts` persists effects in registry entries, and `src/dispatcher.ts` includes them in the graph catalog returned to the host agent.
- `src/dispatcher.ts` validates target graph kind for `start_run` and `call_graph`, but it does not check the target's declared effects before calling `startRun` or `startCallableCall`.
- `src/callable.ts` validates callable schema and graph kind, but it also starts calls without checking manifest effects.
- `src/coach.ts` can directly `startRun` against compact `workflow.json` graphs, and compact graphs also carry `effects`; direct starts bypass registry metadata entirely.
- `node.exec` already supports `inline`, `spawn`, and `script`, but there is no runtime policy distinction for executable node types yet. No current code actually executes scripts, so policy should guard graph boundaries first rather than pretend to sandbox script execution.
- README and `.specdev/project_notes/big_picture.md` both document that declared effects are not enforced yet.

## Goals

- Introduce an explicit runtime effect policy that can allow or reject graph execution based on declared effects.
- Enforce policy for the existing graph entry points:
  - dispatcher `start_run`
  - dispatcher `call_graph`
  - direct workflow `startRun`
  - direct callable `startCallableCall`
  - JSON CLI `start`, `dispatch --action`, and `call`
- Keep read-only catalog operations unaffected: `dispatch --request`, graph list/validate/register, list runs, call list, and state reads should remain usable without effect grants.
- Return clear, structured failures when required effects are not allowed. Use a stable error code such as `E_EFFECT_NOT_ALLOWED` with the missing effects listed in the message or response payload where possible.
- Keep the policy simple enough for consumer CLIs to adapt: a caller passes an allowed effect list, and Ripplegraph checks declared graph effects against it.
- Preserve current behavior for effect-free graphs.
- Document the policy model and the current non-goals.

## Non-Goals

- Do not implement OS sandboxing, process isolation, network blocking, or script execution.
- Do not infer effects from arbitrary instructions, source code, or node text. Only declared effects are enforceable in this assignment.
- Do not implement per-node effect declarations yet unless a small helper makes future per-node checks natural. Graph-level effects are the enforcement boundary for v0.
- Do not add workflow nodes that call callables. That remains a separate runtime integration gap.
- Do not force a large permission system with roles, prompts, or persistence. Runtime policy should be a simple explicit input, not a hidden global state.
- Do not block read-only inspection commands merely because a graph package declares effects.

## Design

### Recommended approach: explicit allow-list policy helper

Add a small `src/effects.ts` module responsible for parsing and enforcing runtime policy. Keep it independent from dispatcher, coach, and callable so the effect model is reusable without creating circular dependencies.

Suggested public shape:

```ts
export interface EffectPolicy {
  allowedEffects: string[];
}

export interface EffectCheck {
  allowed: boolean;
  requiredEffects: string[];
  missingEffects: string[];
}

export function checkEffects(requiredEffects: string[], policy?: EffectPolicy): EffectCheck
export function assertEffectsAllowed(requiredEffects: string[], policy?: EffectPolicy, context?: string): void
```

Default policy should be deny-by-default for non-empty effects and allow for empty effects. This is the safest framework behavior: a host that wants to run an effectful graph must say so explicitly. The runtime API should accept `effectPolicy?: EffectPolicy` on execution entry points.

Use the existing `idSchema` effect name shape. This keeps effect ids portable, easy to serialize, and aligned with the manifest schema.

### Entry-point enforcement

Enforce graph-level effects at execution boundaries:

- `startRun({ ..., effectPolicy })` checks the compact workflow graph's `effects` before creating a run or writing `current.json`. This must happen before `ensureWorkflowRoot()` or any helper that initializes `.ripplegraph/runs/` or `.ripplegraph/current.json`, because denied starts must not create runtime state as a side effect of checking policy.
- `startCallableCall({ ..., effectPolicy })` checks the loaded callable package manifest effects before validating input or creating a call checkpoint.
- `applyDispatchAction({ ..., effectPolicy })` checks the selected registry entry effects before `start_run` or `call_graph`. It should pass the same policy down to `startRun` or `startCallableCall` so direct-call invariants stay consistent.
- CLI commands that can start work accept policy flags and pass them into runtime calls:
  - `start`
  - `dispatch --action`
  - `call`

Do not enforce effects on `dispatch --request`: the host needs to inspect available graph metadata, including effects, before choosing an action. Do not enforce effects on `graph list`, `call-state`, `call-step`, or `state` in this assignment. Once a run or call exists, it has already passed the graph-boundary policy check. Future per-node effects can revisit step-time enforcement.

### Error behavior

Use `RipplegraphError` with a stable code:

```text
E_EFFECT_NOT_ALLOWED: graph summarize-ticket requires effects not allowed by policy: write_files, network
```

This should happen before any durable state mutation. Tests should verify:

- denied workflow start does not create a run or focus current state,
- denied callable start does not create a call checkpoint,
- denied dispatcher action does not mutate state,
- allowing the required effects permits the same action.

### CLI policy shape

Prefer explicit flags over environment variables:

```sh
ripplegraph start --graph daily --run-id daily-a --allow-effect read_repo --workflow-root .
ripplegraph call --graph summarize-ticket --input '{}' --allow-effects read_repo,write_files --workflow-root .
ripplegraph dispatch --action '{"action":"call_graph","graphId":"x"}' --allow-effect read_repo --workflow-root .
```

The CLI helper should normalize both repeated `--allow-effect <effect>` and comma-separated `--allow-effects <a,b>` into `EffectPolicy`. The current `src/internal/cli-helpers.ts` parser returns `Record<string, string | boolean>`, so repeated flags currently overwrite earlier values. Implementation must either extend the parser to preserve repeated flag values, for example as `string[]`, or add a dedicated repeated-value helper used by these commands. Do not silently accept only the last `--allow-effect` value.

Avoid a global config file for now; persistence would make permission behavior less obvious and harder for consumer CLIs to reason about.

### State and catalog visibility

Graph summaries already expose `effects` through registry and dispatcher catalog responses. Keep that behavior. If a direct state response has no focused run and a dispatcher is available, no effect policy is needed because no execution occurs.

For started runs/calls, the checkpoint currently does not persist an allowed-effect list. Do not add persistent grants in v0. The grant authorizes starting the durable run/call; it is not a reusable credential. Future per-node enforcement can decide whether to persist a policy snapshot.

### Alternatives considered

1. **Deny-by-default allow-list at graph boundaries (recommended).** Simple, explicit, easy to test, and fits Ripplegraph's role as a deterministic coach. It prevents hidden side effects before durable state is created.
2. **Warn-only effects.** Easier to adopt but fails the architecture requirement that pure-looking graph calls must not hide mutations. This would preserve the current risk.
3. **Full capability engine with persisted grants and per-node effects.** More powerful, but too large for this assignment and likely to overfit before workflow-callable integration and script execution are designed.

## Success Criteria

- Effect-free workflow and callable starts keep working without policy options.
- Effectful workflow and callable starts fail with `E_EFFECT_NOT_ALLOWED` unless all declared graph effects are explicitly allowed.
- Denied workflow starts leave `current.json` and `runs/` unchanged.
- Denied callable starts leave `.ripplegraph/calls/` unchanged.
- Dispatcher `start_run` and `call_graph` enforce the selected registered graph's effects before mutating state.
- CLI `start`, `call`, and `dispatch --action` accept effect allow-list flags and pass them to runtime entry points.
- Dispatcher request/catalog responses still expose graph effects without requiring grants.
- README and project notes explain the policy, deny-by-default behavior for effectful graphs, CLI flags, and remaining non-goals.
- Typecheck, focused effect/dispatcher/callable/CLI tests, full test suite, and build pass.

## Testing Approach

Add focused tests rather than broad duplicates:

- `tests/effects.test.ts` for pure `checkEffects` / `assertEffectsAllowed` behavior and error shape.
- Extend `tests/coach.test.ts` or add focused runtime assertions for direct workflow start denial before state mutation.
- Extend `tests/callable.test.ts` for callable denial before checkpoint creation and allowed-effect success.
- Extend `tests/dispatcher.test.ts` for `start_run` and `call_graph` effect checks through dispatcher actions.
- Extend `tests/cli.test.ts` with one smoke path proving `--allow-effect` or `--allow-effects` permits an otherwise denied call/start.

Keep fixtures small and graph-level. Avoid introducing script execution fixtures because executing scripts is outside scope.

## Open Questions

- Should `startRun` enforce compact workflow graph effects even when the graph is not registered? Recommendation: yes, because compact graphs already support `effects` in schema and direct starts are an execution entry point.
- Should effect names be standardized now? Recommendation: document examples (`read_repo`, `write_files`, `network`, `run_script`) but do not create a closed enum. Consumers need domain-specific effects.
- Should `call-step` re-check effects? Recommendation: not in v0. A call that exists has already passed the graph-boundary policy check, and no executable tools are run by Ripplegraph during step.
