# Ripplegraph Determinism, Ordering, and Replay Model

Status: implemented

## Purpose and scope

This note defines the boundary of Ripplegraph's current determinism claim. It
separates deterministic control decisions inside one invocation from ordering
that is merely observable, data that depends on wall-clock time or randomness,
state that can change outside the invocation, and historical evidence that is
not sufficient for replay.

This note refines the active notes on execution, state, validation, identity,
packages, host interaction, metadata, public contracts, and value propagation.
Those notes continue to own exact lifecycle branches, schema semantics,
filesystem write order and recovery, identity domains, package resolution,
adapter shapes, and value retention. This note owns the conditions under which
those behaviors are repeatable and the limits on treating them as globally
deterministic or replayable.

## Determinism decision

Ripplegraph is deterministic at bounded control-flow decision points, not as a
whole-system execution recorder. For a serialized value submission to an
already-addressed workflow or callable execution, the implementation takes the
same implemented path through any applicable value-contract validation and
ordered edge selection, including documented short circuits, when it reads the
same applicable validated durable state, workspace descriptor, graph and
package bytes, and registry state; receives the same stable submitted JavaScript
value including observable property order and property-access behavior; and
runs with the same JavaScript semantics.

This narrow guarantee does not cover start admission, identity allocation, or
the complete outcome of a mutation. Repeating those broader operations also
requires the same effect policy and precondition inputs, live workspace,
registry, and package state at every read—including child packages traversed
during workflow admission—the same explicit identifiers or clock/random
results used to generate them, the same collision and existence observations,
and the same filesystem and process outcomes.

Even the bounded validation-and-routing guarantee does not make two
invocations byte-for-byte identical. Runtime timestamps, generated identifiers,
mutable packages and registry state, host-produced values, external effects,
filesystem failures, and concurrent writers can differ. Ripplegraph also does
not replay transition logs to reproduce an earlier run or call.

## Deterministic and variable inputs

| Input to an operation | Current role in repeatability |
| --- | --- |
| Validated checkpoint and focus | Select the execution status, position, retained values, and active workflow run used by the invocation. Different durable state means a different transition problem. |
| Workspace descriptor | Workflow operations reload the preferred or fallback `workflow.json`. Its presence, validity, identity, and metadata can affect admission or the state projected with an existing checkpoint; the retained checkpoint copy is not substituted for that live read. |
| Graph/package bytes | Supply nodes, schemas, edges, metadata, and version identity. Active recovery checks selected identity fields but not a content digest. |
| Registry bytes | Select new root executions and each newly entered child package. An already pinned active source normally reloads its stored path instead. |
| Submitted value | Drives validation and routing. JavaScript object property order is observable at schema `const` comparison and some projections even when the logical key/value set is equal. Direct library values can also expose inherited properties, accessors, or serialization behavior, so the bounded repeatability claim assumes those observations stay stable while the invocation inspects the value. |
| Host policy and preconditions | Affect workflow and callable start admission, including recursive child-effect inspection, but are not retained as execution input for later replay. |
| Explicit or generated identity | Chooses the target run/call namespace or a new one. Omission can invoke clock/random generation, and an observed collision changes creation into rejection. |
| Wall clock and randomness | Supply timestamps, convenience-generated identifiers, and temporary filenames; they do not select graph edges directly. |
| Filesystem and process state | Determine which records exist, which bytes are read, whether collision checks pass, and whether individual writes succeed. There is no isolated snapshot across all files. |
| External host work | Produces submissions and side effects outside Ripplegraph. The runtime neither executes nor records enough information to reproduce that work. |

A fixed graph and value are therefore insufficient by themselves. Repeatable
validation and routing require the relevant current execution, workspace,
package, and registry inputs plus a serialized state boundary. Repeatable start
or whole-mutation outcomes additionally require the admission, identity,
clock/random, collision, and filesystem inputs described above.

## Validation and routing order

