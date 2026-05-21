import { listRegisteredGraphs, type RegistryEntry } from './registry.js';
import { RipplegraphError, type JsonSchema } from './schema.js';

export interface DispatchOptions {
  workflowRoot: string;
}

export interface DispatchRequestOptions extends DispatchOptions {
  request: string;
}

export interface RegisteredGraphSummary {
  id: string;
  version: string;
  kind: RegistryEntry['kind'];
  title?: string;
  description?: string;
  activationHints: string[];
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

const dispatchActionSchema: JsonSchema = {
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
        input: {},
        reason: { type: 'string' },
      },
      additionalProperties: false,
    },
  ],
};

export function getDispatchRequest(options: DispatchRequestOptions): DispatchRequestState {
  const graphs = listRegisteredGraphs(options.workflowRoot).map(graphSummary);
  const dispatcher = selectDispatcher(graphs);
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

function graphSummary(entry: RegistryEntry): RegisteredGraphSummary {
  return {
    id: entry.id,
    version: entry.version,
    kind: entry.kind,
    title: entry.title,
    description: entry.description,
    activationHints: entry.activationHints,
    effects: entry.effects,
    path: entry.path,
  };
}

function selectDispatcher(graphs: RegisteredGraphSummary[]): RegisteredGraphSummary {
  const dispatchers = graphs.filter((entry) => entry.kind === 'dispatcher');
  if (dispatchers.length === 0) {
    throw new RipplegraphError('E_MISSING_DISPATCHER', 'no registered dispatcher graph found');
  }
  if (dispatchers.length > 1) {
    throw new RipplegraphError('E_AMBIGUOUS_DISPATCHER', `multiple registered dispatcher graphs: ${dispatchers.map((entry) => entry.id).join(', ')}`);
  }
  return dispatchers[0];
}
