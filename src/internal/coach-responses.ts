import { listRunIds, readCheckpoint } from '../storage.js';
import type { Checkpoint, Workflow } from '../schema.js';
import type { RunSummary, StateNoFocusedRun, StateOk } from '../coach.js';
import { getGraph, getNode } from './runtime-graph.js';

export function stateForCheckpoint(workflow: Workflow, checkpoint: Checkpoint): StateOk {
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
    responseContract: { command: 'step', acceptedFormats: ['json'] },
  };
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

function previousNodes(checkpoint: Checkpoint): Array<{ id: string; purpose: string }> {
  return Object.keys(checkpoint.outputs).slice(-2).map((id) => ({ id, purpose: 'Completed node' }));
}
