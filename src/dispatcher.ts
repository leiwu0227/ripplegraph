import { z } from 'zod';
import { startCallableCall, type StartCallableCallResponse } from './callable.js';
import { listRuns, resumeRun, startRun, type RunList, type StateOk } from './coach.js';
import { listRegisteredGraphs, type RegistryEntry } from './registry.js';
import { resolveDispatcherEntry } from './internal/dispatcher-resolution.js';
import { RipplegraphError, type JsonSchema } from './schema.js';
import { assertEffectsAllowed, type EffectPolicy } from './effects.js';

export interface DispatchOptions {
  workflowRoot: string;
}

export interface DispatchRequestOptions extends DispatchOptions {
  request: string;
}

export interface DispatchActionOptions extends DispatchOptions {
  action: unknown;
  effectPolicy?: EffectPolicy;
}

export interface RegisteredGraphSummary {
  id: string;
  version: string;
  kind: RegistryEntry['kind'];
  title?: string;
  description?: string;
  activationHints: string[];
  requires: RegistryEntry['requires'];
  effects: string[];
  path: string;
}

export interface DispatchRequestState {
  status: 'needs_action';
  dispatcher: RegisteredGraphSummary;
  request: string;
  orientation: string;
  availableGraphs: RegisteredGraphSummary[];
  actionSchema: JsonSchema;
  nextAllowedCommand: string;
  helpCommand: string;
}

export type DispatchActionResult =
  | (RunList & { action: 'list_runs'; availableGraphs: RegisteredGraphSummary[] })
  | { status: 'needs_user_input'; question: string; choices?: string[] }
  | StartCallableCallResponse
  | StateOk;

// The dispatcher carries two schemas for the same action shapes:
//   - dispatcherActionSchema (Zod, below) is the server-side validator.
//   - dispatchActionSchema (JSON Schema literal further down) is the
//     agent-facing contract surfaced in getDispatchRequest().actionSchema.
// The two MUST list the same `action` discriminator values; a test in
// tests/dispatcher.test.ts asserts this on every run.
const startRunActionSchema = z
  .object({
    action: z.literal('start_run'),
    graphId: z.string().min(1),
    runId: z.string().min(1).optional(),
    input: z.unknown().optional(),
    reason: z.string().min(1).optional(),
  })
  .strict();

const resumeRunActionSchema = z
  .object({
    action: z.enum(['resume_run', 'switch_run']),
    runId: z.string().min(1),
    reason: z.string().min(1).optional(),
  })
  .strict();

const listRunsActionSchema = z
  .object({
    action: z.literal('list_runs'),
  })
  .strict();

const askUserActionSchema = z
  .object({
    action: z.literal('ask_user'),
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).optional(),
  })
  .strict();

const callGraphActionSchema = z
  .object({
    action: z.literal('call_graph'),
    graphId: z.string().min(1),
    callId: z.string().min(1).optional(),
    input: z.unknown().optional(),
    reason: z.string().min(1).optional(),
  })
  .strict();

export const dispatcherActionSchema = z.discriminatedUnion('action', [
  startRunActionSchema,
  resumeRunActionSchema,
  listRunsActionSchema,
  askUserActionSchema,
  callGraphActionSchema,
]);

// Agent-facing JSON Schema. Must stay in sync with dispatcherActionSchema (Zod above).
export const dispatchActionSchema: JsonSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['action', 'graphId'],
      properties: {
        action: { const: 'start_run' },
        graphId: { type: 'string' },
        runId: { type: 'string' },
        input: {},
        reason: { type: 'string' },
      },
      additionalProperties: false,
    },
    {
      type: 'object',
      required: ['action', 'runId'],
      properties: {
        action: { enum: ['resume_run', 'switch_run'] },
        runId: { type: 'string' },
        reason: { type: 'string' },
      },
      additionalProperties: false,
    },
    {
      type: 'object',
      required: ['action'],
      properties: { action: { const: 'list_runs' } },
      additionalProperties: false,
    },
    {
      type: 'object',
      required: ['action', 'question'],
      properties: {
        action: { const: 'ask_user' },
        question: { type: 'string' },
        choices: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
    {
      type: 'object',
      required: ['action', 'graphId'],
      properties: {
        action: { const: 'call_graph' },
        graphId: { type: 'string' },
        callId: { type: 'string' },
        input: {},
        reason: { type: 'string' },
      },
      additionalProperties: false,
    },
  ],
};

