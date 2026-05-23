import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyDispatchAction, getDispatchRequest, registerGraphPackage, stepRun, suspendRun } from '../src/index.js';
import { makeCliWorkflowRoot } from './helpers/workflows.js';

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
      expect(
        getDispatchRequest({ workflowRoot: root, request: 'triage support' }).actionSchema.oneOf?.find(
          (schema) =>
            typeof schema === 'object' &&
            schema !== null &&
            'properties' in schema &&
            (schema.properties as Record<string, unknown>)?.action &&
            JSON.stringify((schema.properties as Record<string, unknown>).action).includes('call_graph'),
        ),
      ).toMatchObject({
        properties: {
          callId: { type: 'string' },
        },
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

  it('applies read-only dispatcher actions without changing focused run state', () => {
    const root = makeCliWorkflowRoot();
    try {
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'workspace-dispatcher') });
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'daily', { kind: 'workflow', effects: [] }) });

      expect(applyDispatchAction({ workflowRoot: root, action: { action: 'list_runs' } })).toMatchObject({
        status: 'ok',
        focusedRunId: null,
        runs: [],
        availableGraphs: [
          { id: 'daily', kind: 'workflow' },
          { id: 'workspace-dispatcher', kind: 'dispatcher' },
        ],
      });
      expect(
        applyDispatchAction({
          workflowRoot: root,
          action: { action: 'ask_user', question: 'Which workflow should handle this?', choices: ['daily'] },
        }),
      ).toEqual({
        status: 'needs_user_input',
        question: 'Which workflow should handle this?',
        choices: ['daily'],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('starts and resumes executable workflow runs through dispatcher actions', () => {
    const root = makeCliWorkflowRoot();
    try {
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'workspace-dispatcher') });
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'daily', { kind: 'workflow', effects: [] }) });

      expect(
        applyDispatchAction({ workflowRoot: root, action: { action: 'start_run', graphId: 'daily', runId: 'daily-a' } }),
      ).toMatchObject({
        status: 'ok',
        run: { id: 'daily-a', rootGraph: 'daily', status: 'active' },
      });

      suspendRun({ workflowRoot: root, note: 'pause' });
      expect(applyDispatchAction({ workflowRoot: root, action: { action: 'switch_run', runId: 'daily-a' } })).toMatchObject({
        status: 'ok',
        run: { id: 'daily-a', rootGraph: 'daily', status: 'active' },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('enforces graph effects before dispatcher start and call actions mutate state', () => {
    const runRoot = makeRoot('ripplegraph-dispatcher-effects-start-');
    try {
      // Compact workflow + registered package both declare the same effects so the
      // start path is denied at startRun's union check, before any state is written.
      fs.writeFileSync(
        path.join(runRoot, 'workflow.json'),
        JSON.stringify({
          id: 'effects-demo',
          version: '0.1.0',
          graphs: {
            daily: {
              kind: 'workflow',
              effects: ['write_files'],
              entry: 'review',
              nodes: {
                review: { purpose: 'Review', exec: 'inline', edges: [{ to: 'done' }] },
                done: { purpose: 'Done', terminal: true },
              },
            },
          },
        }),
        'utf8',
      );
      registerGraphPackage({ workflowRoot: runRoot, packageRoot: writePackage(runRoot, 'workspace-dispatcher') });
      registerGraphPackage({
        workflowRoot: runRoot,
        packageRoot: writePackage(runRoot, 'daily', { kind: 'workflow', effects: ['write_files'] }),
      });

      expect(
        errorCode(() =>
          applyDispatchAction({ workflowRoot: runRoot, action: { action: 'start_run', graphId: 'daily', runId: 'daily-denied' } }),
        ),
      ).toBe('E_EFFECT_NOT_ALLOWED');
      expect(fs.existsSync(path.join(runRoot, '.ripplegraph', 'current.json'))).toBe(false);
      expect(fs.existsSync(path.join(runRoot, '.ripplegraph', 'runs'))).toBe(false);

      expect(
        applyDispatchAction({
          workflowRoot: runRoot,
          action: { action: 'start_run', graphId: 'daily', runId: 'daily-allowed' },
          effectPolicy: { allowedEffects: ['write_files'] },
        }),
      ).toMatchObject({ status: 'ok', run: { id: 'daily-allowed' } });
    } finally {
      fs.rmSync(runRoot, { recursive: true, force: true });
    }

    const callRoot = makeRoot('ripplegraph-dispatcher-effects-call-');
    try {
      registerGraphPackage({ workflowRoot: callRoot, packageRoot: writePackage(callRoot, 'workspace-dispatcher') });
      registerGraphPackage({
        workflowRoot: callRoot,
        packageRoot: writePackage(callRoot, 'summarize', {
          kind: 'callable',
          effects: ['network'],
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
      });

      expect(
        errorCode(() =>
          applyDispatchAction({
            workflowRoot: callRoot,
            action: { action: 'call_graph', graphId: 'summarize', callId: 'call-denied', input: { ticketId: 'TCK-1007' } },
          }),
        ),
      ).toBe('E_EFFECT_NOT_ALLOWED');
      expect(fs.existsSync(path.join(callRoot, '.ripplegraph', 'calls'))).toBe(false);
    } finally {
      fs.rmSync(callRoot, { recursive: true, force: true });
    }
  });

  it('honors per-node effects opt-out through the dispatcher start path', () => {
    const root = makeCliWorkflowRoot();
    try {
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'workspace-dispatcher') });
      registerGraphPackage({
        workflowRoot: root,
        packageRoot: writePackage(root, 'daily', {
          kind: 'workflow',
          effects: ['write_files'],
          entry: 'route',
          nodes: {
            route: {
              purpose: 'Single read-only node',
              exec: 'inline',
              outputSchema: { type: 'object' },
              effects: [],
              terminal: true,
            },
          },
        }),
      });

      expect(
        applyDispatchAction({
          workflowRoot: root,
          action: { action: 'start_run', graphId: 'daily', runId: 'daily-optout' },
          effectPolicy: { allowedEffects: [] },
        }),
      ).toMatchObject({ status: 'ok', run: { id: 'daily-optout', rootGraph: 'daily', status: 'active' } });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('starts package-only workflow targets and rejects unsupported dispatcher action targets clearly', () => {
    const root = makeRoot('ripplegraph-dispatcher-unsupported-');
    try {
      fs.writeFileSync(
        path.join(root, 'workflow.json'),
        JSON.stringify({
          id: 'unsupported-demo',
          version: '0.1.0',
          graphs: {
            'package-only': {
              kind: 'dispatcher',
              entry: 'route',
              nodes: {
                route: {
                  purpose: 'Route a request',
                  exec: 'inline',
                  outputSchema: { type: 'object' },
                  terminal: true,
                },
              },
            },
          },
        }),
        'utf8',
      );
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'workspace-dispatcher') });
      registerGraphPackage({ workflowRoot: root, packageRoot: writePackage(root, 'package-only', { kind: 'workflow', effects: [] }) });
      registerGraphPackage({
        workflowRoot: root,
        packageRoot: writePackage(root, 'summarize', {
          kind: 'callable',
          effects: [],
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
      });

      expect(
        applyDispatchAction({ workflowRoot: root, action: { action: 'start_run', graphId: 'package-only', runId: 'pkg-a' } }),
      ).toMatchObject({
        status: 'ok',
        run: { id: 'pkg-a', rootGraph: 'package-only', status: 'active' },
        position: { graph: 'package-only', node: 'route' },
      });
      expect(stepRun({ workflowRoot: root, output: {} })).toMatchObject({
        status: 'completed',
        run: { id: 'pkg-a', rootGraph: 'package-only', status: 'completed' },
      });
      expect(
        applyDispatchAction({
          workflowRoot: root,
          action: { action: 'call_graph', graphId: 'summarize', callId: 'call-from-dispatch', input: { ticketId: 'TCK-1007' } },
        }),
      ).toMatchObject({
        status: 'active',
        call: { id: 'call-from-dispatch', graphId: 'summarize' },
        input: { ticketId: 'TCK-1007' },
      });
      expect(errorCode(() => applyDispatchAction({ workflowRoot: root, action: { action: 'start_run', graphId: 'missing' } }))).toBe(
        'E_UNKNOWN_GRAPH',
      );
      expect(errorCode(() => applyDispatchAction({ workflowRoot: root, action: { action: 'call_graph', graphId: 'package-only' } }))).toBe(
        'E_WRONG_GRAPH_KIND',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
