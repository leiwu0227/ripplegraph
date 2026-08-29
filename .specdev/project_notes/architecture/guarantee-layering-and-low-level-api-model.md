# Ripplegraph Guarantee Layering and Low-Level API Model

Status: implemented

## Purpose and scope

Ripplegraph exposes schemas, storage primitives, package and registry services,
execution engines, dispatcher coordination, and command adapters from one small
runtime. Those surfaces do not all establish the same invariants. This note
defines how their guarantees compose today and, in particular, what direct use
of a lower-level public function does not prove about a higher-level operation.

The public-API note continues to own which imports and adapters are intentional
contracts. The validation note owns exact record and execution-value checking;
the package note owns manifest and catalog semantics; the state note owns
filesystem layout and write ordering; and the admission note owns the guards of
individual engine operations. This note owns the rule that a guarantee belongs
to the layer and operation that actually performs its checks. It does not make
low-level primitives private, define a future safe/unsafe API split, or turn
current high-level operations into transactions.

## Layering decision

Ripplegraph is a stack of composable operations, not one universal validation
boundary. A successful lower-level operation establishes only its documented
local postconditions. A higher-level operation can establish stronger
invariants by calling several lower layers in a specific order, but those
stronger invariants do not flow backward to callers that invoke one primitive
directly.

The dependency shape is approximately:

```text
optional command adapter or host facade
                  |
                  v
dispatcher coordination or workflow/callable engine
                  |
                  +---- package and registry services
                  |
                  +---- execution-value validation and effect checks
                  |
                  `---- storage readers and writers
                              |
                              v
                    record schemas, JSON, filesystem
