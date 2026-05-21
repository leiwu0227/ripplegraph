import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getDispatchRequest, registerGraphPackage } from '../src/index.js';

const baseManifest = {
  id: 'workspace-dispatcher',
  version: '0.1.0',
  kind: 'dispatcher',
  title: 'Workspace Dispatcher',
  description: 'Routes user requests to registered graphs.',
  activationHints: ['route workspace work'],
  inputSchema: { type: 'object' },
  outputSchema: { type: 'object' },
  effects: ['read_workspace'],
  entry: 'route',
  nodes: {
    route: {
      purpose: 'Route a user request',
      exec: 'inline',
      outputSchema: { type: 'object' },
      terminal: true,
    },
  },
};

function makeRoot(prefix = 'ripplegraph-dispatcher-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writePackage(root: string, id: string, overrides: Record<string, unknown> = {}): string {
  const packageRoot = path.join(root, '.ripplegraph', 'graphs', id);
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify({ ...baseManifest, id, ...overrides }), 'utf8');
  return packageRoot;
}

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

describe('dispatcher runtime', () => {
  it('returns a read-only dispatch request contract for the registered dispatcher and graph catalog', () => {
    const root = makeRoot();
    try {
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'workspace-dispatcher') });
      registerGraphPackage({
        workflowRoot: root,
        packageRoot: writePackage(root, 'support-triage', {
          kind: 'workflow',
          title: 'Support Triage',
          activationHints: ['triage support tickets'],
          effects: ['read_workspace', 'write_files'],
        }),
      });

      expect(getDispatchRequest({ workflowRoot: root, request: 'triage support' })).toMatchObject({
        status: 'needs_action',
        dispatcher: { id: 'workspace-dispatcher', kind: 'dispatcher' },
        request: 'triage support',
        orientation: expect.any(String),
        availableGraphs: [
          { id: 'support-triage', kind: 'workflow', activationHints: ['triage support tickets'] },
          { id: 'workspace-dispatcher', kind: 'dispatcher', activationHints: ['route workspace work'] },
        ],
        actionSchema: { oneOf: expect.any(Array) },
        nextAllowedCommand: expect.stringContaining('ripplegraph dispatch --action'),
        helpCommand: 'ripplegraph explain',
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('requires exactly one registered dispatcher graph', () => {
    const root = makeRoot('ripplegraph-dispatcher-selection-');
    try {
      expect(errorCode(() => getDispatchRequest({ workflowRoot: root, request: 'start work' }))).toBe('E_MISSING_DISPATCHER');

      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'dispatcher-a') });
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'dispatcher-b') });

      expect(errorCode(() => getDispatchRequest({ workflowRoot: root, request: 'start work' }))).toBe('E_AMBIGUOUS_DISPATCHER');
      expect(() => getDispatchRequest({ workflowRoot: root, request: 'start work' })).toThrow(/dispatcher-a.*dispatcher-b/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