On implemented ordinary workflow, gate, and callable paths, Ripplegraph first
loads the current execution and graph, validates the submitted value against
the active contract, and then scans outgoing edges in manifest declaration
order. `selectEdge` returns the first unconditional edge or first `when` object
whose declared top-level fields are strictly equal to the submitted object
record's fields—whichever qualifying edge appears first in the array. Null,
primitive, and array submissions never satisfy a conditional edge, so only an
unconditional edge can route those values. An empty `when` object matches every
non-null, non-array object and therefore shadows later edges for those values
when it appears first. The selector does not rank all matches, backtrack, or
choose randomly.

For fixed accepted inputs and one fixed ordered edge array, this route choice
is deterministic. Reordering two overlapping edges can change the selected
destination without changing either predicate. An unconditional edge shadows
all later edges. A validation rejection prevents route selection, while a
schema-valid value with no matching edge—including a non-object value with
only conditional outgoing edges—raises the path-specific no-route error.

Determinism does not imply that every comparison normalizes values the same
way. Runtime JSON Schema `enum` uses whole-value strict equality; primitive
members compare by value, while object and array members require the same
reference rather than structural equality. Runtime `const` instead compares
direct `JSON.stringify` results, so object insertion order can affect equality.
Reconciliation recursively sorts object keys before serialization. Edge
conditions use strict equality on the declared top-level fields: primitive
members compare by value, while object and array members require the same
reference, so independently materialized structurally equal nested values do
not match. These are four distinct current comparison contracts.

Terminal, gate, and child-return paths have validation and evidence short
circuits described by the execution and validation notes. Those branches are
fixed code paths for fixed inputs, but they do not create one uniform
transition pipeline.

## Observable collection and projection order

Several public views deliberately impose or preserve an order:

- registry storage sorts registry-map keys, while public registry listings sort
  stored entry identifiers, both with JavaScript `localeCompare`;
- run and call lists enumerate directories and apply JavaScript's default
  string `sort()` to their identifiers;
- graph diagrams preserve manifest node-object and edge-array order; displayed
  `when` labels sort their top-level fields and recursively key-sort nested
  object values with `localeCompare`;
- reconciliation recursively sorts object keys with `localeCompare`;
- workflow `context.previous` keeps output-map property enumeration order and
  takes the last three keys in the active scope; and
- callable previous context preserves the current checkpoint output map's
  entry order.

These orders are not one common global ordering contract. Sorted catalogs and
execution lists are identifier views, diagram structure otherwise retains
declaration order, and `context.previous` is a retained map projection rather
than timestamp order. `localeCompare` is also the current JavaScript-runtime
comparison, not a declared bytewise portable collation protocol.

Transition files preserve the order in which successful append calls reach
that file during serialized use. Entries carry timestamps but no monotonic
sequence number, parent event identifier, request correlation identifier, or
workspace-wide ordering field. Separate run and call logs define no total
order across executions.

## Time and generated identity

Workflow and callable checkpoints use ISO wall-clock strings for creation and
update times. Workflow frame entry and transition records also use the current
wall clock. Their schemas require nonempty strings but do not validate ISO
format, uniqueness, or monotonic increase. Clock adjustment can therefore make
timestamps repeat or move backward, and several operations can receive equal
timestamps.

Dispatcher-created run identifiers combine the graph identifier with a
truncated timestamp-derived suffix. Callable start without an explicit
identifier combines `Date.now()` with a `Math.random()` suffix. These are
convenience names, not deterministic allocators or globally unique identifiers.
Creation checks the owning filesystem namespace and rejects a detected
collision; it does not retry with another generated identifier.

Among high-level registration and execution APIs, graph registration is the
narrow clock-option exception: its library option can supply the stored
`registeredAt` string. Workflow, callable, dispatcher, frame, and transition
engine clocks and callable randomness have no corresponding high-level
injection or seed interface. Ripplegraph has no deterministic-clock or
deterministic-random execution mode.

