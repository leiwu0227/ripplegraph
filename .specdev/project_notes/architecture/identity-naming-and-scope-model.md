# Ripplegraph Identity, Naming, and Scope Model

Status: implemented

## Purpose and scope

Ripplegraph uses identifiers in several independent domains: workspace
metadata, registered graphs, graph-local nodes, workflow runs, callable calls,
child-workflow frames, effects, requirements, and host-facing service
declarations. These values share some syntax, but they do not form one global
namespace or imply one identity provider.

This note binds the current identity domains, their scopes, reference rules,
filesystem consequences, generated values, and recovery checks. It refines the
workspace and graph vocabulary in `core-concepts.md`, registration in
`package-and-extension-model.md`, run and call ownership in
`execution-and-workflow-model.md`, durable source identity in
`state-and-recovery.md`, opaque effect names in `effects-and-authority.md`,
host-service identifiers in `host-contract-and-metadata-model.md`, and the
independent version domains in `public-api-and-compatibility-model.md`.

This is not an authentication, authorization, tenancy, package-provenance,
naming-convention, identifier-migration, or globally unique identifier design.

## Identity decision

An identifier is interpreted by the component that owns its domain and only
within that domain's scope. Shared syntax makes values structurally portable;
it does not make two equal strings the same entity across workspaces, graph
packages, runs, calls, nodes, or host services.

The common framework identifier schema accepts one or more ASCII letters,
digits, underscores, dots, or hyphens. It is used by workspace and graph
identifiers, graph-local node keys and references, durable run and call
identifiers, focus, positions, frame scopes, effects, requirements, and most
host-facing identifiers. TypeScript options still expose ordinary strings,
not branded identifier types. Acceptance occurs when the owning schema, path
guard, registry resolver, or engine boundary actually validates or resolves
the value.

Version strings and filesystem paths are deliberately different. Workspace and
graph versions are required nonempty strings but do not use the identifier
syntax or create a namespace. Package paths locate files; they are not graph
identifiers and may be relative to a workspace or absolute.

## Identity domains

| Domain | Current identity and scope | Resolution and collision behavior |
| --- | --- | --- |
| Workspace boundary | The `workflowRoot` path supplied to an invocation selects the workspace state tree. The loaded workspace descriptor contributes an `id`, `version`, and optional dispatcher `entryGraph`. | Ripplegraph does not discover a workspace by descriptor identifier or compare one workspace directory with another. Different roots may declare the same workspace identifier without a runtime collision. |
| Registered graph | One graph identifier keys the workspace registry across dispatcher, workflow, and callable kinds. The manifest also carries a kind and opaque version. | High-level registration uses the manifest identifier as the catalog key. A different path for the same identifier is rejected unless forced; graph kind does not create a parallel sub-namespace. |
| Graph-local node | A node identifier is a key in one executable manifest. The graph's `entry`, each edge target, and a runtime position's node component refer to that graph-local set. | Package validation proves the entry and edge targets name nodes in that same manifest. The same node string may be reused in another graph without collision. |
| Workflow reference | `workflowRef.graphId` names a registered graph, not a local node or package path. | Package shape validation checks only identifier syntax. Workflow preflight or entry later resolves the current registry entry and requires kind `workflow`; no version or path is declared in the reference. |
| Workflow run | A run identifier names one durable record below a workspace's `.ripplegraph/runs/` namespace and is repeated in its checkpoint, focus pointer, and transition records. | Engine start rejects an existing run identifier and also requires the workspace focus slot to be free. Normal state and advance operations address the focused identifier. Resume explicitly selects a suspended run while focus is free, then makes that run current. |
| Callable call | A call identifier names one durable record below the separate `.ripplegraph/calls/` namespace. Every later call operation names it explicitly. | Call creation rejects an existing call directory. A run and a call may use the same textual identifier because their namespaces and engines are separate. |
| Child frame | A runtime-generated scope such as `f1` distinguishes one child-workflow activation inside its owning run. | The checkpoint's monotonic frame counter allocates scopes. Scoped output keys and artifact directories keep a child node identifier distinct from the same node identifier at the root or in another activation. |
| Policy and host metadata | Effects, start requirements, interactions, renderers, tools, validators, side-channel actions, follow-ups, and decision sources use identifiers in their owning declarations. | Effect and requirement checks use exact string lookup. Most host-service identifiers remain opaque metadata; successful package parsing does not prove uniqueness, linkage, installation, or authority. |

These domains may intentionally repeat a string. A workspace, graph, run, call,
node, effect, and tool can all be named `review` without becoming one identity.
Consumers must retain the domain and, where relevant, workspace, graph, run,
call, or frame context instead of treating the bare string as globally
meaningful.

## Workspace scope and descriptor identity

The workspace root path is the storage boundary used by the current APIs. Its
`.ripplegraph/` directory owns the registry, focus, runs, and calls for that
invocation. Ripplegraph has no process-global workspace registry, tenant key,
or lookup from `workflow.id` to a root path.

