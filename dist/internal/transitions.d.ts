import type { Position, TransitionLogEntry } from '../schema.js';
export declare function transitionEntry(op: TransitionLogEntry['op'], runId: string, from: Position | null, to: Position | null): TransitionLogEntry;
