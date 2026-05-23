import path from 'node:path';
import {
  appendTransition,
  ensureWorkflowRoot,
  listRunIds,
  loadWorkflow,
  nodeOutputKey,
  readCheckpoint,
  readCurrent,
  writeCheckpoint,
  writeCurrent,
  writeNodeOutput,
} from './storage.js';
import { loadGraphPackage } from './graph-package.js';
import { resolveRegisteredGraphPackage } from './registry.js';
import {
  RipplegraphError,
  type Checkpoint,
  type Gate,
  type Graph,
  type GraphSource,
  type JsonSchema,
  type Node,
  type Position,
  type Workflow,
} from './schema.js';
import { resumableRuns, runSummary, stateForCheckpoint } from './internal/coach-responses.js';
import { validateOutput } from './internal/output-validation.js';
import { getGraph, getNode, selectEdge } from './internal/runtime-graph.js';
import { transitionEntry } from './internal/transitions.js';
import { type EffectPolicy } from './effects.js';

export interface WorkflowRootOptions {
  workflowRoot: string;
}

export interface StartRunOptions extends WorkflowRootOptions {
  graph: string;
  runId: string;
  effectPolicy?: EffectPolicy;
}

export interface StartRegisteredWorkflowRunOptions extends WorkflowRootOptions {
  graphId: string;
  runId: string;
  effectPolicy?: EffectPolicy;
}

export interface StepRunOptions extends WorkflowRootOptions {
  output: unknown;
}

export interface AdvanceRunOptions extends WorkflowRootOptions {
  input: unknown;
}

export interface DecideGateOptions extends WorkflowRootOptions {
  decision: unknown;
}

export interface SuspendRunOptions extends WorkflowRootOptions {
  note?: string;
}

export interface ResumeRunOptions extends WorkflowRootOptions {
  runId: string;
}

export interface AbandonRunOptions extends WorkflowRootOptions {
  reason?: string;
}

export interface StateOk {
  status: 'ok';
  workflow: { id: string; version: string };
  run: { id: string; status: Checkpoint['status']; rootGraph: string };
  position: Position;
  stack: Checkpoint['stack'];
  orientation: string;
  nextAllowedCommand: string;
  helpCommand: string;
  node: {
    id: string;
    purpose: string;
    instructions?: string;
    exec: Node['exec'];
    outputSchema: JsonSchema;
    gate?: Gate;
  };
  context: {
    previous: Array<{ id: string; purpose: string; output?: unknown }>;
    next: Array<{ id: string; purpose: string; when?: Record<string, unknown> }>;
    latches: [];
    capabilities: [];
  };
  responseContract:
    | { command: 'step'; acceptedFormats: ['json'] }
    | { command: 'decide'; acceptedFormats: ['json']; schema: JsonSchema };
}

export interface StateNoFocusedRun {
  status: 'no_focused_run';
  workflow: { id: string; version: string };
  availableGraphs: string[];
  resumableRuns: Array<{ id: string; status: 'suspended'; rootGraph: string }>;
  dispatcher?: { graph: string; available: true };
  orientation: string;
  nextAllowedCommand: string;
  helpCommand: string;
}

export interface RunSummary {
  id: string;
  status: Checkpoint['status'];
  rootGraph: string;
  position: Position;
  updatedAt: string;
}

export interface RunList {
  status: 'ok';
  workflow: { id: string; version: string };
  focusedRunId: string | null;
  runs: RunSummary[];
}

export interface ValidationErrorResponse {
  status: 'validation_error';
  run: { id: string; status: Checkpoint['status']; rootGraph: string };
  position: Position;
  errors: Array<{ path: string; message: string }>;
}

export type CoachState = StateOk | StateNoFocusedRun;
export type AdvanceResponse = StateOk | { status: 'completed'; run: { id: string; status: 'completed'; rootGraph: string }; position: Position } | ValidationErrorResponse;
export type StepRunResponse = AdvanceResponse;
export type AdvanceRunResponse = AdvanceResponse;
export type DecideGateResponse = AdvanceResponse;

