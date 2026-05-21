import { z } from 'zod';
import { startCallableCall } from './callable.js';
import { listRuns, resumeRun, startRun } from './coach.js';
import { listRegisteredGraphs } from './registry.js';
import { RipplegraphError } from './schema.js';
import { loadWorkflow } from './storage.js';
import { assertEffectsAllowed } from './effects.js';
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
const dispatcherActionSchema = z.discriminatedUnion('action', [
    startRunActionSchema,
    resumeRunActionSchema,
    listRunsActionSchema,
    askUserActionSchema,
    callGraphActionSchema,
]);
const dispatchActionSchema = {
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
export function getDispatchRequest(options) {
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
export function applyDispatchAction(options) {
    const graphs = listRegisteredGraphs(options.workflowRoot).map(graphSummary);
    selectDispatcher(graphs);
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
            const graph = requireRegisteredGraph(graphs, action.graphId, 'workflow');
            assertEffectsAllowed(graph.effects, options.effectPolicy, `graph ${action.graphId}`);
            if (!compactWorkflowHasExecutableGraph(options.workflowRoot, action.graphId)) {
                throw new RipplegraphError('E_GRAPH_NOT_EXECUTABLE_YET', `registered graph ${action.graphId} is not executable yet because it is not present as a workflow in workflow.json`);
            }
            return startRun({
                workflowRoot: options.workflowRoot,
                graph: action.graphId,
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
function graphSummary(entry) {
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
function selectDispatcher(graphs) {
    const dispatchers = graphs.filter((entry) => entry.kind === 'dispatcher');
    if (dispatchers.length === 0) {
        throw new RipplegraphError('E_MISSING_DISPATCHER', 'no registered dispatcher graph found');
    }
    if (dispatchers.length > 1) {
        throw new RipplegraphError('E_AMBIGUOUS_DISPATCHER', `multiple registered dispatcher graphs: ${dispatchers.map((entry) => entry.id).join(', ')}`);
    }
    const dispatcher = dispatchers[0];
    if (!dispatcher)
        throw new RipplegraphError('E_MISSING_DISPATCHER', 'no registered dispatcher graph found');
    return dispatcher;
}
function requireRegisteredGraph(graphs, graphId, kind) {
    const graph = graphs.find((entry) => entry.id === graphId);
    if (!graph)
        throw new RipplegraphError('E_UNKNOWN_GRAPH', `unknown registered graph: ${graphId}`);
    if (graph.kind !== kind) {
        throw new RipplegraphError('E_WRONG_GRAPH_KIND', `graph ${graphId} is ${graph.kind}, expected ${kind}`);
    }
    return graph;
}
function compactWorkflowHasExecutableGraph(workflowRoot, graphId) {
    try {
        return loadWorkflow(workflowRoot).graphs[graphId]?.kind === 'workflow';
    }
    catch (error) {
        if (error instanceof RipplegraphError && error.code === 'E_MISSING_WORKFLOW')
            return false;
        throw error;
    }
}
function generatedRunId(graphId) {
    return `${graphId}-${new Date().toISOString().replace(/[^0-9A-Za-z]/g, '').slice(0, 17)}`;
}
function formatIssues(issues) {
    return issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
}
