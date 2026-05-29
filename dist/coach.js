import path from 'node:path';
import { appendTransition, ensureWorkflowRoot, listRunIds, loadWorkflow, nodeOutputKey, readCheckpoint, readCurrent, writeCheckpoint, writeCurrent, writeNodeOutput, } from './storage.js';
import { loadGraphPackage } from './graph-package.js';
import { listRegisteredGraphs, resolveRegisteredGraphPackage } from './registry.js';
import { resolveDispatcherEntry } from './internal/dispatcher-resolution.js';
import { RipplegraphError, } from './schema.js';
import { resumableRuns, runSummary, stateForCheckpoint } from './internal/coach-responses.js';
import { validateOutput } from './internal/output-validation.js';
import { getNode, selectEdge } from './internal/runtime-graph.js';
import { transitionEntry } from './internal/transitions.js';
export function validateWorkflowRoot(rootPath) {
    const workflow = loadWorkflow(rootPath);
    ensureWorkflowRoot(rootPath);
    return {
        status: 'ok',
        workflow: { id: workflow.id, version: workflow.version },
        graphs: listRegisteredGraphs(rootPath).map((entry) => entry.id),
    };
}
function effectsForNode(graph, node) {
    const executionEffects = node.effects ?? graph.effects;
    const toolEffects = node.toolContract?.effects ?? [];
    const sideChannelEffects = node.sideChannelActions?.flatMap((action) => action.effects ?? []) ?? [];
    return [...new Set([...executionEffects, ...toolEffects, ...sideChannelEffects])];
}
function assertGraphAndChildEffectsAllowed(rootPath, graph, graphId, policy) {
    const allowed = new Set(policy?.allowedEffects ?? []);
    const missing = missingEffectsForGraph(graph, allowed);
    collectMissingChildEffects(rootPath, graph, allowed, missing, new Set([graphId]));
    if (missing.size === 0)
        return;
    const parts = [...missing.entries()].map(([effect, nodes]) => `${effect} (${nodes.length > 1 ? 'nodes' : 'node'}: ${nodes.join(', ')})`);
    throw new RipplegraphError('E_EFFECT_NOT_ALLOWED', `graph ${graphId} requires effects not allowed by policy: ${parts.join(', ')}`);
}
function missingEffectsForGraph(graph, allowed, ownerPrefix = '') {
    const missing = new Map();
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
        for (const effect of effectsForNode(graph, node)) {
            if (allowed.has(effect))
                continue;
            const owners = missing.get(effect) ?? [];
            const owner = `${ownerPrefix}${nodeId}`;
            if (!owners.includes(owner))
                owners.push(owner);
            missing.set(effect, owners);
        }
    }
    return missing;
}
function collectMissingChildEffects(rootPath, graph, allowed, missing, visited) {
    for (const node of Object.values(graph.nodes)) {
        const graphId = node.workflowRef?.graphId;
        if (!graphId || visited.has(graphId))
            continue;
        visited.add(graphId);
        const { graphPackage } = resolveRegisteredGraphPackage({ workflowRoot: rootPath, graphId, kind: 'workflow' });
        const childMissing = missingEffectsForGraph(graphPackage.manifest, allowed, `${graphId}/`);
        for (const [effect, owners] of childMissing) {
            const existing = missing.get(effect) ?? [];
            for (const owner of owners) {
                if (!existing.includes(owner))
                    existing.push(owner);
            }
            missing.set(effect, existing);
        }
        collectMissingChildEffects(rootPath, graphPackage.manifest, allowed, missing, visited);
    }
}
function unmetStartRequirements(requirements, state) {
    return requirements.filter((requirement) => state?.[requirement.id] !== true);
}
function assertStartRequirementsMet(graphId, requirements, state) {
    const unmet = unmetStartRequirements(requirements, state);
    if (unmet.length === 0)
        return;
    throw new RipplegraphError('E_START_REQUIREMENTS_UNMET', `graph ${graphId} start requirements unmet: ${unmet.map((requirement) => requirement.id).join(', ')}`, {
        graphId,
        unmet: unmet.map((requirement) => ({
            id: requirement.id,
            describe: requirement.describe,
            ...(requirement.unmetRedirect ? { redirectTo: requirement.unmetRedirect } : {}),
            ...(requirement.unmetMessage ? { message: requirement.unmetMessage } : {}),
        })),
    });
}
export function startRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const { entry, graphPackage } = resolveRegisteredGraphPackage({
        workflowRoot: opts.workflowRoot,
        graphId: opts.graphId,
        kind: 'workflow',
    });
    const manifest = graphPackage.manifest;
    assertStartRequirementsMet(opts.graphId, manifest.requires, opts.preconditionState);
    assertGraphAndChildEffectsAllowed(opts.workflowRoot, manifest, opts.graphId, opts.effectPolicy);
    const checkpoint = buildInitialCheckpoint({
        runId: opts.runId,
        rootGraph: manifest.id,
        entryNode: manifest.entry,
        workflow,
        graphSource: {
            kind: 'package',
            graphId: manifest.id,
            graphVersion: manifest.version,
            packagePath: entry.path,
        },
    });
    return createRun(opts.workflowRoot, workflow, manifest, checkpoint);
}
function buildInitialCheckpoint(args) {
    const now = new Date().toISOString();
    return {
        runId: args.runId,
        status: 'active',
        rootGraph: args.rootGraph,
        workflow: { id: args.workflow.id, version: args.workflow.version },
        position: { graph: args.rootGraph, node: args.entryNode },
        createdAt: now,
        updatedAt: now,
        outputs: {},
        gateDecisions: {},
        stack: [],
        frameCounter: 0,
        graphSource: args.graphSource,
    };
}
function createRun(rootPath, workflow, graph, checkpoint) {
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
    return enterWorkflowRefs(rootPath, workflow, checkpoint);
}
export function getState(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    ensureWorkflowRoot(opts.workflowRoot);
    const current = readCurrent(opts.workflowRoot);
    if (!current.focusedRunId) {
        const availableGraphs = listRegisteredGraphs(opts.workflowRoot);
        const dispatcher = tryResolveDispatcher(opts.workflowRoot);
        return {
            status: 'no_focused_run',
            workflow: { id: workflow.id, version: workflow.version },
            availableGraphs,
            resumableRuns: resumableRuns(opts.workflowRoot),
            ...(dispatcher ? { dispatcher: { graph: dispatcher.id, available: true } } : {}),
            orientation: dispatcher
                ? 'No run is focused. Submit user intent to the dispatcher.'
                : 'No run is focused. Start or resume a run.',
            nextAllowedCommand: dispatcher
                ? 'ripplegraph dispatch --request "<user request>"'
                : `ripplegraph start --graph ${availableGraphs[0]?.id ?? '<graph-id>'} --run-id <run-id>`,
            helpCommand: 'ripplegraph explain',
        };
    }
    const checkpoint = readCheckpoint(opts.workflowRoot, current.focusedRunId);
    return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint);
}
function tryResolveDispatcher(workflowRoot) {
    try {
        return resolveDispatcherEntry(workflowRoot);
    }
    catch (error) {
        if (error instanceof RipplegraphError) {
            if (error.code === 'E_MISSING_DISPATCHER' ||
                error.code === 'E_AMBIGUOUS_DISPATCHER' ||
                error.code === 'E_ENTRY_GRAPH_MISMATCH') {
                return undefined;
            }
        }
        throw error;
    }
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
    const active = activeContextForCheckpoint(opts.workflowRoot, checkpoint);
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
        if (checkpoint.stack.length > 0) {
            return exitChildWorkflow(opts.workflowRoot, workflow, checkpoint, active, opts.output, to);
        }
        return completeRun(opts.workflowRoot, checkpoint, to);
    }
    writeCheckpoint(opts.workflowRoot, checkpoint);
    return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint);
}
export function advanceRun(opts) {
    const checkpoint = focusedCheckpoint(opts.workflowRoot);
    const active = activeContextForCheckpoint(opts.workflowRoot, checkpoint);
    const node = getNode(active.graph, checkpoint.position.node);
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
    const active = activeContextForCheckpoint(opts.workflowRoot, checkpoint);
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
        if (checkpoint.stack.length > 0) {
            return exitChildWorkflow(opts.workflowRoot, workflow, checkpoint, active, opts.decision, to);
        }
        return completeRun(opts.workflowRoot, checkpoint, to);
    }
    writeCheckpoint(opts.workflowRoot, checkpoint);
    return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint);
}
export function suspendRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const checkpoint = focusedCheckpoint(opts.workflowRoot);
    const active = activeContextForCheckpoint(opts.workflowRoot, checkpoint);
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
    return stateForCheckpoint(workflow, checkpoint, { graph: active.graph, scope: active.scope });
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
    return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint);
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
export function recordSideChannelAction(opts) {
    const status = opts.status ?? 'completed';
    if (status !== 'completed' && status !== 'failed') {
        throw new RipplegraphError('E_INVALID_SIDE_CHANNEL_STATUS', `side-channel status must be completed or failed: ${status}`);
    }
    const { workflow, checkpoint, active } = activeFocusedRun(opts.workflowRoot);
    const position = checkpoint.position;
    appendTransition(opts.workflowRoot, checkpoint.runId, {
        ...transitionEntry('side_channel', checkpoint.runId, position, position),
        output: {
            actionId: opts.actionId,
            status,
            note: opts.note,
            input: opts.input,
            output: opts.output,
        },
        reason: opts.note ?? null,
    });
    return runtimeAuditResponse(workflow, checkpoint, active);
}
export function reconcileExternalState(opts) {
    const { workflow, checkpoint, active } = activeFocusedRun(opts.workflowRoot);
    const position = checkpoint.position;
    const aligned = opts.expected === undefined || stableJson(opts.snapshot) === stableJson(opts.expected);
    appendTransition(opts.workflowRoot, checkpoint.runId, {
        ...transitionEntry('reconcile', checkpoint.runId, position, position),
        output: {
            source: opts.source,
            snapshot: opts.snapshot,
            expected: opts.expected,
            aligned,
            note: opts.note,
        },
        reason: opts.note ?? null,
    });
    return { ...runtimeAuditResponse(workflow, checkpoint, active), reconciliation: { source: opts.source, aligned } };
}
function focusedCheckpoint(rootPath) {
    ensureWorkflowRoot(rootPath);
    const current = readCurrent(rootPath);
    if (!current.focusedRunId) {
        throw new RipplegraphError('E_NO_FOCUSED_RUN', 'no focused run');
    }
    return readCheckpoint(rootPath, current.focusedRunId);
}
function activeFocusedRun(rootPath) {
    const workflow = loadWorkflow(rootPath);
    const checkpoint = focusedCheckpoint(rootPath);
    if (checkpoint.status !== 'active') {
        throw new RipplegraphError('E_RUN_NOT_ACTIVE', `focused run is not active: ${checkpoint.status}`);
    }
    return { workflow, checkpoint, active: activeContextForCheckpoint(rootPath, checkpoint) };
}
function runtimeAuditResponse(workflow, checkpoint, active) {
    return {
        status: 'ok',
        run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
        position: checkpoint.position,
        state: stateForCheckpoint(workflow, checkpoint, { graph: active.graph, scope: active.scope }),
    };
}
function stableJson(value) {
    return JSON.stringify(stableValue(value));
}
function stableValue(value) {
    if (Array.isArray(value))
        return value.map(stableValue);
    if (!value || typeof value !== 'object')
        return value;
    return Object.fromEntries(Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]));
}
function enterWorkflowRefs(rootPath, workflow, checkpoint) {
    let active = activeContextForCheckpoint(rootPath, checkpoint);
    ensureFrameCounter(checkpoint);
    const entered = new Set();
    while (true) {
        const node = getNode(active.graph, checkpoint.position.node);
        const graphId = node.workflowRef?.graphId;
        if (!graphId)
            return stateForCheckpoint(workflow, checkpoint, { graph: active.graph, scope: active.scope });
        const cycleKey = `${active.graphId}/${checkpoint.position.node}->${graphId}`;
        if (entered.has(cycleKey)) {
            throw new RipplegraphError('E_WORKFLOW_REF_CYCLE', `workflowRef cycle while entering ${graphId}`);
        }
        entered.add(cycleKey);
        const { entry, graphPackage } = resolveRegisteredGraphPackage({ workflowRoot: rootPath, graphId, kind: 'workflow' });
        const manifest = graphPackage.manifest;
        const from = checkpoint.position;
        checkpoint.frameCounter += 1;
        const frameScope = `f${checkpoint.frameCounter}`;
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
            graphSource: checkpoint.stack.at(-1).child,
            graphId: manifest.id,
            scope: frameScope,
        };
    }
}
function ensureFrameCounter(checkpoint) {
    if (checkpoint.frameCounter > 0)
        return;
    let max = 0;
    for (const frame of checkpoint.stack) {
        const match = /^f(\d+)$/.exec(frame.scope);
        if (match)
            max = Math.max(max, Number(match[1]));
    }
    for (const key of Object.keys(checkpoint.outputs)) {
        const match = /^f(\d+)\//.exec(key);
        if (match)
            max = Math.max(max, Number(match[1]));
    }
    checkpoint.frameCounter = max;
}
function exitChildWorkflow(rootPath, workflow, checkpoint, child, childResult, childTerminalPosition) {
    const outputErrors = validateOutput(child.graph.outputSchema, childResult);
    if (outputErrors.length > 0) {
        appendTransition(rootPath, checkpoint.runId, {
            ...transitionEntry('step', checkpoint.runId, childTerminalPosition, childTerminalPosition),
            validation: { ok: false, errors: outputErrors },
            error: { code: 'E_VALIDATION', message: 'child workflow output failed validation' },
        });
        return {
            status: 'validation_error',
            run: { id: checkpoint.runId, status: checkpoint.status, rootGraph: checkpoint.rootGraph },
            position: childTerminalPosition,
            errors: outputErrors,
        };
    }
    const frame = checkpoint.stack.pop();
    if (!frame) {
        return completeRun(rootPath, checkpoint, childTerminalPosition);
    }
    const parentGraphSource = frame.parent.graphSource ?? checkpoint.graphSource;
    if (!parentGraphSource) {
        throw new RipplegraphError('E_MISSING_GRAPH_SOURCE', `run ${checkpoint.runId} has a stack frame without a resolvable parent graph source`);
    }
    const parentGraph = graphForSource(rootPath, checkpoint, parentGraphSource);
    const parentNode = getNode(parentGraph, frame.parent.node);
    const artifact = writeNodeOutput(rootPath, checkpoint.runId, frame.parent.node, childResult, frame.parent.scope);
    checkpoint.outputs[nodeOutputKey(frame.parent.scope, frame.parent.node)] = childResult;
    const nextNodeId = selectEdge(parentNode.edges, childResult)?.to;
    if (!nextNodeId) {
        throw new RipplegraphError('E_NO_EDGE', `node ${frame.parent.node} has no matching edge`);
    }
    const to = { graph: frame.parent.graph, node: nextNodeId };
    checkpoint.position = to;
    checkpoint.updatedAt = new Date().toISOString();
    appendTransition(rootPath, checkpoint.runId, {
        ...transitionEntry('step', checkpoint.runId, childTerminalPosition, to),
        input: { artifact },
        output: { artifact },
    });
    const nextNode = getNode(parentGraph, nextNodeId);
    if (nextNode.terminal) {
        if (checkpoint.stack.length > 0) {
            return exitChildWorkflow(rootPath, workflow, checkpoint, { graph: parentGraph, graphSource: parentGraphSource, graphId: frame.parent.graph, scope: frame.parent.scope }, childResult, to);
        }
        return completeRun(rootPath, checkpoint, to);
    }
    writeCheckpoint(rootPath, checkpoint);
    return enterWorkflowRefs(rootPath, workflow, checkpoint);
}
function activeContextForCheckpoint(rootPath, checkpoint) {
    const frame = checkpoint.stack.at(-1);
    if (frame) {
        return {
            graph: graphForSource(rootPath, checkpoint, frame.child),
            graphSource: frame.child,
            graphId: frame.child.graphId,
            scope: frame.scope,
        };
    }
    if (!checkpoint.graphSource) {
        throw new RipplegraphError('E_MISSING_GRAPH_SOURCE', `run ${checkpoint.runId} has no graphSource; the workspace must register a graph package for ${checkpoint.rootGraph}`);
    }
    return {
        graph: graphForSource(rootPath, checkpoint, checkpoint.graphSource),
        graphSource: checkpoint.graphSource,
        graphId: checkpoint.graphSource.graphId,
        scope: '',
    };
}
function graphForSource(rootPath, checkpoint, source) {
    const packageRoot = path.isAbsolute(source.packagePath) ? source.packagePath : path.join(rootPath, source.packagePath);
    const manifest = loadGraphPackage(packageRoot).manifest;
    if (manifest.id !== source.graphId || manifest.kind !== 'workflow' || manifest.version !== source.graphVersion) {
        throw new RipplegraphError('E_RUN_PACKAGE_MISMATCH', `run ${checkpoint.runId} was started with ${source.graphId}@${source.graphVersion}, but ${source.packagePath} is ${manifest.id}@${manifest.version} (${manifest.kind})`);
    }
    return manifest;
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