Workspace identity is loaded from `.ripplegraph/workflow.json` when present,
otherwise from root `workflow.json`; the hidden descriptor wins when both
exist. Its optional `entryGraph` is checked only when resolving the dispatcher:
the workspace must have exactly one registered dispatcher, and the value must
equal that dispatcher's identifier when declared.

A new workflow checkpoint copies the loaded workspace identifier and version.
Current active state and resume operations load the live descriptor but do not
compare it with the checkpoint copy. The copy is descriptive rather than a
workspace-recovery pin. Moving execution files to a different root or changing
the descriptor is not validated as an identity-preserving workspace migration.

Graph packages need not live beneath the workspace root. Registration stores a
normalized relative path for a proper descendant and an absolute path
otherwise. A workspace can therefore refer to an external package, but that
path does not make the package part of the workspace identity or establish
ownership, trust, or provenance.

## Graph registry namespace

The registry is a single workspace map keyed by graph identifier. Dispatcher,
workflow, and callable kinds share that map. High-level registration aligns
the key and entry identifier with the loaded manifest and records the kind,
version, metadata, and normalized package path.

Registering the same identifier from the same normalized path refreshes that
entry without `force`, including its version, kind, and metadata. A different
path for the identifier requires `force`, which replaces the one entry rather
than creating an alias, version set, or kind-qualified name. Registry
normalization locale-sorts map keys, while public listing separately
locale-sorts entries by their stored identifiers. Normal lookup uses exact
string matching with no case folding or canonical aliasing.

Selection adds domain-specific checks:

- dispatcher resolution requires exactly one registry entry of kind
  `dispatcher` and applies the optional workspace `entryGraph` equality check;
- workflow and callable selection looks up the requested registry key, checks
  the expected kind, loads the entry path, and requires the manifest identifier
  and kind to equal the entry; and
- workflow-reference selection adds the expected workflow kind but no declared
  version range or package-path constraint.

The root API also exposes low-level registry writing. The registry schema
validates every map key and every entry identifier independently, but it does
not require a key to equal its entry's `id`. High-level registration maintains
that alignment; a direct schema-valid write can bypass it. The resolver looks
up by map key and then compares the loaded package with the entry identifier,
so consumers must not infer high-level registration invariants from arbitrary
`writeRegistry` input.

## Graph-local names and references

Executable manifests own a local node map. The entry identifier and every edge
target are checked against that same map during package load. Runtime positions
carry both graph and node identifiers, and checkpoint validation requires the
position's graph component to agree with the active root or child graph source.
The checkpoint schema does not by itself prove that the node still exists;
active package reload and node lookup establish that later.

A workflow reference crosses from the local node namespace into the workspace
graph registry. It names only a graph identifier. The current package loader
does not resolve that identifier, require the target to be registered, or bind
a graph version. Workflow start preflight follows the registry's then-current
structural reference closure, and actual child entry resolves again and stores
the selected package path, identifier, and version in the new frame.

Child frames make repeated local names unambiguous inside one run. The root
scope uses unqualified output keys such as `review`; a child activation uses a
runtime scope such as `f1/review`. Artifacts mirror that separation in nested
directories. A later child activation receives a new monotonically allocated
scope even when it enters the same graph and node. Callable calls have no child
frame model: their retained outputs and artifacts are keyed by node identifier,
so revisiting a node replaces that call's latest value at the same path.

## Run and call identity

The workflow engine requires a run identifier from direct starts. Dispatcher
`start_run` may instead generate one by combining the graph identifier with a
timestamp-derived suffix. The callable engine accepts an optional call
identifier and otherwise generates one from the current time plus a random
suffix. These are convenience generators, not UUIDs, durable allocators, or
cross-process collision guarantees. Normal creation still relies on the
owning namespace's existence check and returns an error on collision; it does
not choose another identifier automatically.

Persisted run and call records, focus, positions, graph sources, and transition
identities use the common identifier schema. Public option types expose generic
strings, while dispatcher action parsing requires only nonempty strings at its
earlier layer, so an invalid common identifier can be rejected only when the
later owning path or record boundary is reached. The low-level run path helper
checks path-segment safety, while durable checkpoint parsing additionally
enforces the common identifier schema; the call path helper enforces both
immediately. A helper-accepted path segment is therefore not by itself proof of
an engine-valid durable identity.

The focus pointer does not create or own a run. It stores one run identifier
and causes normal workflow state or advance operations to load that run's
checkpoint. A pointer to a missing or structurally invalid checkpoint is an
error rather than a new identity. A pointer to a non-active checkpoint is
operation-dependent: `getState` can still render it, normal advancement rejects
its status, and `abandonRun` does not require active status before rewriting it
and clearing focus. Resume is the exception to focus-based run selection: it
accepts an explicit suspended run identifier only while the focus slot is free,
then records that identifier as current. Calls never use focus and cannot
collide with a run merely because both use the same string.

