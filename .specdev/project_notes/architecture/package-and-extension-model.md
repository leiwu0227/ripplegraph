# Ripplegraph Package and Extension Model

Status: implemented

## Purpose and scope

Ripplegraph extends a consuming product primarily through declarative graph
packages and host-side composition. A graph package is a directory whose
`graph.json` declares one closed runtime graph kind, while a workspace registry
makes selected packages addressable by graph identifier. Package metadata and
host-facing identifiers let a product supply its own commands, validators,
renderers, and policy without loading that product code into Ripplegraph.

This note binds the current package unit, manifest boundary, registration and
resolution rules, supported extension seams, and compatibility guarantees. It
refines the package vocabulary in `core-concepts.md`, module exposure in
`source-module-boundaries.md`, availability protocol in
`host-runtime-interaction.md`, execution lookup in
`execution-and-workflow-model.md`, source pinning in `state-and-recovery.md`,
and registry snapshot limits in `effects-and-authority.md`. Package-authoring
tutorials, installed package catalogs, product-specific command registries, and
a future plugin or package-manager design remain outside this current-system
capture.

## Graph package unit

A graph package is any filesystem directory with a directly contained
`graph.json`. Ripplegraph checks that the directory and file exist, parses the
JSON, validates the manifest, and returns the package path, manifest path, and
normalized manifest. It does not require an npm package, a particular parent
directory, or a package archive.

The graph-package loader reads only `graph.json` from the package directory.
Additional files there are neither discovered nor copied, imported, executed,
or exposed by that loader. A command or validator named in the manifest is
metadata for a host; it is not an executable module bundled into the runtime.

Every manifest has:

- an ASCII identifier matching `[A-Za-z0-9_.-]+`;
- a nonempty, otherwise opaque version string;
- an explicit `kind` of `dispatcher`, `workflow`, or `callable`; and
- optional title and description plus an activation-hint list that defaults to
  empty.

The graph version is independent of the Ripplegraph library version, the
workspace `workflow.json` version, and the registry's literal format version
`1`. The runtime defines no automatic compatibility relation among those four
values.

## Closed manifest variants

The manifest is a strict discriminated union. Unknown object fields are
rejected rather than silently preserved, except within the deliberately open
metadata values and JSON Schema objects described later.

| Graph kind | Current manifest body | Important exclusions and defaults |
| --- | --- | --- |
| Dispatcher | Common identity and activation metadata only. | Rejects entry, nodes, input/output schemas, requirements, and effects. Its action contract is fixed in runtime code. |
| Workflow | Graph effects, entry, nodes, start requirements, and optional completion-output schema. | Effects and requirements default to `[]`; absence of a completion schema means no graph completion contract. Workflow input schema is rejected. |
| Callable | Graph effects, entry, nodes, input schema, and output schema. | Effects default to `[]`; input and output schemas default to `{ "type": "object" }`; start requirements are rejected. |

Executable manifests share the current node and edge vocabulary. Node
`exec` is either omitted or the literal `inline`; there is no package-selected
executor. The loader applies defaults such as inline execution, object node
output, empty edges, and nonterminal status, then verifies that the entry and
every edge target name a node in the same manifest. It also rejects the
currently invalid `workflowRef` plus gate combination.

Every JSON Schema slot first passes a shared shape parser. Wherever those keys
appear, `type` accepts only `object`, `string`, `number`, `boolean`, or `array`;
`required` is an array of strings; `properties` is a recursively parsed schema
record; and `enum` is an array. Other keyword names pass through this first
layer.

Schemas consumed by Ripplegraph itself then receive an additional package-load
assertion against the runtime's supported keyword set: `type`, `required`,
`properties`, `enum`, `const`, `oneOf`, `items`, and
`additionalProperties: false`. This applies to executable graph output,
callable input, node output, and gate-decision schemas. At this layer `items`
must be a schema object, `oneOf` an array of schema objects, and
`additionalProperties`, when present, must be `false`. An unsupported keyword
or value in one of those slots makes the package invalid instead of becoming
an ignored contract.

