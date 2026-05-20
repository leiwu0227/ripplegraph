import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface WorkflowOptions {
  prefix: string;
  workflow: unknown;
  hidden?: boolean;
}

function createWorkflowRoot({ prefix, workflow, hidden = false }: WorkflowOptions): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const workflowFile = hidden ? path.join(root, '.ripplegraph', 'workflow.json') : path.join(root, 'workflow.json');
  fs.mkdirSync(path.dirname(workflowFile), { recursive: true });
  fs.writeFileSync(workflowFile, JSON.stringify(workflow), 'utf8');
  return root;
}

function dailyReviewGraph(edges: unknown[], extraNodes: Record<string, unknown> = {}): unknown {
  return {
    entry: 'review',
    nodes: {
      review: {
        purpose: 'Review generated intents',
        instructions: 'Submit a decision.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['decision'],
          properties: { decision: { type: 'string', enum: ['proceed', 'stop'] } },
        },
        edges,
      },
      ...extraNodes,
      done: { purpose: 'Complete', terminal: true },
    },
  };
}

function mockcopyGraph(outputSchema: unknown, instructions = 'Submit the mockcopy plan.'): unknown {
  return {
    entry: 'plan',
    nodes: {
      plan: {
        purpose: 'Plan mockcopy run',
        instructions,
        exec: 'inline',
        outputSchema,
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Complete', terminal: true },
    },
  };
}

export function makeCliWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-cli-',
    workflow: {
      id: 'demo',
      version: '0.1.0',
      graphs: {
        daily: dailyReviewGraph([{ to: 'done', when: { decision: 'stop' } }]),
      },
    },
  });
}

export function makeStorageWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-storage-',
    workflow: {
      id: 'demo',
      version: '0.1.0',
      graphs: {
        daily: dailyReviewGraph([{ to: 'done', when: { decision: 'proceed' } }]),
      },
    },
  });
}

export function makeHiddenStorageWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-storage-hidden-',
    hidden: true,
    workflow: {
      id: 'demo',
      version: '0.1.0',
      graphs: {
        daily: dailyReviewGraph([{ to: 'done', when: { decision: 'proceed' } }]),
      },
    },
  });
}

export function makeCoachWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-coach-',
    workflow: {
      id: 'demo',
      version: '0.1.0',
      graphs: {
        daily: dailyReviewGraph(
          [
            { to: 'execute', when: { decision: 'proceed' } },
            { to: 'done', when: { decision: 'stop' } },
          ],
          {
            execute: {
              purpose: 'Record execution result',
              instructions: 'Submit the execution summary.',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['summary'],
                properties: { summary: { type: 'string' } },
              },
              edges: [{ to: 'done' }],
            },
          },
        ),
        mockcopy: mockcopyGraph({ type: 'object' }),
      },
    },
  });
}

export function makeDemoWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-demo-cli-',
    workflow: {
      id: 'demo',
      version: '0.1.0',
      graphs: {
        daily: dailyReviewGraph([{ to: 'done', when: { decision: 'stop' } }]),
        mockcopy: mockcopyGraph(
          {
            type: 'object',
            required: ['plan'],
            properties: { plan: { type: 'string' } },
          },
          'Submit the plan.',
        ),
      },
    },
  });
}
