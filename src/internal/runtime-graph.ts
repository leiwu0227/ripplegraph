import { RipplegraphError, type Edge, type Graph, type Node } from '../schema.js';

export function getNode(graph: Graph, nodeId: string): Node {
  const node = graph.nodes[nodeId];
  if (!node) throw new RipplegraphError('E_UNKNOWN_NODE', `unknown node: ${nodeId}`);
  return node;
}

export function selectEdge(edges: Edge[], output: unknown): Edge | null {
  return edges.find((edge) => !edge.when || matchesWhen(edge.when, output)) ?? null;
}

function matchesWhen(when: Record<string, unknown>, output: unknown): boolean {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return false;
  const record = output as Record<string, unknown>;
  return Object.entries(when).every(([key, value]) => record[key] === value);
}
