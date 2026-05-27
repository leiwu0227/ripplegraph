# Thought: `ripplegraph graph diagram` — schematic export for graph packages

Date: 2026-05-27

## Idea

Add a kernel CLI subcommand that renders a schematic of any graph package
directly from its manifest. Graph visualization is generic over the universal
graph-package schema (`id`, `version`, `kind`, `entry`, `nodes{ purpose, gate,
sideChannelActions, terminal, edges{ to, when } }`) — nothing about it is
product-specific — so it belongs in ripplegraph, not in any product CLI's notes.
Every product CLI on the kernel (specdev, oceanshed, oceanlive) wants the same
capability.

## Why this is a kernel tool, not a product tool

This surfaced while building oceanlive on ripplegraph: a quick matplotlib script
was used to draw schematics of oceanlive's `workspace-dispatcher`, `mockcopy`,
and a gated test fixture. But the script reads only ripplegraph's schema and
would work identically for any package in any repo. Keeping such a renderer in a
product repo duplicates it per product and drifts from the schema. The kernel
owns graph identity/structure, so it should own the structural view of a graph.

## Proposed surface

Extend the existing `graph` command (which already has `validate` / `register`):

```
ripplegraph graph diagram <packageRoot> [--format=mermaid|dot]
```

- Loads the package via `loadGraphPackage` (same path as `validate`).
- Emits text to stdout: **Mermaid by default**, Graphviz **DOT** optionally.
- Pairs naturally with the existing `explain` command (text orientation) — this
  is the structural/visual counterpart.

### Why text (Mermaid/DOT), not images

- **Node-native.** Emitting text reuses `loadGraphPackage` and needs no Python,
  matplotlib, or image pipeline in a TS package. The matplotlib prototype was a
  throwaway to confirm feasibility, not the right durable form.
- **Embeds in docs for free.** Mermaid renders inline in Markdown / GitHub /
  VS Code with zero dependencies, so any product repo can drop a live diagram
  into its docs. DOT covers the Graphviz route when a rendered image is wanted.
- **Diffable.** Text diagrams live in version control and review cleanly.

## Annotations the diagram should carry

Mirror what the prototype proved useful:

- node **kind/role** styling: dispatcher node, normal node, **gate** node,
  **terminal** node, and the **entry** node (distinct border/marker).
- **side-channel actions** listed on a node (e.g. `↻ refresh`).
- edge **`when`** conditions as edge labels (e.g. `choice=proceed`), since the
  kernel matches edges by object properties — showing them makes branch logic
  legible.
- graph header: `id`, `kind`, `version`.

## Layout notes (learned from the prototype)

- A longest-path level (left→right) layout works for the linear/DAG shapes seen
  so far.
- Skip-level edges (an edge whose target is more than one level ahead) must be
  routed *around* intermediate nodes, not drawn straight through them — the
  prototype initially drew a `menu → done` cancel edge straight through the
  `finish` box. Mermaid/DOT layout engines handle this automatically, which is
  another point in favor of delegating layout to them rather than hand-rolling.

## Scope / non-goals

- In scope: structural export of a single graph package (nodes, edges, gates,
  side-channels, terminal/entry, `when` labels) to Mermaid/DOT.
- Out of scope (at least initially): rendering live run state / current position
  overlays, multi-package/dispatcher-routing maps, and emitting raster images
  from the kernel (leave PNG/SVG to the user's Mermaid/Graphviz toolchain).

## Suggested next step

Open a small ripplegraph SpecDev feature assignment:
`graph diagram` exporter — `loadGraphPackage` → Mermaid (default) / DOT, with the
annotations above, slotting into the existing `graph` subcommand switch in
`src/cli.ts`. Reference prototype + sample outputs were generated against the
oceanlive graphs during its A0/A1 work.
