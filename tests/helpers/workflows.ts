import { createTestWorkspace, type GraphPackageManifestInput } from './workspace.js';

function dailyReviewNodes(edges: unknown[], extraNodes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
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
  };
}

function mockcopyGraph(outputSchema: unknown, instructions = 'Submit the mockcopy plan.'): GraphPackageManifestInput {
  return {
    id: 'mockcopy',
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

function changeIntakeGraph(): GraphPackageManifestInput {
  return {
    id: 'change-intake',
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

function architectureSweepGraph(): GraphPackageManifestInput {
  return {
    id: 'architecture-sweep',
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

function workspaceDispatcherGraph(): GraphPackageManifestInput {
  return {
    id: 'workspace-dispatcher',
    kind: 'dispatcher',
    title: 'Workspace Dispatcher',
  };
}

export function makeCliWorkflowRoot(): string {
  return createTestWorkspace({
    prefix: 'ripplegraph-cli-',
    workspace: { id: 'demo' },
    graphs: [
      {
        id: 'daily',
        entry: 'review',
        nodes: dailyReviewNodes([{ to: 'done', when: { decision: 'stop' } }]),
      },
    ],
  });
}

export function makeStorageWorkflowRoot(): string {
  return createTestWorkspace({
    prefix: 'ripplegraph-storage-',
    workspace: { id: 'demo' },
    graphs: [
      {
        id: 'daily',
        entry: 'review',
        nodes: dailyReviewNodes([{ to: 'done', when: { decision: 'proceed' } }]),
      },
    ],
  });
}

export function makeHiddenStorageWorkflowRoot(): string {
  return createTestWorkspace({
    prefix: 'ripplegraph-storage-hidden-',
    hidden: true,
    workspace: { id: 'demo' },
    graphs: [
      {
        id: 'daily',
        entry: 'review',
        nodes: dailyReviewNodes([{ to: 'done', when: { decision: 'proceed' } }]),
      },
    ],
  });
}

export function makeGraphMetadataWorkflowRoot(): string {
  return createTestWorkspace({
    prefix: 'ripplegraph-metadata-',
    workspace: {
      id: 'metadata-demo',
      entryGraph: 'dispatcher',
      title: 'Metadata Demo',
      description: 'Workflow package with graph metadata.',
    },
    graphs: [
      {
        id: 'dispatcher',
        kind: 'dispatcher',
        title: 'Workspace Dispatcher',
        description: 'Selects the right workflow.',
        activationHints: ['route user requests'],
      },
      {
        id: 'legacy',
        entry: 'review',
        nodes: dailyReviewNodes([{ to: 'done', when: { decision: 'proceed' } }]),
      },
    ],
  });
}

export function makeCoachWorkflowRoot(): string {
  return createTestWorkspace({
    prefix: 'ripplegraph-coach-',
    workspace: { id: 'demo' },
    graphs: [
      {
        id: 'daily',
        entry: 'review',
        nodes: dailyReviewNodes(
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
      },
      mockcopyGraph({ type: 'object' }),
    ],
  });
}

export function makeGatedWorkflowRoot(): string {
  return createTestWorkspace({
    prefix: 'ripplegraph-gated-',
    workspace: { id: 'gated-demo' },
    graphs: [
      {
        id: 'review',
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
    ],
  });
}

export function makeDemoWorkflowRoot(): string {
  return createTestWorkspace({
    prefix: 'ripplegraph-demo-cli-',
    workspace: {
      id: 'engineering-coach-demo',
      version: '0.4.0',
      entryGraph: 'workspace-dispatcher',
      title: 'Engineering Coach Demo',
    },
    graphs: [changeIntakeGraph(), architectureSweepGraph(), workspaceDispatcherGraph()],
  });
}