## Package and registry variability

A new workflow or callable selection reads the registry and loads the package
currently addressed by its entry. Active workflow roots, entered child frames,
and active callable checkpoints retain a package path, graph identifier, and
version. Recovery reloads that path and checks identifier, version, and the
kind expected by the engine.

The retained source does not include a content hash. Editing a package in place
while preserving those identity fields can change schemas, edges, metadata, or
node behavior observed by the next invocation without triggering the recovery
identity error. Conversely, changing the version blocks active reload even if
the executable content would otherwise behave the same.

A workflow-reference child that has not yet been entered resolves through the
then-current registry and pins the selected source only when entry occurs.
Changing the registry between parent creation and child entry can therefore
change which package is selected for that later boundary. Once a frame exists,
its stored source is used for active recovery. Whole-run repeatability requires
preserving both package bytes and the registry states consulted over time, not
only the root checkpoint.

## Invocation and concurrency boundary

The current library and adapters are invocation-driven and use synchronous
filesystem operations. One normal JavaScript call performs its reads,
validation, routing, and writes sequentially; there is no internal scheduler,
background worker, task queue, or automatic retry loop that advances another
run or call between those statements.

This is not a concurrency-control guarantee. Workflow focus availability,
run/call identifier availability, registry replacement, and execution advance
all use ordinary read/check/write or read/modify/write sequences. There is no
interprocess lock, compare-and-swap revision, writer lease, or transaction that
serializes competing invocations. Concurrent writers to the same workspace,
run, call, registry, focus pointer, artifact, or log can observe stale state or
produce an interleaving that no single serialized invocation would produce.

Per-file JSON replacement first writes a sibling temporary path containing the
process identifier and `Date.now()`, then renames it over the destination. That
ephemeral filename reduces ordinary temporary-path overlap but is not a lock,
durable writer identity, or uniqueness guarantee and does not coordinate
competing writers.

Persisted callable calls may coexist and use separate call directories, and
workflow runs retain separate run directories even though only one focus
pointer exists. This is logical addressing and storage separation, not a
promise of parallel scheduling, thread safety, linearizability, or safe
concurrent advancement of one execution identity. Deterministic route choice
assumes the host has serialized mutations at the relevant boundary.

## Replay and repetition

Checkpoints, not logs, are the recovery authority. Ripplegraph has no
transition-log reader in its execution engines, event reducer, replay cursor,
or command that rebuilds a checkpoint by applying historical entries.
Transition logs are audit evidence written by operation-specific paths.
Workflow completion has no dedicated completion record, invalid starts and
many thrown failures create no transition, and some accepted records refer to
artifact paths rather than embedding the accepted value.

Artifacts and checkpoint output maps retain the latest value at an address.
Revisiting a node can overwrite bytes referenced by an older transition.
Dispatcher requests are not durably correlated with later actions, effect
allow-lists and precondition assertions are not retained as grants or replay
inputs, and host tool work is not executed or fully captured by the runtime.
The durable files therefore do not form a complete event-sourced description
from which the same execution can be reproduced.

Repeating an API submission is also not replay. There is no idempotency key or
accepted-submission identifier. A retry after success can encounter a new
position, append another audit record, overwrite retained output, complete an
execution, or fail its lifecycle guard. After an ambiguous interruption, the
host must reload authoritative state before deciding whether another mutation
is valid.

## Host coordination and reproducibility boundary

A host that needs stronger reproducibility must provide it outside the current
runtime boundary. That can include serializing writers, assigning stable run
and call identifiers, preserving exact package and registry snapshots,
recording submitted values and policy inputs, correlating dispatcher turns and
external effects, and capturing a trusted clock or sequence. None of those
records becomes Ripplegraph recovery authority unless the runtime explicitly
stores and consumes it.