Manifest validity remains narrower than executability. In particular, package
load does not resolve `workflowRef` graph identifiers, confirm a workspace
dispatcher, evaluate effects or start requirements, or apply callable-engine
host-feature restrictions. Those checks belong to later layers.

## Validation and use layers

The current system intentionally checks different facts at different
boundaries:

| Boundary | Facts checked there | Facts not established there |
| --- | --- | --- |
| Direct package load or `graph validate` | Directory and `graph.json` exist; JSON parses; strict kind-specific manifest, local entry/edge references, structural metadata rules, and runtime-schema keywords are valid. | Registration, child-package availability, engine policy, and recovery compatibility. |
| High-level registration | The target package loads; a different path does not already own its identifier unless replacement is forced; a catalog snapshot and normalized path are written. | Referenced-package closure, dispatcher uniqueness, callable start support, effect authorization, or future file stability. |
| Registered workflow/callable resolution | The catalog contains the requested identifier and expected entry kind; the current package loads; its identifier and kind match the entry. | Equality between the catalog version or metadata snapshot and the current manifest. |
| Engine start or child entry | Owning-engine restrictions, input or precondition contracts, effects, focus/call identity, and the applicable referenced-workflow checks. | Future compatibility after files or registry entries change. |
| Active recovery | The checkpointed package path still loads with the exact stored identifier and version and the kind expected by the owning engine. | Content identity, semantic equivalence, migration, or a persisted authorization grant. |

A package can therefore be load-valid but unregistered, registered but not
currently resolvable, or resolvable but rejected by its owning engine. A valid
registry entry is not proof that the current filesystem package exists or that
an execution can start.

## Registration and catalog snapshots

The workspace registry is a strict version-1 JSON catalog at
`.ripplegraph/registry.json`. Absence means an empty catalog. Normal
registration is explicit; Ripplegraph does not scan directories or infer
packages from the workspace tree.

High-level registration performs one package load, then records a strict entry
under the manifest identifier with:

- identifier, version, and kind;
- title, description, and activation hints;
- workflow requirements, or an empty list for other kinds;
- executable graph-level effects, or an empty list for dispatchers;
- the normalized package path; and
- a registration-time string, normally the current ISO timestamp but
  caller-overridable through the library API.

This entry is a selection snapshot, not a copy of the package. It omits nodes,
edges, input/output contracts, node-level effects, host contracts, referenced
workflow closure, and package content. Proper descendant package paths are
stored relative to the workspace with forward slashes; other package paths are
stored as absolute paths. Registration does not copy or install package files.

Catalog entries and listing output are sorted by graph identifier. Registering
the same identifier at the same normalized path refreshes the snapshot without
`force`, including when the graph version or kind changed. A different path for
that identifier raises `E_GRAPH_ALREADY_REGISTERED` unless `force` is supplied;
forced replacement simply records the new snapshot. It is not a semantic
upgrade, trust, or compatibility check.

The high-level API has no dedicated unregister operation and no atomic
multi-package install. The root library surface does expose `writeRegistry`,
which can replace the complete schema-valid catalog without loading its package
paths or applying registration's collision and normalization rules. The bundled
demo initializer likewise copies a seeded registry. Guarantees specific to
`registerGraphPackage` must not be inferred for every schema-valid registry.

## Lookup and snapshot freshness

Direct validation and diagram generation load a package path without requiring
registration. New workflow runs, callable calls, and workflow-reference entry
instead begin from registry selection. Active run and call recovery is the
opposite: it reloads the path stored in the checkpoint rather than retargeting
through the registry.

Lookup behavior differs by graph kind:

- Dispatcher selection uses registry entries only. It requires exactly one
  registered dispatcher and, when workspace `entryGraph` is present, requires
  that identifier to match. It does not reload the dispatcher's `graph.json`
  during a dispatch request or action.
