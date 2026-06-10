import { listRunIds, readCheckpoint } from '../storage.js';
import { getNode } from './runtime-graph.js';
export function stateForCheckpoint(workflow, checkpoint, context) {
    const activeGraph = context.graph;
    const node = getNode(activeGraph, checkpoint.position.node);
    return {
        status: 'ok',
        workflow: { id: workflow.id, version: workflow.version },
        run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
        position: checkpoint.position,
        stack: checkpoint.stack,
        orientation: `You are at ${checkpoint.position.graph}/${checkpoint.position.node}: ${node.purpose}.`,
        nextAllowedCommand: `ripplegraph advance --input '${exampleOutput(node.gate ? node.gate.decisionSchema : node.outputSchema)}'`,
        helpCommand: 'ripplegraph explain',
        node: {
            id: checkpoint.position.node,
            purpose: node.purpose,
            instructions: node.instructions,
            exec: node.exec,
            outputSchema: node.outputSchema,
            interaction: node.interaction,
            interrupt: node.interrupt,
            gate: node.gate,
            sideChannelActions: node.sideChannelActions,
            toolContract: node.toolContract,
            validators: node.validators,
            operatorContext: node.operatorContext,
        },
        context: {
            previous: previousNodes(checkpoint, context.scope),
            next: node.edges.map((edge) => {
                const next = getNode(activeGraph, edge.to);
                return { id: edge.to, purpose: next.purpose, when: edge.when };
            }),
            latches: [],
            capabilities: [],
        },
        responseContract: node.gate
            ? {
                command: 'decide',
                acceptedFormats: ['json'],
                schema: node.gate.decisionSchema,
                decisionSource: node.gate.decisionSource,
            }
            : { command: 'step', acceptedFormats: ['json'] },
    };
}
export function exampleOutput(schema) {
    const payload = {};
    for (const [name, property] of Object.entries(schema.properties ?? {})) {
        payload[name] = property.enum?.[0] ?? property.type ?? 'value';
    }
    return JSON.stringify(payload);
}
export function runSummary(rootPath, runId) {
    const checkpoint = readCheckpoint(rootPath, runId);
    return {
        id: checkpoint.runId,
        status: checkpoint.status,
        rootGraph: checkpoint.rootGraph,
        position: checkpoint.position,
        updatedAt: checkpoint.updatedAt,
        ...(checkpoint.status === 'completed' && checkpoint.finalOutput !== undefined
            ? { output: checkpoint.finalOutput }
            : {}),
    };
}
export function resumableRuns(rootPath) {
    return listRunIds(rootPath)
        .map((runId) => readCheckpoint(rootPath, runId))
        .filter((checkpoint) => checkpoint.status === 'suspended')
        .map((checkpoint) => ({ id: checkpoint.runId, status: 'suspended', rootGraph: checkpoint.rootGraph }));
}
function previousNodes(checkpoint, scope) {
    const prefix = scope ? `${scope}/` : '';
    return Object.keys(checkpoint.outputs)
        .filter((id) => (scope ? id.startsWith(prefix) : !id.includes('/')))
        .slice(-3)
        .map((id) => ({
        id: scope ? id.slice(prefix.length) : id,
        purpose: 'Completed node',
        output: checkpoint.outputs[id],
    }));
}