Directory enumeration, not a separate identity index, produces run and call
lists. A low-level writer can create partial or replace existing state outside
the higher-level collision and lifecycle checks. In particular,
`writeCheckpoint` creates a run's artifact and scratch directories after only
the path-segment guard and before parsing the durable checkpoint schema. A
path-safe but schema-invalid run identifier can therefore leave enumerable
directory residue even though no valid checkpoint was written. Filesystem
presence alone does not prove an engine-created, complete, or uniquely
allocated execution.

## Identity during active recovery

Workflow root sources, child frames, and callable checkpoints store a package
path, graph identifier, and graph version. The owning engine supplies the
expected graph kind on active reload. Recovery succeeds only when the package
at the stored path still loads with the exact identifier, version, and expected
kind.

This identity check does not hash package content. An in-place edit that
preserves identifier, version, and kind is not detected, while a version-only
change blocks that active execution. Replacing the workspace registry does not
retarget an already stored source. A future child activation or new execution,
however, resolves the registry anew and pins the package selected at that time.

Completed execution lookup is narrower. Completed callable state is returned
from its checkpoint without reloading the graph package, and run/call listings
summarize checkpoints without loading every package. Package-source identity is
an active-execution gate, not a general requirement for retaining historical
records.

## Opaque policy and host-service identifiers

Effect identifiers use exact membership. Ripplegraph assigns no hierarchy,
wildcard, parameter scope, or implied relationship to equal-looking prefixes.
Start-requirement identifiers are exact keys in the caller-supplied boolean
map. Neither kind of value identifies a caller, principal, credential, or
operating-system capability.

Host-facing identifiers describe services for a product to interpret. Current
package loading does not prove that:

- interaction identifiers, follow-up identifiers, tools, validators, or
  side-channel actions are unique;
- `renderVia`, tool decision sources, validator references, follow-up sources,
  or side-channel command references resolve to installed services;
- an action identifier submitted to the side-channel audit API names a
  declaration on the active node; or
- equal service identifiers in different graphs or nodes denote the same host
  implementation.

Products may impose a service registry, qualified naming convention,
cross-reference checks, principal identity, or authorization semantics around
these strings. Those are product contracts, not consequences of Ripplegraph's
identifier syntax.

## Current limits and non-guarantees

Ripplegraph currently provides no:

- globally unique identifier or central allocator across workspaces,
  processes, graph packages, runs, calls, or products;
- tenant, account, principal, owner, credential, or authorization identity;
- namespace qualifier, alias, rename protocol, redirect table, case-folding
  rule, or identifier migration;
- automatic collision retry for generated run or call identifiers;
- graph-version range or package coordinate in `workflowRef`;
- content digest, signature, publisher identity, or provenance attached to
  graph identity;
- general service registry or cross-reference validation for host-facing
  identifiers; or
- guarantee that direct low-level storage or registry writes preserve the
  higher-level engines' identity, collision, focus, or lifecycle invariants.

## Identity and scope invariants present in the system

1. The workspace root path selects the current state boundary; the workspace
   descriptor identifier does not locate or globally register that root.
2. Common identifier syntax does not merge independent identity domains.
3. One workspace registry graph identifier occupies one entry across all graph
   kinds; kind is not a separate registry namespace.
4. Node identifiers and edge targets are graph-local, while workflow
   references cross into the workspace graph registry.
5. Run and call identifiers are workspace-local and live in separate
   namespaces; workflow focus addresses only a run.
6. Child frame scopes distinguish repeated node identifiers and repeated child
   activations inside one workflow run.
7. High-level execution creation rejects collisions, but generated identifiers
   are not guaranteed globally unique and low-level writers bypass that rule.
8. Active package recovery checks stored path, graph identifier, version, and
   expected kind, but not content identity.
9. The copied workspace identity is descriptive during current recovery and is
   not compared with the live workspace descriptor.
10. Policy and host-service identifiers have only the semantics enforced by
    their owning boundary; syntax alone proves neither linkage nor authority.

## Conformance evidence

This note was verified against clean tracked product source at Git revision
`d9606c11df13cdf927980781105e425542c20e04` on 2026-08-28. Product source,
tests, package metadata, launchers, templates, TypeScript configuration, and
generated distribution output are unchanged from revision
`480dcc8ef55b4b840737d066d56c54ceca8f228d`; intervening commits published only
protected architecture notes and receipts.

Verification was static: focused tests were inspected but not executed because
the workspace has no installed Vitest executable.

Relevant source paths:

- `src/schema.ts`
- `src/storage.ts`
- `src/graph-package.ts`
- `src/registry.ts`
- `src/dispatcher.ts`
- `src/coach.ts`
- `src/callable.ts`
- `src/effects.ts`
- `src/internal/dispatcher-resolution.ts`
- `src/internal/coach-responses.ts`
- `tests/schema.test.ts`
- `tests/graph-package.test.ts`
- `tests/storage.test.ts`
- `tests/registry.test.ts`
- `tests/dispatcher.test.ts`
- `tests/coach.test.ts`
- `tests/callable.test.ts`

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
