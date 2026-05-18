export function transitionEntry(op, runId, from, to) {
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
