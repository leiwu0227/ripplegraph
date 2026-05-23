import { listRunIds, readCheckpoint } from '../storage.js';
import type { Checkpoint, Graph, Workflow } from '../schema.js';
import type { RunSummary, StateNoFocusedRun, StateOk } from '../coach.js';
import { getGraph, getNode } from './runtime-graph.js';

interface StateGraphContext {
  graph: Graph;
  scope: string;
}

export function stateForCheckpoint(workflow: Workflow, checkpoint: Checkpoint, context?: Graph | StateGraphContext): StateOk {
  const active = activeContext(workflow, checkpoint, context);
  const activeGraph = active.graph;
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
      gate: node.gate,
    },
    context: {
      previous: previousNodes(checkpoint, active.scope),
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

function activeContext(workflow: Workflow, checkpoint: Checkpoint, context?: Graph | StateGraphContext): StateGraphContext {
  if (!context) return { graph: getGraph(workflow, checkpoint.rootGraph), scope: '' };
  if ('graph' in context) return context;
  return { graph: context, scope: '' };
}

function exampleOutput(schema: { properties?: Record<string, { enum?: unknown[]; type?: string }> }): string {
  const payload: Record<string, unknown> = {};
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    payload[name] = property.enum?.[0] ?? property.type ?? 'value';
  }
  return JSON.stringify(payload);
}

export function runSummary(rootPath: string, runId: string): RunSummary {
  const checkpoint = readCheckpoint(rootPath, runId);
  return {
    id: checkpoint.runId,
    status: checkpoint.status,
    rootGraph: checkpoint.rootGraph,
    position: checkpoint.position,
    updatedAt: checkpoint.updatedAt,
  };
}

export function resumableRuns(rootPath: string): StateNoFocusedRun['resumableRuns'] {
  return listRunIds(rootPath)
    .map((runId) => readCheckpoint(rootPath, runId))
    .filter((checkpoint) => checkpoint.status === 'suspended')
    .map((checkpoint) => ({ id: checkpoint.runId, status: 'suspended', rootGraph: checkpoint.rootGraph }));
}

function previousNodes(checkpoint: Checkpoint, scope: string): Array<{ id: string; purpose: string; output?: unknown }> {
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