A host must not treat a matching timestamp, sorted list position, transition
append position, or reused artifact path as proof of causality or exactly-once
execution. It must also re-anchor from current checkpoint and focus state after
an uncertain write outcome instead of inferring state solely from a returned
error or the tail of a log.

## Current limits and non-guarantees

Ripplegraph currently provides no:

- whole-run deterministic replay or checkpoint reconstruction from logs;
- event-sourced, immutable, or complete record of every execution input,
  policy decision, package byte, metadata view, external effect, and output;
- deterministic clock, seeded randomness, monotonic timestamp, global event
  sequence, or causal correlation identifier;
- package-content pin, registry snapshot pin for future child entry, or
  reproducible-build guarantee;
- interprocess lock, compare-and-swap state revision, writer lease,
  serializable transaction, or safe same-execution parallel-step contract;
- idempotency key, duplicate-submission detection, automatic retry, rollback,
  or exactly-once host-effect coupling;
- portable bytewise collation guarantee for every sorted projection; or
- guarantee that timestamps, map insertion order, directory order, or log
  position represent one global chronology.

## Determinism and replay invariants present in the system

1. For an already-addressed execution with a fixed accepted value and fixed
   ordered edge list, routing chooses the first unconditional or shallow
   strictly matching edge.
2. Deterministic value validation and route choice are narrower than start
   admission, identity allocation, whole-mutation outcome, or byte-identical
   execution; policy, preconditions, clocks, generated identifiers, collision
   observations, and write outcomes can remain variable.
3. Runtime `enum`, runtime `const`, route predicates, and reconciliation use
   four different comparison contracts and must not be treated as
   interchangeable.
4. Registry, run, call, diagram, context, and transition views do not share one
   universal ordering or chronology rule.
5. Active source identity checks path-addressed package id, version, and kind,
   but not package content.
6. A not-yet-entered child is resolved from the registry at entry time; an
   entered frame reloads its stored package source.
7. One invocation executes synchronously, while coordination among separate
   invocations or processes remains host-owned.
8. Coexisting runs and calls are separately addressed durable records, not an
   engine scheduler or a guarantee of safe parallel advancement.
9. Checkpoints are current recovery authority; transition logs and artifacts
   are insufficient for deterministic replay.
10. Every repeated mutation is processed as a new invocation; after ambiguity,
    current authoritative state determines whether resubmission is valid.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`47284a82d05a25ac39415abe22f303eedef2b216` on 2026-08-29. Product source,
tests, package metadata, launchers, templates, TypeScript configuration, and
generated distribution output are unchanged from revision
`480dcc8ef55b4b840737d066d56c54ceca8f228d`; intervening commits published only
protected architecture notes and receipts.

Verification was static: focused tests were inspected but not executed because
the workspace has no installed Vitest executable.

Relevant source paths:

- `src/coach.ts`
- `src/callable.ts`
- `src/dispatcher.ts`
- `src/registry.ts`
- `src/schema.ts`
- `src/storage.ts`
- `src/graph/diagram.ts`
- `src/internal/coach-responses.ts`
- `src/internal/json-io.ts`
- `src/internal/json-utils.ts`
- `src/internal/output-validation.ts`
- `src/internal/runtime-graph.ts`
- `src/internal/transitions.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/dispatcher.test.ts`
- `tests/registry.test.ts`
- `tests/storage.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
- `.specdev/project_notes/architecture/execution-and-workflow-model.md`
- `.specdev/project_notes/architecture/state-and-recovery.md`
- `.specdev/project_notes/architecture/effects-and-authority.md`
- `.specdev/project_notes/architecture/package-and-extension-model.md`
- `.specdev/project_notes/architecture/validation-and-error-model.md`
- `.specdev/project_notes/architecture/host-contract-and-metadata-model.md`
- `.specdev/project_notes/architecture/public-api-and-compatibility-model.md`
- `.specdev/project_notes/architecture/identity-naming-and-scope-model.md`
- `.specdev/project_notes/architecture/data-flow-and-value-propagation.md`
