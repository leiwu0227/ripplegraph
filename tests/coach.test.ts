import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
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
  registerGraphPackage,
  resumeRun,
  startRegisteredWorkflowRun,
  startRun,
  stepRun,
  suspendRun,
  writeCheckpoint,
  writeCurrent,
  writeNodeOutput,
} from '../src/index.js';
import {
  makeCoachWorkflowRoot,
  makeGatedWorkflowRoot,
  makeGraphMetadataWorkflowRoot,
  makeHiddenStorageWorkflowRoot,
  makeInvalidEntryGraphWorkflowRoot,
  makeInvalidGraphMetadataWorkflowRoot,
  makeDemoWorkflowRoot,
  makeStorageWorkflowRoot,
} from './helpers/workflows.js';

function workflowPackageManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'package-flow',
    version: '0.1.0',
    kind: 'workflow',
    entry: 'review',
    nodes: {
      review: {
        purpose: 'Review package workflow v1',
        exec: 'inline',
        outputSchema: {
          type: 'object',
          required: ['decision'],
          properties: { decision: { type: 'string', enum: ['stop'] } },
        },
        edges: [{ to: 'done', when: { decision: 'stop' } }],
      },
      done: { purpose: 'Package workflow complete', terminal: true },
    },
    ...overrides,
  };
}

function makePackageWorkflowRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-package-workflow-'));
  fs.writeFileSync(
    path.join(root, 'workflow.json'),
    JSON.stringify({
      id: 'package-workspace',
      version: '0.1.0',
      graphs: {},
    }),
    'utf8',
  );
  return root;
}

function writeGraphPackage(root: string, folder: string, manifest: Record<string, unknown>, force = false): string {
  const packageRoot = path.join(root, folder);
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify(manifest), 'utf8');
  registerGraphPackage({ workflowRoot: root, packageRoot, force, now: '2026-05-23T00:00:00.000Z' });
  return packageRoot;
}

