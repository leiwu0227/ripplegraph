import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadGraphPackage, RipplegraphError } from '../src/index.js';

function makePackageRoot(manifest: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-package-'));
  fs.writeFileSync(path.join(root, 'graph.json'), JSON.stringify(manifest), 'utf8');
  return root;
}

const validManifest = {
  id: 'support-triage',
  version: '0.1.0',
  kind: 'workflow',
  title: 'Support Triage',
  description: 'Classify support tickets.',
  activationHints: ['triage support ticket'],
  inputSchema: { type: 'object' },
  outputSchema: { type: 'object' },
  effects: ['read_workspace'],
  entry: 'classify-ticket',
  nodes: {
    'classify-ticket': {
      purpose: 'Classify the newest support ticket',
      exec: 'inline',
      outputSchema: {
        type: 'object',
        required: ['category'],
        properties: {
          category: { type: 'string', enum: ['bug', 'feature', 'question'] },
        },
      },
      terminal: true,
    },
  },
};

describe('graph package loader', () => {
  it('loads a valid flat graph package manifest', () => {
    const root = makePackageRoot({
      ...validManifest,
      requires: [
        {
          id: 'workspace_ready',
          describe: 'a prepared workspace',
          unmetRedirect: 'setup-workspace',
          unmetMessage: 'Set up the workspace first.',
        },
      ],
    });
    try {
      expect(loadGraphPackage(root)).toMatchObject({
        path: root,
        manifest: {
          id: 'support-triage',
          version: '0.1.0',
          kind: 'workflow',
          activationHints: ['triage support ticket'],
          effects: ['read_workspace'],
          requires: [
            {
              id: 'workspace_ready',
              describe: 'a prepared workspace',
              unmetRedirect: 'setup-workspace',
              unmetMessage: 'Set up the workspace first.',
            },
          ],
          entry: 'classify-ticket',
        },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('defaults requires and preserves structured error details', () => {
    const root = makePackageRoot(validManifest);
    try {
      expect(loadGraphPackage(root).manifest.requires).toEqual([]);
      expect(new RipplegraphError('E_TEST', 'test message', { example: true })).toMatchObject({
        code: 'E_TEST',
        message: 'test message',
        details: { example: true },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects invalid package folders and graph references', () => {
    const missingFileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-missing-package-'));
    try {
      expect(() => loadGraphPackage(missingFileRoot)).toThrow(/no graph.json found/);
    } finally {
      fs.rmSync(missingFileRoot, { recursive: true, force: true });
    }

    const invalidRoot = makePackageRoot({
      ...validManifest,
      entry: 'missing-node',
    });
    try {
      expect(() => loadGraphPackage(invalidRoot)).toThrow(/entry references unknown node: missing-node/);
    } finally {
      fs.rmSync(invalidRoot, { recursive: true, force: true });
    }
  });

  it('loads host contract metadata and workflowRef maps', () => {
    const root = makePackageRoot({
      ...validManifest,
      effects: ['read_workspace'],
      nodes: {
        'classify-ticket': {
          purpose: 'Classify the newest support ticket',
          interaction: {
            id: 'classify-choice',
            kind: 'choice',
            prompt: 'Pick the support category.',
            renderVia: 'select',
            choices: [{ label: 'Bug', value: 'bug', description: 'A product defect.' }],
          },
          interrupt: { requiresUserTurn: true, reason: 'Needs user category confirmation.' },
          toolContract: {
            id: 'ticket-loader',
            command: 'load-ticket',
            purpose: 'Load the active ticket.',
            effects: ['read_workspace'],
            outputSchema: { type: 'object', properties: { ticketId: { type: 'string' } } },
            validator: 'ticket-output',
          },
          validators: [{ id: 'ticket-output', purpose: 'Validate loaded ticket shape.' }],
          sideChannelActions: [
            {
              id: 'refresh-ticket',
              purpose: 'Refresh ticket state without advancing the graph.',
              commandRef: 'ticket-loader',
              effects: ['read_workspace'],
              outputSchema: { type: 'object' },
              validator: 'ticket-output',
            },
          ],
          gate: {
            type: 'external_decision',
            interaction: {
              id: 'category-confirm',
              kind: 'confirm',
              prompt: 'Use this category?',
              choices: [
                { label: 'Yes', value: true },
                { label: 'No', value: false },
              ],
            },
            decisionSchema: { type: 'object' },
          },
          edges: [{ to: 'child' }],
        },
        child: {
          purpose: 'Run child workflow',
          workflowRef: {
            graphId: 'support-child',
            inputMap: { ticketId: '$.ticket.id' },
            outputMap: { summary: '$.result.summary' },
          },
          terminal: true,
        },
      },
    });
    try {
      expect(loadGraphPackage(root).manifest.nodes['classify-ticket']).toMatchObject({
        interaction: { id: 'classify-choice', kind: 'choice', choices: [{ value: 'bug' }] },
        interrupt: { requiresUserTurn: true },
        toolContract: { id: 'ticket-loader', effects: ['read_workspace'] },
        validators: [{ id: 'ticket-output' }],
        sideChannelActions: [{ id: 'refresh-ticket', commandRef: 'ticket-loader' }],
        gate: { interaction: { id: 'category-confirm', kind: 'confirm' } },
      });
      expect(loadGraphPackage(root).manifest.nodes.child.workflowRef).toMatchObject({
        graphId: 'support-child',
        inputMap: { ticketId: '$.ticket.id' },
        outputMap: { summary: '$.result.summary' },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects interactions that cannot be rendered from their metadata', () => {
    const missingChoiceRoot = makePackageRoot({
      ...validManifest,
      nodes: {
        'classify-ticket': {
          purpose: 'Classify the newest support ticket',
          interaction: { id: 'bad-choice', kind: 'choice', prompt: 'Choose.' },
          terminal: true,
        },
      },
    });
    try {
      expect(() => loadGraphPackage(missingChoiceRoot)).toThrow(/choices/);
    } finally {
      fs.rmSync(missingChoiceRoot, { recursive: true, force: true });
    }

    const missingFormSchemaRoot = makePackageRoot({
      ...validManifest,
      nodes: {
        'classify-ticket': {
          purpose: 'Classify the newest support ticket',
          interaction: { id: 'bad-form', kind: 'form', prompt: 'Fill form.' },
          terminal: true,
        },
      },
    });
    try {
      expect(() => loadGraphPackage(missingFormSchemaRoot)).toThrow(/schema/);
    } finally {
      fs.rmSync(missingFormSchemaRoot, { recursive: true, force: true });
    }
  });
});