export function validateWorkflowRoot(rootPath: string): { status: 'ok'; workflow: { id: string; version: string }; graphs: string[] } {
  const workflow = loadWorkflow(rootPath);
  ensureWorkflowRoot(rootPath);
  return { status: 'ok', workflow: { id: workflow.id, version: workflow.version }, graphs: Object.keys(workflow.graphs) };
}

function effectsForNode(graph: Graph, node: Node): string[] {
  return node.effects ?? graph.effects;
}

function assertGraphEffectsAllowed(graph: Graph, graphId: string, policy?: EffectPolicy): void {
  const allowed = new Set(policy?.allowedEffects ?? []);
  const missing = missingEffectsForGraph(graph, graphId, allowed);
  if (missing.size === 0) return;
  const parts = [...missing.entries()].map(
    ([effect, nodes]) => `${effect} (${nodes.length > 1 ? 'nodes' : 'node'}: ${nodes.join(', ')})`,
  );
  throw new RipplegraphError(
    'E_EFFECT_NOT_ALLOWED',
    `graph ${graphId} requires effects not allowed by policy: ${parts.join(', ')}`,
  );
}

function assertGraphAndChildEffectsAllowed(rootPath: string, graph: Graph, graphId: string, policy?: EffectPolicy): void {
  const allowed = new Set(policy?.allowedEffects ?? []);
  const missing = missingEffectsForGraph(graph, graphId, allowed);
  collectMissingChildEffects(rootPath, graph, allowed, missing, new Set([graphId]));
  if (missing.size === 0) return;
  const parts = [...missing.entries()].map(
    ([effect, nodes]) => `${effect} (${nodes.length > 1 ? 'nodes' : 'node'}: ${nodes.join(', ')})`,
  );
  throw new RipplegraphError(
    'E_EFFECT_NOT_ALLOWED',
    `graph ${graphId} requires effects not allowed by policy: ${parts.join(', ')}`,
  );
}

function missingEffectsForGraph(graph: Graph, graphId: string, allowed: Set<string>): Map<string, string[]> {
  const missing = new Map<string, string[]>();
  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    for (const effect of effectsForNode(graph, node)) {
      if (allowed.has(effect)) continue;
      const owners = missing.get(effect) ?? [];
      const owner = `${graphId}/${nodeId}`;
      if (!owners.includes(owner)) owners.push(owner);
      missing.set(effect, owners);
    }
  }
  return missing;
}

function collectMissingChildEffects(
  rootPath: string,
  graph: Graph,
  allowed: Set<string>,
  missing: Map<string, string[]>,
  visited: Set<string>,
): void {
  for (const node of Object.values(graph.nodes)) {
    const graphId = node.workflowRef?.graphId;
    if (!graphId || visited.has(graphId)) continue;
    visited.add(graphId);
    const { graphPackage } = resolveRegisteredGraphPackage({ workflowRoot: rootPath, graphId, kind: 'workflow' });
    const childMissing = missingEffectsForGraph(graphPackage.manifest, graphId, allowed);
    for (const [effect, owners] of childMissing) {
      const existing = missing.get(effect) ?? [];
      for (const owner of owners) {
        if (!existing.includes(owner)) existing.push(owner);
      }
      missing.set(effect, existing);
    }
    collectMissingChildEffects(rootPath, graphPackage.manifest, allowed, missing, visited);
  }
}

export function startRun(opts: StartRunOptions): StateOk {
  const workflow = loadWorkflow(opts.workflowRoot);
  const graph = getGraph(workflow, opts.graph);
  assertGraphAndChildEffectsAllowed(opts.workflowRoot, graph, opts.graph, opts.effectPolicy);
  const now = new Date().toISOString();
  const checkpoint: Checkpoint = {
    runId: opts.runId,
    status: 'active',
    rootGraph: opts.graph,
    workflow: { id: workflow.id, version: workflow.version },
    position: { graph: opts.graph, node: graph.entry },
    createdAt: now,
    updatedAt: now,
    outputs: {},
    gateDecisions: {},
    stack: [],
  };
  return createRun(opts.workflowRoot, workflow, graph, checkpoint);
}

