import { RipplegraphError } from '../schema.js';
export function getNode(graph, nodeId) {
    const node = graph.nodes[nodeId];
    if (!node)
        throw new RipplegraphError('E_UNKNOWN_NODE', `unknown node: ${nodeId}`);
    return node;
}
export function selectEdge(edges, output) {
    return edges.find((edge) => !edge.when || matchesWhen(edge.when, output)) ?? null;
}
function matchesWhen(when, output) {
    if (!output || typeof output !== 'object' || Array.isArray(output))
        return false;
    const record = output;
    return Object.entries(when).every(([key, value]) => record[key] === value);
}
