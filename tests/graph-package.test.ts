import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadGraphPackage } from '../src/index.js';

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
    const root = makePackageRoot(validManifest);
    try {
      expect(loadGraphPackage(root)).toMatchObject({
        path: root,
        manifest: {
          id: 'support-triage',
          version: '0.1.0',
          kind: 'workflow',
          activationHints: ['triage support ticket'],
          effects: ['read_workspace'],
          entry: 'classify-ticket',
        },
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
});