export function startRegisteredWorkflowRun(opts: StartRegisteredWorkflowRunOptions): StateOk {
  const workflow = loadWorkflow(opts.workflowRoot);
  const { entry, graphPackage } = resolveRegisteredGraphPackage({
    workflowRoot: opts.workflowRoot,
    graphId: opts.graphId,
    kind: 'workflow',
  });
  const manifest = graphPackage.manifest;
  assertGraphAndChildEffectsAllowed(opts.workflowRoot, manifest, opts.graphId, opts.effectPolicy);
  const now = new Date().toISOString();
  const checkpoint: Checkpoint = {
    runId: opts.runId,
    status: 'active',
    rootGraph: manifest.id,
    workflow: { id: workflow.id, version: workflow.version },
    position: { graph: manifest.id, node: manifest.entry },
    createdAt: now,
    updatedAt: now,
    outputs: {},
    gateDecisions: {},
    stack: [],
    graphSource: {
      kind: 'package',
      graphId: manifest.id,
      graphVersion: manifest.version,
      packagePath: entry.path,
    },
  };
  return createRun(opts.workflowRoot, workflow, manifest, checkpoint);
}

function createRun(rootPath: string, workflow: Workflow, graph: Graph, checkpoint: Checkpoint): StateOk {
  ensureWorkflowRoot(rootPath);
  const current = readCurrent(rootPath);
  if (current.focusedRunId) {
    throw new RipplegraphError('E_FOCUSED_RUN_EXISTS', `focused run already exists: ${current.focusedRunId}`);
  }
  if (listRunIds(rootPath).includes(checkpoint.runId)) {
    throw new RipplegraphError('E_RUN_EXISTS', `run already exists: ${checkpoint.runId}`);
  }
  writeCheckpoint(rootPath, checkpoint);
  writeCurrent(rootPath, { focusedRunId: checkpoint.runId });
  appendTransition(rootPath, checkpoint.runId, transitionEntry('start', checkpoint.runId, null, checkpoint.position));
  return enterWorkflowRefs(rootPath, workflow, checkpoint, graph);
}

export function getState(opts: WorkflowRootOptions): CoachState {
  const workflow = loadWorkflow(opts.workflowRoot);
  ensureWorkflowRoot(opts.workflowRoot);
  const current = readCurrent(opts.workflowRoot);
  if (!current.focusedRunId) {
    const dispatcher = workflow.entryGraph ? { graph: workflow.entryGraph, available: true as const } : undefined;
    return {
      status: 'no_focused_run',
      workflow: { id: workflow.id, version: workflow.version },
      availableGraphs: Object.keys(workflow.graphs),
      resumableRuns: resumableRuns(opts.workflowRoot),
      dispatcher,
      orientation: dispatcher ? 'No run is focused. Submit user intent to the dispatcher.' : 'No run is focused. Start or resume a run.',
      nextAllowedCommand: dispatcher
        ? 'ripplegraph dispatch --request "<user request>"'
        : `ripplegraph start --graph ${Object.keys(workflow.graphs)[0] ?? '<graph-id>'} --run-id <run-id>`,
      helpCommand: 'ripplegraph explain',
    };
  }
  const checkpoint = readCheckpoint(opts.workflowRoot, current.focusedRunId);
  return stateForCheckpoint(workflow, checkpoint, activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint));
}

export function listRuns(opts: WorkflowRootOptions): RunList {
  const workflow = loadWorkflow(opts.workflowRoot);
  ensureWorkflowRoot(opts.workflowRoot);
  const current = readCurrent(opts.workflowRoot);
  return {
    status: 'ok',
    workflow: { id: workflow.id, version: workflow.version },
    focusedRunId: current.focusedRunId,
    runs: listRunIds(opts.workflowRoot).map((runId) => runSummary(opts.workflowRoot, runId)),
  };
}

