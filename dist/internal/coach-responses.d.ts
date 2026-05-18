import type { Checkpoint, Workflow } from '../schema.js';
import type { RunSummary, StateNoFocusedRun, StateOk } from '../coach.js';
export declare function stateForCheckpoint(workflow: Workflow, checkpoint: Checkpoint): StateOk;
export declare function runSummary(rootPath: string, runId: string): RunSummary;
export declare function resumableRuns(rootPath: string): StateNoFocusedRun['resumableRuns'];
