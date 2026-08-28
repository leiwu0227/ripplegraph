# Ripplegraph Source Module Boundaries

Status: implemented

## Purpose and scope

Ripplegraph's production TypeScript source is organized around explicit module
ownership rather than one directory per architectural layer. The source tree is
shallow, with public library modules at `src/`, executable adapters beside them,
specialized graph utilities under `src/graph/`, and non-root helpers under
`src/internal/`.

This note binds the current public/private boundary, responsibility split, and
dependency direction. The filenames below identify the present implementation
but are not a closed inventory: adding, splitting, combining, or renaming files
does not create architectural drift when the same ownership, public surface,
and dependency boundaries remain intact.

## Build and distribution boundary

- `src/` is the authored TypeScript production-source root. TypeScript compiles
  it to generated JavaScript and declarations under `dist/`; `dist/` is output,
  not an authored source layer.
- The package's declared programmatic entry point is `dist/index.js`, with
  declarations at `dist/index.d.ts`.
- `bin/ripplegraph` and `bin/ripplegraph-demo` are minimal executable launchers.
  They contain no runtime policy and load `dist/cli.js` and `dist/demo-cli.js`
  respectively.
- The published package includes `dist/`, `bin/`, and `templates/`. Templates
  are shipped assets consumed by the demo adapter, not runtime source modules.

## Source folder structure

```text
ripplegraph/
├── bin/
│   ├── ripplegraph                  # loads dist/cli.js
│   └── ripplegraph-demo             # loads dist/demo-cli.js
├── src/                             # authored TypeScript production source
│   ├── index.ts                     # root library barrel
│   ├── schema.ts                    # shared contracts, schemas, and errors
│   ├── storage.ts                   # workspace, run, and call persistence
│   ├── graph-package.ts             # graph package loading and validation
│   ├── registry.ts                  # graph catalog and package resolution
│   ├── effects.ts                   # declared-effect policy
│   ├── coach.ts                     # workflow-run engine
│   ├── callable.ts                  # callable-call engine
│   ├── dispatcher.ts                # validated front-door coordination
│   ├── cli.ts                       # machine-readable command adapter
│   ├── demo-cli.ts                  # human-readable reference adapter
│   ├── graph/
│   │   └── diagram.ts               # Mermaid and DOT rendering
│   └── internal/                    # non-root implementation helpers
│       ├── cli-helpers.ts           # argument, JSON, and output helpers
│       ├── coach-responses.ts       # host-facing state assembly
│       ├── dispatcher-resolution.ts # dispatcher selection
│       ├── json-io.ts               # JSON filesystem primitives
│       ├── json-utils.ts            # stable JSON values
│       ├── output-validation.ts     # runtime output validation
│       ├── runtime-graph.ts         # node lookup and edge selection
│       ├── schema-keywords.ts       # supported schema vocabulary
│       ├── transitions.ts           # transition record construction
│       └── zod-issues.ts            # validation issue formatting
├── templates/                       # shipped demo assets
└── dist/                            # generated JavaScript and declarations
```

## Source ownership map

| Path | Current ownership | Root library exposure |
| --- | --- | --- |
| `src/index.ts` | The package barrel and intentional programmatic entry point. | Defines exposure by re-exporting selected modules. |
| `src/schema.ts` | Shared errors, manifest schemas, node contracts, workflow/callable checkpoints, transition records, and inferred public types. | Re-exported. |
| `src/storage.ts` | Workspace metadata lookup and the `.ripplegraph/` paths and persistence operations for focus, runs, calls, checkpoints, artifacts, and transition logs. | Re-exported. |
| `src/graph-package.ts` | Graph-package folder lookup, `graph.json` reading, and manifest validation. | Re-exported. |
| `src/registry.ts` | Registry schema, persistence, package registration, catalog listing, and kind-aware package resolution. | Re-exported. |
| `src/effects.ts` | Declared-effect allow-list checking and denial errors. | Re-exported. |
| `src/coach.ts` | Durable workflow-run lifecycle, focus, start requirements, effect preflight, stepping, gates, child workflows, audit operations, and recovery. | Re-exported. |
| `src/callable.ts` | Isolated callable-call lifecycle, callable contract restrictions, validation, persistence, stepping, and completion. | Re-exported. |
| `src/dispatcher.ts` | The validated front-door action protocol that composes registry, workflow, callable, and effect services. | Re-exported. |
| `src/graph/diagram.ts` | Pure rendering of validated graph manifests as Mermaid or DOT text. | Re-exported through `src/index.ts`. |
| `src/cli.ts` | Machine-readable command adapter for the library API. | Executable only; not re-exported. |
| `src/demo-cli.ts` | Human-readable reference adapter and demo-project initializer. | Executable only; not re-exported. |
| `src/internal/` | Shared implementation helpers for CLI parsing, response assembly, dispatcher resolution, JSON I/O, stable JSON, output validation, edge selection, schema-keyword checks, transition construction, and issue formatting. | Not re-exported. |

## Programmatic API boundary

