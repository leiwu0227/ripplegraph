import path from 'node:path';
import { loadGraphPackage } from './graph-package.js';
import {
  appendCallableTransition,
  createCallableCheckpoint,
  listCallIds,
  readCallableCheckpoint,
  writeCallableCheckpoint,
  writeCallableOutput,
} from './storage.js';
import { resolveRegisteredGraphPackage } from './registry.js';
import {
  RipplegraphError,
  type CallableCheckpoint,
  type GraphPackageManifest,
  type JsonSchema,
  type Node,
  type Position,
} from './schema.js';
import { assertSupportedCallableSchema, validateOutput, type ValidationIssue } from './internal/output-validation.js';
import { getNode, selectEdge } from './internal/runtime-graph.js';

export interface CallableRootOptions {
  workflowRoot: string;
}

export interface StartCallableCallOptions extends CallableRootOptions {
  graphId: string;
  callId?: string;
  input?: unknown;
}

export interface GetCallableCallOptions extends CallableRootOptions {
  callId: string;
}

export interface StepCallableCallOptions extends CallableRootOptions {
  callId: string;
  output: unknown;
}

export interface CallableCallSummary {
  id: string;
  status: CallableCheckpoint['status'];
  graphId: string;
  position: Position;
  updatedAt: string;
}

export interface CallableCallList {
  status: 'ok';
  calls: CallableCallSummary[];
}

export interface CallableState {
  status: 'active';
  call: { id: string; status: 'active'; graphId: string; graphVersion: string };
  position: Position;
  input: unknown;
  node: {
    id: string;
    purpose: string;
    instructions?: string;
    exec: Node['exec'];
    outputSchema: JsonSchema;
  };
  context: {
    previous: Array<{ id: string; purpose: string; output?: unknown }>;
  };
  responseContract: { command: 'call-step'; acceptedFormats: ['json']; schema: JsonSchema };
  nextAllowedCommand: string;
  helpCommand: string;
}

export interface CallableValidationErrorResponse {
  status: 'validation_error';
  call: { id: string; status?: CallableCheckpoint['status']; graphId: string };
  position?: Position;
  errors: ValidationIssue[];
}

export interface CallableCompleted {
  status: 'completed';
  call: { id: string; status: 'completed'; graphId: string; graphVersion: string };
  position: Position;
  input: unknown;
  output: unknown;
  outputArtifact?: string;
}

export type StartCallableCallResponse = CallableState | CallableValidationErrorResponse;
export type CallableCallResponse = CallableState | CallableCompleted;
export type StepCallableCallResponse = CallableCallResponse | CallableValidationErrorResponse;

export function startCallableCall(opts: StartCallableCallOptions): StartCallableCallResponse {
  const { entry, graphPackage } = resolveRegisteredGraphPackage({
    workflowRoot: opts.workflowRoot,
    graphId: opts.graphId,
    kind: 'callable',
  });
  const manifest = graphPackage.manifest;
  assertCallableSupported(manifest);
  const callId = opts.callId ?? generatedCallId();
  const input = opts.input ?? {};
  const errors = validateOutput(manifest.inputSchema, input);
  if (errors.length > 0) {
    return {
      status: 'validation_error',
      call: { id: callId, graphId: opts.graphId },
      errors,
    };
  }

  const now = new Date().toISOString();
  const checkpoint: CallableCheckpoint = {
    callId,
    status: 'active',
    graphId: manifest.id,
    graphVersion: manifest.version,
    packagePath: entry.path,
    position: { graph: manifest.id, node: manifest.entry },
    input,
    outputs: {},
    createdAt: now,
    updatedAt: now,
  };
  createCallableCheckpoint(opts.workflowRoot, checkpoint);
  appendCallableTransition(opts.workflowRoot, callId, {
    ts: now,
    op: 'start',
    callId,
    from: null,
    to: checkpoint.position,
    input,
    output: null,
    validation: { ok: true },
    error: null,
  });
  return stateForCallable(manifest, checkpoint);
}

