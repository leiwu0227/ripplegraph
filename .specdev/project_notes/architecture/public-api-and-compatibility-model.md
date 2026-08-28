# Ripplegraph Public API and Compatibility Model

Status: implemented

## Purpose and scope

Ripplegraph exposes several different kinds of contract: a programmatic ESM
library, a machine-oriented command adapter, a human-readable demo adapter,
author-owned workspace and graph-package records, and runtime-owned durable
state. Compatibility is determined separately at each boundary. A version
string on one boundary does not version, negotiate, or migrate the others.

This note binds those current surfaces and the compatibility behavior that
exists today. It refines the root-module boundary in
`source-module-boundaries.md`, the adapter protocol in
`host-runtime-interaction.md`, package identity in
`package-and-extension-model.md`, durable authority in
`state-and-recovery.md`, and failure projection in
`validation-and-error-model.md`. It does not define a release policy, promise
semantic-version stability, freeze every error message or help string, or
propose a future migration framework.

## Compatibility decision

Ripplegraph's intentional programmatic surface is the package root. The two
bundled executables are separate adapters over that library, while JSON
manifests and workspace state are accepted according to their owning runtime
schemas and semantic checks. Compatibility exists only where those concrete
surfaces continue to accept and produce equivalent contracts.

There is no runtime-wide protocol version or compatibility negotiation. The
npm package version, workspace version, graph version, registry format version,
durable record shapes, and response discriminators are distinct domains.
No general cross-domain compatibility inference follows from changing one. The
implemented exception is explicit graph identity propagation: a loaded graph
version is copied into new run, call, or child-frame source state and compared
exactly when that active execution reloads its package.

## Current contract surfaces

| Surface | Current boundary | Compatibility consequence |
| --- | --- | --- |
| Root library import | The generated `dist/index.js` entry and `dist/index.d.ts` declarations re-export schemas, storage, workflow, callable, dispatcher, registry, package, effect, and diagram services. | Removing or changing a root export, its options, return shape, or throw behavior changes the programmatic contract. |
| Deep emitted paths | The package has no Node.js `exports` map, so consumers may be able to resolve shipped files below `dist/`. | Reachability is not root-API status. CLI modules and generated internal helpers remain implementation paths, not intentional programmatic contracts. |
| Machine CLI | Once loaded, `ripplegraph` parses command arguments, delegates to root services, and normally emits structured JSON results. Help and successful graph diagrams are raw text exceptions. If the minimal launcher cannot load `dist/cli.js`, it instead writes the import failure as raw stderr text and exits 1. | Command spelling, argument interpretation, stdout framing, result discriminators, and exit behavior are adapter contracts distinct from TypeScript call signatures. Automation cannot assume every failing process reached the adapter's JSON error boundary. |
| Demo CLI | Once loaded, `ripplegraph-demo` renders selected runtime data as human-readable guidance and can copy bundled demo assets. If the minimal launcher cannot load `dist/demo-cli.js`, it writes the import failure as raw stderr text and exits 1. | It is a reference human adapter, not a machine JSON protocol or a second definition of runtime semantics. Its labeled in-adapter errors do not cover launcher-load failure. |
| Author-owned JSON | Workspace `workflow.json` and package `graph.json` are loaded through strict owning schemas, bounded defaults, and semantic refinements. | Shape, closed discriminators, defaults, and validation behavior determine what the current runtime accepts. |
| Runtime-owned JSON | Registry, focus, and checkpoints are written and read through owning schemas; transition records are schema-checked when appended; artifacts and open payload fields carry caller data subject to JSON serialization. | Existing control state must still parse under the current reader before higher-level recovery can proceed. Logs remain evidence rather than replay input. |
| Shipped distribution | The package publishes generated `dist/`, minimal `bin/` launchers, and demo `templates/`. | Installed library and executable behavior comes from the generated distribution, not directly from authored TypeScript source. Templates remain demo assets rather than a general compatibility layer. |

These surfaces overlap but are not interchangeable. A library operation may
have no CLI command, two commands may delegate to the same operation, and an
adapter may deliberately omit fields from a library response without changing
the underlying engine contract.

## Distribution and import boundary

The current package is ECMAScript-module-only. Its manifest names
`dist/index.js` as the programmatic entry, `dist/index.d.ts` as its declarations,
and Node.js 20 or newer as the supported engine range. TypeScript compiles all
production source under `src/` to ES2022 JavaScript and declarations under
`dist/`; tests and examples are not part of that compilation root.

