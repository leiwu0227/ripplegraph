import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { makeCliWorkflowRoot, makeGatedWorkflowRoot } from './helpers/workflows.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const cli = path.join(repoRoot, 'src', 'cli.ts');
const binCli = path.join(repoRoot, 'bin', 'ripplegraph');

function run(args: string[]): { status: number | null; json: Record<string, unknown>; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    json: JSON.parse(result.stdout || '{}') as Record<string, unknown>,
    stderr: result.stderr,
  };
}

function runBuilt(args: string[]): { status: number | null; json: Record<string, unknown>; stderr: string } {
  const result = spawnSync(process.execPath, [binCli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    json: JSON.parse(result.stdout || '{}') as Record<string, unknown>,
    stderr: result.stderr,
  };
}

describe('reference cli', () => {
  it('validates, registers, and lists graph packages', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-cli-registry-'));
    const packageRoot = path.join(root, '.ripplegraph', 'graphs', 'support-triage');
    const manifest = {
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
          outputSchema: { type: 'object' },
          terminal: true,
        },
      },
    };
    try {
      fs.mkdirSync(packageRoot, { recursive: true });
      fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify(manifest), 'utf8');

      expect(run(['graph', 'validate', packageRoot]).json).toMatchObject({
        status: 'ok',
        package: {
          id: 'support-triage',
          version: '0.1.0',
          kind: 'workflow',
        },
      });
      expect(run(['graph', 'register', packageRoot, '--workflow-root', root]).json).toMatchObject({
        status: 'ok',
        entry: {
          id: 'support-triage',
          path: '.ripplegraph/graphs/support-triage',
        },
      });
      expect(run(['graph', 'list', '--workflow-root', root]).json).toMatchObject({
        status: 'ok',
        graphs: [{ id: 'support-triage', version: '0.1.0' }],
      });
      expect(runBuilt(['graph', 'list', '--workflow-root', root]).json).toMatchObject({
        status: 'ok',
        graphs: [{ id: 'support-triage', version: '0.1.0' }],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('renders gated state and advances it through the canonical advance command', () => {
    const root = makeGatedWorkflowRoot();
    try {
      expect(run(['start', '--workflow-root', root, '--graph', 'review', '--run-id', 'approval-a']).json.status).toBe('ok');
      const state = run(['state', '--workflow-root', root]).json;
      expect(state.responseContract).toMatchObject({ command: 'decide', schema: { required: ['decision'] } });
      expect(run(['step', '--workflow-root', root, '--output', '{"decision":"approved"}']).json).toMatchObject({
        status: 'error',
        code: 'E_GATE_DECISION_REQUIRED',
      });
      expect(run(['advance', '--workflow-root', root, '--input', '{"decision":"approved","reason":"ok"}']).json.status).toBe(
        'completed',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('starts, reads, steps, suspends, and resumes with JSON commands', () => {
    const root = makeCliWorkflowRoot();
    try {
      expect(run(['validate', '--workflow-root', root]).json.status).toBe('ok');
      expect(run(['start', '--workflow-root', root, '--graph', 'daily', '--run-id', 'daily-a']).json.status).toBe('ok');
      expect(run(['state', '--workflow-root', root]).json.position).toEqual({ graph: 'daily', node: 'review' });
      expect(run(['step', '--workflow-root', root, '--output', '{"decision":"maybe"}']).json.status).toBe(
        'validation_error',
      );
      expect(run(['advance', '--workflow-root', root, '--input', '{"decision":"stop"}']).json.status).toBe(
        'completed',
      );
      expect(run(['state', '--workflow-root', root]).json.status).toBe('no_focused_run');
      expect(run(['start', '--workflow-root', root, '--graph', 'daily', '--run-id', 'daily-b']).json.status).toBe('ok');
      expect(run(['suspend', '--workflow-root', root, '--note', 'pause']).json.run).toMatchObject({
        id: 'daily-b',
        status: 'suspended',
      });
      expect(run(['resume', '--workflow-root', root, '--run-id', 'daily-b']).json.run).toMatchObject({
        id: 'daily-b',
        status: 'active',
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
