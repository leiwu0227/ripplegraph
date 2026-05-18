import type { Position, TransitionLogEntry } from '../schema.js';

export function transitionEntry(
  op: TransitionLogEntry['op'],
  runId: string,
  from: Position | null,
  to: Position | null,
): TransitionLogEntry {
  return {
    ts: new Date().toISOString(),
    op,
    runId,
    from,
    to,
    actor: 'agent',
    input: null,
    output: null,
    validation: { ok: true },
    gateDecision: null,
    reason: null,
    error: null,
  };
}