export function getCallableCall(opts: GetCallableCallOptions): CallableCallResponse {
  const checkpoint = readCallableCheckpoint(opts.workflowRoot, opts.callId);
  if (checkpoint.status === 'completed') return completedForCallable(checkpoint);
  return stateForCallable(loadCheckpointedCallablePackage(opts.workflowRoot, checkpoint), checkpoint);
}

export function stepCallableCall(opts: StepCallableCallOptions): StepCallableCallResponse {
  const checkpoint = readCallableCheckpoint(opts.workflowRoot, opts.callId);
  if (checkpoint.status !== 'active') {
    throw new RipplegraphError('E_CALL_NOT_ACTIVE', `call ${opts.callId} is not active: ${checkpoint.status}`);
  }
  const manifest = loadCheckpointedCallablePackage(opts.workflowRoot, checkpoint);
  const node = getNode(manifest, checkpoint.position.node);
  const errors = validateOutput(node.outputSchema, opts.output);
  if (errors.length > 0) {
    appendCallableTransition(opts.workflowRoot, checkpoint.callId, {
      ts: new Date().toISOString(),
      op: 'step',
      callId: checkpoint.callId,
      from: checkpoint.position,
      to: checkpoint.position,
      input: null,
      output: opts.output,
      validation: { ok: false, errors },
      error: { code: 'E_VALIDATION', message: 'output failed validation' },
    });
    return {
      status: 'validation_error',
      call: { id: checkpoint.callId, status: checkpoint.status, graphId: checkpoint.graphId },
      position: checkpoint.position,
      errors,
    };
  }
  const nextNodeId = selectEdge(node.edges, opts.output)?.to;
  if (!nextNodeId) {
    throw new RipplegraphError('E_NO_EDGE', `callable node ${checkpoint.position.node} has no matching edge`);
  }
  const nextNode = getNode(manifest, nextNodeId);
  const from = checkpoint.position;
  const to = { graph: checkpoint.graphId, node: nextNodeId };
  if (nextNode.terminal) {
    const outputErrors = validateOutput(manifest.outputSchema, opts.output);
    if (outputErrors.length > 0) {
      appendCallableTransition(opts.workflowRoot, checkpoint.callId, {
        ts: new Date().toISOString(),
        op: 'step',
        callId: checkpoint.callId,
        from,
        to: from,
        input: null,
        output: opts.output,
        validation: { ok: false, errors: outputErrors },
        error: { code: 'E_VALIDATION', message: 'call output failed validation' },
      });
      return {
        status: 'validation_error',
        call: { id: checkpoint.callId, status: checkpoint.status, graphId: checkpoint.graphId },
        position: checkpoint.position,
        errors: outputErrors,
      };
    }
    const artifact = writeCallableOutput(opts.workflowRoot, checkpoint.callId, checkpoint.position.node, opts.output);
    checkpoint.outputs[checkpoint.position.node] = opts.output;
    checkpoint.position = to;
    checkpoint.status = 'completed';
    checkpoint.finalOutput = opts.output;
    checkpoint.outputArtifact = artifact;
    checkpoint.updatedAt = new Date().toISOString();
    writeCallableCheckpoint(opts.workflowRoot, checkpoint);
    appendCallableTransition(opts.workflowRoot, checkpoint.callId, {
      ts: checkpoint.updatedAt,
      op: 'complete',
      callId: checkpoint.callId,
      from,
      to,
      input: { artifact },
      output: { artifact },
      validation: { ok: true },
      error: null,
    });
    return completedForCallable(checkpoint);
  }

  const artifact = writeCallableOutput(opts.workflowRoot, checkpoint.callId, checkpoint.position.node, opts.output);
  checkpoint.outputs[checkpoint.position.node] = opts.output;
  checkpoint.position = to;
  checkpoint.updatedAt = new Date().toISOString();
  writeCallableCheckpoint(opts.workflowRoot, checkpoint);
  appendCallableTransition(opts.workflowRoot, checkpoint.callId, {
    ts: checkpoint.updatedAt,
    op: 'step',
    callId: checkpoint.callId,
    from,
    to,
    input: { artifact },
    output: { artifact },
    validation: { ok: true },
    error: null,
  });
  return stateForCallable(manifest, checkpoint);
}

