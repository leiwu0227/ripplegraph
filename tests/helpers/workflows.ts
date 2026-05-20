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

function supportTriageGraph(): unknown {
  return {
    entry: 'classify-ticket',
    nodes: {
      'classify-ticket': {
        purpose: 'Classify the newest support ticket',
        instructions: 'Read tickets/inbox.json and support-playbook.md.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['category', 'priority', 'rationale'],
          properties: {
            category: { type: 'string', enum: ['bug', 'feature', 'question'] },
            priority: { type: 'string', enum: ['low', 'normal', 'urgent'] },
            rationale: { type: 'string' },
          },
        },
        edges: [
          { to: 'review-classification' },
        ],
      },
      'review-classification': {
        purpose: 'External review gate for the classification',
        instructions:
          'Stop here and ask the user or external operator to review the previous classification. Use ripplegraph-demo decide, not submit.',
        exec: 'inline',
        gate: {
          type: 'external_decision',
          decisionSchema: {
            type: 'object',
            required: ['decision', 'reason'],
            properties: {
              decision: {
                type: 'string',
                enum: ['approved-bug', 'approved-feature', 'approved-question', 'rejected'],
              },
              reason: { type: 'string' },
            },
          },
        },
        edges: [
          { to: 'reproduce-bug', when: { decision: 'approved-bug' } },
          { to: 'scope-feature', when: { decision: 'approved-feature' } },
          { to: 'answer-question', when: { decision: 'approved-question' } },
          { to: 'classify-ticket', when: { decision: 'rejected' } },
        ],
      },
      'reproduce-bug': {
        purpose: 'Draft a bug reproduction plan',
        instructions: 'Write reproduction details.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['steps', 'expected', 'actual', 'nextOwner'],
          properties: {
            steps: { type: 'array' },
            expected: { type: 'string' },
            actual: { type: 'string' },
            nextOwner: { type: 'string', enum: ['support', 'engineering'] },
          },
        },
        edges: [{ to: 'done' }],
      },
      'scope-feature': {
        purpose: 'Scope a feature request',
        exec: 'inline',
        outputSchema: { type: 'object' },
        edges: [{ to: 'done' }],
      },
      'answer-question': {
        purpose: 'Prepare a customer answer',
        exec: 'inline',
        outputSchema: { type: 'object' },
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Support triage complete', terminal: true },
    },
  };
}

function policyRefreshGraph(): unknown {
  return {
    entry: 'audit-playbook',
    nodes: {
      'audit-playbook': {
        purpose: 'Find one improvement to the support playbook',
        instructions: 'Suggest one concrete playbook improvement.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['gap', 'suggestedChange'],
          properties: {
            gap: { type: 'string' },
            suggestedChange: { type: 'string' },
          },
        },
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Policy refresh complete', terminal: true },
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
      id: 'support-triage-demo',
      version: '0.3.0',
      graphs: {
        'support-triage': supportTriageGraph(),
        'policy-refresh': policyRefreshGraph(),
      },
    },
  });
}
