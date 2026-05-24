import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendTransition,
  ensureWorkflowRoot,
  getState,
  loadGraphPackage,
  loadWorkflow,
  decideGate,
  readCheckpoint,
  readCurrent,
  listRegisteredGraphs,
  listRuns,
  recordSideChannelAction,
  registerGraphPackage,
  reconcileExternalState,
  resumeRun,
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
  makeDemoWorkflowRoot,
  makeStorageWorkflowRoot,
} from './helpers/workflows.js';
import { createTestWorkspace } from './helpers/workspace.js';

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
  return createTestWorkspace({
    prefix: 'ripplegraph-package-workflow-',
    workspace: { id: 'package-workspace' },
    graphs: [],
  });
}

function writeGraphPackage(root: string, folder: string, manifest: Record<string, unknown>, force = false): string {
  const packageRoot = path.join(root, folder);
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify(manifest), 'utf8');
  registerGraphPackage({ workflowRoot: root, packageRoot, force, now: '2026-05-23T00:00:00.000Z' });
  return packageRoot;
}

describe('coach runtime storage', () => {
  it('loads workspace manifests from the hidden runtime directory', () => {
    const root = makeHiddenStorageWorkflowRoot();
    try {
      expect(loadWorkflow(root).id).toBe('demo');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('exposes registered graph metadata through the registry', () => {
    const root = makeGraphMetadataWorkflowRoot();
    try {
      const workflow = loadWorkflow(root);
      expect(workflow).toMatchObject({
        id: 'metadata-demo',
        entryGraph: 'dispatcher',
        title: 'Metadata Demo',
        description: 'Workflow package with graph metadata.',
      });
      const registered = listRegisteredGraphs(root);
      const dispatcher = registered.find((entry) => entry.id === 'dispatcher');
      expect(dispatcher).toMatchObject({
        id: 'dispatcher',
        kind: 'dispatcher',
        title: 'Workspace Dispatcher',
        description: 'Selects the right workflow.',
        activationHints: ['route user requests'],
        effects: ['read_workspace'],
      });
      expect(registered.find((entry) => entry.id === 'legacy')?.kind).toBe('workflow');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('lists registered graph ids and persists focused run files under .ripplegraph', () => {
    const root = makeStorageWorkflowRoot();
    try {
      expect(listRegisteredGraphs(root).map((entry) => entry.id)).toEqual(['daily']);

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
        graphSource: {
          kind: 'package',
          graphId: 'daily',
          graphVersion: '0.1.0',
          packagePath: '.ripplegraph/graphs/daily',
        },
      } as Parameters<typeof writeCheckpoint>[1]);
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

  it('persists graph source metadata on workflow checkpoints', () => {
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

  it('rejects graph packages where workflowRef and gate are both defined', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-workflow-ref-invalid-'));
    try {
      const pkgRoot = path.join(root, '.ripplegraph', 'graphs', 'parent');
      fs.mkdirSync(pkgRoot, { recursive: true });
      fs.writeFileSync(
        path.join(pkgRoot, 'graph.json'),
        JSON.stringify({
          id: 'parent',
          version: '0.1.0',
          kind: 'workflow',
          entry: 'review',
          nodes: {
            review: {
              purpose: 'Invalid ref gate',
              workflowRef: { graphId: 'child-flow' },
              gate: { type: 'external_decision', decisionSchema: { type: 'object' } },
            },
          },
        }),
        'utf8',
      );
      expect(() => loadGraphPackage(pkgRoot)).toThrow(/workflowRef.*gate/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('persists workflow-ref stack frames and scoped node artifacts', () => {
    const root = makeStorageWorkflowRoot();
    try {
      ensureWorkflowRoot(root);
      writeCheckpoint(root, {
        runId: 'stacked-run',
        status: 'active',
        rootGraph: 'parent',
        workflow: { id: 'demo', version: '0.1.0' },
        position: { graph: 'child-flow', node: 'review' },
        createdAt: '2026-05-23T00:00:00.000Z',
        updatedAt: '2026-05-23T00:00:00.000Z',
        outputs: {},
        gateDecisions: {},
        stack: [
          {
            parent: {
              graph: 'parent',
              node: 'review',
              scope: '',
            },
            child: {
              kind: 'package',
              graphId: 'child-flow',
              graphVersion: '0.1.0',
              packagePath: '.ripplegraph/graphs/child-flow',
            },
            scope: 'f1',
            enteredAt: '2026-05-23T00:00:00.000Z',
          },
        ],
      });

      const artifact = writeNodeOutput(root, 'stacked-run', 'review', { decision: 'ok' }, 'f1');
      expect(artifact).toBe('artifacts/f1/review/output.json');
      expect(JSON.parse(fs.readFileSync(path.join(root, '.ripplegraph', 'runs', 'stacked-run', artifact), 'utf8'))).toEqual({
        decision: 'ok',
      });
      expect(readCheckpoint(root, 'stacked-run').stack).toHaveLength(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('coach operations', () => {
  it('exposes gated nodes as external decision contracts', () => {
    const root = makeGatedWorkflowRoot();
    try {
      const state = startRun({ workflowRoot: root, graphId: 'review', runId: 'approval-a' });
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

  it('exposes gate decision source metadata in gated state contracts', () => {
    const root = createTestWorkspace({
      prefix: 'ripplegraph-gate-source-',
      workspace: { id: 'gate-source-demo' },
      graphs: [
        {
          id: 'review',
          entry: 'approval',
          nodes: {
            approval: {
              purpose: 'Request reviewloop approval',
              gate: {
                type: 'external_decision',
                decisionSource: { kind: 'tool', tool: 'reviewloop', label: 'Implementation review' },
                decisionSchema: {
                  type: 'object',
                  required: ['decision'],
                  properties: { decision: { type: 'string', enum: ['approved', 'rejected'] } },
                },
              },
              edges: [{ to: 'done', when: { decision: 'approved' } }],
            },
            done: { purpose: 'Done', terminal: true },
          },
        },
      ],
    });
    try {
      const state = startRun({ workflowRoot: root, graphId: 'review', runId: 'approval-source-a' });
      expect(state.node.gate?.decisionSource).toEqual({
        kind: 'tool',
        tool: 'reviewloop',
        label: 'Implementation review',
      });
      expect(state.responseContract).toMatchObject({
        command: 'decide',
        decisionSource: { kind: 'tool', tool: 'reviewloop', label: 'Implementation review' },
      });

      const response = decideGate({ workflowRoot: root, decision: { decision: 'approved', reason: 'review passed' } });
      expect(response.status).toBe('completed');
      expect(response.position).toEqual({ graph: 'review', node: 'done' });
      const checkpoint = readCheckpoint(root, 'approval-source-a');
      expect(checkpoint.gateDecisions).toEqual({
        approval: { decision: 'approved', reason: 'review passed' },
      });
      expect(checkpoint.outputs).toEqual({
        approval: { decision: 'approved', reason: 'review passed' },
      });
      const logEntries = fs
        .readFileSync(path.join(root, '.ripplegraph', 'runs', 'approval-source-a', 'transition-log.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { op: string; gateDecision?: unknown });
      expect(logEntries.map((entry) => entry.op)).toEqual(['start', 'decide']);
      expect(logEntries[1]?.gateDecision).toEqual({ decision: 'approved', reason: 'review passed' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('exposes host contract metadata in active node state', () => {
    const root = createTestWorkspace({
      prefix: 'ripplegraph-host-contract-state-',
      workspace: { id: 'host-contract-demo' },
      graphs: [
        {
          id: 'review',
          entry: 'approval',
          nodes: {
            approval: {
              purpose: 'Request host-visible approval',
              interaction: {
                id: 'approval-form',
                kind: 'form',
                prompt: 'Enter the approval summary.',
                schema: { type: 'object', properties: { summary: { type: 'string' } } },
              },
              interrupt: { requiresUserTurn: true, reason: 'User must review approval summary.' },
              toolContract: { id: 'load-artifact', command: 'artifact-load', validator: 'artifact-validator' },
              validators: [{ id: 'artifact-validator', purpose: 'Validate artifact output.' }],
              sideChannelActions: [{ id: 'refresh-artifact', purpose: 'Refresh artifact without advancing.' }],
              gate: {
                type: 'external_decision',
                interaction: {
                  id: 'approval-choice',
                  kind: 'choice',
                  prompt: 'Approve this summary?',
                  choices: [{ label: 'Approve', value: 'approved' }],
                },
                decisionSchema: { type: 'object', properties: { decision: { type: 'string' } } },
              },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Done', terminal: true },
          },
        },
      ],
    });
    try {
      const state = startRun({ workflowRoot: root, graphId: 'review', runId: 'approval-contract-a' });
      expect(state.node).toMatchObject({
        interaction: { id: 'approval-form', kind: 'form', schema: { type: 'object' } },
        interrupt: { requiresUserTurn: true },
        toolContract: { id: 'load-artifact', command: 'artifact-load' },
        validators: [{ id: 'artifact-validator' }],
        sideChannelActions: [{ id: 'refresh-artifact' }],
        gate: { interaction: { id: 'approval-choice', choices: [{ value: 'approved' }] } },
      });
      expect(state.responseContract).toMatchObject({ command: 'decide' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects graph packages with tool decision sources missing a tool identifier', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-gate-source-invalid-'));
    try {
      const pkgRoot = path.join(root, '.ripplegraph', 'graphs', 'review');
      fs.mkdirSync(pkgRoot, { recursive: true });
      fs.writeFileSync(
        path.join(pkgRoot, 'graph.json'),
        JSON.stringify({
          id: 'review',
          version: '0.1.0',
          kind: 'workflow',
          entry: 'approval',
          nodes: {
            approval: {
              purpose: 'Invalid source',
              gate: {
                type: 'external_decision',
                decisionSource: { kind: 'tool' },
                decisionSchema: { type: 'object' },
              },
            },
          },
        }),
        'utf8',
      );
      expect(() => loadGraphPackage(pkgRoot)).toThrow(/decisionSource/);
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
    const root = createTestWorkspace({
      prefix: 'ripplegraph-effects-deny-',
      workspace: { id: 'effects-demo' },
      graphs: [
        {
          id: 'effectful',
          kind: 'workflow',
          effects: ['read_workspace'],
          entry: 'review',
          nodes: {
            review: { purpose: 'Review with effect', exec: 'inline', edges: [{ to: 'done' }] },
            done: { purpose: 'Done', terminal: true },
          },
        },
      ],
    });
    try {
      let code: string | undefined;
      try {
        startRun({ workflowRoot: root, graphId: 'effectful', runId: 'effect-a' });
      } catch (error) {
        code = (error as { code?: string }).code;
      }
      expect(code).toBe('E_EFFECT_NOT_ALLOWED');
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'current.json'))).toBe(false);
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'runs'))).toBe(false);

      const allowed = startRun({
        workflowRoot: root,
        graphId: 'effectful',
        runId: 'effect-a',
        effectPolicy: { allowedEffects: ['read_workspace'] },
      });
      expect(allowed.run.id).toBe('effect-a');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('starts, suspends, and resumes exactly one focused run', () => {
    const root = makeCoachWorkflowRoot();
    try {
      expect(getState({ workflowRoot: root }).status).toBe('no_focused_run');

      const started = startRun({ workflowRoot: root, graphId: 'daily', runId: 'daily-a' });
      expect(started.run.id).toBe('daily-a');
      expect(() => startRun({ workflowRoot: root, graphId: 'mockcopy', runId: 'mock-a' })).toThrow(
        /focused run/,
      );

      const suspended = suspendRun({ workflowRoot: root, note: 'daily execution preempted' });
      expect(suspended.run.status).toBe('suspended');
      expect(readCurrent(root)).toEqual({ focusedRunId: null });

      startRun({ workflowRoot: root, graphId: 'mockcopy', runId: 'mock-a' });
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

      const state = startRun({ workflowRoot: root, graphId: 'package-flow', runId: 'package-a' });

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
      startRun({ workflowRoot: root, graphId: 'package-flow', runId: 'package-a' });
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

  it('renders stacked run state from the active child graph and scope', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/package-flow-v1', workflowPackageManifest());
      writeGraphPackage(root, 'graphs/parent-flow', {
        id: 'parent-flow',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        nodes: {
          review: { purpose: 'Parent ref', workflowRef: { graphId: 'package-flow' }, edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });
      ensureWorkflowRoot(root);
      writeCheckpoint(root, {
        runId: 'stacked-a',
        status: 'active',
        rootGraph: 'parent-flow',
        workflow: { id: 'package-workspace', version: '0.1.0' },
        position: { graph: 'package-flow', node: 'review' },
        createdAt: '2026-05-23T00:00:00.000Z',
        updatedAt: '2026-05-23T00:00:00.000Z',
        outputs: {
          review: { parent: true },
          'f1/review': { child: true },
        },
        gateDecisions: {},
        stack: [
          {
            parent: { graph: 'parent-flow', node: 'review', scope: '' },
            child: {
              kind: 'package',
              graphId: 'package-flow',
              graphVersion: '0.1.0',
              packagePath: 'graphs/package-flow-v1',
            },
            scope: 'f1',
            enteredAt: '2026-05-23T00:00:00.000Z',
          },
        ],
        graphSource: {
          kind: 'package',
          graphId: 'parent-flow',
          graphVersion: '0.1.0',
          packagePath: 'graphs/parent-flow',
        },
      } as Parameters<typeof writeCheckpoint>[1]);
      writeCurrent(root, { focusedRunId: 'stacked-a' });

      const state = getState({ workflowRoot: root });
      expect(state).toMatchObject({
        status: 'ok',
        position: { graph: 'package-flow', node: 'review' },
        node: { purpose: 'Review package workflow v1' },
        stack: [{ parent: { graph: 'parent-flow', node: 'review', scope: '' }, child: { graphId: 'package-flow' }, scope: 'f1' }],
        context: { previous: [{ id: 'review', output: { child: true } }] },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('enters a registered workflow-ref child when starting the parent workflow package', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/child-flow', {
        id: 'child-flow',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'work',
        nodes: {
          work: {
            purpose: 'Run child work',
            outputSchema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['done'] } } },
            edges: [{ to: 'done', when: { decision: 'done' } }],
          },
          done: { purpose: 'Child done', terminal: true },
        },
      });
      writeGraphPackage(root, 'graphs/parent-flow', {
        id: 'parent-flow',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        nodes: {
          review: { purpose: 'Run child ref', workflowRef: { graphId: 'child-flow' }, edges: [{ to: 'done' }] },
          done: { purpose: 'Parent done', terminal: true },
        },
      });

      const state = startRun({ workflowRoot: root, graphId: 'parent-flow', runId: 'nested-a' });

      expect(state).toMatchObject({
        status: 'ok',
        run: { id: 'nested-a', rootGraph: 'parent-flow', status: 'active' },
        position: { graph: 'child-flow', node: 'work' },
        node: { purpose: 'Run child work' },
        stack: [
          {
            parent: { graph: 'parent-flow', node: 'review', scope: '' },
            child: { graphId: 'child-flow', graphVersion: '0.1.0', packagePath: 'graphs/child-flow' },
            scope: 'f1',
          },
        ],
      });
      expect(readCheckpoint(root, 'nested-a')).toMatchObject({
        rootGraph: 'parent-flow',
        graphSource: { graphId: 'parent-flow', graphVersion: '0.1.0', packagePath: 'graphs/parent-flow' },
        position: { graph: 'child-flow', node: 'work' },
        stack: [{ parent: { graphSource: { graphId: 'parent-flow' } }, child: { graphId: 'child-flow' }, scope: 'f1' }],
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('denies parent workflow-ref starts when a reachable child effect is not allowed', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/effect-child', {
        id: 'effect-child',
        version: '0.1.0',
        kind: 'workflow',
        effects: ['write_repo'],
        entry: 'work',
        nodes: {
          work: { purpose: 'Write repo', edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });
      writeGraphPackage(root, 'graphs/effect-parent', {
        id: 'effect-parent',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        nodes: {
          review: { purpose: 'Run effect child', workflowRef: { graphId: 'effect-child' }, edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });

      expect(() => startRun({ workflowRoot: root, graphId: 'effect-parent', runId: 'effect-a' })).toThrow(
        /write_repo/,
      );
      expect(readCurrent(root)).toEqual({ focusedRunId: null });
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'runs', 'effect-a'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('pops child workflow frames and keeps overlapping parent and child outputs scoped', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/collision-child', {
        id: 'collision-child',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        outputSchema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['done'] } } },
        nodes: {
          review: {
            purpose: 'Child review',
            outputSchema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['done'] } } },
            edges: [{ to: 'done', when: { decision: 'done' } }],
          },
          done: { purpose: 'Child done', terminal: true },
        },
      });
      writeGraphPackage(root, 'graphs/collision-parent', {
        id: 'collision-parent',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        nodes: {
          review: {
            purpose: 'Parent review',
            workflowRef: { graphId: 'collision-child' },
            edges: [{ to: 'done', when: { decision: 'done' } }],
          },
          done: { purpose: 'Parent done', terminal: true },
        },
      });
      startRun({ workflowRoot: root, graphId: 'collision-parent', runId: 'collision-a' });

      const completed = stepRun({ workflowRoot: root, output: { decision: 'done' } });

      expect(completed).toMatchObject({
        status: 'completed',
        run: { id: 'collision-a', rootGraph: 'collision-parent', status: 'completed' },
        position: { graph: 'collision-parent', node: 'done' },
      });
      expect(readCurrent(root)).toEqual({ focusedRunId: null });
      expect(readCheckpoint(root, 'collision-a')).toMatchObject({
        status: 'completed',
        position: { graph: 'collision-parent', node: 'done' },
        stack: [],
        outputs: {
          review: { decision: 'done' },
          'f1/review': { decision: 'done' },
        },
      });
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, '.ripplegraph', 'runs', 'collision-a', 'artifacts', 'review', 'output.json'), 'utf8'),
        ),
      ).toEqual({ decision: 'done' });
      expect(
        JSON.parse(
          fs.readFileSync(path.join(root, '.ripplegraph', 'runs', 'collision-a', 'artifacts', 'f1', 'review', 'output.json'), 'utf8'),
        ),
      ).toEqual({ decision: 'done' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('enters workflow-ref nodes when restored state is already positioned on the ref', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/recovery-child', {
        id: 'recovery-child',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'work',
        nodes: {
          work: { purpose: 'Recovered child work', edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });
      writeGraphPackage(root, 'graphs/recovery-parent', {
        id: 'recovery-parent',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        nodes: {
          review: { purpose: 'Recovered parent ref', workflowRef: { graphId: 'recovery-child' }, edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });
      ensureWorkflowRoot(root);
      writeCheckpoint(root, {
        runId: 'recovery-a',
        status: 'active',
        rootGraph: 'recovery-parent',
        workflow: { id: 'package-workspace', version: '0.1.0' },
        position: { graph: 'recovery-parent', node: 'review' },
        createdAt: '2026-05-23T00:00:00.000Z',
        updatedAt: '2026-05-23T00:00:00.000Z',
        outputs: {},
        gateDecisions: {},
        stack: [],
        graphSource: {
          kind: 'package',
          graphId: 'recovery-parent',
          graphVersion: '0.1.0',
          packagePath: 'graphs/recovery-parent',
        },
      });
      writeCurrent(root, { focusedRunId: 'recovery-a' });

      const state = getState({ workflowRoot: root });

      expect(state).toMatchObject({
        status: 'ok',
        position: { graph: 'recovery-child', node: 'work' },
        node: { purpose: 'Recovered child work' },
        stack: [{ parent: { graph: 'recovery-parent', node: 'review', scope: '' }, child: { graphId: 'recovery-child' } }],
      });
      expect(readCheckpoint(root, 'recovery-a').position).toEqual({ graph: 'recovery-child', node: 'work' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps outer child scope after an inner workflow-ref exits to a non-terminal parent node', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/leaf-child', {
        id: 'leaf-child',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        outputSchema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['done'] } } },
        nodes: {
          review: {
            purpose: 'Leaf review',
            outputSchema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['done'] } } },
            edges: [{ to: 'done', when: { decision: 'done' } }],
          },
          done: { purpose: 'Done', terminal: true },
        },
      });
      writeGraphPackage(root, 'graphs/middle-child', {
        id: 'middle-child',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'inner',
        nodes: {
          inner: { purpose: 'Middle inner ref', workflowRef: { graphId: 'leaf-child' }, edges: [{ to: 'after', when: { decision: 'done' } }] },
          after: { purpose: 'Middle after child', edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });
      writeGraphPackage(root, 'graphs/outer-parent', {
        id: 'outer-parent',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'review',
        nodes: {
          review: { purpose: 'Outer parent ref', workflowRef: { graphId: 'middle-child' }, edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });
      startRun({ workflowRoot: root, graphId: 'outer-parent', runId: 'nested-scope-a' });

      const state = stepRun({ workflowRoot: root, output: { decision: 'done' } });

      expect(state).toMatchObject({
        status: 'ok',
        position: { graph: 'middle-child', node: 'after' },
        stack: [{ scope: 'f1' }],
        context: { previous: [{ id: 'inner', output: { decision: 'done' } }] },
      });
      expect(readCheckpoint(root, 'nested-scope-a')).toMatchObject({
        position: { graph: 'middle-child', node: 'after' },
        stack: [{ scope: 'f1' }],
        outputs: {
          'f1/inner': { decision: 'done' },
          'f2/review': { decision: 'done' },
        },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('allocates sibling workflow-ref frame scopes monotonically and persists the counter', () => {
    const root = makePackageWorkflowRoot();
    try {
      writeGraphPackage(root, 'graphs/sibling-child', {
        id: 'sibling-child',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'work',
        outputSchema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['done'] } } },
        nodes: {
          work: {
            purpose: 'Child work',
            outputSchema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['done'] } } },
            edges: [{ to: 'done', when: { decision: 'done' } }],
          },
          done: { purpose: 'Done', terminal: true },
        },
      });
      writeGraphPackage(root, 'graphs/sibling-parent', {
        id: 'sibling-parent',
        version: '0.1.0',
        kind: 'workflow',
        entry: 'first',
        nodes: {
          first: { purpose: 'First ref', workflowRef: { graphId: 'sibling-child' }, edges: [{ to: 'second' }] },
          second: { purpose: 'Second ref', workflowRef: { graphId: 'sibling-child' }, edges: [{ to: 'done' }] },
          done: { purpose: 'Done', terminal: true },
        },
      });
      startRun({ workflowRoot: root, graphId: 'sibling-parent', runId: 'sibling-a' });
      stepRun({ workflowRoot: root, output: { decision: 'done' } });
      const checkpoint = readCheckpoint(root, 'sibling-a');
      expect(checkpoint.frameCounter).toBe(2);
      expect(checkpoint.stack).toMatchObject([{ scope: 'f2', parent: { node: 'second' } }]);
      expect(checkpoint.position).toEqual({ graph: 'sibling-child', node: 'work' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects a checkpoint with position.graph mismatched against the active graph', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graphId: 'daily', runId: 'mismatch-a' });
      const checkpointPath = path.join(root, '.ripplegraph', 'runs', 'mismatch-a', 'checkpoint.json');
      const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as { position: { graph: string } };
      raw.position.graph = 'not-the-active-graph';
      fs.writeFileSync(checkpointPath, JSON.stringify(raw, null, 2), 'utf8');
      expect(() => readCheckpoint(root, 'mismatch-a')).toThrow(/position\.graph/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('decides a gated node, stores the external decision, and logs a decide transition', () => {
    const root = makeGatedWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graphId: 'review', runId: 'approval-a' });
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

  it('records side-channel actions without advancing graph position', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graphId: 'daily', runId: 'side-channel-a' });
      const before = readCheckpoint(root, 'side-channel-a');
      const response = recordSideChannelAction({
        workflowRoot: root,
        actionId: 'refresh-backend',
        input: { table: 'positions' },
        output: { rows: 3 },
        note: 'loaded current table',
      });

      expect(response).toMatchObject({
        status: 'ok',
        run: { id: 'side-channel-a', status: 'active' },
        position: before.position,
        state: { position: before.position },
      });
      expect(readCheckpoint(root, 'side-channel-a')).toEqual(before);
      expect(readCurrent(root)).toEqual({ focusedRunId: 'side-channel-a' });

      const logEntries = fs
        .readFileSync(path.join(root, '.ripplegraph', 'runs', 'side-channel-a', 'transition-log.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { op: string; from?: unknown; to?: unknown; output?: unknown });
      expect(logEntries.map((entry) => entry.op)).toEqual(['start', 'side_channel']);
      expect(logEntries[1]).toMatchObject({
        from: before.position,
        to: before.position,
        output: {
          actionId: 'refresh-backend',
          status: 'completed',
          note: 'loaded current table',
          input: { table: 'positions' },
          output: { rows: 3 },
        },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('records external state reconciliation drift without advancing graph position', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graphId: 'daily', runId: 'reconcile-a' });
      const before = readCheckpoint(root, 'reconcile-a');

      const aligned = reconcileExternalState({
        workflowRoot: root,
        source: 'backend-fsm',
        snapshot: { status: 'ready', nested: { count: 2 } },
        expected: { nested: { count: 2 }, status: 'ready' },
      });
      expect(aligned.reconciliation).toEqual({ source: 'backend-fsm', aligned: true });

      const drift = reconcileExternalState({
        workflowRoot: root,
        source: 'backend-fsm',
        snapshot: { status: 'waiting' },
        expected: { status: 'ready' },
        note: 'backend action set changed',
      });
      expect(drift.reconciliation).toEqual({ source: 'backend-fsm', aligned: false });
      expect(drift.position).toEqual(before.position);
      expect(readCheckpoint(root, 'reconcile-a')).toEqual(before);

      const logEntries = fs
        .readFileSync(path.join(root, '.ripplegraph', 'runs', 'reconcile-a', 'transition-log.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { op: string; to?: unknown; output?: { aligned?: boolean; note?: string } });
      expect(logEntries.map((entry) => entry.op)).toEqual(['start', 'reconcile', 'reconcile']);
      expect(logEntries[1]).toMatchObject({ to: before.position, output: { aligned: true } });
      expect(logEntries[2]).toMatchObject({ to: before.position, output: { aligned: false, note: 'backend action set changed' } });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('exposes previous outputs and conditional routes as neighborhood context', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graphId: 'daily', runId: 'daily-a' });
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
      startRun({ workflowRoot: root, graphId: 'change-intake', runId: 'change-a', effectPolicy: { allowedEffects: ['read_repo'] } });
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
      startRun({ workflowRoot: root, graphId: 'review', runId: 'approval-a' });
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
      startRun({ workflowRoot: normalRoot, graphId: 'daily', runId: 'daily-a' });
      expect(() => decideGate({ workflowRoot: normalRoot, decision: { decision: 'approved' } })).toThrow(/not gated/);
    } finally {
      fs.rmSync(normalRoot, { recursive: true, force: true });
    }
  });

  it('steps through a branch and completes at a terminal node', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graphId: 'daily', runId: 'daily-a' });
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

  it('rejects unknown and wrong-kind graph ids on startRun', () => {
    const root = createTestWorkspace({
      prefix: 'ripplegraph-startrun-errors-',
      workspace: { id: 'startrun-errors' },
      graphs: [
        {
          id: 'callable-only',
          kind: 'callable',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          entry: 'work',
          nodes: {
            work: {
              purpose: 'Do work',
              exec: 'inline',
              outputSchema: { type: 'object' },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Done', terminal: true },
          },
        },
      ],
    });
    try {
      const errorCode = (fn: () => unknown): string | undefined => {
        try {
          fn();
        } catch (error) {
          return (error as { code?: string }).code;
        }
        return undefined;
      };
      expect(errorCode(() => startRun({ workflowRoot: root, graphId: 'missing', runId: 'r1' }))).toBe('E_UNKNOWN_GRAPH');
      expect(errorCode(() => startRun({ workflowRoot: root, graphId: 'callable-only', runId: 'r2' }))).toBe('E_WRONG_GRAPH_KIND');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects invalid output without advancing the checkpoint', () => {
    const root = makeCoachWorkflowRoot();
    try {
      startRun({ workflowRoot: root, graphId: 'daily', runId: 'daily-a' });
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