export function listCallableCalls(opts: CallableRootOptions): CallableCallList {
  return {
    status: 'ok',
    calls: listCallIds(opts.workflowRoot).map((callId) => {
      const checkpoint = readCallableCheckpoint(opts.workflowRoot, callId);
      return {
        id: checkpoint.callId,
        status: checkpoint.status,
        graphId: checkpoint.graphId,
        position: checkpoint.position,
        updatedAt: checkpoint.updatedAt,
      };
    }),
  };
}

function assertCallableSupported(manifest: GraphPackageManifest): void {
  assertSupportedCallableSchema(manifest.inputSchema);
  assertSupportedCallableSchema(manifest.outputSchema);
  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    if (node.gate) throw new RipplegraphError('E_CALLABLE_GATE_UNSUPPORTED', `callable node ${nodeId} uses a gate`);
    assertSupportedCallableSchema(node.outputSchema);
  }
}

function loadCheckpointedCallablePackage(workflowRoot: string, checkpoint: CallableCheckpoint): GraphPackageManifest {
  const packageRoot = path.isAbsolute(checkpoint.packagePath)
    ? checkpoint.packagePath
    : path.join(workflowRoot, checkpoint.packagePath);
  const manifest = loadGraphPackage(packageRoot).manifest;
  if (manifest.id !== checkpoint.graphId || manifest.kind !== 'callable' || manifest.version !== checkpoint.graphVersion) {
    throw new RipplegraphError(
      'E_CALL_PACKAGE_MISMATCH',
      `call ${checkpoint.callId} was started with ${checkpoint.graphId}@${checkpoint.graphVersion}, but ${checkpoint.packagePath} is ${manifest.id}@${manifest.version} (${manifest.kind})`,
    );
  }
  assertCallableSupported(manifest);
  return manifest;
}

function stateForCallable(manifest: GraphPackageManifest, checkpoint: CallableCheckpoint): CallableState {
  const node = getNode(manifest, checkpoint.position.node);
  return {
    status: 'active',
    call: {
      id: checkpoint.callId,
      status: 'active',
      graphId: checkpoint.graphId,
      graphVersion: checkpoint.graphVersion,
    },
    position: checkpoint.position,
    input: checkpoint.input,
    node: {
      id: checkpoint.position.node,
      purpose: node.purpose,
      instructions: node.instructions,
      exec: node.exec,
      outputSchema: node.outputSchema,
    },
    context: {
      previous: Object.entries(checkpoint.outputs).map(([id, output]) => ({
        id,
        purpose: manifest.nodes[id]?.purpose ?? id,
        output,
      })),
    },
    responseContract: { command: 'call-step', acceptedFormats: ['json'], schema: node.outputSchema },
    nextAllowedCommand: `ripplegraph call-step --call-id ${checkpoint.callId} --output <json>`,
    helpCommand: `ripplegraph explain --call-id ${checkpoint.callId}`,
  };
}

function completedForCallable(checkpoint: CallableCheckpoint): CallableCompleted {
  return {
    status: 'completed',
    call: {
      id: checkpoint.callId,
      status: 'completed',
      graphId: checkpoint.graphId,
      graphVersion: checkpoint.graphVersion,
    },
    position: checkpoint.position,
    input: checkpoint.input,
    output: checkpoint.finalOutput,
    outputArtifact: checkpoint.outputArtifact,
  };
}

function generatedCallId(): string {
  return `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
