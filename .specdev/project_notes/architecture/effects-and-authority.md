# Ripplegraph Effects and Authority Model

Status: implemented

## Purpose and scope

Ripplegraph uses effect identifiers as declarative inputs to execution
admission. A graph package declares what work may be involved, an invocation
caller supplies an allow-list for a new run or call, and the workflow and
callable start engines refuse their own state creation when the implemented
check finds a missing effect. This is a policy preflight over metadata, not
execution of the effect and not proof that the caller, host, user, process, or
operating system actually grants that capability.

This note binds the current effect vocabulary, workflow and callable admission
rules, policy lifetime, host/runtime authority boundary, and explicit security
limits. It refines the effect concept in `core-concepts.md`, the host-owned grant
step in `host-runtime-interaction.md`, the external-effect boundary in
`execution-and-workflow-model.md`, and the non-transactional effect boundary in
`state-and-recovery.md`. Command tutorials, environment-specific permission
configuration, and a future sandbox or identity design remain outside this
current-system capture.

## Authority boundary

| Participant or record | Current authority and responsibility |
| --- | --- |
| Graph package | Declares effect identifiers, workflow start requirements, node work, and host-facing contracts. A declaration describes expected capability use; it does not grant permission to perform it. |
| Invocation caller | Supplies workflow precondition facts and the effect allow-list used for one run-start or call-start admission. Ripplegraph does not authenticate who supplied those values or obtain user consent for them. |
| Ripplegraph runtime | Through its workflow and callable start engines, validates package structure, computes the effect set implemented by the owning engine, compares it with the caller's allow-list, rejects missing effects before engine-created execution state is written, and owns graph-state transitions. |
| Host or product CLI | Interprets instructions, resolves commands and validators, conducts user or tool interactions, performs external work, and decides which caller authority is sufficient before supplying an allow-list. |
| Registry and dispatcher | Surface selection metadata and forward an effect policy into executable start operations. They do not create a principal, permission, or persistent grant. |
| Process and operating-system controls | Own real filesystem, process, network, credential, and environment enforcement outside Ripplegraph. |

The binding separation is that graph declarations constrain Ripplegraph's
admission decision, while actual external authority remains outside the graph
runtime. A successful preflight means only that every effect identifier checked
at that boundary appeared in the supplied allow-list.

## Effect declaration model

Effect declarations use the common identifier vocabulary: nonempty strings
consisting only of ASCII `A-Z`, `a-z`, `0-9`, underscore, dot, or hyphen.
Ripplegraph assigns no built-in semantics to names such as `read_repo`,
`write_files`, or `network`. There is no hierarchy, wildcard expansion,
parameter scope, or implication between identifiers; comparison is exact
string membership.

The declaration locations have different meanings:

| Declaration | Workflow meaning | Callable meaning |
| --- | --- | --- |
| Graph `effects` | Default execution effects for each node whose own `effects` field is absent. | The complete effect set checked at call creation. |
| Node `effects` absent | Inherit the workflow graph defaults. | Accepted by the shared schema but not checked or returned by the callable engine. |
| Node `effects: []` | Replace the graph defaults with no execution effects for that node. | Accepted but has no callable admission effect. |
| Node `effects: [...]` | Replace, rather than add to, the graph defaults for that node. | Accepted but has no callable admission effect. |
| Tool-contract `effects` | Added to that node's execution effects for workflow admission. | Tool contracts are rejected by callable startup. |
| Side-channel-action `effects` | Effects from every declared action are added to that node's workflow admission set. | Side-channel actions are rejected by callable startup. |

Tool and side-channel effects remain additive even when a workflow node clears
or replaces its graph defaults. Duplicate required or allowed identifiers do
not create distinct requirements. An absent policy is equivalent to an empty
allow-list, so an effect-free admission succeeds without policy input and an
effectful admission does not.

Dispatcher manifests cannot declare effects. Their strict manifest is
metadata-only, and registry entries for dispatchers store empty requirement and
effect lists.

## Workflow admission

Workflow start applies two separate caller-supplied admission inputs:

1. Each start requirement declared by the root workflow must be exactly `true`
   in the supplied precondition-state map. Requirements are readiness
   assertions, not effects.
2. The effective workflow effect set must be contained in the supplied
   allow-list.

The runtime checks the root workflow's start requirements first. It reports
unmet requirement identifiers and any graph-authored redirect or message, but
it does not inspect the external system to establish those facts. The
precondition map is a caller assertion.

Recursive workflow admission collects effects from referenced children, but it
does not collect their `requires` declarations. A child workflow's requirements
are checked when that child is started as a root; they are not checked while
preflighting a parent or when a workflow-reference node later enters the child.
Consequently, a child requirement does not guard nested use of that package.