`src/index.ts` and the corresponding generated index use explicit module-level
wildcard exports. They currently expose:

- graph, workspace, checkpoint, transition, and host-contract schemas and
  inferred types;
- low-level storage paths, readers, writers, and appenders;
- graph-package loading and registry services;
- workflow, callable, dispatcher, and effect services; and
- Mermaid or DOT diagram rendering.

The machine and demo CLI modules are executable adapters and are not re-exported
from the root. Neither are `src/internal/` helpers. The absence of an `exports`
map means this boundary is conventional rather than sealed by package
resolution. Code that imports a deep generated path takes a dependency outside
the intentional root contract.

The generated JavaScript and declarations are the files an installed consumer
loads. A source change that is not reflected in `dist/` can therefore make
repository source, installed runtime behavior, and published TypeScript types
disagree. Build synchronization is a distribution concern; `dist/` does not
become authored architecture merely because it is shipped.

## Programmatic library contract

The root surface provides ordinary synchronous TypeScript functions and data
types. Public operations generally accept named options objects, return plain
objects, and use a `status` discriminator where an operation has multiple
normal outcomes. The discriminator vocabulary is operation-specific:

- workflow state distinguishes `ok` from `no_focused_run`;
- workflow advancement can return `ok`, `completed`, or
  `validation_error`;
- callable operations use `active`, `completed`, `validation_error`, and an
  `ok` list response; and
- dispatcher operations add `needs_action` and `needs_user_input` while also
  returning workflow or callable results.

There is no one root response envelope and no exported runtime schema that
parses every library response. Consumers must narrow the result defined for the
operation they invoked. At a supported runtime execution-value boundary—
callable input, ordinary node output, workflow gate decision, or a checked
completion output—a rejected value returns `validation_error`. Structural
record or dispatcher-action rejection, admission, lifecycle, identity, route,
and storage failures generally throw. `RipplegraphError.code` is an open
string, and native or Zod errors can still escape lower-level public functions.
The exact failure boundary is owned by `validation-and-error-model.md`.

Generated TypeScript declarations describe the compiled API to typed
consumers; they do not validate JavaScript calls or durable data at runtime.
Zod schemas and explicit semantic checks own runtime acceptance where the
implementation invokes them. Whole library options and constructed response
objects are not uniformly reparsed through Zod merely because related record
types exist.

Low-level storage is intentionally root-exported. Direct consumers can read or
write individual records and append transition entries, but those calls bypass
the higher-level engine's lifecycle and focus rules and its documented
operation-specific write ordering. Neither the low-level functions nor the
higher-level engines provide cross-file rollback or atomicity. Public
reachability is therefore broader than the recommended workflow, callable, and
dispatcher control paths.

## Machine and demo adapter contracts

After its module loads, the `ripplegraph` adapter catches a thrown
`RipplegraphError` and writes a JSON error object containing `status: "error"`,
the open code, message, and optional details, then exits with status 1. Other
throws are projected as `E_INTERNAL` and also exit 1. A returned
`validation_error` is ordinary command output and exits normally, so process
status alone does not prove that an engine submission was accepted.

Most successful machine commands serialize the library result as indented
JSON. Two deliberate stdout exceptions are not JSON:

- help is command text; and
- a successful `graph diagram` command is Mermaid or DOT text.

The machine help distinguishes canonical host operations from compatibility or
management/debug operations. That classification is an adapter-level usage
contract, not a second engine. For example, a canonical operation can delegate
to the same library service as a compatibility alias, and direct management
commands remain callable without changing dispatcher or workflow ownership.

After its module loads, the demo adapter has different vocabulary and rendering.
It writes human-readable state, guidance, validation feedback, and
initialization text; throws are rendered on stderr as a code and message, with
native failures labeled `E_INTERNAL`. Before that boundary, the minimal demo
launcher writes an import rejection as raw stderr and exits 1. The adapter's
fixed presentation, demo initialization behavior, and bundled-template
assumptions are not a versioned machine protocol.

Neither adapter publishes a protocol-version field, capability handshake, or
content-negotiation mechanism. A host that automates the machine CLI must know
which commands produce JSON and must narrow returned status fields just as a
library consumer does.

## Independent version domains

