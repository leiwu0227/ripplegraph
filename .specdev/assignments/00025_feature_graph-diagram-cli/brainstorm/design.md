# Graph Diagram CLI

## Overview

Add a kernel CLI subcommand:

```sh
ripplegraph graph diagram <packageRoot> [--format=mermaid|dot]
```

The command renders a structural schematic of a single graph package directly
from `graph.json`. It should use the same `loadGraphPackage` path as
`graph validate`, so diagram export never accepts an invalid graph package.

The default format is Mermaid text. DOT is available for users who prefer
Graphviz layout or want to render PNG/SVG with external tools. Ripplegraph
should not emit images in this assignment.

## Goals

- Add `graph diagram` under the existing `graph` CLI command family.
- Support `--format=mermaid` by default.
- Support `--format=dot` as an optional output.
- Include graph header information: `id`, `kind`, and `version`.
- Include every node, including entry, gate, terminal, and normal nodes.
- Annotate side-channel actions on their owning nodes.
- Label edges with `when` conditions where present.
- Keep output text-only and written to stdout.
- Keep the formatter reusable from TypeScript code, not embedded entirely in
  `src/cli.ts`.

## Non-Goals

- No PNG, SVG, matplotlib, Mermaid CLI, Playwright, or Graphviz rendering inside
  the kernel.
- No live run overlays or current-position highlighting.
- No multi-package dispatcher/routing map.
- No product-specific annotations for Oceanlive, SpecDev, or Oceanshed.
- No layout engine in Ripplegraph. Mermaid/DOT consumers own final layout.

## Design

Add a small formatter module, likely `src/graph/diagram.ts`, exporting:

```ts
export type DiagramFormat = "mermaid" | "dot";

export function renderGraphDiagram(
  manifest: GraphPackageManifest,
  format?: DiagramFormat,
): string;
```

The CLI should add a `diagram` branch to `handleGraphCommand`:

```sh
ripplegraph graph diagram .ripplegraph/graphs/my-flow
ripplegraph graph diagram .ripplegraph/graphs/my-flow --format=dot
```

Unlike existing graph subcommands, `diagram` should emit raw text rather than
JSON because the command's primary artifact is the diagram source. Errors should
continue to use the existing JSON error payload path.

Mermaid output should use `flowchart LR`. Nodes should have stable generated
diagram IDs derived from graph node IDs, because node IDs may contain
characters Mermaid treats specially. Labels should show the node ID and compact
metadata:

- entry marker
- gate marker
- terminal marker
- side-channel action IDs

DOT output should emit a `digraph` with `rankdir=LR`, node labels carrying the
same compact metadata, and edge labels for `when` conditions.

Edge labels should be deterministic and compact. A simple stable JSON string or
`key=value` list is enough for v1.

## Success Criteria

- `ripplegraph graph diagram <packageRoot>` prints Mermaid text.
- `ripplegraph graph diagram <packageRoot> --format=mermaid` prints equivalent
  Mermaid text.
- `ripplegraph graph diagram <packageRoot> --format=dot` prints DOT text.
- Invalid `--format` values fail with a clear `RipplegraphError`.
- Tests cover gate, terminal, entry, side-channel, and `when` annotations.
- README documents the command and the text-first rendering stance.

## Testing Approach

Add focused unit tests for the formatter using an in-memory manifest or fixture
package. Add a CLI test that invokes `graph diagram` and asserts the raw stdout
starts with Mermaid/DOT rather than JSON.

No image rendering tests are needed because image generation is explicitly out
of scope.
