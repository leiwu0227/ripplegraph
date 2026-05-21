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
  stepCallableCall,
  writeCallableOutput,
} from '../src/index.js';

function makeRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-callable-'));
}

function writeGraphPackage(root: string, folder: string, manifest: Record<string, unknown>, force = false): string {
  const packageRoot = path.join(root, folder);
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify(manifest), 'utf8');
  registerGraphPackage({ workflowRoot: root, packageRoot, force, now: '2026-05-21T00:00:00.000Z' });
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

  it('denies effectful callable starts before validating input or creating call state', () => {
    const root = makeRoot();
    try {
      writeGraphPackage(root, 'graphs/summarize-ticket', callableManifest({ effects: ['read_workspace'] }));

      expect(errorCode(() => startCallableCall({ workflowRoot: root, graphId: 'summarize-ticket', callId: 'call-denied' }))).toBe(
        'E_EFFECT_NOT_ALLOWED',
      );
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'calls'))).toBe(false);

      const allowed = startCallableCall({
        workflowRoot: root,
        graphId: 'summarize-ticket',
        callId: 'call-allowed',
        input: { ticketId: 'TCK-1007' },
        effectPolicy: { allowedEffects: ['read_workspace'] },
      });
      expect(allowed).toMatchObject({ status: 'active', call: { id: 'call-allowed' } });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('continues active calls against the checkpointed package after registry replacement', () => {
    const root = makeRoot();
    try {
      writeGraphPackage(root, 'graphs/summarize-ticket-v1', callableManifest());
      startCallableCall({
        workflowRoot: root,
        graphId: 'summarize-ticket',
        callId: 'call-pinned-package',
        input: { ticketId: 'TCK-1007' },
      });
      writeGraphPackage(
        root,
        'graphs/summarize-ticket-v2',
        callableManifest({
          version: '0.2.0',
          outputSchema: {
            type: 'object',
            required: ['title'],
            properties: { title: { type: 'string' } },
          },
          nodes: {
            summarize: {
              purpose: 'Changed summarizer',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['title'],
                properties: { title: { type: 'string' } },
              },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Done', terminal: true },
          },
        }),
        true,
      );

      expect(getCallableCall({ workflowRoot: root, callId: 'call-pinned-package' })).toMatchObject({
        status: 'active',
        call: { graphVersion: '0.1.0' },
        node: { purpose: 'Summarize a support ticket' },
      });
      expect(
        stepCallableCall({
          workflowRoot: root,
          callId: 'call-pinned-package',
          output: { summary: 'Checkout failure.' },
        }),
      ).toMatchObject({
        status: 'completed',
        output: { summary: 'Checkout failure.' },
      });
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

describe('callable step and completion', () => {
  it('steps callable nodes, persists artifacts, and completes with final output', () => {
    const root = makeRoot();
    try {
      writeGraphPackage(root, 'graphs/summarize-ticket', callableManifest());
      startCallableCall({
        workflowRoot: root,
        graphId: 'summarize-ticket',
        callId: 'call-complete',
        input: { ticketId: 'TCK-1007' },
      });

      const completed = stepCallableCall({
        workflowRoot: root,
        callId: 'call-complete',
        output: { summary: 'Checkout failure.' },
      });

      expect(completed).toMatchObject({
        status: 'completed',
        call: { id: 'call-complete', status: 'completed', graphId: 'summarize-ticket', graphVersion: '0.1.0' },
        position: { graph: 'summarize-ticket', node: 'done' },
        input: { ticketId: 'TCK-1007' },
        output: { summary: 'Checkout failure.' },
        outputArtifact: 'artifacts/summarize/output.json',
      });
      expect(readCallableCheckpoint(root, 'call-complete')).toMatchObject({
        status: 'completed',
        finalOutput: { summary: 'Checkout failure.' },
        outputArtifact: 'artifacts/summarize/output.json',
      });
      expect(JSON.parse(fs.readFileSync(callableArtifactPath(root, 'call-complete', 'summarize'), 'utf8'))).toEqual({
        summary: 'Checkout failure.',
      });
      expect(fs.readFileSync(callableTransitionLogPath(root, 'call-complete'), 'utf8')).toContain('"op":"complete"');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps active position on validation errors and rejects no-edge or completed steps', () => {
    const root = makeRoot();
    try {
      writeGraphPackage(root, 'graphs/summarize-ticket', callableManifest());
      writeGraphPackage(root, 'graphs/no-edge-ticket', {
        ...callableManifest({
          id: 'no-edge-ticket',
          nodes: {
            summarize: {
              purpose: 'Summarize a support ticket',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['summary'],
                properties: { summary: { type: 'string' } },
              },
              edges: [{ to: 'done', when: { route: 'done' } }],
            },
            done: { purpose: 'Done', terminal: true },
          },
        }),
      });
      startCallableCall({
        workflowRoot: root,
        graphId: 'summarize-ticket',
        callId: 'call-invalid-step',
        input: { ticketId: 'TCK-1007' },
      });
      const invalid = stepCallableCall({
        workflowRoot: root,
        callId: 'call-invalid-step',
        output: { summary: 7 },
      });

      expect(invalid).toMatchObject({
        status: 'validation_error',
        call: { id: 'call-invalid-step', status: 'active', graphId: 'summarize-ticket' },
        position: { graph: 'summarize-ticket', node: 'summarize' },
        errors: [{ path: 'summary', message: 'expected string' }],
      });
      expect(readCallableCheckpoint(root, 'call-invalid-step').position).toEqual({
        graph: 'summarize-ticket',
        node: 'summarize',
      });

      startCallableCall({
        workflowRoot: root,
        graphId: 'no-edge-ticket',
        callId: 'call-no-edge',
        input: { ticketId: 'TCK-1007' },
      });
      expect(
        errorCode(() =>
          stepCallableCall({
            workflowRoot: root,
            callId: 'call-no-edge',
            output: { summary: 'Checkout failure.' },
          }),
        ),
      ).toBe('E_NO_EDGE');

      stepCallableCall({
        workflowRoot: root,
        callId: 'call-invalid-step',
        output: { summary: 'Checkout failure.' },
      });
      expect(
        errorCode(() =>
          stepCallableCall({
            workflowRoot: root,
            callId: 'call-invalid-step',
            output: { summary: 'Again.' },
          }),
        ),
      ).toBe('E_CALL_NOT_ACTIVE');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
