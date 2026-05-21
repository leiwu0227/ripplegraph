import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendCallableTransition,
  callableArtifactPath,
  callableCheckpointPath,
  callableTransitionLogPath,
  getCallableCall,
  createCallableCheckpoint,
  listCallIds,
  listCallableCalls,
  readCallableCheckpoint,
  readCurrent,
  registerGraphPackage,
  startCallableCall,
  writeCallableOutput,
} from '../src/index.js';

function makeRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-callable-'));
}

function writeGraphPackage(root: string, folder: string, manifest: Record<string, unknown>): string {
  const packageRoot = path.join(root, folder);
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify(manifest), 'utf8');
  registerGraphPackage({ workflowRoot: root, packageRoot, now: '2026-05-21T00:00:00.000Z' });
  return packageRoot;
}

function callableManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'summarize-ticket',
    version: '0.1.0',
    kind: 'callable',
    inputSchema: {
      type: 'object',
      required: ['ticketId'],
      additionalProperties: false,
      properties: {
        ticketId: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['summary'],
      properties: {
        summary: { type: 'string' },
      },
    },
    entry: 'summarize',
    nodes: {
      summarize: {
        purpose: 'Summarize a support ticket',
        instructions: 'Return a concise summary.',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['summary'],
          properties: {
            summary: { type: 'string' },
          },
        },
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Done', terminal: true },
    },
    ...overrides,
  };
}

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

