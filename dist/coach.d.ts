import { type Checkpoint, type Gate, type JsonSchema, type Node, type Position } from './schema.js';
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
    workflow: {
        id: string;
        version: string;
    };
    run: {
        id: string;
        status: Checkpoint['status'];
        rootGraph: string;
    };
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
        previous: Array<{
            id: string;
            purpose: string;
            output?: unknown;
        }>;
        next: Array<{
            id: string;
            purpose: string;
            when?: Record<string, unknown>;
        }>;
        latches: [];
        capabilities: [];
    };
    responseContract: {
        command: 'step';
        acceptedFormats: ['json'];
    } | {
        command: 'decide';
        acceptedFormats: ['json'];
        schema: JsonSchema;
        decisionSource?: Gate['decisionSource'];
    };
}
export interface StateNoFocusedRun {
    status: 'no_focused_run';
    workflow: {
        id: string;
        version: string;
    };
    availableGraphs: string[];
    resumableRuns: Array<{
        id: string;
        status: 'suspended';
        rootGraph: string;
    }>;
    dispatcher?: {
        graph: string;
        available: true;
    };
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
    workflow: {
        id: string;
        version: string;
    };
    focusedRunId: string | null;
    runs: RunSummary[];
}
export interface ValidationErrorResponse {
    status: 'validation_error';
    run: {
        id: string;
        status: Checkpoint['status'];
        rootGraph: string;
    };
    position: Position;
    errors: Array<{
        path: string;
        message: string;
    }>;
}
export type CoachState = StateOk | StateNoFocusedRun;
export type AdvanceResponse = StateOk | {
    status: 'completed';
    run: {
        id: string;
        status: 'completed';
        rootGraph: string;
    };
    position: Position;
} | ValidationErrorResponse;
export type StepRunResponse = AdvanceResponse;
export type AdvanceRunResponse = AdvanceResponse;
export type DecideGateResponse = AdvanceResponse;
export declare function validateWorkflowRoot(rootPath: string): {
    status: 'ok';
    workflow: {
        id: string;
        version: string;
    };
    graphs: string[];
};
export declare function startRun(opts: StartRunOptions): StateOk;
export declare function startRegisteredWorkflowRun(opts: StartRegisteredWorkflowRunOptions): StateOk;
export declare function getState(opts: WorkflowRootOptions): CoachState;
export declare function listRuns(opts: WorkflowRootOptions): RunList;
export declare function stepRun(opts: StepRunOptions): StepRunResponse;
export declare function advanceRun(opts: AdvanceRunOptions): AdvanceRunResponse;
export declare function decideGate(opts: DecideGateOptions): DecideGateResponse;
export declare function suspendRun(opts: SuspendRunOptions): StateOk;
export declare function resumeRun(opts: ResumeRunOptions): StateOk;
export declare function abandonRun(opts: AbandonRunOptions): {
    status: 'abandoned';
    run: {
        id: string;
        status: 'abandoned';
        rootGraph: string;
    };
    position: Position;
};
