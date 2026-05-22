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

function changeIntakeGraph(): unknown {
  return {
    kind: 'workflow',
    title: 'Change Intake',
    effects: ['read_repo'],
    entry: 'classify-change',
    nodes: {
      'classify-change': {
        purpose: 'Classify the queued engineering change',
        instructions: 'Read work-items/inbox.json, engineering-playbook.md, and repo-brief.md.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['changeType', 'risk', 'rationale'],
          properties: {
            changeType: { type: 'string', enum: ['bugfix', 'feature', 'refactor', 'question'] },
            risk: { type: 'string', enum: ['low', 'medium', 'high'] },
            rationale: { type: 'string' },
          },
        },
        edges: [{ to: 'review-routing' }],
      },
      'review-routing': {
        purpose: 'Human review gate for the routing decision',
        instructions:
          'Stop here and ask the user or external operator to review the previous classification. Use ripplegraph-demo advance with a decision.',
        exec: 'inline',
        gate: {
          type: 'external_decision',
          decisionSchema: {
            type: 'object',
            required: ['decision', 'reason'],
            properties: {
              decision: {
                type: 'string',
                enum: ['approved-bugfix', 'approved-feature', 'approved-refactor', 'approved-question', 'rejected'],
              },
              reason: { type: 'string' },
            },
          },
        },
        edges: [
          { to: 'plan-bugfix', when: { decision: 'approved-bugfix' } },
          { to: 'shape-feature', when: { decision: 'approved-feature' } },
          { to: 'simplify-design', when: { decision: 'approved-refactor' } },
          { to: 'answer-question', when: { decision: 'approved-question' } },
          { to: 'classify-change', when: { decision: 'rejected' } },
        ],
      },
      'plan-bugfix': {
        purpose: 'Plan a bugfix',
        instructions: 'Create a concise bugfix plan.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['reproduction', 'expectedBehavior', 'likelyFiles', 'verification'],
          properties: {
            reproduction: { type: 'string' },
            expectedBehavior: { type: 'string' },
            likelyFiles: { type: 'array' },
            verification: { type: 'array' },
          },
        },
        edges: [{ to: 'done' }],
      },
      'shape-feature': {
        purpose: 'Shape a feature',
        exec: 'inline',
        outputSchema: { type: 'object' },
        edges: [{ to: 'done' }],
      },
      'simplify-design': {
        purpose: 'Plan a behavior-preserving simplification',
        exec: 'inline',
        outputSchema: { type: 'object' },
        edges: [{ to: 'done' }],
      },
      'answer-question': {
        purpose: 'Answer an engineering question',
        exec: 'inline',
        outputSchema: { type: 'object' },
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Change intake complete', terminal: true },
    },
  };
}

function architectureSweepGraph(): unknown {
  return {
    kind: 'workflow',
    title: 'Architecture Sweep',
    effects: ['read_repo'],
    entry: 'select-cleanup',
    nodes: {
      'select-cleanup': {
        purpose: 'Select one cleanup candidate',
        instructions: 'Choose one small cleanup that would improve maintainability without reducing behavior.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['candidate', 'whyNow', 'verification'],
          properties: {
            candidate: { type: 'string' },
            whyNow: { type: 'string' },
            verification: { type: 'array' },
          },
        },
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Architecture sweep complete', terminal: true },
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

export function makeGraphMetadataWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-metadata-',
    workflow: {
      id: 'metadata-demo',
      version: '0.1.0',
      entryGraph: 'dispatcher',
      title: 'Metadata Demo',
      description: 'Workflow package with graph metadata.',
      graphs: {
        dispatcher: {
          kind: 'dispatcher',
          title: 'Workspace Dispatcher',
          description: 'Selects the right workflow.',
          activationHints: ['route user requests'],
          inputSchema: {
            type: 'object',
            required: ['request'],
            properties: { request: { type: 'string' } },
          },
          outputSchema: {
            type: 'object',
            required: ['action'],
            properties: { action: { type: 'string' } },
          },
          effects: ['read_workspace'],
          entry: 'route',
          nodes: {
            route: {
              purpose: 'Route a user request',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['action'],
                properties: { action: { type: 'string' } },
              },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Complete', terminal: true },
          },
        },
        legacy: dailyReviewGraph([{ to: 'done', when: { decision: 'proceed' } }]),
      },
    },
  });
}

export function makeInvalidGraphMetadataWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-invalid-metadata-',
    workflow: {
      id: 'invalid-metadata-demo',
      version: '0.1.0',
      graphs: {
        broken: {
          kind: 'tool',
          effects: [''],
          entry: 'review',
          nodes: {
            review: {
              purpose: 'Review generated intents',
              exec: 'inline',
              outputSchema: { type: 'object' },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Complete', terminal: true },
          },
        },
      },
    },
  });
}

export function makeInvalidEntryGraphWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-invalid-entry-graph-',
    workflow: {
      id: 'invalid-entry-graph-demo',
      version: '0.1.0',
      entryGraph: 'daily',
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

export function makeGatedWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-gated-',
    workflow: {
      id: 'gated-demo',
      version: '0.1.0',
      graphs: {
        review: {
          entry: 'approval',
          nodes: {
            approval: {
              purpose: 'Request external approval',
              instructions: 'Ask for an external decision before continuing.',
              exec: 'inline',
              gate: {
                type: 'external_decision',
                decisionSchema: {
                  type: 'object',
                  required: ['decision'],
                  properties: {
                    decision: { type: 'string', enum: ['approved', 'rejected'] },
                    reason: { type: 'string' },
                  },
                },
              },
              edges: [
                { to: 'done', when: { decision: 'approved' } },
                { to: 'done', when: { decision: 'rejected' } },
              ],
            },
            done: { purpose: 'Complete', terminal: true },
          },
        },
      },
    },
  });
}

export function makeDemoWorkflowRoot(): string {
  return createWorkflowRoot({
    prefix: 'ripplegraph-demo-cli-',
    workflow: {
      id: 'engineering-coach-demo',
      version: '0.4.0',
      entryGraph: 'workspace-dispatcher',
      title: 'Engineering Coach Demo',
      graphs: {
        'change-intake': changeIntakeGraph(),
        'architecture-sweep': architectureSweepGraph(),
        'workspace-dispatcher': {
          kind: 'dispatcher',
          entry: 'route',
          nodes: {
            route: {
              purpose: 'Choose the best graph for an engineering request',
              exec: 'inline',
              outputSchema: { type: 'object' },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Dispatcher recommendation complete', terminal: true },
          },
        },
      },
    },
  });
}
