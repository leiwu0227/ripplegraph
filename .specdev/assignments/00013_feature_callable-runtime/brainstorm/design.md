# Design: callable graph runtime

## Overview

The registry can now store `dispatcher`, `workflow`, and `callable` graph packages, and the dispatcher action schema recognizes `call_graph`. The missing runtime piece is that callable packages cannot actually be invoked. A callable should behave like a typed graph-shaped function: it can have internal nodes and transitions, but from the caller's perspective it returns validated output and does not mutate the focused workflow run.

Ripplegraph should not turn callable graphs into hidden LLM jobs. The host agent still performs node work. The runtime should create an isolated call, surface the current callable node contract, validate submitted node outputs, advance internal callable transitions, and complete with a final output that matches the package `outputSchema`.

Real findings from the current codebase:

- `src/dispatcher.ts` validates `call_graph` targets but always throws `E_CALLABLE_RUNTIME_NOT_IMPLEMENTED`.
- Registered packages are readable through `src/registry.ts`, but there is no helper that resolves a registry entry back to a package folder for execution.
- Existing `src/coach.ts` run lifecycle is tied to compact `workflow.json` and focused workflow state, so reusing it directly would pollute `runs/` and `current.json`.
- `src/internal/output-validation.ts` is reusable as a starting point for JSON-schema-shaped checks, but it currently enforces only `type`, `enum`, `required`, and nested `properties` while manifests accept broader keywords via `.passthrough()`.

## Goals

- Add a callable runtime API for registered `kind: "callable"` graph packages.
- Resolve callable packages from `.ripplegraph/registry.json` and load their `graph.json` manifests.
- Validate call input against the package `inputSchema` before creating call state.
- Store callable execution state outside focused workflow runs, likely under `.ripplegraph/calls/<call-id>/`.
- Return agent-friendly callable state: call id, graph id/version, position, current node contract, previous callable outputs, response contract, and exact next command.
- Add step/advance behavior for callable nodes using the package graph's node output schemas and edges.
- Complete a call with final output validated against the package `outputSchema`.
- Define and enforce the callable validation subset so accepted callable schemas cannot silently rely on unsupported JSON Schema keywords.
- Wire low-level JSON CLI support and update dispatcher `call_graph` to start a callable call instead of returning not implemented.
- Keep callable execution isolated: no writes to `current.json`, no focused run changes, and no `runs/` entries.

## Non-Goals

- Do not execute LLMs, scripts, shell commands, or external tools automatically.
- Do not implement effect permission enforcement yet; effects remain declared metadata until the effects assignment.
- Do not add workflow node syntax for calling callables from inside a workflow graph.
- Do not migrate durable workflow execution from compact `workflow.json` to package folders.
- Do not make callables one-shot black boxes; multi-node callable graphs should remain host-agent-driven.
- Do not add remote package installation, package copying, or registry discovery beyond the current local registry.

## Design

### Recommended approach

Create a small `src/callable.ts` module that owns callable package execution and call persistence. Keep it parallel to, but separate from, `coach.ts` because calls are not focused workflow runs.

Public API:

```ts
interface CallableState {
  status: "active";
  call: { id: string; status: "active"; graphId: string; graphVersion: string };
  position: { graph: string; node: string };
  input: unknown;
  node: { id: string; purpose: string; instructions?: string; exec: string; outputSchema: JsonSchema };
  context: { previous: Array<{ id: string; purpose: string; output?: unknown }> };
  responseContract: { command: "call-step"; acceptedFormats: ["json"]; schema: JsonSchema };
  nextAllowedCommand: string;
  helpCommand: string;
}

interface CallableCompleted {
  status: "completed";
  call: { id: string; status: "completed"; graphId: string; graphVersion: string };
  position: { graph: string; node: string };
  input: unknown;
  output: unknown;
  outputArtifact?: string;
}

startCallableCall(options: {
  workflowRoot: string;
  graphId: string;
  callId?: string;
  input?: unknown;
}): CallableState | CallableCompleted

stepCallableCall(options: {
  workflowRoot: string;
  callId: string;
  output: unknown;
}): CallableState | CallableCompleted | ValidationErrorResponse

getCallableCall(options: {
  workflowRoot: string;
  callId: string;
}): CallableState | CallableCompleted

listCallableCalls(options: {
  workflowRoot: string;
}): CallableCallList
```

`startCallableCall` resolves the registered graph, requires `kind: "callable"`, loads the package manifest, validates input against `inputSchema`, creates an isolated checkpoint, and returns the entry node contract. `stepCallableCall` validates the current node output, records it, selects the next edge, and either returns the next node or completes when the next node is terminal. Completion validates the final node output against the package `outputSchema`.

`CallableState` must always include the original call `input`, including when returned by `call-state` in a later process. The host agent needs that input to execute the current callable node after context loss or resume. `CallableCompleted` must return the final validated `output` directly in the JSON response, not only persist it as an artifact; otherwise the caller cannot use the callable as a function result.

### State layout

Use a separate call state tree:

```text
.ripplegraph/
  calls/
    <call-id>/
      checkpoint.json
      transition-log.jsonl
      artifacts/
        <node-id>.json
```

The checkpoint should include call id, status (`active`, `completed`, `failed` if needed later), graph id, graph version, package path, position, input, outputs, createdAt, and updatedAt. This keeps call audit state available without mixing calls into workflow `runs/` or changing `current.json`.