| Version-bearing domain | Current meaning | What the runtime does not infer |
| --- | --- | --- |
| npm package version | Distribution metadata for the installed Ripplegraph package. The core runtime does not read it when loading a workspace, graph, registry, checkpoint, or response. | It does not automatically select a data migrator, negotiate a CLI protocol, or compare itself with graph or workspace versions. |
| Workspace `workflow.version` | A required nonempty workspace identity string. It is projected from the currently loaded descriptor and copied into a new run checkpoint. | Active operations do not compare the current descriptor's identifier or version with the checkpoint copy; it is not a persisted-format gate. |
| Graph manifest `version` | A required nonempty package identity label. Registration snapshots it; new executable selection loads the current package; active run/call recovery requires exact equality with the checkpointed graph source. | It is not parsed as semantic version, ordered, range-selected, or used to negotiate features or migrate package data. |
| Registry `version` | The literal integer `1` at the root of `.ripplegraph/registry.json`. | It is not a graph version or npm version. Other values are rejected; no registry upgrader or downgrade path exists. |
| Checkpoint, focus, and transition shapes | Their owning strict schemas are the implicit current format. Identity fields inside them serve execution or workspace identity. | They have no independent format-version discriminator, migration registry, or compatibility range. |
| Library and CLI responses | Operation-specific TypeScript shapes and adapter output, usually distinguished by `status` or `action`. | They carry no protocol version, minimum-client declaration, or feature-negotiation field. |

Graph-version behavior is intentionally asymmetric. The registry resolver
checks a selected entry's identifier and kind against the package it currently
loads but does not require the registry's snapshotted version to match. A new
run, call, or child frame records the loaded manifest's current version. Later
active recovery reloads the checkpointed path and requires exact identifier,
version, and expected kind. An in-place content change that preserves those
values is not detected; a version change blocks that active execution even if
the new package might otherwise be compatible.

Workspace-version behavior is different. A run records the workspace identity
present at start, but current state and resume paths load and project the
current workspace descriptor without comparing it with that checkpoint copy.
Graph and workspace version strings must therefore not be treated as one
coordinated compatibility tuple.

## Structural and durable-data compatibility

Most framework-owned records use strict Zod objects. Unknown outer fields are
rejected in graph manifests, workspace descriptors, registry entries, focus,
checkpoints, and transition entries. Closed graph kinds, statuses, operations,
interaction kinds, execution markers, dispatcher actions, and other literal or
enum vocabularies likewise reject values the current runtime does not know.
Adding an optional field or new discriminator in a newer producer does not make
it forward-compatible with an older strict reader.

The intentional open areas are bounded. JSON Schema objects are passthrough
records, transition `validation` envelopes permit extra details, and fields
typed as `unknown` or arbitrary string-keyed data retain application values.
That openness does not relax their strict containing record or cause unknown
framework fields to become extensions.

Schema defaults accept omission only where an owning schema declares one—for
example, selected manifest collections, node fields, checkpoint maps and
stacks, or the registry's `graphs` field. Separate reader rules handle absence
of certain whole files. These are bounded current-shape normalization and
absence rules, not a general old-format upgrader. In particular:

- a missing registry file reads as an empty version-1 registry;
- a missing current-focus file reads as no focused run;
- a missing checkpoint or call checkpoint is an error; and
- an invalid or differently shaped existing record is rejected rather than
  migrated.

Workspace identity has one explicit location fallback:
`.ripplegraph/workflow.json` is used when present, otherwise root
`workflow.json` is used. The hidden file wins when both exist. This dual read
path is a current lookup rule, not evidence of a generalized file-layout
migration system.

Runtime-owned control records are parsed before use. Existing state can become
unreadable after an incompatible schema change even when its graph package is
unchanged. Transition logs are historical evidence rather than replay input,
and artifacts or open payloads do not reconstruct a rejected checkpoint.
Root-exported low-level control-record writers validate the current record they
are given but do not detect an older format and upgrade it. Artifact writers
instead accept arbitrary output subject to the shared JSON writer's
serialization behavior.

## Interpreting changes

Compatibility impact follows the surface changed, not merely the file edited:

| Change | Current interpretation |
| --- | --- |
| Add, remove, or alter a root export or generated declaration | Programmatic API change. A source-only edit is not delivered until generated distribution output is synchronized. |
| Refactor an unexported helper while preserving root behavior | Internal change, even though the absent `exports` map may leave the generated path technically reachable. |
| Change a command, flag interpretation, stdout framing, result shape, or exit behavior | Change to that CLI adapter. It need not change the corresponding library operation, but automated clients can still break. |
| Change demo wording or selected rendering | Change to the human reference adapter, not the machine protocol or engine contract. |
| Add a graph/workspace field or closed vocabulary value | Schema change. Older strict runtimes generally reject it unless the relevant slot is intentionally open. |
| Change a checkpoint, focus, registry-entry, or transition outer shape | Durable-format change. Existing files require continued reader acceptance or an explicit external migration because no built-in migrator exists. |
| Change only a graph version string at the package path retained by an active checkpoint | New selections can record the new value; active executions pinned to the old value are rejected when they reload that path. The version change does not prove a content or schema change. |
| Change npm package version | Distribution release metadata changes. No runtime data or protocol compatibility action follows automatically. |

An unchanged version is not proof of compatibility, and a changed version is
not a migration instruction. Tests that assert current examples or result
fields, plus direct source/distribution comparison, are conformance evidence for
those cases; they do not create a general semantic-version or
backwards-compatibility policy.

## Current limits and non-guarantees

Ripplegraph currently provides no:

- package `exports` map that technically seals root API paths;
- CommonJS entry point or browser-targeted distribution contract;
- published stability tier, deprecation registry, or compatibility matrix for
  root exports and commands;
- single response schema, closed error-code taxonomy, or separately versioned
  machine protocol;
- runtime/package feature negotiation, minimum-runtime field, capability
  handshake, or graph-version range selection;
- manifest, workspace, checkpoint, focus, transition-log, or response migration
  framework;
- content digest that equates a graph version with exact package bytes;
- automatic registry refresh or compatibility check between its full snapshot
  and the package selected for a new execution; or
- guarantee that a future strict reader accepts unknown fields emitted by a
  newer producer.

A consuming product may wrap the root API with a stable facade, validate a
closed result/error union, version its own protocol, pin package content, or
provide migrations for the workspace data it controls. Those become product
contracts. They are not supplied by Ripplegraph merely because the underlying
library call, graph version, or registry read succeeds.

## Public API and compatibility invariants present in the system

1. The root barrel defines the intentional programmatic API; deep-path
   reachability does not promote an internal or CLI module into that API.
2. Authored TypeScript compiles to the shipped JavaScript and declarations;
   installed consumers execute generated distribution files.
3. TypeScript declarations, runtime record schemas, semantic checks, CLI
   framing, and durable readers are separate compatibility boundaries.
4. Result discriminators are operation-specific, and the library does not
   provide one universal success/error envelope.
5. Machine JSON results, help or diagram raw text, pre-adapter launcher failures
   on raw stderr, and demo human rendering are distinct output boundaries.
6. npm, workspace, graph, registry-format, durable-record, and response version
   domains are not interchangeable.
7. Only graph-source recovery uses graph-version equality as an active package
   gate; equality still does not prove content identity.
8. Strict framework records reject unknown framework fields except at
   deliberately open payload or passthrough slots.
9. Defaults and the two workspace-descriptor locations are bounded read rules,
   not a general migration facility.
10. Existing durable state must parse under current readers; Ripplegraph has no
    built-in format upgrade, downgrade, or negotiation path.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`5ec460ae01373b1fb844b0933403c5f2781d97e8` on 2026-08-28. Product source,
tests, package metadata, launchers, templates, TypeScript configuration, and
generated distribution output are unchanged from revision
`480dcc8ef55b4b840737d066d56c54ceca8f228d`; intervening commits published only
protected architecture notes and receipts.

Verification was static: focused tests were inspected but not executed because
the workspace has no installed Vitest executable.

Relevant paths:

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/schema.ts`
- `src/storage.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/dispatcher.ts`
- `src/effects.ts`
- `src/graph/diagram.ts`
- `src/cli.ts`
- `src/demo-cli.ts`
- `src/internal/cli-helpers.ts`
- `src/internal/coach-responses.ts`
- `src/internal/json-io.ts`
- `bin/ripplegraph`
- `bin/ripplegraph-demo`
- `dist/index.js`
- `dist/index.d.ts`
- `tests/schema.test.ts`
- `tests/storage.test.ts`
- `tests/registry.test.ts`
- `tests/templates.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`
- `tests/cli.test.ts`
- `tests/demo-cli.test.ts`
