# Design: graph package registry foundation

## Overview

Ripplegraph is moving from a compact `workflow.json` demo runner toward a repository of graph packages. This assignment implements the foundation for that shift without changing the whole runtime at once. A graph package is a self-contained folder containing a `graph.json` definition plus optional human docs, templates, assets, and tests. Ripplegraph will be able to validate a package folder, register it in a workspace registry, and list registered packages.

The normal future workspace shape is:

```text
.ripplegraph/
  registry.json
  graphs/
    dispatcher/
      graph.json
      AGENT.md
      README.md
    specdev-assignment/
      graph.json
      templates/
  current.json
  runs/
```

This assignment should not implement the full multi-package runtime. It establishes the package catalog and validation interfaces that future assignments can use for `dispatch`, callable graph invocation, and package-folder-backed workflow execution.

## Goals

- Define the concrete graph package folder contract, centered on `graph.json`.
- Add code that loads and validates graph package folders using the existing graph schema fields: `kind`, `title`, `description`, `activationHints`, `inputSchema`, `outputSchema`, `effects`, `entry`, and `nodes`.
- Add `.ripplegraph/registry.json` persistence for registered graph packages.
- Add CLI support for graph management:
  - `graph validate <path>`
  - `graph register <path> [--workflow-root <path>]`
  - `graph list [--workflow-root <path>]`
- Keep existing `workflow.json` behavior and demos working.
- Make the output useful to host agents: clear package ids, kinds, versions or paths where available, validation failures, and next-step hints.

## Non-Goals

- Do not replace the compact `workflow.json` runtime in this assignment.
- Do not implement real `dispatch --request ...` execution yet.
- Do not implement callable graph execution yet.
- Do not enforce effect permissions yet, beyond preserving declared effects in metadata.
- Do not design a package marketplace, dependency resolver, or remote install protocol.
- Do not migrate SpecDev, Oceanshed, or other downstream CLIs to graph packages in this assignment.

## Design

### Alternatives Considered

#### Option A: Registry foundation first

Add package loading, validation, registry persistence, and graph CLI commands while keeping the existing runtime intact. This is the recommended approach because it creates a stable integration surface with low blast radius. It also gives future dispatcher and callable work a real catalog to build on.

#### Option B: Implement dispatcher and registry together

Build graph registration and `dispatch` execution in one larger assignment. This would produce a more impressive end-to-end result, but it couples two unsettled boundaries: package discovery and intent routing. Failures would be harder to isolate, and tests would need to cover both registry correctness and dispatcher behavior at once.

#### Option C: Replace `workflow.json` with package folders immediately

Move the current demo/runtime directly onto graph folders. This may be the eventual direction, but doing it first risks breaking the working demo CLI and existing tests before the package contract is proven. It also makes compatibility behavior harder to reason about.

### Recommended Approach

Use Option A. Treat this as an architectural foundation assignment with a narrow runtime surface:

1. Add graph package types and schemas in a dedicated graph-package module.
2. Implement pure package loading and validation helpers.
3. Implement registry file storage under `.ripplegraph/registry.json`.
4. Add CLI graph subcommands to both the JSON CLI where appropriate and the agent-facing demo CLI if it improves manual testing.
5. Add tests that cover valid packages, invalid packages, registry creation, id/path handling, duplicate registration behavior, and preservation of current workflow behavior.

The key design choice is to make package validation independent from registration. A caller should be able to validate a package folder without mutating workspace state. Registration should only persist metadata after validation succeeds.

## Package Contract

A graph package folder must contain:

```text
graph-package/
  graph.json
```

Optional files may include:

```text
graph-package/
  README.md
  AGENT.md
  templates/
  assets/
  tests/
```

`graph.json` will use a flat top-level package manifest. The package identity fields live beside the existing graph fields:

```json
{
  "id": "support-triage",
  "version": "0.1.0",
  "kind": "workflow",
  "title": "Support Triage",
  "description": "Classify support tickets and route them through a review gate.",
  "activationHints": ["triage support ticket", "classify customer issue"],
  "inputSchema": { "type": "object" },
  "outputSchema": { "type": "object" },
  "effects": ["read_workspace"],
  "entry": "classify-ticket",
  "nodes": {
    "classify-ticket": {
      "purpose": "Classify the newest support ticket",
      "exec": "inline",
      "outputSchema": {
        "type": "object",
        "required": ["category"],
        "properties": {
          "category": {
            "type": "string",
            "enum": ["bug", "feature", "question"]
          }
        }
      },
      "terminal": true
    }
  }
}
```

The implementation should keep the existing `graphSchema` graph-only. `src/schema.ts` can continue to parse graph definitions inside compact `workflow.json`, where the graph id comes from the `graphs` record key. Graph package folders need a different manifest because a standalone folder has no containing record key.

Do not build the package schema by calling `.extend()` on the current exported `graphSchema`. The exported `graphSchema` already applies `.superRefine(...)`, so it is a refined schema rather than a plain extendable object schema. Instead, refactor the schema construction into shared pieces:

```ts
const graphFieldsSchema = z.object({
  kind: z.enum(['dispatcher', 'workflow', 'callable']).default('workflow'),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  activationHints: z.array(z.string().min(1)).default([]),
  inputSchema: jsonSchemaSchema.default({ type: 'object' }),
  outputSchema: jsonSchemaSchema.default({ type: 'object' }),
  effects: z.array(idSchema).default([]),
  entry: idSchema,
  nodes: z.record(idSchema, nodeSchema),
}).strict();

function validateGraphReferences(graph, ctx) {
  // shared entry and edge-target checks
}

export const graphSchema = graphFieldsSchema.superRefine(validateGraphReferences);

export const graphPackageManifestSchema = graphFieldsSchema.extend({
  id: idSchema,
  version: z.string().min(1),
}).superRefine(validateGraphReferences);
```

The exact helper names can vary, but the structure should avoid duplicate validation logic and keep both schemas derived from the same graph-field definition. If `idSchema` is currently private to `src/schema.ts`, expose it deliberately or keep the package manifest schema in `src/schema.ts` and export its inferred type from there. Do not use a nested `{ id, version, graph }` wrapper for v0. The flat manifest keeps `graph.json` readable, avoids an extra level in CLI payloads, and matches the registry entry fields directly while still preserving the existing compact `workflow.json` behavior.

## Registry Contract

`.ripplegraph/registry.json` should be a small, deterministic JSON file. It should be easy for humans and host agents to inspect. A reasonable v0 shape is:

```json
{
  "version": 1,
  "graphs": {
    "support-triage": {
      "id": "support-triage",
      "version": "0.1.0",
      "kind": "workflow",
      "title": "Support Triage",
      "description": "Classify support tickets and route them through a review gate.",
      "activationHints": ["triage support ticket"],
      "effects": ["read_workspace"],
      "path": ".ripplegraph/graphs/support-triage",
      "registeredAt": "2026-05-21T00:00:00.000Z"
    }
  }
}
```

The registry should store enough metadata for `graph list` and future dispatch selection. It should not duplicate the full node graph unless there is a clear runtime need. Full definitions can remain in package folders and be loaded when needed.

## CLI Behavior

The low-level JSON CLI should expose machine-readable commands:

```text
ripplegraph graph validate <path> [--workflow-root <path>]
ripplegraph graph register <path> [--workflow-root <path>]
ripplegraph graph list [--workflow-root <path>]
```

Expected behavior:

- `graph validate` reads the package folder and returns `{ "status": "ok", "package": ... }` or a structured validation error.
- `graph register` validates first, creates `.ripplegraph/registry.json` if missing, writes or updates the package metadata, and returns the registry entry.
- `graph list` returns registered entries sorted by id.

The agent-facing demo CLI may render these commands in text if it stays simple and does not obscure the JSON CLI behavior. The JSON CLI is the core contract.

## Edge Cases

- Missing package folder.
- Missing `graph.json`.
- Invalid JSON.
- Manifest id does not match folder name. This should be allowed unless it causes registry ambiguity; the id is authoritative.
- Duplicate registration. Re-registering the same id should update the entry if the path is the same or if an explicit `--force` is provided. Without `--force`, a different existing path should fail.
- Relative and absolute paths. Registry paths should be stable, preferably workspace-root-relative when the package lives inside the workspace.
- Invalid graph references, such as unknown entry node or edge target. Existing schema validation should catch these.
- Dispatcher package with missing or weak output contract. The schema can accept it for now, but validation messages should make future expectations clear if possible.

## Success Criteria

- A valid graph package folder can be validated without creating or changing `.ripplegraph/registry.json`.
- A valid package can be registered into `.ripplegraph/registry.json`.
- Registered packages can be listed deterministically.
- Invalid package folders produce actionable structured errors.
- Re-register and duplicate-id behavior is explicit and tested.
- Existing demo and workflow tests still pass.
- The implementation leaves clear interfaces for later `dispatch` and callable execution assignments.

## Testing Approach

Add focused unit tests for package loading and registry operations. Use temporary directories for workspace roots so tests do not touch repository `.ripplegraph` state. Add CLI tests for the new graph commands, including success and failure paths. Keep regression coverage around existing `validate`, `start`, `status`, `advance`, and demo behavior so the current compact `workflow.json` path remains intact.

Recommended test groups:

- `loadGraphPackage` valid/invalid cases.
- `validateGraphPackage` schema and reference errors.
- `readRegistry` missing-file default.
- `registerGraphPackage` create/update/conflict behavior.
- CLI command output and exit behavior.
- Existing test suite unchanged.

## Open Implementation Questions

- Should `graph register` copy package folders into `.ripplegraph/graphs/`, or register the existing path first? For this assignment, registering the existing path is lower risk; copy/install can be a later package-management feature.
- Should duplicate registration use `--force`, `--replace`, or update only when path matches? The recommended v0 rule is update same id and same path, require `--force` for id conflicts with a different path.