export function stepRun(opts: StepRunOptions): StepRunResponse {
  const workflow = loadWorkflow(opts.workflowRoot);
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  if (checkpoint.status !== 'active') {
    throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
  }
  const active = activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint);
  const node = getNode(active.graph, checkpoint.position.node);
  if (node.terminal) {
    return completeRun(opts.workflowRoot, checkpoint, checkpoint.position);
  }
  if (node.gate) {
    throw new RipplegraphError('E_GATE_DECISION_REQUIRED', `node ${checkpoint.position.node} requires an external decision`);
  }
  const errors = validateOutput(node.outputSchema, opts.output);
  if (errors.length > 0) {
    appendTransition(opts.workflowRoot, checkpoint.runId, {
      ...transitionEntry('step', checkpoint.runId, checkpoint.position, checkpoint.position),
      validation: { ok: false, errors },
      error: { code: 'E_VALIDATION', message: 'output failed validation' },
    });
    return {
      status: 'validation_error',
      run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
      position: checkpoint.position,
      errors,
    };
  }

  const artifact = writeNodeOutput(opts.workflowRoot, checkpoint.runId, checkpoint.position.node, opts.output, active.scope);
  const nextNodeId = selectEdge(node.edges, opts.output)?.to;
  if (!nextNodeId) {
    throw new RipplegraphError('E_NO_EDGE', `node ${checkpoint.position.node} has no matching edge`);
  }
  const from = checkpoint.position;
  const to = { graph: active.graphId, node: nextNodeId };
  checkpoint.outputs[nodeOutputKey(active.scope, checkpoint.position.node)] = opts.output;
  checkpoint.position = to;
  checkpoint.updatedAt = new Date().toISOString();
  appendTransition(opts.workflowRoot, checkpoint.runId, {
    ...transitionEntry('step', checkpoint.runId, from, to),
    input: { artifact },
    output: { artifact },
  });
  const nextNode = getNode(active.graph, nextNodeId);
  if (nextNode.terminal) {
    return completeRun(opts.workflowRoot, checkpoint, to);
  }
  writeCheckpoint(opts.workflowRoot, checkpoint);
  return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint, active.graph);
}

export function advanceRun(opts: AdvanceRunOptions): AdvanceRunResponse {
  const workflow = loadWorkflow(opts.workflowRoot);
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  const active = activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint);
  const node = getNode(active.graph, checkpoint.position.node);
  if (node.gate) return decideGate({ workflowRoot: opts.workflowRoot, decision: opts.input });
  return stepRun({ workflowRoot: opts.workflowRoot, output: opts.input });
}

export function decideGate(opts: DecideGateOptions): DecideGateResponse {
  const workflow = loadWorkflow(opts.workflowRoot);
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  if (checkpoint.status !== 'active') {
    throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
  }
  const active = activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint);
  const node = getNode(active.graph, checkpoint.position.node);
  if (!node.gate) {
    throw new RipplegraphError('E_NODE_NOT_GATED', `node ${checkpoint.position.node} is not gated`);
  }
  const errors = validateOutput(node.gate.decisionSchema, opts.decision);
  if (errors.length > 0) {
    appendTransition(opts.workflowRoot, checkpoint.runId, {
      ...transitionEntry('decide', checkpoint.runId, checkpoint.position, checkpoint.position),
      validation: { ok: false, errors },
      gateDecision: opts.decision,
      error: { code: 'E_VALIDATION', message: 'gate decision failed validation' },
    });
    return {
      status: 'validation_error',
      run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
      position: checkpoint.position,
      errors,
    };
  }

  const artifact = writeNodeOutput(opts.workflowRoot, checkpoint.runId, checkpoint.position.node, opts.decision, active.scope);
  const nextNodeId = selectEdge(node.edges, opts.decision)?.to;
  if (!nextNodeId) {
    throw new RipplegraphError('E_NO_EDGE', `node ${checkpoint.position.node} has no matching edge`);
  }
  const from = checkpoint.position;
  const to = { graph: active.graphId, node: nextNodeId };
  checkpoint.gateDecisions[nodeOutputKey(active.scope, checkpoint.position.node)] = opts.decision;
  checkpoint.outputs[nodeOutputKey(active.scope, checkpoint.position.node)] = opts.decision;
  checkpoint.position = to;
  checkpoint.updatedAt = new Date().toISOString();
  appendTransition(opts.workflowRoot, checkpoint.runId, {
    ...transitionEntry('decide', checkpoint.runId, from, to),
    input: { artifact },
    output: null,
    gateDecision: opts.decision,
  });
  const nextNode = getNode(active.graph, nextNodeId);
  if (nextNode.terminal) {
    return completeRun(opts.workflowRoot, checkpoint, to);
  }
  writeCheckpoint(opts.workflowRoot, checkpoint);
  return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint, active.graph);
}

