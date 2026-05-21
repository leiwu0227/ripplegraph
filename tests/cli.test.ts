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
      fs.writeFileSync(path.join(root, 'workflow.json'), JSON.stringify({ id: 'cli-registry', version: '0.1.0', graphs: {} }), 'utf8');
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
      const dispatcherRoot = path.join(root, '.ripplegraph', 'graphs', 'workspace-dispatcher');
      fs.mkdirSync(dispatcherRoot, { recursive: true });
      fs.writeFileSync(
        path.join(dispatcherRoot, 'graph.json'),
        JSON.stringify({
          ...manifest,
          id: 'workspace-dispatcher',
          kind: 'dispatcher',
          title: 'Workspace Dispatcher',
          activationHints: ['route workspace work'],
        }),
        'utf8',
      );
      expect(run(['graph', 'register', dispatcherRoot, '--workflow-root', root]).json.status).toBe('ok');
      expect(run(['graph', 'list', '--workflow-root', root]).json).toMatchObject({
        status: 'ok',
        graphs: [
          { id: 'support-triage', version: '0.1.0' },
          { id: 'workspace-dispatcher', version: '0.1.0' },
        ],
      });
      expect(run(['dispatch', '--request', 'triage support', '--workflow-root', root]).json).toMatchObject({
        status: 'needs_action',
        dispatcher: { id: 'workspace-dispatcher', kind: 'dispatcher' },
        request: 'triage support',
      });
      expect(run(['dispatch', '--action', '{"action":"list_runs"}', '--workflow-root', root]).json).toMatchObject({
        status: 'ok',
        action: 'list_runs',
        availableGraphs: [{ id: 'support-triage' }, { id: 'workspace-dispatcher' }],
      });
      const callableRoot = path.join(root, '.ripplegraph', 'graphs', 'summarize-ticket');
      fs.mkdirSync(callableRoot, { recursive: true });
      fs.writeFileSync(
        path.join(callableRoot, 'graph.json'),
        JSON.stringify({
          ...manifest,
          id: 'summarize-ticket',
          kind: 'callable',
          effects: ['read_workspace', 'network'],
          inputSchema: {
            type: 'object',
            required: ['ticketId'],
            properties: { ticketId: { type: 'string' } },
          },
          outputSchema: {
            type: 'object',
            required: ['summary'],
            properties: { summary: { type: 'string' } },
          },
          entry: 'summarize',
          nodes: {
            summarize: {
              purpose: 'Summarize a ticket',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['summary'],
                properties: { summary: { type: 'string' } },
              },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Done', terminal: true },
          },
        }),
        'utf8',
      );
      expect(run(['graph', 'register', callableRoot, '--workflow-root', root]).json.status).toBe('ok');
      expect(
        run([
          'call',
          '--graph',
          'summarize-ticket',
          '--call-id',
          'call-cli',
          '--input',
          '{"ticketId":"TCK-1007"}',
          '--allow-effect',
          'read_workspace',
          '--allow-effect',
          'network',
          '--workflow-root',
          root,
        ]).json,
      ).toMatchObject({
        status: 'active',
        call: { id: 'call-cli', graphId: 'summarize-ticket' },
      });
      expect(run(['call-state', '--call-id', 'call-cli', '--workflow-root', root]).json).toMatchObject({
        status: 'active',
        input: { ticketId: 'TCK-1007' },
      });
      expect(
        run([
          'dispatch',
          '--action',
          '{"action":"call_graph","graphId":"summarize-ticket","callId":"call-dispatch","input":{"ticketId":"TCK-1008"}}',
          '--allow-effects',
          'read_workspace,network',
          '--workflow-root',
          root,
        ]).json,
      ).toMatchObject({
        status: 'active',
        call: { id: 'call-dispatch', graphId: 'summarize-ticket' },
      });
      expect(
        run(['call-step', '--call-id', 'call-cli', '--output', '{"summary":"Checkout failure."}', '--workflow-root', root]).json,
      ).toMatchObject({
        status: 'completed',
        output: { summary: 'Checkout failure.' },
      });
      const callList = run(['call-list', '--workflow-root', root]).json;
      expect(callList.status).toBe('ok');
      expect(callList.calls).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'call-cli', status: 'completed', graphId: 'summarize-ticket' })]),
      );
      expect(runBuilt(['graph', 'list', '--workflow-root', root]).json).toMatchObject({
        status: 'ok',
        graphs: [
          { id: 'summarize-ticket', version: '0.1.0' },
          { id: 'support-triage', version: '0.1.0' },
          { id: 'workspace-dispatcher', version: '0.1.0' },
        ],
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
      const workflowPath = path.join(root, 'workflow.json');
      const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8')) as { graphs: { daily: { effects?: string[] } } };
      workflow.graphs.daily.effects = ['read_workspace'];
      fs.writeFileSync(workflowPath, JSON.stringify(workflow), 'utf8');

      expect(run(['validate', '--workflow-root', root]).json.status).toBe('ok');
      expect(run(['start', '--workflow-root', root, '--graph', 'daily', '--run-id', 'daily-a']).json).toMatchObject({
        status: 'error',
        code: 'E_EFFECT_NOT_ALLOWED',
      });
      expect(
        run(['start', '--workflow-root', root, '--graph', 'daily', '--run-id', 'daily-a', '--allow-effects', 'read_workspace']).json.status,
      ).toBe('ok');
      expect(run(['state', '--workflow-root', root]).json.position).toEqual({ graph: 'daily', node: 'review' });
      expect(run(['step', '--workflow-root', root, '--output', '{"decision":"maybe"}']).json.status).toBe(
        'validation_error',
      );
      expect(run(['advance', '--workflow-root', root, '--input', '{"decision":"stop"}']).json.status).toBe(
        'completed',
      );
      expect(run(['state', '--workflow-root', root]).json.status).toBe('no_focused_run');
      expect(
        run(['start', '--workflow-root', root, '--graph', 'daily', '--run-id', 'daily-b', '--allow-effect', 'read_workspace']).json.status,
      ).toBe('ok');
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