Because `callId` is used as a filesystem path segment, it must be validated before any write. Use the existing `idSchema` shape (`^[A-Za-z0-9_.-]+$`) for user-supplied and generated ids, and mirror storage path-segment checks so path traversal cannot reach outside `.ripplegraph/calls/`. Starting a call with an existing call id must fail with `E_CALL_EXISTS` before overwriting any checkpoint, transition log, or artifact.

### Package loading and registry resolution

Add a registry helper such as `resolveRegisteredGraphPackage(workflowRoot, graphId)` or keep it private in `callable.ts` if only callables need it initially. It should:

- read the registry,
- reject unknown graph ids with `E_UNKNOWN_GRAPH`,
- reject wrong kinds with `E_WRONG_GRAPH_KIND`,
- resolve relative paths against `workflowRoot`,
- load the package via `loadGraphPackage`,
- verify the loaded manifest still matches the registry id/kind enough to avoid stale registry drift.

This helper is intentionally small. Broader package execution for workflows can reuse or promote it later.

### CLI behavior

Add low-level JSON CLI commands:

```text
ripplegraph call --graph <graph-id> --input <json> [--call-id <id>] [--workflow-root <path>]
ripplegraph call-state --call-id <id> [--workflow-root <path>]
ripplegraph call-step --call-id <id> --output <json> [--workflow-root <path>]
ripplegraph call-list [--workflow-root <path>]
```

The command names are explicit and easy to test. A later ergonomic CLI can alias these, but the JSON CLI should stay direct.

### Dispatcher integration

Update dispatcher `call_graph` action from recognized-but-not-executed to a real callable start action:

```json
{
  "action": "call_graph",
  "graphId": "summarize-ticket",
  "callId": "call-001",
  "input": { "ticketId": "TCK-1007" },
  "reason": "Need a typed summary before triage."
}
```

`applyDispatchAction` should validate the target is callable and call `startCallableCall`. This keeps dispatcher routing as the front door while keeping callable execution details in `src/callable.ts`.

The dispatcher schemas must be updated with `callId?: string` in both places:

- the strict Zod `callGraphActionSchema`,
- the public JSON action schema returned by `dispatch --request`.

Tests should cover `call_graph` with a caller-provided `callId` so this does not regress.

### Validation and transition behavior

Do not rely on unsupported JSON Schema keywords silently. This assignment should either rename/generalize `validateOutput` or add a sibling validation module, then make callable contracts enforce a documented v0 subset:

- supported now: `type`, `enum`, `required`, nested `properties`;
- add in this assignment: `const`, `oneOf`, array `items`, and `additionalProperties: false`;
- reject unsupported callable contract keywords with a clear `E_UNSUPPORTED_SCHEMA_KEYWORD` before creating or stepping a call.

Use that validator for:

- package input validation at call start,
- node output validation at each step,
- package output validation at completion.

Use the same edge selection semantics as workflow nodes. If no edge matches a valid node output, return `E_NO_EDGE`. Gate support should be rejected for callables in v0 with `E_CALLABLE_GATE_UNSUPPORTED`, because a callable is meant to behave like a typed task call; human gates belong to workflow runs unless explicitly designed later.

## Success Criteria

- Registered callable packages can be started through the runtime API and JSON CLI.
- User-supplied and generated call ids are filesystem-safe; unsafe ids fail before any write, and duplicate call ids fail with `E_CALL_EXISTS`.
- Unknown graph ids and non-callable graph kinds are rejected before call state is created.
- Callable package, node, and output schemas either use the supported validation subset or fail clearly before their unsupported keywords can be ignored.
- Invalid call input returns a structured validation error and does not create a call checkpoint.
- Active callable calls expose the current node contract and next allowed command without changing focused workflow state.
- `call-state` exposes the original call input for active calls.
- `call-step` validates node output, records artifacts, advances internal edges, and completes with package-output validation while returning the final validated output in the response.
- Dispatcher `call_graph` accepts optional `callId`, starts a callable call, and no longer returns `E_CALLABLE_RUNTIME_NOT_IMPLEMENTED` for valid callable targets.
- `list_runs` and focused workflow state remain unchanged by callable calls.
- Typecheck, focused callable/dispatcher/CLI tests, full test suite, and built `dist/` output pass.

## Testing Approach

Use temporary workflow roots with registered callable package folders. Keep test fixtures small:

- a single-node or two-node callable that completes successfully,
- successful completion returning the final output through the runtime API and CLI,
- `call-state` for an active call created with input,
- a callable with input validation failure,
- unsafe and duplicate caller-provided `callId` rejection,
- callable schemas using `additionalProperties: false`, `items`, `const`, or `oneOf`, plus one unsupported-keyword rejection,
- a wrong-kind registry target,
- dispatcher `call_graph` integration with caller-provided `callId`,
- CLI `call`, `call-state`, `call-step`, and `call-list` smoke coverage.

Prefer a dedicated `tests/callable.test.ts` for runtime behavior and small extensions to `tests/dispatcher.test.ts` and `tests/cli.test.ts` for integration.

## Open Questions

- Should a terminal entry node complete immediately from input, or should v0 require at least one executable non-terminal node? Recommendation: support the existing workflow convention where the output that transitions into a terminal node becomes the final output; avoid special terminal-entry semantics unless a real use case needs it.
- Should call ids be user-supplied or generated? Recommendation: allow optional `callId` and generate one when omitted, with tests using explicit ids.
- Should callables support gates? Recommendation: reject gates in v0; this keeps callables function-like and leaves human approval in workflow graphs.
