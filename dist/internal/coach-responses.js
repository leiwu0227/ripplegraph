import { listRunIds, readCheckpoint } from '../storage.js';
import { getGraph, getNode } from './runtime-graph.js';
export function stateForCheckpoint(workflow, checkpoint) {
    const graph = getGraph(workflow, checkpoint.rootGraph);
    const node = getNode(graph, checkpoint.position.node);
    return {
        status: 'ok',
        workflow: { id: workflow.id, version: workflow.version },
        run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
        position: checkpoint.position,
        node: {
            id: checkpoint.position.node,
            purpose: node.purpose,
            instructions: node.instructions,
            exec: node.exec,
            outputSchema: node.outputSchema,
            gate: node.gate,
        },
        context: {
            previous: previousNodes(checkpoint),
            next: node.edges.map((edge) => {
                const next = getNode(graph, edge.to);
                return { id: edge.to, purpose: next.purpose };
            }),
            latches: [],
            capabilities: [],
        },
        responseContract: node.gate
            ? { command: 'decide', acceptedFormats: ['json'], schema: node.gate.decisionSchema }
            : { command: 'step', acceptedFormats: ['json'] },
    };
}
export function runSummary(rootPath, runId) {
    const checkpoint = readCheckpoint(rootPath, runId);
    return {
        id: checkpoint.runId,
        status: checkpoint.status,
        rootGraph: checkpoint.rootGraph,
        position: checkpoint.position,
        updatedAt: checkpoint.updatedAt,
    };
}
export function resumableRuns(rootPath) {
    return listRunIds(rootPath)
        .map((runId) => readCheckpoint(rootPath, runId))
        .filter((checkpoint) => checkpoint.status === 'suspended')
        .map((checkpoint) => ({ id: checkpoint.runId, status: 'suspended', rootGraph: checkpoint.rootGraph }));
}
function previousNodes(checkpoint) {
    return Object.keys(checkpoint.outputs).slice(-2).map((id) => ({ id, purpose: 'Completed node' }));
}
