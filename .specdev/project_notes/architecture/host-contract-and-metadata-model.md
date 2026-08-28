# Ripplegraph Host Contract and Metadata Model

Status: implemented

## Purpose and scope

Ripplegraph graph packages contain more than runtime routing and value schemas.
They also carry descriptive data that helps a host discover graphs, orient an
agent at an active node, render an interaction, resolve product commands and
validators, and display a bounded diagram. Ripplegraph validates and projects
that data at specific boundaries, but it does not turn descriptive identifiers
or text into host behavior.

This note binds the metadata model as it exists today: graph discovery
metadata, node work descriptions, interaction and gate metadata, tool,
validator, interrupt, side-channel, and operator-context contracts, registry
snapshots, dispatcher and execution-state projection, metadata freshness, and
diagram or adapter representation. It refines the host/runtime protocol in
`host-runtime-interaction.md`, node semantics in
`execution-and-workflow-model.md`, persistence authority in
`state-and-recovery.md`, effect ownership in `effects-and-authority.md`, package
extension seams in `package-and-extension-model.md`, and schema ownership in
`validation-and-error-model.md`.

This is not a product-UI specification, a graph-authoring tutorial, an installed
metadata catalog, a promise to execute named host services, or a future plugin,
capability-negotiation, localization, or activity-model design.

## Metadata planes and owners

The current manifest combines several data planes whose consumers and
guarantees differ:

| Plane | Representative fields | Current consumer and meaning |
| --- | --- | --- |
| Graph discovery | `title`, `description`, `activationHints` | Package, registry, state, dispatcher, and CLI surfaces expose selection context to a host. Ripplegraph does not score hints or infer a graph choice from user intent. |
| Admission summary | workflow `requires` and executable `effects` | Registration snapshots these fields and dispatch surfaces them. Workflow start checks the loaded workflow; dispatcher `call_graph` first checks snapshotted callable effects, then callable start checks the loaded manifest again, as described by `effects-and-authority.md`. |
| Node work description | `purpose`, `instructions`, `exec`, `operatorContext` | Active workflow or callable state tells the host what work is current and carries passive product context. |
| Runtime response contracts | node `outputSchema` and gate `decisionSchema` | The owning engine validates submitted values; state also exposes the contract so the host can construct a response. |
| Workflow host-service metadata | `interaction`, `interrupt`, `toolContract`, `validators`, `sideChannelActions` | Active workflow state returns declarative host work. Ripplegraph does not render, resolve, invoke, or authenticate the named service. |
| Gate acquisition metadata | `gate.interaction` and `gate.decisionSource` | Active gate state describes how a host might obtain the decision. The gate itself, not this acquisition description, makes the runtime require `decide`. |
| Runtime-derived guidance | `orientation`, neighborhood `context`, `responseContract`, next/help commands | Ripplegraph constructs guidance from the current checkpoint and loaded manifest. These are response fields, not manifest declarations or durable authority. |
| Diagram projection | graph identity, node identifiers, structural tags, side-channel identifiers, and edge conditions | The diagram renderer produces a deliberately incomplete Mermaid or DOT structural view. |

Structural acceptance, engine enforcement, host interpretation, and adapter
presentation remain separate. A value can be valid metadata yet name no real
renderer, command, validator, tool, external source, or product capability.

The workspace descriptor is a separate metadata surface: `workflow.json`
permits optional `title` and `description`, but current runtime responses expose
only its identifier and version. This note does not imply that workspace-level
descriptions are projected as host context.

## Graph discovery metadata

Every dispatcher, workflow, and callable manifest may declare a nonempty
`title`, a nonempty `description`, and a list of nonempty `activationHints`.
The first two are optional; activation hints default to an empty list. Graph
identity, version, and kind are separate required package identity fields.

Registration copies the following selection and admission summary into the
workspace registry:

- identifier, version, and kind;
- title, description, and activation hints;
- workflow start requirements, or an empty list for other graph kinds;
- executable graph-level effects, or an empty list for dispatchers;
- normalized package path; and
- registration timestamp.

It does not snapshot entry, nodes, instructions, response schemas,
interactions, tools, validators, operator context, edges, or other node-level
contracts. The registry is therefore a discovery snapshot, not a complete
manifest copy.