describe('coach runtime storage', () => {
  it('loads workflow definitions from the hidden runtime directory', () => {
    const root = makeHiddenStorageWorkflowRoot();
    try {
      expect(loadWorkflow(root).id).toBe('demo');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('loads graph package metadata while preserving legacy graph defaults', () => {
    const root = makeGraphMetadataWorkflowRoot();
    try {
      const workflow = loadWorkflow(root);
      expect(workflow).toMatchObject({
        entryGraph: 'dispatcher',
        title: 'Metadata Demo',
        description: 'Workflow package with graph metadata.',
      });
      expect(workflow.graphs.dispatcher).toMatchObject({
        kind: 'dispatcher',
        title: 'Workspace Dispatcher',
        description: 'Selects the right workflow.',
        activationHints: ['route user requests'],
        inputSchema: { required: ['request'] },
        outputSchema: { required: ['action'] },
        effects: ['read_workspace'],
      });
      expect(workflow.graphs.legacy).toMatchObject({
        kind: 'workflow',
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }

    const invalidRoot = makeInvalidGraphMetadataWorkflowRoot();
    try {
      expect(() => loadWorkflow(invalidRoot)).toThrow();
    } finally {
      fs.rmSync(invalidRoot, { recursive: true, force: true });
    }

    const invalidEntryRoot = makeInvalidEntryGraphWorkflowRoot();
    try {
      expect(() => loadWorkflow(invalidEntryRoot)).toThrow(/entryGraph must reference a dispatcher graph/);
    } finally {
      fs.rmSync(invalidEntryRoot, { recursive: true, force: true });
    }
  });

  it('accepts per-node effects declarations and rejects deprecated exec modes', () => {
    const validRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rg-node-effects-valid-'));
    fs.writeFileSync(
      path.join(validRoot, 'workflow.json'),
      JSON.stringify({
        id: 'node-effects',
        version: '0.0.1',
        graphs: {
          main: {
            kind: 'workflow',
            entry: 'a',
            effects: ['read_repo'],
            nodes: {
              a: { purpose: 'first', effects: ['read_repo', 'write_repo'], edges: [{ to: 'b' }] },
              b: { purpose: 'last', terminal: true },
            },
          },
        },
      }),
      'utf8',
    );
    try {
      expect(loadWorkflow(validRoot).graphs.main!.nodes.a!.effects).toEqual(['read_repo', 'write_repo']);
    } finally {
      fs.rmSync(validRoot, { recursive: true, force: true });
    }

    const invalidRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rg-exec-spawn-'));
    fs.writeFileSync(
      path.join(invalidRoot, 'workflow.json'),
      JSON.stringify({
        id: 'spawn-rejected',
        version: '0.0.1',
        graphs: {
          main: {
            kind: 'workflow',
            entry: 'a',
            nodes: { a: { purpose: 'first', exec: 'spawn', terminal: true } },
          },
        },
      }),
      'utf8',
    );
    try {
      expect(() => loadWorkflow(invalidRoot)).toThrow(/exec/i);
    } finally {
      fs.rmSync(invalidRoot, { recursive: true, force: true });
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

  it('persists optional package source metadata on workflow checkpoints', () => {
    const root = makeStorageWorkflowRoot();
    try {
      ensureWorkflowRoot(root);
      writeCheckpoint(root, {
        runId: 'package-run',
        status: 'active',
        rootGraph: 'package-flow',
        workflow: { id: 'demo', version: '0.1.0' },
        position: { graph: 'package-flow', node: 'review' },
        createdAt: '2026-05-23T00:00:00.000Z',
        updatedAt: '2026-05-23T00:00:00.000Z',
        outputs: {},
        graphSource: {
          kind: 'package',
          graphId: 'package-flow',
          graphVersion: '0.1.0',
          packagePath: '.ripplegraph/graphs/package-flow',
        },
      } as Parameters<typeof writeCheckpoint>[1]);

      expect(readCheckpoint(root, 'package-run').graphSource).toEqual({
        kind: 'package',
        graphId: 'package-flow',
        graphVersion: '0.1.0',
        packagePath: '.ripplegraph/graphs/package-flow',
      });
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
      expect(state.orientation).toBe('You are at review/approval: Request external approval.');
      expect(state.nextAllowedCommand).toContain('ripplegraph advance');
      expect(state.helpCommand).toBe('ripplegraph explain');
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

  it('exposes dispatcher-ready guidance when no run is focused', () => {
    const root = makeGraphMetadataWorkflowRoot();
    try {
      const state = getState({ workflowRoot: root });
      expect(state.status).toBe('no_focused_run');
      if (state.status === 'no_focused_run') {
        expect(state.dispatcher).toEqual({ graph: 'dispatcher', available: true });
        expect(state.orientation).toBe('No run is focused. Submit user intent to the dispatcher.');
        expect(state.nextAllowedCommand).toBe('ripplegraph dispatch --request "<user request>"');
        expect(state.helpCommand).toBe('ripplegraph explain');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('denies effectful workflow starts before creating runtime state', () => {
    const root = makeGraphMetadataWorkflowRoot();
    try {
      let code: string | undefined;
      try {
        startRun({ workflowRoot: root, graph: 'dispatcher', runId: 'dispatch-a' });
      } catch (error) {
        code = (error as { code?: string }).code;
      }
      expect(code).toBe('E_EFFECT_NOT_ALLOWED');
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'current.json'))).toBe(false);
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'runs'))).toBe(false);

      const allowed = startRun({
        workflowRoot: root,
        graph: 'dispatcher',
        runId: 'dispatch-a',
        effectPolicy: { allowedEffects: ['read_workspace'] },
      });
      expect(allowed.run.id).toBe('dispatch-a');
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

  it('starts and completes a registered workflow package as a pinned run', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/package-flow-v1', workflowPackageManifest());

      const state = startRegisteredWorkflowRun({ workflowRoot: root, graphId: 'package-flow', runId: 'package-a' });

      expect(state).toMatchObject({
        status: 'ok',
        run: { id: 'package-a', rootGraph: 'package-flow', status: 'active' },
        position: { graph: 'package-flow', node: 'review' },
        node: { purpose: 'Review package workflow v1' },
      });
      expect(readCheckpoint(root, 'package-a').graphSource).toEqual({
        kind: 'package',
        graphId: 'package-flow',
        graphVersion: '0.1.0',
        packagePath: 'graphs/package-flow-v1',
      });

      expect(stepRun({ workflowRoot: root, output: { decision: 'stop' } })).toMatchObject({
        status: 'completed',
        position: { graph: 'package-flow', node: 'done' },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('continues package-backed workflow runs against the pinned package after registry replacement', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/package-flow-v1', workflowPackageManifest());
      startRegisteredWorkflowRun({ workflowRoot: root, graphId: 'package-flow', runId: 'package-a' });
      suspendRun({ workflowRoot: root });

      writeGraphPackage(
        root,
        'graphs/package-flow-v2',
        workflowPackageManifest({
          version: '0.2.0',
          nodes: {
            review: {
              purpose: 'Review package workflow v2',
              exec: 'inline',
              outputSchema: {
                type: 'object',
                required: ['decision'],
                properties: { decision: { type: 'string', enum: ['go'] } },
              },
              edges: [{ to: 'done', when: { decision: 'go' } }],
            },
            done: { purpose: 'Package workflow complete v2', terminal: true },
          },
        }),
        true,
      );

      const resumed = resumeRun({ workflowRoot: root, runId: 'package-a' });
      expect(resumed).toMatchObject({
        status: 'ok',
        node: { purpose: 'Review package workflow v1' },
      });
      expect(stepRun({ workflowRoot: root, output: { decision: 'stop' } })).toMatchObject({
        status: 'completed',
        position: { graph: 'package-flow', node: 'done' },
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

  it('exposes previous outputs and conditional routes as neighborhood context', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graph: 'daily', runId: 'daily-a' });
      const state = stepRun({ workflowRoot: root, output: { decision: 'proceed' } });
      expect(state.status).toBe('ok');
      if (state.status === 'ok') {
        expect(state.context.previous).toEqual([
          { id: 'review', purpose: 'Completed node', output: { decision: 'proceed' } },
        ]);
        expect(state.context.next).toEqual([{ id: 'done', purpose: 'Complete', when: undefined }]);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('includes gate decisions in recent context after gated routing', () => {
    const root = makeDemoWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graph: 'change-intake', runId: 'change-a', effectPolicy: { allowedEffects: ['read_repo'] } });
      stepRun({ workflowRoot: root, output: { changeType: 'refactor', risk: 'medium', rationale: 'duplicated helpers' } });
      const state = decideGate({ workflowRoot: root, decision: { decision: 'approved-refactor', reason: 'routing is right' } });
      expect(state.status).toBe('ok');
      if (state.status === 'ok') {
        expect(state.context.previous).toEqual([
          {
            id: 'classify-change',
            purpose: 'Completed node',
            output: { changeType: 'refactor', risk: 'medium', rationale: 'duplicated helpers' },
          },
          {
            id: 'review-routing',
            purpose: 'Completed node',
            output: { decision: 'approved-refactor', reason: 'routing is right' },
          },
        ]);
      }
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
