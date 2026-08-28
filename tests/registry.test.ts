import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { listRegisteredGraphs, readRegistry, registerGraphPackage } from '../src/index.js';
import { makeRoot } from './helpers/setup.js';

const manifest = {
  id: 'support-triage',
  version: '0.1.0',
  kind: 'workflow',
  title: 'Support Triage',
  description: 'Classify support tickets.',
  activationHints: ['triage support ticket'],
  outputSchema: { type: 'object' },
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
  nodes: {
    'classify-ticket': {
      purpose: 'Classify the newest support ticket',
      exec: 'inline',
      outputSchema: { type: 'object' },
      terminal: true,
    },
  },
};

function writePackage(packageRoot: string, overrides: Record<string, unknown> = {}): void {
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify({ ...manifest, ...overrides }), 'utf8');
}

describe('graph registry storage', () => {
  it('creates, lists, and updates registered graph packages deterministically', () => {
    const root = makeRoot('ripplegraph-registry-');
    const packageRoot = path.join(root, '.ripplegraph', 'graphs', 'support-triage');
    try {
      writePackage(packageRoot);
      expect(readRegistry(root)).toEqual({ version: 1, graphs: {} });

      const first = registerGraphPackage({ workflowRoot: root, packageRoot, now: '2026-05-21T00:00:00.000Z' });
      expect(first).toMatchObject({
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
        path: '.ripplegraph/graphs/support-triage',
        registeredAt: '2026-05-21T00:00:00.000Z',
      });

      writePackage(packageRoot, { version: '0.2.0' });
      const second = registerGraphPackage({ workflowRoot: root, packageRoot, now: '2026-05-22T00:00:00.000Z' });
      expect(second).toMatchObject({ id: 'support-triage', version: '0.2.0' });
      expect(listRegisteredGraphs(root)).toEqual([second]);
      expect(Object.keys(readRegistry(root).graphs)).toEqual(['support-triage']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects duplicate ids from a different path unless forced', () => {
    const root = makeRoot('ripplegraph-registry-conflict-');
    const firstRoot = path.join(root, 'one');
    const secondRoot = path.join(root, 'two');
    try {
      writePackage(firstRoot);
      writePackage(secondRoot);

      registerGraphPackage({ workflowRoot: root, packageRoot: firstRoot, now: '2026-05-21T00:00:00.000Z' });
      expect(() =>
        registerGraphPackage({ workflowRoot: root, packageRoot: secondRoot, now: '2026-05-21T00:00:00.000Z' }),
      ).toThrow(/already registered/);

      expect(registerGraphPackage({ workflowRoot: root, packageRoot: secondRoot, force: true }).path).toBe('two');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('stores descendants whose first segment begins with two dots as relative paths', () => {
    const root = makeRoot('ripplegraph-registry-leading-dots-');
    const packageRoot = path.join(root, '..packages', 'support-triage');
    try {
      writePackage(packageRoot);

      expect(registerGraphPackage({ workflowRoot: root, packageRoot }).path).toBe('..packages/support-triage');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