Workflow effect preflight then follows this implemented model:

```text
root workflow package
    -> inspect every declared node
    -> use node effects, or graph effects when node effects are absent
    -> add tool-contract and all side-channel-action effects
    -> resolve every declared workflow reference through the current registry
    -> repeat for each distinct referenced workflow graph
    -> reject if any required identifier is absent from the caller allow-list
```

This scan is structural, not route-sensitive. It examines every declared node
and recursively follows workflow references whether or not a particular edge
will be selected in the eventual run. Every referenced graph in that structural
closure must therefore be registered and resolve as a workflow package at
start, even when its route would not be selected; resolution failure aborts the
start before run creation. A referenced graph identifier is visited once during
one preflight. Missing-effect diagnostics associate each missing identifier
with the root node or `child-graph/node` owners that required it. A child owner
uses its effect-owning referenced graph's own identifier, not a full ancestry
path for deeper nesting. For example, a node `x` in grandchild graph `C` is
reported as `C/x`, not with its parent or full root-to-child chain.

Requirement or effect denial occurs before the run checkpoint, focus pointer,
start transition, or fresh workflow-state scaffold is written. Package and
registry resolution may already have performed reads, but no denied execution
record is created. After preflight, the engine creates root run state and can
immediately enter a workflow-reference node. That entry resolves the referenced
child again; it does not retain the child package examined by preflight or
recheck its effects or requirements. A concurrent registry or package change
between those resolutions can therefore change or fail immediate child entry
after root checkpoint, focus, and start-transition state already exists.

Both direct workflow start and dispatcher `start_run` use this full workflow
preflight. The dispatcher forwards the caller policy to the workflow engine; it
does not replace the engine's node, tool, side-channel, or child-workflow scan
with the registry's graph-level summary.

## Callable and dispatcher admission

Callable creation checks only the callable manifest's graph-level `effects`.
It performs that check before callable host-feature validation, input-schema
validation, checkpoint creation, artifact directory creation, or the start
transition. Direct call start and dispatcher `call_graph` therefore deny a
missing graph effect without creating call state.

Dispatcher `call_graph` first compares the registry entry's graph-level effects
with the policy, and `startCallableCall` checks the loaded manifest again. The
second check binds creation to the package actually loaded. Neither check
includes callable node-level effects. The shared node schema accepts those
declarations, while callable state omits them and the callable engine neither
checks nor acts on them. This is a current enforcement gap, not a supported
per-node callable authority model.

The dispatcher request phase, catalog inspection, `list_runs`, and `ask_user`
do not require effect policy. Resume and `switch_run` delegate to workflow
resume without effect reauthorization. The dispatcher action value itself has
no effect-grant field; adapters pass policy separately from the validated
selection action.

Registry and dispatcher summaries contain workflow requirements and only the
package's graph-level effects as captured at registration. For a workflow, that
catalog entry is not a complete effective-effect summary: node overrides, tool
contracts, side-channel actions, and referenced child workflows are computed
only by workflow start. Registry metadata also is not automatically refreshed
when a package file changes in place. A host cannot treat the catalog effect
list as proof that no additional workflow effect will be required.

This snapshot has an observable callable edge case. Dispatcher `call_graph`
can reject an effect still present in a stale registry entry before loading a
callable whose manifest no longer declares it. Conversely, an effect added to
the callable after registration is absent from that first check but is caught
by the loaded-manifest check before call state is created.

## Policy lifetime and recovery

The allow-list and workflow precondition map are invocation-local admission
inputs. Ripplegraph does not record them as fields in run or call checkpoints,
transition logs, the focus pointer, or registry execution state, nor does it
automatically write them as artifacts. A successful start does not create a
reusable grant record, and a denial does not append an audit record of the
rejected policy.

After creation, normal state, advancement, gate decisions, suspension,
resumption, abandonment, callable state, and callable stepping accept no effect
policy and perform no effect recheck. The runtime has no grant revocation,
expiry, escalation, or per-node reauthorization operation. Starting a distinct
run or call performs a new admission with the policy supplied to that new
invocation.

This boundary interacts with package recovery in two important ways:

- A workflow reference entered later resolves its child from the registry at
  that later time. Entry checks neither effects nor the child's start
  requirements, so a replacement child can declare different authority inputs
  from the child examined when the parent run started.
- Active run and call recovery checks stored package path, identity, version,
  and expected kind, but not content. A package changed in place under the same
  identity can change effect declarations without causing reauthorization.

The runtime therefore does not claim that a run or call remains continuously
authorized by an immutable effect grant. Its implemented guarantee is limited
to the package metadata examined at the creation boundary.

