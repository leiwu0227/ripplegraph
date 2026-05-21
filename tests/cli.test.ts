import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { makeCliWorkflowRoot, makeGatedWorkflowRoot } from './helpers/workflows.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const cli = path.join(repoRoot, 'src', 'cli.ts');

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

describe('reference cli', () => {
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