- Engine-driven workflow and callable selection passes the expected kind to the
  shared resolver, so it first checks the registry entry kind, then loads the
  entry path and checks that the current manifest identifier and kind still
  match. The resolver does not compare the entry's version, title, activation
  hints, requirements, or effects with the current manifest.
- A successful new start stores the current loaded manifest version together
  with the registered path. Later workflow-reference entry repeats registry
  resolution and stores the then-current child manifest version on its frame.

Registry metadata can therefore become stale when `graph.json` changes in
place. Dispatcher and catalog responses continue to expose the stored snapshot.
New workflow or callable execution uses the current loaded manifest after the
identifier/kind check, although dispatcher callable preflight can first act on
stale catalog effects as documented in `effects-and-authority.md`.
Re-registration refreshes the snapshot; no background watcher does so.

## Version and compatibility behavior

Graph versions are identity labels, not semantic-version policy. Ripplegraph
requires only a nonempty string. It does not parse ordering, enforce semantic
versioning, select ranges, negotiate features, declare a minimum runtime
version, or run package migrations.

For a new registered selection, the loaded package version may differ from the
registry snapshot and still resolve. The loaded manifest version becomes the
new run, call, or child-frame version. For active recovery, equality is strict:
changing the package's version at the checkpointed path causes package mismatch
and blocks active execution.

Version equality is not content equality. Editing a checkpointed package in
place while retaining its identifier, version, and expected kind is not
detected. Conversely, registry replacement does not retarget an already
checkpointed root workflow, active child frame, or active callable, while a
future child entry or new execution uses the current registry.

There is no graph-manifest format field, feature declaration, compatibility
range, content digest, lockfile, signature, or package provenance check. Since
manifest objects are strict and runtime-consumed schemas use a closed keyword
set, a package using a newer field, graph kind, execution mode, or runtime
schema keyword is rejected by a runtime that does not implement it rather than
being negotiated or ignored.

## Supported extension seams

Current extensibility is composition around a closed kernel, not arbitrary code
loading:

| Extension seam | Current contract |
| --- | --- |
| Add a graph package | A product can add and explicitly register a dispatcher, workflow, or callable manifest without changing Ripplegraph source, provided it stays within the existing schemas and runtime rules. Normal dispatch still requires the workspace registry to contain exactly one dispatcher. |
| Compose workflows | A workflow node can name another registered workflow by `workflowRef.graphId`. Ripplegraph supplies same-run frames; packages have no dependency installation, version constraint, or input/output mapping declaration. |
| Activation and orientation metadata | Titles, descriptions, activation hints, instructions, and arbitrary `operatorContext` values are returned for host interpretation. Ripplegraph does not infer product policy from them. |
| Host service identifiers | Interaction renderers, tool commands, validator identifiers, side-channel command references, and tool decision sources let the host bind product services. Ripplegraph validates metadata shape but neither resolves all cross-references nor loads, executes, or authenticates those services. |
| Host-facing schemas | Interaction, tool, validator, and side-channel schemas retain the shared parser's common-key shapes and five-value `type` vocabulary. They skip Ripplegraph's runtime keyword assertion and output validation, so additional keyword names pass through for the host to interpret and enforce. |
| Root library composition | Consumers can build product CLIs from the root exports for schemas, packages, registry, engines, effects, storage, dispatcher, and diagram rendering. CLI adapters and `src/internal/` are not intentional root APIs, although the absent Node.js `exports` map does not technically block deep imports. |

Shipped templates are demo assets, not an automatic extension registry.
Diagram rendering consumes a validated manifest and emits Mermaid or DOT text;
it neither installs nor executes a package.

## Closed kernel boundaries and non-guarantees

Package data cannot independently add a graph kind, manifest field, node
execution mode, routing operator, dispatcher action, lifecycle transition, or
runtime-enforced schema keyword. Those are closed runtime contracts and require
a Ripplegraph code and schema change. Extra files beside `graph.json` do not
become hooks, and `exec: inline` is the only accepted execution marker.

