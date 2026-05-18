import { type Edge, type Graph, type Node, type Workflow } from '../schema.js';
export declare function getGraph(workflow: Workflow, graphId: string): Graph;
export declare function getNode(graph: Graph, nodeId: string): Node;
export declare function selectEdge(edges: Edge[], output: unknown): Edge | null;
