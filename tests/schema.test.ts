import { describe, expect, it } from 'vitest';
import { graphPackageManifestSchema } from '../src/schema.js';

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'support-triage',
    version: '0.1.0',
    kind: 'workflow',
    entry: 'classify',
    nodes: {
      classify: {
        purpose: 'Classify the ticket',
        exec: 'inline',
        outputSchema: { type: 'object' },
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Complete', terminal: true },
    },
    ...overrides,
  };
}

describe('graph package manifest schema', () => {
  it('accepts a representative valid manifest with defaults applied', () => {
    const result = graphPackageManifestSchema.safeParse(manifest());
    expect(result.success).toBe(true);
    if (result.success && result.data.kind !== 'dispatcher') {
      expect(result.data.entry).toBe('classify');
      expect(result.data.effects).toEqual([]);
      expect(result.data.nodes.done?.terminal).toBe(true);
    }
  });

  it('rejects unknown entry and dangling edge references with issue paths', () => {
    const result = graphPackageManifestSchema.safeParse(
      manifest({
        entry: 'missing-entry',
        nodes: {
          classify: {
            purpose: 'Classify the ticket',
            exec: 'inline',
            outputSchema: { type: 'object' },
            edges: [{ to: 'nowhere' }],
          },
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
      expect(issues).toContainEqual({ path: 'entry', message: 'entry references unknown node: missing-entry' });
      expect(issues).toContainEqual({ path: 'nodes.classify.edges', message: 'edge references unknown node: nowhere' });
    }
  });

  it('rejects a manifest without an explicit kind', () => {
    const input = manifest();
    delete input.kind;
    expect(graphPackageManifestSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a workflow manifest that carries inputSchema (workflow runs take no input)', () => {
    expect(graphPackageManifestSchema.safeParse(manifest({ inputSchema: { type: 'object' } })).success).toBe(false);
  });

  it('accepts a workflow manifest with requires and rejects requires on a callable', () => {
    const requires = [{ id: 'workspace_ready', describe: 'a prepared workspace' }];
    expect(graphPackageManifestSchema.safeParse(manifest({ requires })).success).toBe(true);
    expect(graphPackageManifestSchema.safeParse(manifest({ kind: 'callable', requires })).success).toBe(false);
  });

  it('accepts a callable manifest with inputSchema', () => {
    const result = graphPackageManifestSchema.safeParse(manifest({ kind: 'callable', inputSchema: { type: 'object' } }));
    expect(result.success).toBe(true);
    if (result.success && result.data.kind === 'callable') {
      expect(result.data.inputSchema).toEqual({ type: 'object' });
    }
  });

  it('leaves workflow outputSchema absent when undeclared (no contract), while callable still defaults it', () => {
    const workflowResult = graphPackageManifestSchema.safeParse(manifest());
    expect(workflowResult.success).toBe(true);
    if (workflowResult.success && workflowResult.data.kind === 'workflow') {
      expect(workflowResult.data.outputSchema).toBeUndefined();
    }

    const declaredResult = graphPackageManifestSchema.safeParse(
      manifest({ outputSchema: { type: 'object', required: ['summary'] } }),
    );
    expect(declaredResult.success).toBe(true);
    if (declaredResult.success && declaredResult.data.kind === 'workflow') {
      expect(declaredResult.data.outputSchema).toEqual({ type: 'object', required: ['summary'] });
    }

    const callableResult = graphPackageManifestSchema.safeParse(manifest({ kind: 'callable' }));
    expect(callableResult.success).toBe(true);
    if (callableResult.success && callableResult.data.kind === 'callable') {
      expect(callableResult.data.outputSchema).toEqual({ type: 'object' });
      expect(callableResult.data.inputSchema).toEqual({ type: 'object' });
    }
  });

  it.each([
    ['graph outputSchema with format', { outputSchema: { type: 'string', format: 'email' } }, 'outputSchema'],
    [
      'node outputSchema with minLength',
      {
        nodes: {
          classify: {
            purpose: 'Classify the ticket',
            exec: 'inline',
            outputSchema: { type: 'object', properties: { note: { type: 'string', minLength: 3 } } },
            edges: [{ to: 'done' }],
          },
          done: { purpose: 'Complete', terminal: true },
        },
      },
      'nodes.classify.outputSchema.properties.note',
    ],
    [
      'gate decisionSchema with pattern',
      {
        nodes: {
          classify: {
            purpose: 'Classify the ticket',
            exec: 'inline',
            outputSchema: { type: 'object' },
            gate: {
              type: 'external_decision',
              decisionSchema: { type: 'string', pattern: '^a' },
            },
            edges: [{ to: 'done' }],
          },
          done: { purpose: 'Complete', terminal: true },
        },
      },
      'nodes.classify.gate.decisionSchema',
    ],
    [
      'callable inputSchema with pattern',
      { kind: 'callable', inputSchema: { type: 'string', pattern: '^a' } },
      'inputSchema',
    ],
  ])('rejects unsupported keywords in runtime-validated schemas: %s', (_label, override, expectedPath) => {
    const result = graphPackageManifestSchema.safeParse(manifest(override));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.message.includes('unsupported schema keyword'));
      expect(issue).toBeDefined();
      expect(issue?.path.join('.')).toContain(expectedPath);
    }
  });

  it('still accepts exotic keywords in host-facing schemas (never runtime-validated)', () => {
    const result = graphPackageManifestSchema.safeParse(
      manifest({
        nodes: {
          classify: {
            purpose: 'Classify the ticket',
            exec: 'inline',
            outputSchema: { type: 'object' },
            interaction: {
              id: 'classify-form',
              kind: 'form',
              prompt: 'Fill in the ticket details.',
              schema: { type: 'object', properties: { note: { type: 'string', minLength: 3, pattern: '^a' } } },
            },
            toolContract: {
              id: 'ticket-loader',
              command: 'load-ticket',
              outputSchema: { type: 'string', format: 'uri', maxLength: 200 },
            },
            sideChannelActions: [
              { id: 'refresh', purpose: 'Refresh state', outputSchema: { type: 'number', minimum: 0 } },
            ],
            validators: [{ id: 'check', inputSchema: { type: 'string', pattern: '.*' } }],
            edges: [{ to: 'done' }],
          },
          done: { purpose: 'Complete', terminal: true },
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects workflowRef nodes that carry inputMap or outputMap (never applied or exposed)', () => {
    for (const mapField of [{ inputMap: { request: 'ticket' } }, { outputMap: { summary: 'result' } }]) {
      const result = graphPackageManifestSchema.safeParse(
        manifest({
          nodes: {
            classify: {
              purpose: 'Classify the ticket',
              exec: 'inline',
              outputSchema: { type: 'object' },
              workflowRef: { graphId: 'child-graph', ...mapField },
              edges: [{ to: 'done' }],
            },
            done: { purpose: 'Complete', terminal: true },
          },
        }),
      );
      expect(result.success).toBe(false);
    }
  });
});

describe('dispatcher manifest schema (metadata-only)', () => {
  function dispatcherManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'workspace-dispatcher',
      version: '0.1.0',
      kind: 'dispatcher',
      title: 'Workspace Dispatcher',
      description: 'Routes user requests to registered graphs.',
      activationHints: ['route workspace work'],
      ...overrides,
    };
  }

  it('accepts a metadata-only dispatcher manifest with defaults applied', () => {
    const result = graphPackageManifestSchema.safeParse({
      id: 'workspace-dispatcher',
      version: '0.1.0',
      kind: 'dispatcher',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe('dispatcher');
      expect(result.data.activationHints).toEqual([]);
      expect(result.data).not.toHaveProperty('entry');
      expect(result.data).not.toHaveProperty('nodes');
      expect(result.data).not.toHaveProperty('effects');
    }
  });

  it.each([
    ['entry', { entry: 'route' }],
    ['nodes', { nodes: { route: { purpose: 'Route', terminal: true } } }],
    ['inputSchema', { inputSchema: { type: 'object' } }],
    ['outputSchema', { outputSchema: { type: 'object' } }],
    ['requires', { requires: [] }],
    ['effects', { effects: [] }],
  ])('rejects a dispatcher manifest that carries %s', (_field, override) => {
    expect(graphPackageManifestSchema.safeParse(dispatcherManifest(override)).success).toBe(false);
  });
});
