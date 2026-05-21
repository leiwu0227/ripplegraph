import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendCallableTransition,
  callableArtifactPath,
  callableCheckpointPath,
  callableTransitionLogPath,
  createCallableCheckpoint,
  listCallIds,
  readCallableCheckpoint,
  writeCallableOutput,
} from '../src/index.js';

function makeRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-callable-'));
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
