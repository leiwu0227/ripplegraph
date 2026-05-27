# Graph Diagram CLI

Add `ripplegraph graph diagram <packageRoot> [--format=mermaid|dot]` as a
kernel-owned graph package schematic exporter. The command should load a graph
package through the existing `loadGraphPackage` path and emit text to stdout:
Mermaid by default, Graphviz DOT when requested.

This belongs in Ripplegraph because it visualizes only generic graph package
structure: graph identity, kind, version, entry node, nodes, gates, terminal
markers, side-channel action metadata, and edge conditions. Product CLIs such as
SpecDev, Oceanshed, and Oceanlive can embed or render the output without each
maintaining their own schema-specific diagram script.
