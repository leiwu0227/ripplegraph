import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertEffectsAllowed, checkEffects, RipplegraphError, startRun } from '../src/index.js';

function makeWorkflowRoot(prefix: string, workflow: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.writeFileSync(path.join(root, 'workflow.json'), JSON.stringify(workflow), 'utf8');
  return root;
}

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
    const overrideRoot = makeWorkflowRoot('rg-union-override-', {
      id: 'union-override',
      version: '0.0.1',
      graphs: {
        main: {
          kind: 'workflow',
          entry: 'a',
          effects: ['read_repo'],
          nodes: {
            a: { purpose: 'first', effects: ['read_repo', 'write_repo'], edges: [{ to: 'b' }] },
            b: { purpose: 'terminal', terminal: true },
          },
        },
      },
    });
    try {
      expect(() =>
        startRun({ workflowRoot: overrideRoot, graph: 'main', runId: 'r', effectPolicy: { allowedEffects: ['read_repo'] } }),
      ).toThrow(/write_repo \(node: a\)/);
      expect(
        startRun({
          workflowRoot: overrideRoot,
          graph: 'main',
          runId: 'r',
          effectPolicy: { allowedEffects: ['read_repo', 'write_repo'] },
        }).status,
      ).toBe('ok');
    } finally {
      fs.rmSync(overrideRoot, { recursive: true, force: true });
    }

    const optOutRoot = makeWorkflowRoot('rg-union-optout-', {
      id: 'union-optout',
      version: '0.0.1',
      graphs: {
        main: {
          kind: 'workflow',
          entry: 'a',
          effects: ['write_repo'],
          nodes: { a: { purpose: 'first', effects: [], terminal: true } },
        },
      },
    });
    try {
      expect(
        startRun({ workflowRoot: optOutRoot, graph: 'main', runId: 'r', effectPolicy: { allowedEffects: [] } }).status,
      ).toBe('ok');
    } finally {
      fs.rmSync(optOutRoot, { recursive: true, force: true });
    }
  });
});