A no-focused-run state returns the registry entries as `availableGraphs`. A
dispatcher request returns closely related summaries for the selected
dispatcher and all registered graphs, omitting the registration timestamp but
retaining the package path. The machine graph-list command also returns
registry entries. By contrast, graph validation summarizes the package loaded
from the requested path at that invocation.

Ripplegraph does not compare a request with activation hints, rank graphs, or
choose a graph. `getDispatchRequest` carries the caller's request through
unchanged and asks the host to choose one value from a runtime-owned dispatcher
action contract. The graph-authored dispatcher package contributes its own
discovery metadata only; it has no nodes and does not define that action
schema.

Registry metadata can become stale when `graph.json` changes in place.
Re-registration refreshes the snapshot; no watcher or background synchronizer
does so. Hosts must not treat a catalog title, description, hint, requirement,
effect, or version as proof that the current package still contains the same
value.

Callable dispatch gives one part of that stale snapshot operational weight.
The dispatcher can reject `call_graph` from a registry effect that the current
callable manifest no longer declares; an effect added after registration can
pass that first check but is caught by callable start's loaded-manifest recheck
before call state is created.

## Node work description

Each executable node requires a nonempty `purpose`. It may also declare
nonempty `instructions` and an arbitrary string-keyed `operatorContext` object.
The only accepted execution marker is `inline`, and omission materializes that
default. These fields describe host work; they do not cause Ripplegraph to load
or run node code.

Active workflow state returns purpose, instructions, execution marker, output
schema, operator context, and all workflow host-contract fields for the active
node. It also derives:

- an orientation string from current graph, node, and purpose;
- the next-node identifiers, purposes, and edge conditions from declared
  outgoing routes; and
- up to three retained outputs in the active frame scope as recent context.

Recent entries use the fixed description `Completed node`; Ripplegraph does not
persist and replay the historical purpose text that was served when an output
was accepted. The response's `latches` and `capabilities` arrays are currently
always empty and are not populated from manifest metadata.

Control-flow fields are distinct from host descriptions. `edges`, `terminal`,
`gate`, and `workflowRef` declare runtime transition semantics subject to the
graph-kind and entry-point limits in `execution-and-workflow-model.md`. On an
ordinary nonterminal workflow node, `node.outputSchema` validates a submitted
step; on a callable node it validates each callable step. A workflow gate's
`decisionSchema` validates a submitted decision. Current exceptions remain:
direct workflow `step` on a terminal node bypasses node and gate validation, a
child-workflow result bypasses its parent reference node's output schema,
callable gates are rejected, and callable `workflowRef` is accepted by package
shape but has no child-workflow semantics. Serving a contract to a host does
not make all other schemas in the same node runtime contracts.

## Interaction and gate metadata

An interaction is a strict record with an identifier, one of four kinds, and a
nonempty prompt:

| Field | Current structural meaning |
| --- | --- |
| `kind` | `choice`, `free_text`, `confirm`, or `form`. |
| `renderVia` | Optional host renderer identifier; Ripplegraph does not resolve it. |
| `choices` | Optional list of labels and primitive string, number, or boolean values, with optional descriptions. `choice` and `confirm` require at least one entry. |
| `schema` | Optional host-facing JSON Schema-shaped value. A `form` interaction requires an object schema. |
| `followUp` | Optional descriptive record containing a string condition, follow-up identifier and kind, and optional source identifier. Ripplegraph does not evaluate or schedule it. |

The local choice and form refinements are structural renderability checks. They
do not require a renderer to exist, enforce unique interaction identifiers,
restrict every optional field to only one interaction kind, or prove the host
can conduct the interaction.

A gate is a workflow external-decision boundary. It requires the literal type
`external_decision` and a decision schema, and may carry both an interaction
and a decision source. A decision source is either `human`, with an optional
label, or `tool`, with a required tool identifier and optional label. Workflow
state returns the full gate; its derived response contract repeats the decision
schema and decision source and changes the expected command to `decide`.

The distinction is architectural: on a nonterminal workflow node, an
interaction or interrupt alone does not change the engine operation or block a
direct `step`; a gate does. A schema-legal node that is both terminal and gated
retains the entry-point divergence described in
`execution-and-workflow-model.md`: canonical `advance` handles the gate first,
while direct `step` takes the terminal short-circuit. Likewise,
`interrupt.requiresUserTurn: true` and its optional reason are served
instructions for the host; they do not suspend the run, contact a user, or
prevent a direct runtime submission.