describe('callable storage', () => {
  it('persists isolated callable checkpoint, artifacts, transition log, and call list', () => {
    const root = makeRoot();
    try {
      createCallableCheckpoint(root, {
        callId: 'call-a',
        status: 'active',
        graphId: 'summarize-ticket',
        graphVersion: '0.1.0',
        packagePath: 'graphs/summarize-ticket',
        position: { graph: 'summarize-ticket', node: 'summarize' },
        input: { ticketId: 'TCK-1007' },
        outputs: {},
        createdAt: '2026-05-21T00:00:00.000Z',
        updatedAt: '2026-05-21T00:00:00.000Z',
      });
      const artifact = writeCallableOutput(root, 'call-a', 'summarize', { summary: 'Checkout failure.' });
      appendCallableTransition(root, 'call-a', {
        ts: '2026-05-21T00:00:01.000Z',
        op: 'start',
        callId: 'call-a',
        from: null,
        to: { graph: 'summarize-ticket', node: 'summarize' },
        input: { ticketId: 'TCK-1007' },
        output: null,
        validation: { ok: true },
        error: null,
      });

      expect(readCallableCheckpoint(root, 'call-a')).toMatchObject({
        callId: 'call-a',
        status: 'active',
        graphId: 'summarize-ticket',
        input: { ticketId: 'TCK-1007' },
      });
      expect(artifact).toBe('artifacts/summarize/output.json');
      expect(JSON.parse(fs.readFileSync(callableArtifactPath(root, 'call-a', 'summarize'), 'utf8'))).toEqual({
        summary: 'Checkout failure.',
      });
      expect(fs.readFileSync(callableTransitionLogPath(root, 'call-a'), 'utf8').trim()).toContain('"op":"start"');
      expect(listCallIds(root)).toEqual(['call-a']);
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'runs'))).toBe(false);
      expect(callableCheckpointPath(root, 'call-a')).toContain(path.join('.ripplegraph', 'calls', 'call-a', 'checkpoint.json'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects unsafe or duplicate call ids before writing call state', () => {
    const root = makeRoot();
    const checkpoint = {
      callId: 'call-a',
      status: 'active' as const,
      graphId: 'summarize-ticket',
      graphVersion: '0.1.0',
      packagePath: 'graphs/summarize-ticket',
      position: { graph: 'summarize-ticket', node: 'summarize' },
      input: {},
      outputs: {},
      createdAt: '2026-05-21T00:00:00.000Z',
      updatedAt: '2026-05-21T00:00:00.000Z',
    };
    try {
      expect(errorCode(() => createCallableCheckpoint(root, { ...checkpoint, callId: '../escape' }))).toBe(
        'E_BAD_PATH_SEGMENT',
      );

      createCallableCheckpoint(root, checkpoint);

      expect(errorCode(() => createCallableCheckpoint(root, checkpoint))).toBe('E_CALL_EXISTS');
      expect(readCallableCheckpoint(root, 'call-a').updatedAt).toBe('2026-05-21T00:00:00.000Z');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('callable start and state', () => {
  it('starts registered callable calls and restores input through state and list APIs', () => {
    const root = makeRoot();
    try {
      writeGraphPackage(root, 'graphs/summarize-ticket', callableManifest());

      const state = startCallableCall({
        workflowRoot: root,
        graphId: 'summarize-ticket',
        callId: 'call-start',
        input: { ticketId: 'TCK-1007' },
      });

      expect(state).toMatchObject({
        status: 'active',
        call: { id: 'call-start', status: 'active', graphId: 'summarize-ticket', graphVersion: '0.1.0' },
        position: { graph: 'summarize-ticket', node: 'summarize' },
        input: { ticketId: 'TCK-1007' },
        node: {
          id: 'summarize',
          purpose: 'Summarize a support ticket',
          instructions: 'Return a concise summary.',
          exec: 'inline',
        },
        context: { previous: [] },
        responseContract: { command: 'call-step', acceptedFormats: ['json'] },
        nextAllowedCommand: 'ripplegraph call-step --call-id call-start --output <json>',
        helpCommand: 'ripplegraph explain --call-id call-start',
      });
      expect(getCallableCall({ workflowRoot: root, callId: 'call-start' })).toMatchObject({
        status: 'active',
        input: { ticketId: 'TCK-1007' },
      });
      expect(listCallableCalls({ workflowRoot: root })).toMatchObject({
        status: 'ok',
        calls: [{ id: 'call-start', status: 'active', graphId: 'summarize-ticket' }],
      });
      expect(readCurrent(root)).toEqual({ focusedRunId: null });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects invalid start inputs and non-callable targets without creating checkpoints', () => {
    const root = makeRoot();
    try {
      writeGraphPackage(root, 'graphs/summarize-ticket', callableManifest());
      writeGraphPackage(root, 'graphs/workflow-ticket', {
        ...callableManifest({ id: 'workflow-ticket', kind: 'workflow' }),
      });
      writeGraphPackage(root, 'graphs/gated-ticket', {
        ...callableManifest({
          id: 'gated-ticket',
          nodes: {
            summarize: {
              purpose: 'Summarize a support ticket',
              exec: 'inline',
              gate: {
                type: 'external_decision',
                decisionSchema: { type: 'object' },
              },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Done', terminal: true },
          },
        }),
      });

      const invalid = startCallableCall({
        workflowRoot: root,
        graphId: 'summarize-ticket',
        callId: 'bad-input',
        input: { extra: true },
      });

      expect(invalid).toMatchObject({
        status: 'validation_error',
        call: { id: 'bad-input', graphId: 'summarize-ticket' },
        errors: [
          { path: 'ticketId', message: 'required' },
          { path: 'extra', message: 'unexpected property' },
        ],
      });
      expect(listCallIds(root)).toEqual([]);
      expect(errorCode(() => startCallableCall({ workflowRoot: root, graphId: 'missing', callId: 'missing-call' }))).toBe(
        'E_UNKNOWN_GRAPH',
      );
      expect(
        errorCode(() => startCallableCall({ workflowRoot: root, graphId: 'workflow-ticket', callId: 'workflow-call' })),
      ).toBe('E_WRONG_GRAPH_KIND');
      expect(errorCode(() => startCallableCall({ workflowRoot: root, graphId: 'gated-ticket', callId: 'gated-call' }))).toBe(
        'E_CALLABLE_GATE_UNSUPPORTED',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
