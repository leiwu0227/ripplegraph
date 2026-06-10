import { describe, expect, it } from 'vitest';
import { renderGraphDiagram, type GraphPackageManifest } from '../src/index.js';

const manifest: GraphPackageManifest = {
  id: 'support-triage',
  version: '0.1.0',
  kind: 'workflow',
  entry: 'classify.ticket',
  activationHints: [],
  requires: [],
  inputSchema: { type: 'object' },
  outputSchema: { type: 'object' },
  effects: [],
  nodes: {
    'classify.ticket': {
      purpose: 'Classify ticket',
      exec: 'inline',
      outputSchema: { type: 'object' },
      gate: {
        type: 'external_decision',
        decisionSchema: { type: 'object' },
      },
      sideChannelActions: [{ id: 'refresh-ticket', purpose: 'Refresh ticket' }],
      edges: [{ to: 'done', when: { decision: 'approved' } }],
      terminal: false,
    },
    done: {
      purpose: 'Done',
      exec: 'inline',
      outputSchema: { type: 'object' },
      edges: [],
      terminal: true,
    },
  },
};

describe('graph diagram renderer', () => {
  it('renders Mermaid with graph header, node annotations, side-channel actions, and edge labels', () => {
    const diagram = renderGraphDiagram(manifest);

    expect(diagram).toContain('flowchart LR');
    expect(diagram).toContain('%% support-triage (workflow) v0.1.0');
    expect(diagram).toContain('classify_ticket["classify.ticket');
    expect(diagram).toContain('entry');
    expect(diagram).toContain('gate');
    expect(diagram).toContain('side: refresh-ticket');
    expect(diagram).toContain('done["done');
    expect(diagram).toContain('terminal');
    expect(diagram).toContain('classify_ticket -->|decision=approved| done');
  });

  it('renders DOT with equivalent annotations and edge labels', () => {
    const diagram = renderGraphDiagram(manifest, 'dot');

    expect(diagram).toContain('digraph "support-triage"');
    expect(diagram).toContain('label="support-triage (workflow) v0.1.0"');
    expect(diagram).toContain('"classify_ticket" [label="classify.ticket');
    expect(diagram).toContain('entry');
    expect(diagram).toContain('gate');
    expect(diagram).toContain('side: refresh-ticket');
    expect(diagram).toContain('"done" [label="done');
    expect(diagram).toContain('terminal');
    expect(diagram).toContain('"classify_ticket" -> "done" [label="decision=approved"];');
  });

  it('renders a metadata-only note for dispatcher packages in both formats', () => {
    const dispatcher: GraphPackageManifest = {
      id: 'workspace-dispatcher',
      version: '0.1.0',
      kind: 'dispatcher',
      activationHints: [],
      effects: [],
    };

    expect(renderGraphDiagram(dispatcher)).toBe(
      '%% workspace-dispatcher (dispatcher) v0.1.0: metadata-only dispatcher package, no nodes to diagram\n',
    );
    expect(renderGraphDiagram(dispatcher, 'dot')).toBe(
      '// workspace-dispatcher (dispatcher) v0.1.0: metadata-only dispatcher package, no nodes to diagram\n',
    );
  });
});
