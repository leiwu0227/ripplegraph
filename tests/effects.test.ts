import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { assertEffectsAllowed, checkEffects, RipplegraphError, startRun } from '../src/index.js';
import { createTestWorkspace } from './helpers/workspace.js';

describe('effect policy', () => {
  it('checks declared effects against explicit allow-list policy', () => {
    expect(checkEffects([], undefined)).toEqual({
      allowed: true,
      requiredEffects: [],
      missingEffects: [],
    });
    expect(checkEffects(['read_repo', 'write_files', 'read_repo'], { allowedEffects: ['read_repo', 'read_repo'] })).toEqual({
      allowed: false,
      requiredEffects: ['read_repo', 'write_files'],
      missingEffects: ['write_files'],
    });
    expect(checkEffects(['write_files', 'read_repo'], { allowedEffects: ['read_repo', 'write_files'] })).toMatchObject({
      allowed: true,
      missingEffects: [],
    });

    expect(() => assertEffectsAllowed(['network'], undefined, 'graph summarize-ticket')).toThrow(RipplegraphError);
    expect(() => assertEffectsAllowed(['network'], undefined, 'graph summarize-ticket')).toThrow(
      'graph summarize-ticket requires effects not allowed by policy: network',
    );
  });

  it('checks union of node effects at startRun, honoring override and opt-out', () => {
    const overrideRoot = createTestWorkspace({
      prefix: 'rg-union-override-',
      workspace: { id: 'union-override' },
      graphs: [
        {
          id: 'main',
          kind: 'workflow',
          entry: 'a',
          effects: ['read_repo'],
          nodes: {
            a: { purpose: 'first', effects: ['read_repo', 'write_repo'], edges: [{ to: 'b' }] },
            b: { purpose: 'terminal', terminal: true },
          },
        },
      ],
    });
    try {
      expect(() =>
        startRun({ workflowRoot: overrideRoot, graphId: 'main', runId: 'r', effectPolicy: { allowedEffects: ['read_repo'] } }),
      ).toThrow(/write_repo \(node: a\)/);
      expect(
        startRun({
          workflowRoot: overrideRoot,
          graphId: 'main',
          runId: 'r',
          effectPolicy: { allowedEffects: ['read_repo', 'write_repo'] },
        }).status,
      ).toBe('ok');
    } finally {
      fs.rmSync(overrideRoot, { recursive: true, force: true });
    }

    const optOutRoot = createTestWorkspace({
      prefix: 'rg-union-optout-',
      workspace: { id: 'union-optout' },
      graphs: [
        {
          id: 'main',
          kind: 'workflow',
          entry: 'a',
          effects: ['write_repo'],
          nodes: { a: { purpose: 'first', effects: [], terminal: true } },
        },
      ],
    });
    try {
      expect(
        startRun({ workflowRoot: optOutRoot, graphId: 'main', runId: 'r', effectPolicy: { allowedEffects: [] } }).status,
      ).toBe('ok');
    } finally {
      fs.rmSync(optOutRoot, { recursive: true, force: true });
    }
  });

  it('includes host contract effects in workflow start preflight', () => {
    const root = createTestWorkspace({
      prefix: 'rg-host-contract-effects-',
      workspace: { id: 'host-contract-effects' },
      graphs: [
        {
          id: 'main',
          kind: 'workflow',
          entry: 'a',
          effects: ['write_repo'],
          nodes: {
            a: {
              purpose: 'first',
              effects: [],
              toolContract: { id: 'artifact-loader', command: 'load-artifact', effects: ['network'] },
              sideChannelActions: [
                { id: 'refresh-backend', purpose: 'Refresh backend state.', effects: ['read_backend', 'network'] },
              ],
              terminal: true,
            },
          },
        },
      ],
    });
    try {
      expect(() =>
        startRun({ workflowRoot: root, graphId: 'main', runId: 'r', effectPolicy: { allowedEffects: ['network'] } }),
      ).toThrow(/read_backend \(node: a\)/);
      expect(() =>
        startRun({ workflowRoot: root, graphId: 'main', runId: 'r', effectPolicy: { allowedEffects: ['network'] } }),
      ).not.toThrow(/write_repo/);
      expect(
        startRun({
          workflowRoot: root,
          graphId: 'main',
          runId: 'r',
          effectPolicy: { allowedEffects: ['network', 'read_backend'] },
        }).status,
      ).toBe('ok');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