## Host contracts, decisions, and audit records

Workflow state exposes graph-authored interaction, interrupt, gate,
tool-contract, validator, side-channel-action, instruction, and operator-context
metadata. Ripplegraph validates their manifest shape and serves them to the
host, but it does not run commands, invoke validators, conduct the interaction,
or authenticate a human or tool named as a gate decision source. Host-facing
tool, validator, interaction, and side-channel schemas are not runtime output
validation contracts.

State responses do not expose the admitted allow-list or an effective base
node-effect set. Workflow responses can include the effects nested in returned
tool contracts and side-channel actions, while callable responses omit even a
callable node's schema-accepted `effects` declaration.

Tool-contract and side-channel effects participate in workflow start preflight
because they describe possible host work at a node. That admission does not
make their commands executable authority. The host remains responsible for
resolving a command identifier against its own command policy, protecting
credentials, obtaining any user approval, applying external validation, and
deciding whether to perform the operation.

Side-channel recording is audit-only. The runtime requires an active focused
run and a valid completed/failed status, then appends the caller-supplied action
identifier, input, output, and note without advancing the checkpoint. It does
not verify that the action identifier is declared on the active node, validate
the action's host-facing output schema, or recheck its declared effects.
External-state reconciliation compares the caller-supplied snapshot with an
optional caller-supplied expected value, then records the source and the
runtime-computed alignment result. It does not perform or authorize the
external read that produced those observations.

An audit entry records what the caller reported; it is not proof of the
caller's identity, the external action's occurrence, or the permission under
which it ran.

## Security boundary and non-guarantees

Ripplegraph's current effect policy does not:

- infer effects from instructions, commands, outputs, or observed host work;
- require graph authors to declare every effect actually performed by a host;
- prevent a host from performing undeclared or denied work outside the runtime;
- authenticate callers, model principals or roles, verify signatures, or
  collect user consent;
- provide deny rules, wildcard grants, parameter-scoped capabilities, expiry,
  delegation, or revocation;
- persist or audit the supplied allow-list or precondition assertions;
- sandbox a process, restrict filesystem access, block network access, protect
  credentials, execute scripts, or enforce operating-system policy; or
- atomically couple an external effect to a checkpoint or transition record.

Products can place stronger identity, approval, command-resolution, sandbox,
and operating-system controls around Ripplegraph. Those controls remain
product or host authority; their existence must not be inferred from a graph
effect declaration or successful runtime preflight.

Engine admission is also not a storage access-control boundary. The root
library API re-exports low-level storage writers such as checkpoint, focus,
artifact, and transition helpers. A caller with direct library and filesystem
access can use those helpers to write schema-valid execution records without
passing through workflow or callable effect admission. Those helpers validate
record shape where a record schema applies, not execution authority.

## Effect and authority invariants present in the system

1. Effect identifiers are declarative exact-match labels, not executable
   capabilities or a built-in permission taxonomy.
2. Dispatcher manifests carry no effects and dispatcher selection does not by
   itself grant execution authority.
3. Workflow start checks the effective effects of every declared root node and
   recursively referenced workflow package, with node override and additive
   tool/side-channel semantics.
4. Callable start checks graph-level effects only; callable node-level effects
   are a schema-accepted enforcement gap.
5. Through the workflow and callable engine start entry points, a missing
   checked effect prevents that engine from creating run or call state.
6. Workflow precondition facts and effect allow-lists are supplied by the
   caller, are not externally verified by Ripplegraph, and are not persisted.
7. Existing runs and calls do not reauthorize effects during advancement,
   recovery, or lifecycle operations.
8. Graph state and validation are runtime authority; external work, user
   consent, command execution, and operating-system enforcement remain host or
   product authority.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`71f82204af7046851620ac66f7a9f3b096b131ae` on 2026-08-28. Product source and
focused tests are unchanged from revision
`5cdf1c75b591baddee04d110c5a314ac2f830ad8`.

Verification was static: the focused tests were inspected but not executed
because the workspace has no installed Vitest executable.

Relevant source paths:

- `src/schema.ts`
- `src/effects.ts`
- `src/registry.ts`
- `src/graph-package.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/dispatcher.ts`
- `src/cli.ts`
- `src/index.ts`
- `src/internal/cli-helpers.ts`
- `src/internal/coach-responses.ts`
- `src/internal/transitions.ts`
- `src/storage.ts`
- `tests/schema.test.ts`
- `tests/graph-package.test.ts`
- `tests/effects.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/dispatcher.test.ts`
- `tests/cli.test.ts`
- `tests/registry.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
- `.specdev/project_notes/architecture/execution-and-workflow-model.md`
- `.specdev/project_notes/architecture/state-and-recovery.md`