## Tool, validator, and side-channel contracts

Workflow nodes can carry three related host-service declarations:

| Contract | Declared fields | Runtime treatment |
| --- | --- | --- |
| Tool contract | identifier, command string, optional purpose, effects, input/output schemas, and validator identifier | Returned in active workflow state. Tool effects participate in workflow start preflight; the command and schemas remain host-owned. |
| Validator contract | identifier, optional purpose, and optional input/output schemas | Returned as a list in active workflow state. Ripplegraph does not resolve or invoke the validator. |
| Side-channel action | identifier, required purpose, optional command reference, effects, output schema, and validator identifier | Returned in active workflow state. Effects participate in workflow start preflight; declaration does not itself perform or record an action. |

The identifier vocabulary supplies shape, not linkage. Current package loading
does not prove that a tool's validator names a declared validator, a
side-channel command reference names the node's tool contract, a side-channel
validator exists, identifiers are unique within their lists, or any named
host service is installed.

Host-facing schemas pass the common JSON Schema shape parser but skip
Ripplegraph's runtime keyword assertion and value validator. A host may support
richer schema vocabulary, but it must supply the implementation. Similarly,
the engine's side-channel recording API accepts a caller-supplied action
identifier without checking it against the active node's declarations. The
effect and audit consequences remain governed by `effects-and-authority.md`.

## Workflow, callable, and dispatcher projection

The three graph kinds do not expose one uniform host-contract surface:

| Graph kind | Current metadata projection |
| --- | --- |
| Dispatcher | Metadata-only manifest. Registry and dispatch surfaces expose discovery and admission summaries; the runtime supplies the fixed action schema. |
| Workflow | Active state exposes purpose, instructions, execution marker, output schema, operator context, interaction, interrupt, gate, side-channel actions, tool contract, and validators. |
| Callable | Active state exposes purpose, instructions, execution marker, output schema, and operator context. Callable startup separately rejects gates and rejects interaction, interrupt, side-channel, tool, and validator metadata. |

Callable rejection occurs during engine admission at start and is re-applied
when a checkpointed callable package reloads, not during package shape parsing.
The shared node schema can therefore load those fields in a callable package,
but that package cannot start through the current callable engine. Callable
node `operatorContext` remains a supported passive field. Callable response
contracts carry the node output schema directly, while ordinary workflow
response contracts leave that schema under `node.outputSchema`; gate response
contracts include the decision schema and decision source.

Active execution state does not repeat graph title, description, or activation
hints. Those are discovery data surfaced before selection. Completed workflow
and callable results likewise return execution identity, position, and output
rather than the active node's host contracts.

## Metadata freshness and durability

Package load parses, validates, and normalizes current manifest metadata. The
registry then retains only its bounded snapshot. A run or call checkpoint stores
package path and identity, not a copy of graph discovery or node contract
metadata.

On later active-state reads, Ripplegraph reloads the package at the
checkpointed path and verifies identifier, version, and expected kind.
Changing the registry to point the same graph identifier at a different path
does not retarget that execution. Editing the checkpointed package in place
while preserving identifier, version, and kind can, however, change the
purpose, instructions, operator context, interaction, contract, or other
manifest data returned on a later invocation. This is the same identity-versus-
content boundary defined by `state-and-recovery.md` and
`package-and-extension-model.md`.

Callable reload adds one enforcement wrinkle: it re-asserts that gates and the
five unsupported host-service fields are absent. Adding one of those fields in
place can therefore make an active call fail to reload instead of merely
changing metadata returned to its host.

Checkpoints, artifacts, and transitions do not record the complete metadata
served to a host. Transition history can show position and submitted values,
but it is not an immutable history of prompts, instructions, choices, command
references, validator declarations, or operator context. Registry timestamps
show registration time, not when a host observed any metadata.

## Adapter and diagram representation

The machine CLI emits library response objects as JSON, so state, dispatch, and
graph-list commands retain their corresponding metadata fields. Its graph
validation command emits a bounded package summary rather than the full
manifest. Product CLIs can and commonly should translate these raw contracts
into product vocabulary.