```

Not every operation traverses every branch. The machine `graph diagram` command
loads a package without registration and passes its parsed manifest to the pure
root-exported `renderGraphDiagram`; calling that renderer directly performs no
package load or manifest parse. Registry listing reads no package. Completed
callable inspection reads a checkpoint without reloading its package. The
machine CLI's `validate` command checks a workspace and catalog shallowly while
initializing missing workflow storage, whereas `graph validate` loads one
package. The name “validate,” a successful parse, or a public import therefore
does not imply that every later engine guard has run.

## Current guarantee layers

| Layer | Representative surfaces | What success establishes | What success does not establish |
| --- | --- | --- | --- |
| Type and declaration | Exported TypeScript interfaces, inferred Zod types, generated declarations | A compile-time contract for typed consumers of the shipped declaration files | Runtime option validation, durable-data validity, or engine admission |
| Record schema | Workspace, manifest, registry, focus, checkpoint, transition, and dispatcher-action schemas | The supplied value has that schema's shape, defaults, closed fields, and local refinements | Existence or agreement of separately stored records, package availability, lifecycle validity, policy, or authorization |
| JSON and storage primitive | Record readers/writers, path helpers, artifact writers, transition appenders, directory listing | The primitive's own path, parsing, schema, serialization, or per-file write contract | High-level collision, focus, source, lifecycle, effect, route, or multi-file consistency invariants |
| Package and catalog service | Package load, registry read/write/list, registration, registered resolution | The operation-specific manifest, catalog, path, collision, or id/kind checks that service performs | Universal executability, a pinned package snapshot, start admission, or active-execution recovery |
| Execution engine | Workflow and callable start, continuation, lifecycle, query, and audit operations | The operation's ordered package, policy, identity, focus, status, value, route, and persistence checks | A reusable admission grant, cross-invocation isolation, rollback, or guarantees for state created outside that engine path |
| Dispatcher request construction | `getDispatchRequest` | Current catalog projection, configured-dispatcher resolution, and a transient advertised action schema | Validation or application of a submitted action, branch-specific checks, an engine result, or a durable request ticket |
| Dispatcher action application | `applyDispatchAction` | A fresh catalog projection, configured-dispatcher resolution, strict action parsing, branch-specific checks, and the returned or delegated result | A target reservation, durable action ticket, or replacement of delegated engine checks |
| Command adapter | Machine and demo argument parsing, JSON acquisition, delegation, and rendering | The adapter accepted and projected that command invocation according to its own contract | Stronger engine semantics than the called library operation or a general protocol shared by every adapter |

These are ownership layers, not trust or security levels. A lower layer can be
appropriate for tests, migration tools, inspection, seeding, or a product that
deliberately owns the omitted invariants. Its public status does not silently
upgrade the result to an engine-created run, admitted call, registered package,
or reconciled workspace.

## Public reachability and guarantee strength

The package root intentionally re-exports schemas, storage helpers, package and
registry services, workflow and callable engines, dispatcher services, effect
checks, and diagram rendering. Low-level storage and registry functions are
therefore programmatic API, not accidental private helpers. In contrast,
`src/internal/` supports the public owners but is not re-exported from the root.

Root reachability answers “may a consumer call this supported surface?” It does
not answer “which invariants did this call establish?” `writeCheckpoint`,
`writeCurrent`, `writeRegistry`, `appendTransition`, and artifact writers are
public operations with narrower contracts than `startRun`,
`startCallableCall`, `registerGraphPackage`, or `applyDispatchAction`.

Ripplegraph currently has no separate `unsafe`, `raw`, or `internal-storage`
namespace, no branded type proving that a record came from an engine, and no
capability token required to call a writer. Callers must choose the operation
whose postconditions they need rather than infer guarantee strength from export
visibility or TypeScript naming.

## Types and record schemas are local contracts

Generated TypeScript declarations do not validate JavaScript values or files.
Runtime acceptance occurs only when an operation invokes a Zod schema or an
explicit semantic check. Even then, a schema normally establishes facts about
one value. For example:

- `currentSchema` validates one nullable focused-run identifier but does not
  prove that its checkpoint exists or is active;
- `checkpointSchema` checks its own identifiers, lifecycle vocabulary, and
  active graph/position relationship, but does not load the referenced package,
  require the current node to exist, or compare the checkpoint with focus;
- when invoked on a value, `registrySchema` validates map keys and entries
  independently but does not require a map key to equal its entry's `id` or
  load the entry's package path; and
- transition schemas validate one appended entry but do not prove that the
  named run or call exists, that `from` matches its checkpoint, or that the
  claimed operation occurred.

Manifest schemas have stronger local refinements: executable packages require
a local entry node, local edge targets, supported runtime schema keywords, and
the declared closed variant. Those refinements still do not resolve a
`workflowRef.graphId` through the workspace registry, evaluate effects or root
requirements, inspect workflow focus, or reserve execution identity.

Runtime JSON-Schema value checking is another layer again. A manifest may be
structurally valid, yet a later submitted callable input, node output, gate
decision, or completion value can be rejected by the operation that consumes
it. Conversely, host-facing schemas retained as metadata are not promoted into
engine validation merely because they share the manifest's schema shape.

## Storage primitives establish per-record facts

Storage readers parse the record they load and storage writers parse the
control record they are given. Artifact writers accept arbitrary caller values
subject to JSON serialization, while transition appenders validate the one
entry before appending it. Path helpers reject selected unsafe segments. These
checks protect their immediate file boundary; they do not recreate the owning
engine operation.

Direct storage use can therefore produce combinations that no high-level
engine would create:

- `writeCurrent` can point focus at an absent, completed, or otherwise
  incompatible run because it validates only the focus record;
- `writeCheckpoint` can replace a run checkpoint without checking focus,
  collision, retained-package identity, allowed lifecycle transitions, or
  effect policy;
- `writeCallableCheckpoint` can overwrite an existing schema-valid call,
  whereas `createCallableCheckpoint` additionally rejects an existing call
  directory; both paths validate call-identifier path safety and the checkpoint
  schema;
- artifact writers can create or replace output files without validating an
  active node response or updating a checkpoint; and
- transition appenders can create schema-valid evidence without advancing or
  even loading the corresponding execution.

The primitives are also not uniformly side-effect-free on rejection. After
their initial path-segment checks, both `writeCheckpoint` and
`writeCallableCheckpoint` create the execution's artifact and scratch
directories before fully parsing and writing the checkpoint. Run and call
listing enumerate directories first and only higher callers that load
summaries validate the contained checkpoint. Per-file JSON replacement is not
a transaction across these records.

## Package, registry, registration, and resolution are distinct

`loadGraphPackage` proves that one directory currently contains a readable
`graph.json` accepted by the manifest schema and its local refinements. Both
`graph validate` and the machine `graph diagram` command use this direct
package path; the latter then passes the parsed manifest to
`renderGraphDiagram`. Direct use of that pure renderer accepts a supplied
manifest and performs neither package loading nor manifest parsing. Neither CLI
operation proves that the package is registered or that an engine can start it
in a particular workspace.

Raw registry operations have a different scope:

- `readRegistry` parses and sorts the current catalog, with absence treated as
  an empty version-1 registry;
- `writeRegistry` reads and sorts the caller's `graphs`, constructs a
  `{ version: 1, graphs }` catalog, parses that constructed value, and replaces
  the catalog. Its parse validates the constructed graph keys and entries, but
  the caller's root `version` and extra root fields are overwritten or dropped
  rather than validated as supplied, and a missing or malformed `graphs` value
  can fail while sorting before Zod parsing. The operation does not load package
  paths, enforce key/entry-id equality, normalize registration paths, or apply
  registration collision rules; and
- `listRegisteredGraphs` projects stored entries without checking that their
  packages remain present or current.

`registerGraphPackage` composes package load with current-registry parsing,
path normalization, identifier/path ownership, and catalog replacement. That
is stronger than raw registry writing, but it is catalog admission only.

`resolveRegisteredGraphPackage` composes registry lookup, an optional expected
kind, current package load, and entry/package identifier and kind agreement. It
does not compare the live version or other package metadata with the snapshot,
evaluate start requirements or effects, inspect focus or lifecycle, or pin the
package across a later invocation. Engine operations add only the further
checks relevant to their own path.

## Engine invariants are path-specific

Workflow and callable engines establish their high-level invariants by
ordering lower-level reads, semantic checks, value validation, and writes.
Workflow start, callable start, resume, ordinary continuation, completed
inspection, suspension, abandonment, and list/query paths intentionally do not
share one wrapper. The dispatcher can add earlier catalog checks, but delegated
workflow and callable engines still reload and validate the sources and state
they own.

Consequently, an engine guarantee applies only when that engine path created or
validated the relevant state. A direct checkpoint writer can construct a
schema-valid lifecycle combination outside the high-level transition graph. A
raw registry writer can construct a schema-valid entry that high-level
registration would not have emitted. A transition appender can record evidence
without the engine mutation it normally accompanies. Later engine operations
may reject, partially accept, or project such state according to the checks on
that later path; low-level reachability does not expand the documented
high-level lifecycle.

There is no all-engine preflight. `validateWorkflowRoot` loads the workspace,
initializes missing workflow storage, and lists the parsed registry entries'
stored `id` values rather than the registry map keys. It does not load every
registered package, run start requirements or effect preflight, inspect
focus/checkpoint agreement, validate every execution, or simulate later writes.
`graph validate` checks one package instead. A caller that needs an operation's
full guarantee must invoke that operation or perform and own equivalent checks
itself.

## Adapter guarantees are additional, not substitutive

The machine CLI parses flags and JSON, applies command-specific required
arguments and small adapter normalizations, then delegates to library
operations. It can reject malformed command input before an engine runs and it
projects thrown failures into its JSON error boundary after the module loads.
Those adapter checks neither replace nor generalize the engine's package,
policy, lifecycle, identity, value, and persistence checks.

Adapter commands also select different library layers. `graph validate` calls
the package loader directly; `graph register` calls high-level registration;
`graph list` reads the catalog; `graph diagram` loads a package and passes its
manifest to the pure renderer; `validate` calls the shallow workspace check;
and execution commands call their corresponding engines. A successful command
must therefore be interpreted according to the delegated operation, not a
uniform notion of CLI validation.

The demo CLI is a human-facing facade with its own presentation and selected
defaults, including a fixed effect allow-list for its direct start command. It
does not create a second engine or strengthen the library operations it calls.
Likewise, dispatcher request/action coordination is a library layer with its
own early checks, not a persistent authority that makes later engine checks
unnecessary.

## Consumer and maintainer responsibilities

A consumer that needs Ripplegraph's documented workflow, callable, dispatcher,
registration, or recovery invariants should use the corresponding high-level
operation and treat its documented exceptions as binding. A consumer that uses
raw writers or lower-level services owns the omitted composition, including
cross-record agreement, collision handling, lifecycle legality, policy,
source identity, operation ordering, failure recovery, and any migration or
repair semantics.

Maintainers must keep tests and claims at the layer they exercise. A schema
test proves schema behavior. A storage test proves the primitive's local
round-trip or failure behavior. A package or registry test proves that service.
An engine or adapter guarantee requires evidence through that higher path.
Passing a lower-layer test cannot substitute for the higher-layer conformance
case.

Changes can propagate upward because higher layers depend on lower ones, but
ownership remains specific. Tightening a record schema can make storage and
engine reads reject old state. Adding an engine guard need not change what a
raw writer accepts. Changing an adapter default need not change its delegated
library operation. Public compatibility impact remains governed by the
surface that changed, not by an assumption that all root exports are one
semantic layer.

## Failure and persistence qualification

Layered composition does not imply rollback. A later check can fail after an
earlier layer has already scaffolded directories, replaced a file, appended
evidence, or completed another write in the same high-level operation. The
state and admission notes own the exact known prefixes. This note's rule is
narrower: success at an early layer is not success of the enclosing operation,
and failure at a later layer is not proof that every earlier side effect was
absent.

The same qualification applies to read freshness. Registry entries, package
bytes, focus, checkpoints, and directory contents are independently mutable.
Composing their readers in one synchronous invocation does not produce an
isolated snapshot or a reusable proof for the next invocation.

## Current limits and non-guarantees

Ripplegraph currently provides no:

- universal validator, dry run, or health check that executes every package,
  registry, policy, lifecycle, state, route, and adapter guard;
- root-API namespace or type-level marker separating raw primitives from
  high-level invariant-preserving operations;
- proof or durable attestation that a checkpoint, registry entry, transition,
  or artifact was produced by its normal engine path;
- automatic cross-record consistency check for focus, checkpoints, logs,
  artifacts, registry entries, and package bytes;
- transaction, rollback, compare-and-swap revision, lock, or immutable snapshot
  spanning the layers;
- automatic repair or migration that turns schema-valid low-level state into a
  valid high-level execution; or
- guarantee that adapter acceptance, package validation, registration, or a
  prior successful invocation authorizes a later engine operation.

Products may wrap Ripplegraph with a narrower facade, hide raw exports, add a
workspace verifier, attach provenance, serialize writers, or provide repair and
migration tools. Those are product-owned guarantees unless and until the
runtime explicitly implements and exposes them.

## Guarantee-layering invariants present in the system

1. A guarantee belongs to the operation that performs its checks; success at a
   lower layer does not imply success at a higher layer.
2. Root-exported low-level primitives are intentional API, but public
   reachability does not grant engine-created provenance or invariants.
3. TypeScript declarations describe calls at compile time; runtime schemas and
   semantic operations remain the acceptance authorities.
4. Record schemas establish local shape and refinements, not agreement with
   separately stored workspace, package, registry, focus, or execution state.
5. Storage primitives validate their immediate paths, records, or log entries
   and can bypass high-level policy, lifecycle, identity, collision, and write
   ordering.
6. Package validation, raw registry read or constructed-catalog write success,
   registration, registered resolution, and execution admission are distinct
   successful states.
7. Workflow, callable, dispatcher, query, and lifecycle guarantees are
   operation-specific; Ripplegraph has no universal engine wrapper.
8. `validate` and `graph validate` are bounded operations, not certification of
   later runtime success.
9. Adapter parsing and projection add adapter contracts without replacing or
   strengthening the delegated engine's ownership.
10. Later-layer failure can follow earlier-layer side effects, and sequential
    reads do not create an isolated or reusable cross-layer snapshot.
11. Callers that use a lower-level surface own every higher-layer invariant
    they choose to bypass.

## Conformance evidence

This note was verified against repository HEAD
`3f62cebacec27dacbc892b29d0ed61ec9e619b6c` on 2026-08-29. Tracked product
source, tests, package metadata, launchers, templates, TypeScript
configuration, and generated distribution output are unchanged from product
baseline `480dcc8ef55b4b840737d066d56c54ceca8f228d`; intervening commits publish
architecture notes and receipts only.

Primary implementation boundaries:

- `src/index.ts`
- `src/schema.ts`
- `src/storage.ts`
- `src/graph-package.ts`
- `src/graph/diagram.ts`
- `src/registry.ts`
- `src/effects.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/dispatcher.ts`
- `src/cli.ts`
- `src/demo-cli.ts`
- `src/internal/json-io.ts`
- `src/internal/output-validation.ts`

Focused supporting tests:

- `tests/schema.test.ts`
- `tests/storage.test.ts`
- `tests/graph-package.test.ts`
- `tests/registry.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/dispatcher.test.ts`
- `tests/cli.test.ts`

Verification was static. The focused tests were inspected but not executed
because project dependencies are not installed; the configured Vitest
entrypoint and executable are absent.

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
- `.specdev/project_notes/architecture/determinism-ordering-and-replay-model.md`
- `.specdev/project_notes/architecture/admission-and-lifecycle-guard-model.md`
