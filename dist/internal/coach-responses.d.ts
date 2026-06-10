import type { Checkpoint, Graph, Workflow } from '../schema.js';
import type { RunSummary, StateNoFocusedRun, StateOk } from '../coach.js';
interface StateGraphContext {
    graph: Graph;
    scope: string;
}
export declare function stateForCheckpoint(workflow: Workflow, checkpoint: Checkpoint, context: StateGraphContext): StateOk;
export declare function exampleOutput(schema: {
    properties?: Record<string, {
        enum?: unknown[];
        type?: string;
    }>;
}): string;
export declare function runSummary(rootPath: string, runId: string): RunSummary;
export declare function resumableRuns(rootPath: string): StateNoFocusedRun['resumableRuns'];
export {};