export function suspendRun(opts: SuspendRunOptions): StateOk {
  const workflow = loadWorkflow(opts.workflowRoot);
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  const active = activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint);
  if (checkpoint.status !== 'active') {
    throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
  }
  checkpoint.status = 'suspended';
  checkpoint.updatedAt = new Date().toISOString();
  if (opts.note) checkpoint.resumeNote = opts.note;
  writeCheckpoint(opts.workflowRoot, checkpoint);
  writeCurrent(opts.workflowRoot, { focusedRunId: null });
  appendTransition(opts.workflowRoot, checkpoint.runId, {
    ...transitionEntry('suspend', checkpoint.runId, checkpoint.position, checkpoint.position),
    reason: opts.note ?? null,
  });
  return stateForCheckpoint(workflow, checkpoint, active);
}

export function resumeRun(opts: ResumeRunOptions): StateOk {
  const workflow = loadWorkflow(opts.workflowRoot);
  ensureWorkflowRoot(opts.workflowRoot);
  const current = readCurrent(opts.workflowRoot);
  if (current.focusedRunId) {
    throw new RipplegraphError('E_FOCUSED_RUN_EXISTS', `focused run already exists: ${current.focusedRunId}`);
  }
  const checkpoint = readCheckpoint(opts.workflowRoot, opts.runId);
  const active = activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint);
  if (checkpoint.status !== 'suspended') {
    throw new RipplegraphError('E_RUN_NOT_RESUMABLE', `run ${opts.runId} is not suspended`);
  }
  checkpoint.status = 'active';
  checkpoint.updatedAt = new Date().toISOString();
  writeCheckpoint(opts.workflowRoot, checkpoint);
  writeCurrent(opts.workflowRoot, { focusedRunId: opts.runId });
  appendTransition(opts.workflowRoot, checkpoint.runId, transitionEntry('resume', checkpoint.runId, checkpoint.position, checkpoint.position));
  return stateForCheckpoint(workflow, checkpoint, active);
}

export function abandonRun(opts: AbandonRunOptions): { status: 'abandoned'; run: { id: string; status: 'abandoned'; rootGraph: string }; position: Position } {
  const checkpoint = focusedCheckpoint(opts.workflowRoot);
  checkpoint.status = 'abandoned';
  checkpoint.updatedAt = new Date().toISOString();
  writeCheckpoint(opts.workflowRoot, checkpoint);
  writeCurrent(opts.workflowRoot, { focusedRunId: null });
  appendTransition(opts.workflowRoot, checkpoint.runId, {
    ...transitionEntry('abandon', checkpoint.runId, checkpoint.position, checkpoint.position),
    reason: opts.reason ?? null,
  });
  return {
    status: 'abandoned',
    run: { id: checkpoint.runId, status: 'abandoned', rootGraph: checkpoint.rootGraph },
    position: checkpoint.position,
  };
}

function focusedCheckpoint(rootPath: string): Checkpoint {
  ensureWorkflowRoot(rootPath);
  const current = readCurrent(rootPath);
  if (!current.focusedRunId) {
    throw new RipplegraphError('E_NO_FOCUSED_RUN', 'no focused run');
  }
  return readCheckpoint(rootPath, current.focusedRunId);
}

