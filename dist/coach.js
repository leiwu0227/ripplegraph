import { appendTransition, ensureWorkflowRoot, listRunIds, loadWorkflow, readCheckpoint, readCurrent, writeCheckpoint, writeCurrent, writeNodeOutput, } from './storage.js';
import { RipplegraphError, } from './schema.js';
import { resumableRuns, runSummary, stateForCheckpoint } from './internal/coach-responses.js';
import { validateOutput } from './internal/output-validation.js';
import { getGraph, getNode, selectEdge } from './internal/runtime-graph.js';
import { transitionEntry } from './internal/transitions.js';
export function validateWorkflowRoot(rootPath) {
    const workflow = loadWorkflow(rootPath);
    ensureWorkflowRoot(rootPath);
    return { status: 'ok', workflow: { id: workflow.id, version: workflow.version }, graphs: Object.keys(workflow.graphs) };
}
export function startRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    ensureWorkflowRoot(opts.workflowRoot);
    const current = readCurrent(opts.workflowRoot);
    if (current.focusedRunId) {
        throw new RipplegraphError('E_FOCUSED_RUN_EXISTS', `focused run already exists: ${current.focusedRunId}`);
    }
    const graph = getGraph(workflow, opts.graph);
    if (listRunIds(opts.workflowRoot).includes(opts.runId)) {
        throw new RipplegraphError('E_RUN_EXISTS', `run already exists: ${opts.runId}`);
    }
    const now = new Date().toISOString();
    const checkpoint = {
        runId: opts.runId,
        status: 'active',
        rootGraph: opts.graph,
        workflow: { id: workflow.id, version: workflow.version },
        position: { graph: opts.graph, node: graph.entry },
        createdAt: now,
        updatedAt: now,
        outputs: {},
        gateDecisions: {},
    };
    writeCheckpoint(opts.workflowRoot, checkpoint);
    writeCurrent(opts.workflowRoot, { focusedRunId: opts.runId });
    appendTransition(opts.workflowRoot, opts.runId, transitionEntry('start', opts.runId, null, checkpoint.position));
    return stateForCheckpoint(workflow, checkpoint);
}
export function getState(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    ensureWorkflowRoot(opts.workflowRoot);
    const current = readCurrent(opts.workflowRoot);
    if (!current.focusedRunId) {
        const dispatcher = workflow.entryGraph ? { graph: workflow.entryGraph, available: true } : undefined;
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
    return stateForCheckpoint(workflow, readCheckpoint(opts.workflowRoot, current.focusedRunId));
}
export function listRuns(opts) {
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
export function stepRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const checkpoint = focusedCheckpoint(opts.workflowRoot);
    if (checkpoint.status !== 'active') {
        throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
    }
    const graph = getGraph(workflow, checkpoint.rootGraph);
    const node = getNode(graph, checkpoint.position.node);
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
    const artifact = writeNodeOutput(opts.workflowRoot, checkpoint.runId, checkpoint.position.node, opts.output);
    const nextNodeId = selectEdge(node.edges, opts.output)?.to;
    if (!nextNodeId) {
        throw new RipplegraphError('E_NO_EDGE', `node ${checkpoint.position.node} has no matching edge`);
    }
    const from = checkpoint.position;
    const to = { graph: checkpoint.rootGraph, node: nextNodeId };
    checkpoint.outputs[checkpoint.position.node] = opts.output;
    checkpoint.position = to;
    checkpoint.updatedAt = new Date().toISOString();
    appendTransition(opts.workflowRoot, checkpoint.runId, {
        ...transitionEntry('step', checkpoint.runId, from, to),
        input: { artifact },
        output: { artifact },
    });
    const nextNode = getNode(graph, nextNodeId);
    if (nextNode.terminal) {
        return completeRun(opts.workflowRoot, checkpoint, to);
    }
    writeCheckpoint(opts.workflowRoot, checkpoint);
    return stateForCheckpoint(workflow, checkpoint);
}
export function advanceRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const checkpoint = focusedCheckpoint(opts.workflowRoot);
    const graph = getGraph(workflow, checkpoint.rootGraph);
    const node = getNode(graph, checkpoint.position.node);
    if (node.gate)
        return decideGate({ workflowRoot: opts.workflowRoot, decision: opts.input });
    return stepRun({ workflowRoot: opts.workflowRoot, output: opts.input });
}
export function decideGate(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const checkpoint = focusedCheckpoint(opts.workflowRoot);
    if (checkpoint.status !== 'active') {
        throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
    }
    const graph = getGraph(workflow, checkpoint.rootGraph);
    const node = getNode(graph, checkpoint.position.node);
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
    const artifact = writeNodeOutput(opts.workflowRoot, checkpoint.runId, checkpoint.position.node, opts.decision);
    const nextNodeId = selectEdge(node.edges, opts.decision)?.to;
    if (!nextNodeId) {
        throw new RipplegraphError('E_NO_EDGE', `node ${checkpoint.position.node} has no matching edge`);
    }
    const from = checkpoint.position;
    const to = { graph: checkpoint.rootGraph, node: nextNodeId };
    checkpoint.gateDecisions[checkpoint.position.node] = opts.decision;
    checkpoint.position = to;
    checkpoint.updatedAt = new Date().toISOString();
    appendTransition(opts.workflowRoot, checkpoint.runId, {
        ...transitionEntry('decide', checkpoint.runId, from, to),
        input: { artifact },
        output: null,
        gateDecision: opts.decision,
    });
    const nextNode = getNode(graph, nextNodeId);
    if (nextNode.terminal) {
        return completeRun(opts.workflowRoot, checkpoint, to);
    }
    writeCheckpoint(opts.workflowRoot, checkpoint);
    return stateForCheckpoint(workflow, checkpoint);
}
export function suspendRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const checkpoint = focusedCheckpoint(opts.workflowRoot);
    if (checkpoint.status !== 'active') {
        throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
    }
    checkpoint.status = 'suspended';
    checkpoint.updatedAt = new Date().toISOString();
    if (opts.note)
        checkpoint.resumeNote = opts.note;
    writeCheckpoint(opts.workflowRoot, checkpoint);
    writeCurrent(opts.workflowRoot, { focusedRunId: null });
    appendTransition(opts.workflowRoot, checkpoint.runId, {
        ...transitionEntry('suspend', checkpoint.runId, checkpoint.position, checkpoint.position),
        reason: opts.note ?? null,
    });
    return stateForCheckpoint(workflow, checkpoint);
}
export function resumeRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    ensureWorkflowRoot(opts.workflowRoot);
    const current = readCurrent(opts.workflowRoot);
    if (current.focusedRunId) {
        throw new RipplegraphError('E_FOCUSED_RUN_EXISTS', `focused run already exists: ${current.focusedRunId}`);
    }
    const checkpoint = readCheckpoint(opts.workflowRoot, opts.runId);
    if (checkpoint.status !== 'suspended') {
        throw new RipplegraphError('E_RUN_NOT_RESUMABLE', `run ${opts.runId} is not suspended`);
    }
    checkpoint.status = 'active';
    checkpoint.updatedAt = new Date().toISOString();
    writeCheckpoint(opts.workflowRoot, checkpoint);
    writeCurrent(opts.workflowRoot, { focusedRunId: opts.runId });
    appendTransition(opts.workflowRoot, checkpoint.runId, transitionEntry('resume', checkpoint.runId, checkpoint.position, checkpoint.position));
    return stateForCheckpoint(workflow, checkpoint);
}
export function abandonRun(opts) {
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
function focusedCheckpoint(rootPath) {
    ensureWorkflowRoot(rootPath);
    const current = readCurrent(rootPath);
    if (!current.focusedRunId) {
        throw new RipplegraphError('E_NO_FOCUSED_RUN', 'no focused run');
    }
    return readCheckpoint(rootPath, current.focusedRunId);
}
function completeRun(rootPath, checkpoint, to) {
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
