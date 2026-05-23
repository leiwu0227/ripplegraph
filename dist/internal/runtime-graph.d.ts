import { type Edge, type Graph, type Node } from '../schema.js';
export declare function getNode(graph: Graph, nodeId: string): Node;
export declare function selectEdge(edges: Edge[], output: unknown): Edge | null;