Ripplegraph currently provides no:

- package discovery scan, remote registry, download, dependency resolver,
  install hook, update solver, lockfile, or dedicated uninstall operation;
- transitive registration or availability check for `workflowRef` dependencies
  during registration;
- semantic-version range selection, runtime/package compatibility negotiation,
  manifest migration, or rollback;
- content hash, signature, publisher identity, origin attestation, or trust
  policy;
- dynamic import of graph-package code, package-defined callback, background
  process, or package sandbox; or
- atomic transaction across several package registrations and their external
  files.

Products may build those facilities around Ripplegraph's root API. They remain
host or product behavior and must not be inferred from package validity,
registration, a version string, or a successful graph start.

## Package and extension invariants present in the system

1. A graph package contributes one strict `graph.json` manifest; Ripplegraph
   does not load executable package code.
2. The three graph kinds and their fields are a closed runtime union.
3. Manifest loading validates local graph structure and runtime schema
   vocabulary, while registration, engine admission, and recovery are separate
   validation layers.
4. Registration is explicit and records a metadata/path snapshot; it neither
   copies a package nor installs referenced packages.
5. Normal identifier collision is workspace-wide: one registry identifier maps
   to one path unless explicitly replaced.
6. Dispatcher lookup is registry-only, while new workflow/callable lookup
   reloads the package and compares identifier and kind but not registry
   version.
7. Active recovery compares checkpointed identifier, version, path, and expected
   kind, but not package content.
8. Host-facing identifiers and metadata extend product behavior outside the
   kernel; they do not grant code execution inside Ripplegraph.
9. New manifest vocabulary or engine semantics require a core change rather
   than an unrecognized package field.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`480dcc8ef55b4b840737d066d56c54ceca8f228d` on 2026-08-28. Relative to the
earlier product boundary at
`5cdf1c75b591baddee04d110c5a314ac2f830ad8`, the only product changes are the
inside-workspace path-classifier correction in `src/registry.ts`, its tracked
`dist/registry.js` output, and regression coverage in `tests/registry.test.ts`.
That correction preserves relative storage for legitimate descendant names
beginning with two dots while retaining absolute storage for actual parent
traversal.

Focused tests were inspected but not executed because the workspace has no
installed Vitest executable. Adhoc verification parsed the changed TypeScript
and shipped JavaScript, executed the classifier body from `dist/registry.js`
against normal, leading-dot, and external paths, and checked the exact
three-file product boundary.

Relevant source paths:

- `package.json`
- `dist/registry.js`
- `src/index.ts`
- `src/schema.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/effects.ts`
- `src/storage.ts`
- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/cli.ts`
- `src/demo-cli.ts`
- `src/graph/diagram.ts`
- `src/internal/coach-responses.ts`
- `src/internal/dispatcher-resolution.ts`
- `src/internal/json-io.ts`
- `src/internal/runtime-graph.ts`
- `src/internal/schema-keywords.ts`
- `src/internal/output-validation.ts`
- `templates/minimal/workflow.json`
- `templates/minimal/.ripplegraph/registry.json`
- `templates/minimal/.ripplegraph/graphs/workspace-dispatcher/graph.json`
- `tests/schema.test.ts`
- `tests/graph-package.test.ts`
- `tests/output-validation.test.ts`
- `tests/registry.test.ts`
- `tests/dispatcher.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/cli.test.ts`
- `tests/templates.test.ts`

Relevant active architecture authority:

- `.specdev/project_notes/architecture/core-concepts.md`
- `.specdev/project_notes/architecture/source-module-boundaries.md`
- `.specdev/project_notes/architecture/host-runtime-interaction.md`
- `.specdev/project_notes/architecture/execution-and-workflow-model.md`
- `.specdev/project_notes/architecture/state-and-recovery.md`
- `.specdev/project_notes/architecture/effects-and-authority.md`
