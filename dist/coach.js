import path from 'node:path';
import { appendTransition, ensureWorkflowRoot, listRunIds, loadWorkflow, nodeOutputKey, readCheckpoint, readCurrent, writeCheckpoint, writeCurrent, writeNodeOutput, } from './storage.js';
import { loadGraphPackage } from './graph-package.js';
import { resolveRegisteredGraphPackage } from './registry.js';
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
function effectsForNode(graph, node) {
    return node.effects ?? graph.effects;
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
export function startRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const graph = getGraph(workflow, opts.graph);
    assertGraphAndChildEffectsAllowed(opts.workflowRoot, graph, opts.graph, opts.effectPolicy);
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
        stack: [],
        frameCounter: 0,
    };
    return createRun(opts.workflowRoot, workflow, graph, checkpoint);
}
export function startRegisteredWorkflowRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const { entry, graphPackage } = resolveRegisteredGraphPackage({
        workflowRoot: opts.workflowRoot,
        graphId: opts.graphId,
        kind: 'workflow',
    });
    const manifest = graphPackage.manifest;
    assertGraphAndChildEffectsAllowed(opts.workflowRoot, manifest, opts.graphId, opts.effectPolicy);
    const now = new Date().toISOString();
    const checkpoint = {
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
        frameCounter: 0,
        graphSource: {
            kind: 'package',
            graphId: manifest.id,
            graphVersion: manifest.version,
            packagePath: entry.path,
        },
    };
    return createRun(opts.workflowRoot, workflow, manifest, checkpoint);
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
    const checkpoint = readCheckpoint(opts.workflowRoot, current.focusedRunId);
    return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint);
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
        if (checkpoint.stack.length > 0) {
            return exitChildWorkflow(opts.workflowRoot, workflow, checkpoint, active, opts.output, to);
        }
        return completeRun(opts.workflowRoot, checkpoint, to);
    }
    writeCheckpoint(opts.workflowRoot, checkpoint);
    return enterWorkflowRefs(opts.workflowRoot, workflow, checkpoint);
}
export function advanceRun(opts) {
    const workflow = loadWorkflow(opts.workflowRoot);
    const checkpoint = focusedCheckpoint(opts.workflowRoot);
    const active = activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint);
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
    const active = activeContextForCheckpoint(opts.workflowRoot, workflow, checkpoint);
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
    return stateForCheckpoint(workflow, checkpoint, active);
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
function focusedCheckpoint(rootPath) {
    ensureWorkflowRoot(rootPath);
    const current = readCurrent(rootPath);
    if (!current.focusedRunId) {
        throw new RipplegraphError('E_NO_FOCUSED_RUN', 'no focused run');
    }
    return readCheckpoint(rootPath, current.focusedRunId);
}
function enterWorkflowRefs(rootPath, workflow, checkpoint) {
    let active = activeContextForCheckpoint(rootPath, workflow, checkpoint);
    ensureFrameCounter(checkpoint);
    const entered = new Set();
    while (true) {
        const node = getNode(active.graph, checkpoint.position.node);
        const graphId = node.workflowRef?.graphId;
        if (!graphId)
            return stateForCheckpoint(workflow, checkpoint, active);
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
    const parentGraph = frame.parent.graphSource ? graphForSource(rootPath, checkpoint, frame.parent.graphSource) : getGraph(workflow, frame.parent.graph);
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
            return exitChildWorkflow(rootPath, workflow, checkpoint, { graph: parentGraph, graphSource: frame.parent.graphSource, graphId: frame.parent.graph, scope: frame.parent.scope }, childResult, to);
        }
        return completeRun(rootPath, checkpoint, to);
    }
    writeCheckpoint(rootPath, checkpoint);
    return enterWorkflowRefs(rootPath, workflow, checkpoint);
}
function activeContextForCheckpoint(rootPath, workflow, checkpoint) {
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
