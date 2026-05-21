import {
  appendCallableTransition,
  createCallableCheckpoint,
  listCallIds,
  readCallableCheckpoint,
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
import { getNode } from './internal/runtime-graph.js';

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
  call: { id: string; graphId: string };
  errors: ValidationIssue[];
}

export type StartCallableCallResponse = CallableState | CallableValidationErrorResponse;

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

export function getCallableCall(opts: GetCallableCallOptions): CallableState {
  const checkpoint = readCallableCheckpoint(opts.workflowRoot, opts.callId);
  const { graphPackage } = resolveRegisteredGraphPackage({
    workflowRoot: opts.workflowRoot,
    graphId: checkpoint.graphId,
    kind: 'callable',
  });
  return stateForCallable(graphPackage.manifest, checkpoint);
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

function generatedCallId(): string {
  return `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