export function getDispatchRequest(options: DispatchRequestOptions): DispatchRequestState {
  const graphs = listRegisteredGraphs(options.workflowRoot).map(graphSummary);
  const dispatcher = resolveDispatcher(options.workflowRoot);
  return {
    status: 'needs_action',
    dispatcher,
    request: options.request,
    orientation: 'Choose one validated dispatcher action for this request.',
    availableGraphs: graphs,
    actionSchema: dispatchActionSchema,
    nextAllowedCommand: `ripplegraph dispatch --action '{"action":"list_runs"}'`,
    helpCommand: 'ripplegraph explain',
  };
}

export function applyDispatchAction(options: DispatchActionOptions): DispatchActionResult {
  const graphs = listRegisteredGraphs(options.workflowRoot).map(graphSummary);
  resolveDispatcher(options.workflowRoot);
  const result = dispatcherActionSchema.safeParse(options.action);
  if (!result.success) {
    throw new RipplegraphError('E_INVALID_DISPATCH_ACTION', formatIssues(result.error.issues));
  }

  const action = result.data;
  switch (action.action) {
    case 'list_runs':
      return { ...listRuns({ workflowRoot: options.workflowRoot }), action: 'list_runs', availableGraphs: graphs };
    case 'ask_user':
      return action.choices
        ? { status: 'needs_user_input', question: action.question, choices: action.choices }
        : { status: 'needs_user_input', question: action.question };
    case 'resume_run':
    case 'switch_run':
      return resumeRun({ workflowRoot: options.workflowRoot, runId: action.runId });
    case 'start_run': {
      requireRegisteredGraph(graphs, action.graphId, 'workflow');
      return startRun({
        workflowRoot: options.workflowRoot,
        graphId: action.graphId,
        runId: action.runId ?? generatedRunId(action.graphId),
        effectPolicy: options.effectPolicy,
      });
    }
    case 'call_graph': {
      const graph = requireRegisteredGraph(graphs, action.graphId, 'callable');
      assertEffectsAllowed(graph.effects, options.effectPolicy, `graph ${action.graphId}`);
      return startCallableCall({
        workflowRoot: options.workflowRoot,
        graphId: action.graphId,
        callId: action.callId,
        input: action.input,
        effectPolicy: options.effectPolicy,
      });
    }
  }
}

function graphSummary(entry: RegistryEntry): RegisteredGraphSummary {
  return {
    id: entry.id,
    version: entry.version,
    kind: entry.kind,
    title: entry.title,
    description: entry.description,
    activationHints: entry.activationHints,
    requires: entry.requires,
    effects: entry.effects,
    path: entry.path,
  };
}

export function resolveDispatcher(workflowRoot: string): RegisteredGraphSummary {
  return graphSummary(resolveDispatcherEntry(workflowRoot));
}

function requireRegisteredGraph(graphs: RegisteredGraphSummary[], graphId: string, kind: RegisteredGraphSummary['kind']): RegisteredGraphSummary {
  const graph = graphs.find((entry) => entry.id === graphId);
  if (!graph) throw new RipplegraphError('E_UNKNOWN_GRAPH', `unknown registered graph: ${graphId}`);
  if (graph.kind !== kind) {
    throw new RipplegraphError('E_WRONG_GRAPH_KIND', `graph ${graphId} is ${graph.kind}, expected ${kind}`);
  }
  return graph;
}

function generatedRunId(graphId: string): string {
  return `${graphId}-${new Date().toISOString().replace(/[^0-9A-Za-z]/g, '').slice(0, 17)}`;
}

function formatIssues(issues: Array<{ path: Array<string | number>; message: string }>): string {
  return issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
}
