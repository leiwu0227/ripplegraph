import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  checkpointPath,
  ensureWorkflowRoot,
  readCheckpoint,
  readCurrent,
  writeCheckpoint,
  writeCurrent,
  type Checkpoint,
} from '../src/index.js';
import { errorCode, makeRoot } from './helpers/setup.js';

function checkpoint(runId: string): Checkpoint {
  return {
    runId,
    status: 'active',
    rootGraph: 'daily',
    workflow: { id: 'demo', version: '0.1.0' },
    position: { graph: 'daily', node: 'review' },
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    outputs: { review: { decision: 'proceed' } },
    gateDecisions: {},
    stack: [],
    frameCounter: 0,
  };
}

describe('storage persistence', () => {
  it('round-trips checkpoints and the focused-run pointer through disk', () => {
    const root = makeRoot('ripplegraph-storage-');
    try {
      ensureWorkflowRoot(root);
      expect(readCurrent(root)).toEqual({ focusedRunId: null });

      const written = checkpoint('daily-a');
      writeCheckpoint(root, written);
      writeCurrent(root, { focusedRunId: 'daily-a' });

      expect(readCheckpoint(root, 'daily-a')).toEqual(written);
      expect(readCurrent(root)).toEqual({ focusedRunId: 'daily-a' });
      expect(fs.readdirSync(root, { recursive: true }).some((entry) => String(entry).includes('.tmp.'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects corrupt checkpoint JSON with E_BAD_JSON', () => {
    const root = makeRoot('ripplegraph-storage-corrupt-');
    try {
      ensureWorkflowRoot(root);
      writeCheckpoint(root, checkpoint('daily-a'));
      fs.writeFileSync(checkpointPath(root, 'daily-a'), '{ not json', 'utf8');
      expect(errorCode(() => readCheckpoint(root, 'daily-a'))).toBe('E_BAD_JSON');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