`src/index.ts` currently re-exports `schema`, `storage`, `coach`,
`graph-package`, `registry`, `dispatcher`, `callable`, `effects`, and
`graph/diagram`. Those exports form the intentional root library surface.

Neither CLI adapter nor any `src/internal/` module is re-exported. Their emitted
files are implementation details rather than root API contracts. The package
does not currently declare a Node.js `exports` map, so this separation is
conventional rather than technically sealed: consumers may be able to resolve
deep emitted paths, but that reachability does not make those paths part of the
root API.

`src/storage.ts` is intentionally included in the current root surface.
Persistence helpers therefore cannot be treated as private merely because
higher-level runtime services normally call them on a host's behalf.

## Dependency direction

The current runtime dependency direction is:

| From | Depends inward on |
| --- | --- |
| `bin/*` | The corresponding generated CLI adapter only. |
| `src/cli.ts`, `src/demo-cli.ts` | The root library API plus private parsing or presentation helpers. |
| `src/dispatcher.ts` | Workflow and callable engines, registry/catalog access, dispatcher resolution, schemas, and effect checking. |
| `src/coach.ts` | Schemas, storage, package and registry resolution, effects, and private transition, validation, graph, JSON, dispatcher, and response helpers. |
| `src/callable.ts` | Schemas, call storage, package and registry resolution, effects, and private graph and validation helpers. |
| `src/registry.ts` | Package loading, the registry path, shared schemas, and private JSON and validation formatting. |
| `src/graph-package.ts`, `src/storage.ts`, `src/effects.ts` | Shared schemas and narrowly scoped private primitives. |
| `src/graph/diagram.ts` | Shared graph types and stable JSON formatting only. |

`src/internal/` is a visibility boundary, not a universal lowest layer. Private
helpers may consume public types and may be shared by several public modules.
Type-only back-references from private helpers to an owning public module erase
at build time and do not transfer runtime ownership to the helper.

## Structural invariants present in the system

1. `src/index.ts`, rather than physical placement directly under `src/`, defines
   the intentional root library surface.
2. Shared graph, node, checkpoint, and transition contracts have one schema
   owner. Runtime modules consume those contracts rather than declaring
   competing persistence or manifest shapes.
3. Workflow-run and callable-call execution remain sibling engines. Neither
   engine invokes the other; the dispatcher is the runtime front door that can
   select either one.
4. Runtime engines do not manipulate workspace files directly. Workflow and
   call state operations go through storage; package loading and registry
   changes go through their owning modules and shared private JSON primitives.
5. CLI adapters parse, render, and delegate. They do not own graph transition,
   checkpoint, registration, or effect-policy semantics, and library runtime
   modules do not depend on CLI adapters.
6. Private helpers remain outside the root barrel. They support public owners
   without becoming an alternate public service layer.
7. Graph diagram generation is read-only and separate from graph execution.
8. Generic production modules contain Ripplegraph runtime policy, not the
   lifecycle policy of consuming products. Product CLIs compose the public
   surface outside this core; the bundled demo remains a reference adapter.

## Interpreting structural change

The following changes would conflict with this architecture unless the active
note were explicitly replaced:

- making CLI adapters or private helpers part of the root API without redefining
  their ownership;
- making schema, storage, package, or registry responsibilities compete across
  unrelated modules;
- creating a dependency from library runtime modules back into CLI adapters;
- coupling workflow and callable engines directly instead of composing them at
  a front-door or host boundary;
- moving transition authority or direct runtime-state mutation into adapters;
  or
- embedding a consuming product's lifecycle policy into generic runtime
  modules.

An internal refactor does not conflict merely because a file moves or a helper
is split. It remains conformant when the root API, module responsibilities,
runtime dependency direction, and host/runtime boundary remain equivalent.

## Current enforcement limits

- The lack of a package `exports` map means the public/private import boundary
  is documented by the root barrel but not enforced by Node.js package
  resolution.
- The package exposes low-level storage alongside higher-level orchestration
  APIs; the root surface is broader than only the coach, dispatcher, and
  callable services.
- `src/internal/` groups helpers by visibility. It is not subdivided into
  ownership-specific directories, and several public modules share some of its
  mechanics.

## Conformance evidence

This note was verified against clean tracked production source at Git revision
`412d293119b58b716cee1182b0023b9d0ff09ece` on 2026-08-28.

Relevant source paths:

- `package.json`
- `tsconfig.json`
- `bin/ripplegraph`
- `bin/ripplegraph-demo`
- `src/index.ts`
- `src/schema.ts`
- `src/storage.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/effects.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/dispatcher.ts`
- `src/graph/diagram.ts`
- `src/cli.ts`
- `src/demo-cli.ts`
- `src/internal/cli-helpers.ts`
- `src/internal/coach-responses.ts`
- `src/internal/dispatcher-resolution.ts`
- `src/internal/json-io.ts`
- `src/internal/json-utils.ts`
- `src/internal/output-validation.ts`
- `src/internal/runtime-graph.ts`
- `src/internal/schema-keywords.ts`
- `src/internal/transitions.ts`
- `src/internal/zod-issues.ts`