function enterWorkflowRefs(rootPath: string, workflow: Workflow, checkpoint: Checkpoint, graph: Graph): StateOk {
  let active: ActiveContext = { graph, graphSource: checkpoint.graphSource, graphId: checkpoint.position.graph, scope: '' };
  const entered = new Set<string>();
  while (true) {
    const node = getNode(active.graph, checkpoint.position.node);
    const graphId = node.workflowRef?.graphId;
    if (!graphId) return stateForCheckpoint(workflow, checkpoint, active);
    const cycleKey = `${active.graphId}/${checkpoint.position.node}->${graphId}`;
    if (entered.has(cycleKey)) {
      throw new RipplegraphError('E_WORKFLOW_REF_CYCLE', `workflowRef cycle while entering ${graphId}`);
    }
    entered.add(cycleKey);

    const { entry, graphPackage } = resolveRegisteredGraphPackage({ workflowRoot: rootPath, graphId, kind: 'workflow' });
    const manifest = graphPackage.manifest;
    const from = checkpoint.position;
    const frameScope = nextFrameScope(checkpoint);
    checkpoint.stack.push({
      parent: {
        graph: active.graphId,
        node: checkpoint.position.node,
        graphSource: active.graphSource,
        scope: active.scope,
      },
      child: {
        kind: 'package',
        graphId: manifest.id,
        graphVersion: manifest.version,
        packagePath: entry.path,
      },
      scope: frameScope,
      enteredAt: new Date().toISOString(),
    });
    checkpoint.position = { graph: manifest.id, node: manifest.entry };
    checkpoint.updatedAt = new Date().toISOString();
    writeCheckpoint(rootPath, checkpoint);
    appendTransition(rootPath, checkpoint.runId, transitionEntry('step', checkpoint.runId, from, checkpoint.position));
    active = {
      graph: manifest,
      graphSource: checkpoint.stack.at(-1)!.child,
      graphId: manifest.id,
      scope: frameScope,
    };
  }
}

function nextFrameScope(checkpoint: Checkpoint): string {
  let max = 0;
  for (const frame of checkpoint.stack) {
    const match = /^f(\d+)$/.exec(frame.scope);
    if (match) max = Math.max(max, Number(match[1]));
  }
  for (const key of Object.keys(checkpoint.outputs)) {
    const match = /^f(\d+)\//.exec(key);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `f${max + 1}`;
}

interface ActiveContext {
  graph: Graph;
  graphSource?: GraphSource;
  graphId: string;
  scope: string;
}

function activeContextForCheckpoint(rootPath: string, workflow: Workflow, checkpoint: Checkpoint): ActiveContext {
  const frame = checkpoint.stack.at(-1);
  if (frame) {
    return {
      graph: graphForSource(rootPath, checkpoint, frame.child),
      graphSource: frame.child,
      graphId: frame.child.graphId,
      scope: frame.scope,
    };
  }
  if (checkpoint.graphSource) {
    return {
      graph: graphForSource(rootPath, checkpoint, checkpoint.graphSource),
      graphSource: checkpoint.graphSource,
      graphId: checkpoint.graphSource.graphId,
      scope: '',
    };
  }
  return { graph: getGraph(workflow, checkpoint.rootGraph), graphId: checkpoint.rootGraph, scope: '' };
}

function graphForCheckpoint(rootPath: string, workflow: Workflow, checkpoint: Checkpoint): Graph {
  return activeContextForCheckpoint(rootPath, workflow, checkpoint).graph;
}

function graphForSource(rootPath: string, checkpoint: Checkpoint, source: GraphSource): Graph {
  const packageRoot = path.isAbsolute(source.packagePath) ? source.packagePath : path.join(rootPath, source.packagePath);
  const manifest = loadGraphPackage(packageRoot).manifest;
  if (manifest.id !== source.graphId || manifest.kind !== 'workflow' || manifest.version !== source.graphVersion) {
    throw new RipplegraphError(
      'E_RUN_PACKAGE_MISMATCH',
      `run ${checkpoint.runId} was started with ${source.graphId}@${source.graphVersion}, but ${source.packagePath} is ${manifest.id}@${manifest.version} (${manifest.kind})`,
    );
  }
  return manifest;
}

function completeRun(rootPath: string, checkpoint: Checkpoint, to: Position): StepRunResponse {
  checkpoint.status = 'completed';
  checkpoint.position = to;
  checkpoint.updatedAt = new Date().toISOString();
  writeCheckpoint(rootPath, checkpoint);
  writeCurrent(rootPath, { focusedRunId: null });
  return {
    status: 'completed',
    run: { id: checkpoint.runId, status: 'completed', rootGraph: checkpoint.rootGraph },
    position: checkpoint.position,
  };
}
