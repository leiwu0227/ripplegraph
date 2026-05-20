import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  appendTransition,
  ensureWorkflowRoot,
  getState,
  loadWorkflow,
  decideGate,
  readCheckpoint,
  readCurrent,
  listRuns,
  resumeRun,
  startRun,
  stepRun,
  suspendRun,
  writeCheckpoint,
  writeCurrent,
  writeNodeOutput,
} from '../src/index.js';
import { makeCoachWorkflowRoot, makeGatedWorkflowRoot, makeHiddenStorageWorkflowRoot, makeStorageWorkflowRoot } from './helpers/workflows.js';

describe('coach runtime storage', () => {
  it('loads workflow definitions from the hidden runtime directory', () => {
    const root = makeHiddenStorageWorkflowRoot();
    try {
      expect(loadWorkflow(root).id).toBe('demo');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('loads a multi-graph workflow and persists the focused run files', () => {
    const root = makeStorageWorkflowRoot();
    try {
      const workflow = loadWorkflow(root);
      expect(Object.keys(workflow.graphs)).toEqual(['daily']);

      ensureWorkflowRoot(root);
      writeCurrent(root, { focusedRunId: 'run-a' });
      writeCheckpoint(root, {
        runId: 'run-a',
        status: 'active',
        rootGraph: 'daily',
        workflow: { id: 'demo', version: '0.1.0' },
        position: { graph: 'daily', node: 'review' },
        createdAt: '2026-05-15T00:00:00.000Z',
        updatedAt: '2026-05-15T00:00:00.000Z',
        outputs: {},
      });
      writeNodeOutput(root, 'run-a', 'review', { decision: 'proceed' });
      appendTransition(root, 'run-a', {
        ts: '2026-05-15T00:00:00.000Z',
        op: 'start',
        runId: 'run-a',
        from: null,
        to: { graph: 'daily', node: 'review' },
        actor: 'agent',
        input: null,
        output: null,
        validation: { ok: true },
        gateDecision: null,
        reason: null,
        error: null,
      });

      expect(readCurrent(root)).toEqual({ focusedRunId: 'run-a' });
      expect(readCheckpoint(root, 'run-a').position).toEqual({ graph: 'daily', node: 'review' });
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, '.ripplegraph', 'runs', 'run-a', 'artifacts', 'review', 'output.json'), 'utf8'),
        ),
      ).toEqual({ decision: 'proceed' });
      expect(fs.readFileSync(path.join(root, '.ripplegraph', 'runs', 'run-a', 'transition-log.jsonl'), 'utf8').trim()).toContain(
        '"op":"start"',
      );
      expect(fs.existsSync(path.join(root, 'runs'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('coach operations', () => {
  it('exposes gated nodes as external decision contracts', () => {
    const root = makeGatedWorkflowRoot();
    try {
      const state = startRun({ workflowRoot: root, graph: 'review', runId: 'approval-a' });
      expect(state.node.gate).toMatchObject({
        type: 'external_decision',
        decisionSchema: {
          required: ['decision'],
          properties: {
            decision: { enum: ['approved', 'rejected'] },
          },
        },
      });
      expect(state.responseContract).toMatchObject({
        command: 'decide',
        acceptedFormats: ['json'],
        schema: {
          required: ['decision'],
        },
      });
      expect(readCheckpoint(root, 'approval-a').gateDecisions).toEqual({});
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('starts, suspends, and resumes exactly one focused run', () => {
    const root = makeCoachWorkflowRoot();
    try {
      expect(getState({ workflowRoot: root }).status).toBe('no_focused_run');

      const started = startRun({ workflowRoot: root, graph: 'daily', runId: 'daily-a' });
      expect(started.run.id).toBe('daily-a');
      expect(() => startRun({ workflowRoot: root, graph: 'mockcopy', runId: 'mock-a' })).toThrow(
        /focused run/,
      );

      const suspended = suspendRun({ workflowRoot: root, note: 'daily execution preempted' });
      expect(suspended.run.status).toBe('suspended');
      expect(readCurrent(root)).toEqual({ focusedRunId: null });

      startRun({ workflowRoot: root, graph: 'mockcopy', runId: 'mock-a' });
      suspendRun({ workflowRoot: root });
      const resumed = resumeRun({ workflowRoot: root, runId: 'daily-a' });
      expect(resumed.position).toEqual({ graph: 'daily', node: 'review' });
      expect(readCheckpoint(root, 'daily-a').status).toBe('active');
      expect(listRuns({ workflowRoot: root })).toMatchObject({
        focusedRunId: 'daily-a',
        runs: [
          {
            id: 'daily-a',
            status: 'active',
            rootGraph: 'daily',
            position: { graph: 'daily', node: 'review' },
          },
          {
            id: 'mock-a',
            status: 'suspended',
            rootGraph: 'mockcopy',
            position: { graph: 'mockcopy', node: 'plan' },
          },
        ],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('decides a gated node, stores the external decision, and logs a decide transition', () => {
    const root = makeGatedWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graph: 'review', runId: 'approval-a' });
      const response = decideGate({ workflowRoot: root, decision: { decision: 'approved', reason: 'classification is correct' } });
      expect(response.status).toBe('completed');
      expect(response.position).toEqual({ graph: 'review', node: 'done' });
      const checkpoint = readCheckpoint(root, 'approval-a');
      expect(checkpoint.gateDecisions).toEqual({
        approval: { decision: 'approved', reason: 'classification is correct' },
      });
      const logEntries = fs
        .readFileSync(path.join(root, '.ripplegraph', 'runs', 'approval-a', 'transition-log.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { op: string; gateDecision?: unknown });
      expect(logEntries.map((entry) => entry.op)).toEqual(['start', 'decide']);
      expect(logEntries[1]?.gateDecision).toEqual({ decision: 'approved', reason: 'classification is correct' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('blocks normal step on gated nodes and validates gate decisions', () => {
    const root = makeGatedWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graph: 'review', runId: 'approval-a' });
      expect(() => stepRun({ workflowRoot: root, output: { decision: 'approved' } })).toThrow(/external decision/);
      const invalid = decideGate({ workflowRoot: root, decision: { decision: 'maybe' } });
      expect(invalid.status).toBe('validation_error');
      if (invalid.status === 'validation_error') {
        expect(invalid.errors).toEqual([{ path: 'decision', message: 'expected one of approved, rejected' }]);
      }
      expect(readCheckpoint(root, 'approval-a').position).toEqual({ graph: 'review', node: 'approval' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }

    const normalRoot = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: normalRoot, graph: 'daily', runId: 'daily-a' });
      expect(() => decideGate({ workflowRoot: normalRoot, decision: { decision: 'approved' } })).toThrow(/not gated/);
    } finally {
      fs.rmSync(normalRoot, { recursive: true, force: true });
    }
  });

  it('steps through a branch and completes at a terminal node', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graph: 'daily', runId: 'daily-a' });
      const next = stepRun({ workflowRoot: root, output: { decision: 'stop' } });
      expect(next.status).toBe('completed');
      expect(readCheckpoint(root, 'daily-a').position).toEqual({ graph: 'daily', node: 'done' });
      expect(readCheckpoint(root, 'daily-a').status).toBe('completed');
      expect(readCurrent(root)).toEqual({ focusedRunId: null });
      const logEntries = fs
        .readFileSync(path.join(root, '.ripplegraph', 'runs', 'daily-a', 'transition-log.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { op: string; input?: { artifact?: string } });
      expect(logEntries.map((entry) => entry.op)).toEqual(['start', 'step']);
      expect(logEntries[1]?.input?.artifact).toBe('artifacts/review/output.json');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects invalid output without advancing the checkpoint', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graph: 'daily', runId: 'daily-a' });
      const response = stepRun({ workflowRoot: root, output: { decision: 'maybe' } });
      expect(response.status).toBe('validation_error');
      if (response.status === 'validation_error') {
        expect(response.errors).toEqual([{ path: 'decision', message: 'expected one of proceed, stop' }]);
      }
      expect(readCheckpoint(root, 'daily-a').position).toEqual({ graph: 'daily', node: 'review' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