The bundled human-readable demo adapter renders only a subset. It shows graph
identifier, kind, and title in discovery listings; active purpose and
instructions; recent and next-node context; and a simplified view of the node
or gate output schema. It does not render the complete interaction, interrupt,
tool, validator, side-channel, operator-context, or arbitrary JSON Schema
surface. Adapter omission does not remove a manifest field or change engine
semantics.

The graph diagram command loads and validates the package at the supplied path,
then emits Mermaid or DOT text. Its structural projection contains:

- graph identifier, kind, and version;
- every node identifier;
- `entry`, `gate`, and `terminal` tags;
- declared side-channel action identifiers; and
- edges with stable, key-sorted `when` labels.

It omits graph title and description, node purpose and instructions, schemas,
interactions, decision sources, tools, validators, operator context, effects,
and requirements. A dispatcher produces only a metadata-only comment because
it has no nodes. The diagram is an orientation aid, not a complete manifest,
host-service contract, runtime-state view, or rendered image.

## Current limits and non-guarantees

Ripplegraph currently does not provide:

- a renderer, command, validator, tool, identity, interaction, or external-
  service registry behind graph-authored identifiers;
- cross-reference validation or uniqueness guarantees among renderers, tools,
  validators, side-channel actions, follow-ups, and decision sources;
- automatic intent classification, activation-hint ranking, or graph selection
  from request text or activation hints;
- automatic user-turn enforcement, prompt rendering, command execution,
  validator invocation, or follow-up scheduling;
- localization, content negotiation, host capability negotiation, or a
  separately versioned metadata protocol;
- a durable snapshot or audit history of the exact metadata served during an
  execution;
- automatic refresh of registry metadata after package edits;
- callable gates or callable interaction, interrupt, side-channel, tool, and
  validator contracts; or
- a diagram that preserves the full manifest or proves executable host
  integration.

A product may add resolvers, UI rendering, localization, provenance, command
policy, richer host-schema enforcement, capability negotiation, or metadata
snapshots around Ripplegraph. Those facilities remain product behavior and
cannot be inferred from successful package load or metadata projection.

## Host contract and metadata invariants present in the system

1. Graph discovery metadata describes candidates; Ripplegraph exposes it but
   does not choose a graph from activation hints or request text.
2. The registry is a bounded metadata snapshot and does not contain executable
   node bodies or host contracts.
3. Purpose, instructions, and operator context describe host work; only
   runtime-owned response and decision schemas validate engine submissions.
4. Workflow state exposes the full current node host-contract surface, while
   callable state supports only the narrower passive work description and
   output contract.
5. Interaction, interrupt, decision-source, tool, validator, and side-channel
   identifiers do not resolve or execute themselves.
6. Tool and side-channel effects can affect workflow start admission without
   making their named host operations runtime-executable.
7. A checkpoint pins package identity and path, not metadata content or a
   historical copy of what the host observed.
8. Machine, demo, and diagram adapters are different projections; omission by
   one adapter does not redefine the manifest or engine contract.
9. Dispatcher action shape is runtime-owned even though graph discovery
   metadata helps the host choose an action.
10. Metadata validation is not proof of renderer availability, service
    identity, authorization, execution, or external correctness.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`01e30225c4466039f5225acace89bf56cee93eee` on 2026-08-28. Product source,
tests, package metadata, templates, and adapters are unchanged from revision
`480dcc8ef55b4b840737d066d56c54ceca8f228d`; the intervening commits only
published protected architecture notes and receipts.

Verification was static: focused tests were inspected but not executed because
the workspace has no installed Vitest executable.

Relevant source paths:

- `src/schema.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/effects.ts`
- `src/cli.ts`
- `src/demo-cli.ts`
- `src/graph/diagram.ts`
- `src/internal/coach-responses.ts`
- `src/internal/runtime-graph.ts`
- `tests/schema.test.ts`
- `tests/graph-package.test.ts`
- `tests/registry.test.ts`
- `tests/dispatcher.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/graph-diagram.test.ts`
- `tests/cli.test.ts`
- `tests/demo-cli.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
- `.specdev/project_notes/architecture/execution-and-workflow-model.md`
- `.specdev/project_notes/architecture/state-and-recovery.md`
- `.specdev/project_notes/architecture/effects-and-authority.md`
- `.specdev/project_notes/architecture/package-and-extension-model.md`
- `.specdev/project_notes/architecture/validation-and-error-model.md`
